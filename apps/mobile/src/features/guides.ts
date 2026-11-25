import { GUIDE_PACK, isGuideReleasable, type Guide, type GuideCategory, type GuideSource } from '@adultingos/shared';
import NetInfo from '@react-native-community/netinfo';
import { kvGet, kvSet } from '@/db/database';
import { isEnabled } from '@/config/env';
import { supabase } from '@/sync/supabase';

export interface GuideWithMeta extends Guide {
  /** True when shown only because this is a non-production build. */
  unverifiedPreview: boolean;
  origin: 'server' | 'bundled';
}

type R = Record<string, unknown>;

/** Fetches published guides from the server and caches them for offline use. */
async function fetchServerGuides(): Promise<Guide[] | null> {
  const sb = supabase();
  if (!sb) return null;
  const net = await NetInfo.fetch();
  if (net.isConnected === false) return null;
  const { data, error } = await sb
    .from('guides')
    .select('*, guide_steps(*), guide_requirements(*), guide_sources(*)')
    .in('status', ['published', 'needs_update']);
  if (error || !data) return null;
  const guides: Guide[] = (data as R[]).map((g) => ({
    slug: String(g.slug), title: String(g.title), category: g.category as GuideCategory, agency: (g.agency as string) ?? undefined, jurisdiction: 'PH',
    audience: String(g.audience ?? ''), summary: String(g.summary ?? ''), eligibilityCaveats: String(g.eligibility_caveats ?? ''),
    requirements: ((g.guide_requirements as R[]) ?? []).sort((a, b) => Number(a.position) - Number(b.position)).map((r) => String(r.text)),
    steps: ((g.guide_steps as R[]) ?? []).sort((a, b) => Number(a.position) - Number(b.position)).map((s) => ({
      title: String(s.title), body: String(s.body ?? ''), optional: !!s.is_optional, offsetDays: Number(s.suggested_offset_days ?? 0),
    })),
    feesText: (g.fees_text as string) ?? null, processingTimeText: (g.processing_time_text as string) ?? null, helpfulNotes: String(g.helpful_notes ?? ''),
    sources: ((g.guide_sources as R[]) ?? []).map((s): GuideSource => ({
      title: String(s.title), url: String(s.url), publisher: String(s.publisher), isOfficial: !!s.is_official, verifiedOn: (s.verified_on as string) ?? null,
    })),
    related: (g.related_slugs as string[]) ?? [], status: g.status as Guide['status'], contentVersion: Number(g.content_version ?? 0),
    lastVerifiedOn: (g.last_verified_on as string) ?? null,
  }));
  await kvSet('guides_cache', { at: new Date().toISOString(), guides });
  return guides;
}

/**
 * Resolution order:
 *   1. published guides from the server (or the offline cache of them);
 *   2. bundled guides that are releasable (published + verified official source);
 *   3. bundled drafts — only when `guides_unverified_preview` is on (never in production),
 *      flagged so the UI shows a prominent "not yet verified" banner.
 */
export async function loadGuides(opts: { refresh?: boolean } = {}): Promise<{ guides: GuideWithMeta[]; cachedAt: string | null; offline: boolean }> {
  let server: Guide[] | null = opts.refresh !== false ? await fetchServerGuides() : null;
  let cachedAt: string | null = null;
  let offline = false;
  if (!server) {
    const cache = await kvGet<{ at: string; guides: Guide[] } | null>('guides_cache', null);
    if (cache) {
      server = cache.guides;
      cachedAt = cache.at;
      offline = !!supabase();
    }
  }
  const bySlug = new Map<string, GuideWithMeta>();
  for (const g of GUIDE_PACK) {
    if (isGuideReleasable(g)) bySlug.set(g.slug, { ...g, unverifiedPreview: false, origin: 'bundled' });
    else if (isEnabled('guides_unverified_preview')) bySlug.set(g.slug, { ...g, unverifiedPreview: true, origin: 'bundled' });
  }
  for (const g of server ?? []) bySlug.set(g.slug, { ...g, unverifiedPreview: false, origin: 'server' });
  return { guides: [...bySlug.values()], cachedAt, offline };
}

export async function getGuide(slug: string): Promise<GuideWithMeta | null> {
  const { guides } = await loadGuides({ refresh: false });
  return guides.find((g) => g.slug === slug) ?? null;
}
