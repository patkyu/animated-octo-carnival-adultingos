import { router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { GOVERNMENT_DISCLAIMER } from '@adultingos/shared';
import { getGuide, loadGuides } from '@/features/guides';
import { useData } from '@/lib/useData';
import { AppText, Button, Card, Icon, Row, Stack, StatusBadge } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { EmptyState, LoadingList, Notice } from '@/ui/states';

export default function GuideDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: g, isLoading } = useData(['guide', slug], () => getGuide(slug));
  const { data: all } = useData(['guides'], () => loadGuides());
  if (isLoading) return <Screen title="Guide"><LoadingList rows={4} /></Screen>;
  if (!g) return <Screen title="Guide"><EmptyState mascot="doki" title="Guide not available" body="It may have been withdrawn for review." actionLabel="All guides" onAction={() => router.replace('/guides')} /></Screen>;
  const related = (all?.guides ?? []).filter((x) => g.related.includes(x.slug));
  const isGov = g.category === 'government';

  return (
    <Screen title="Guide" footer={g.steps.length ? <Button label="Add steps to my tasks" icon="plus" full onPress={() => router.push(`/guide/checklist/${slug}`)} /> : undefined}>
      <Stack gap={8}>
        <AppText variant="title">{g.title}</AppText>
        <Row wrap gap={8}>
          <StatusBadge label={`Jurisdiction: ${g.jurisdiction === 'PH' ? 'Philippines' : g.jurisdiction}`} tone="neutral" icon="map-pin" />
          {g.unverifiedPreview ? <StatusBadge label="Draft · not yet verified" tone="warning" /> : g.lastVerifiedOn ? <StatusBadge label={`Last verified ${g.lastVerifiedOn}`} tone="success" /> : <StatusBadge label="General guidance" tone="neutral" icon="info" />}
          {g.contentVersion ? <AppText variant="caption" color="textMuted">Version {g.contentVersion}</AppText> : null}
        </Row>
      </Stack>

      {g.unverifiedPreview ? (
        <Notice tone="warning" title="Not yet verified">
          This draft hasn't been checked against official sources by an editor. Don't rely on it — use the official website below. It is hidden in the production app until verified.
        </Notice>
      ) : null}
      {g.status === 'needs_update' ? <Notice tone="warning" title="Being reviewed">Our editors are checking this guide for changes. Confirm details on the official website.</Notice> : null}

      <Card>
        <Stack gap={8}>
          <AppText>{g.summary}</AppText>
          {g.audience ? <AppText variant="support" color="textMuted">For: {g.audience}</AppText> : null}
        </Stack>
      </Card>

      {g.eligibilityCaveats ? <Notice tone="info" title="Before you start">{g.eligibilityCaveats}</Notice> : null}

      {g.requirements.length ? (
        <Card>
          <Stack gap={8}>
            <AppText variant="section">What you may need</AppText>
            {g.requirements.map((r, i) => <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}><Icon name="check" size={16} color="primary" /><AppText style={{ flex: 1 }}>{r}</AppText></Row>)}
          </Stack>
        </Card>
      ) : null}

      <Card>
        <Stack gap={12}>
          <AppText variant="section">Steps</AppText>
          {g.steps.map((s, i) => (
            <Row key={i} gap={12} style={{ alignItems: 'flex-start' }}>
              <AppText variant="bodyStrong" color="primary" style={{ width: 24 }}>{i + 1}.</AppText>
              <Stack gap={2} style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{s.title}{s.optional ? ' (optional)' : ''}</AppText>
                {s.body ? <AppText variant="support" color="textMuted">{s.body}</AppText> : null}
              </Stack>
            </Row>
          ))}
        </Stack>
      </Card>

      {isGov ? (
        <Card>
          <Stack gap={6}>
            <AppText variant="section">Fees and processing time</AppText>
            <AppText>{g.feesText ?? 'Not listed here because we could not verify it. Check the official website for current fees.'}</AppText>
            <AppText>{g.processingTimeText ?? 'Processing times vary. Check the official website.'}</AppText>
          </Stack>
        </Card>
      ) : null}

      {g.helpfulNotes ? <Notice title="Helpful notes">{g.helpfulNotes}</Notice> : null}

      {g.sources.length ? (
        <Card>
          <Stack gap={8}>
            <AppText variant="section">Official sources</AppText>
            {g.sources.map((s) => (
              <Stack key={s.url} gap={2}>
                <Button label={s.title} icon="external-link" variant="ghost" compact style={{ alignSelf: 'flex-start' }} onPress={() => Linking.openURL(s.url)} />
                <AppText variant="caption" color="textMuted">{s.publisher} · {s.url}{s.verifiedOn ? ` · checked ${s.verifiedOn}` : ' · not yet checked by an editor'}</AppText>
              </Stack>
            ))}
          </Stack>
        </Card>
      ) : null}

      {related.length ? (
        <Stack gap={8}>
          <AppText variant="section">Related guides</AppText>
          {related.map((r) => <Button key={r.slug} label={r.title} variant="secondary" full onPress={() => router.push(`/guide/${r.slug}`)} />)}
        </Stack>
      ) : null}

      <AppText variant="caption" color="textMuted">{GOVERNMENT_DISCLAIMER}</AppText>
      <Button label="Report outdated or wrong information" icon="flag" variant="ghost" onPress={() => router.push(`/guide/report/${slug}`)} />
    </Screen>
  );
}
