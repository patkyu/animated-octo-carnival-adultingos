import { Linking, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { APP_VERSION, SUPPORT_EMAIL } from '@/config/env';
import { supabase } from '@/sync/supabase';

export type FeedbackKind = 'bug' | 'feature' | 'support' | 'other';
export type GuideReportReason = 'outdated' | 'incorrect' | 'broken_link' | 'unclear' | 'other';

/**
 * Sends feedback to the server when signed in and online; otherwise opens the
 * user's e-mail app with a prefilled message (nothing is sent automatically).
 */
export async function submitFeedback(kind: FeedbackKind, message: string): Promise<'sent' | 'email'> {
  const sb = supabase();
  const session = sb ? (await sb.auth.getSession()).data.session : null;
  const online = (await NetInfo.fetch()).isConnected !== false;
  if (sb && session && online) {
    const { error } = await sb.from('feedback_reports').insert({ user_id: session.user.id, kind, message: message.slice(0, 4000), app_version: APP_VERSION, platform: Platform.OS });
    if (!error) return 'sent';
  }
  await openEmail(`AdultingOS ${kind} report`, `${message}\n\n—\nApp version ${APP_VERSION} (${Platform.OS})`);
  return 'email';
}

export async function reportGuide(slug: string, reason: GuideReportReason, details: string): Promise<'sent' | 'email'> {
  const sb = supabase();
  const session = sb ? (await sb.auth.getSession()).data.session : null;
  if (sb && session) {
    const { data: g } = await sb.from('guides').select('id').eq('slug', slug).maybeSingle();
    if (g) {
      const { error } = await sb.from('content_reports').insert({ user_id: session.user.id, guide_id: g.id, reason, details: details.slice(0, 1000) });
      if (!error) return 'sent';
    }
  }
  await openEmail(`Guide report: ${slug}`, `Reason: ${reason}\n\n${details}\n\n—\nApp version ${APP_VERSION}`);
  return 'email';
}

export async function openEmail(subject: string, body: string): Promise<void> {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  await Linking.openURL(url).catch(() => undefined);
}
