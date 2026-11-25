import { describe, expect, it } from 'vitest';
import { GOVERNMENT_DISCLAIMER, GUIDE_PACK, isGuideReleasable } from '@adultingos/shared';
import { FAQ, PRIVACY_POLICY, TERMS } from '@/content/legal';
import { FEATURE_FLAGS } from '@/config/featureFlags';

describe('legal content', () => {
  it('privacy policy covers the required topics', () => {
    const headings = PRIVACY_POLICY.sections.map((s) => s.heading.toLowerCase()).join(' | ');
    for (const h of ['who we are', 'what we collect', 'how we use', 'share', 'retention', 'your rights', 'children']) expect(headings).toContain(h);
    const text = JSON.stringify(PRIVACY_POLICY);
    expect(text).toContain('Data Privacy Act of 2012');
    expect(text).toContain('Anthropic'); // AI processor must be disclosed
  });
  it('terms carry the mandatory government disclaimer verbatim', () => {
    expect(JSON.stringify(TERMS)).toContain(GOVERNMENT_DISCLAIMER);
  });
  it('FAQ answers are non-empty', () => {
    for (const f of FAQ) expect(f.a.length).toBeGreaterThan(20);
  });
});

describe('release safety', () => {
  it('unreleased modules and draft-guide preview are off in production', () => {
    for (const k of ['guides_unverified_preview', 'savings_goals', 'life_milestones', 'household', 'routines', 'premium', 'document_vault'] as const) {
      expect(FEATURE_FLAGS[k].production).toBe(false);
    }
  });
  it('no government guide is releasable without a verified official source', () => {
    for (const g of GUIDE_PACK.filter((x) => x.category === 'government')) {
      const verified = g.sources.some((s) => s.isOfficial && s.verifiedOn);
      expect(isGuideReleasable(g)).toBe(verified && (g.status === 'published' || g.status === 'needs_update'));
      // Drafts must not assert fees or processing times.
      expect(g.feesText).toBeNull();
      expect(g.processingTimeText).toBeNull();
    }
  });
});
