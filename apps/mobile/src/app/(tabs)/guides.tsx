import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GOVERNMENT_DISCLAIMER, GUIDE_CATEGORY_LABEL, searchGuides, type GuideCategory } from '@adultingos/shared';
import { loadGuides, type GuideWithMeta } from '@/features/guides';
import { useData } from '@/lib/useData';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Card, Chip, Icon, Row, Stack, StatusBadge } from '@/ui/primitives';
import { TextField } from '@/ui/forms';
import { Mascot } from '@/ui/Mascot';
import { EmptyState, ErrorState, LoadingList, Notice } from '@/ui/states';
import { IS_PRODUCTION } from '@/config/env';

function GuideCard({ g }: { g: GuideWithMeta }) {
  return (
    <Card onPress={() => router.push(`/guide/${g.slug}`)} accessibilityLabel={`${g.title}. ${g.unverifiedPreview ? 'Draft, not yet verified.' : ''}`}>
      <Stack gap={6}>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Icon name={g.category === 'government' ? 'shield' : 'book-open'} color="primary" />
          <Stack gap={2} style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{g.title}</AppText>
            {g.agency ? <AppText variant="caption" color="textMuted">{g.agency}</AppText> : null}
          </Stack>
          <Icon name="chevron-right" color="textMuted" />
        </Row>
        <AppText variant="support" color="textMuted" numberOfLines={2}>{g.summary}</AppText>
        <Row wrap gap={6}>
          {g.unverifiedPreview ? <StatusBadge label="Draft · not yet verified" tone="warning" icon="alert-triangle" /> : g.lastVerifiedOn ? <StatusBadge label={`Verified ${g.lastVerifiedOn}`} tone="success" icon="check-circle" /> : <StatusBadge label="General guidance" tone="neutral" icon="info" />}
          <AppText variant="caption" color="textMuted">{g.steps.length} steps</AppText>
        </Row>
      </Stack>
    </Card>
  );
}

export default function Guides() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<GuideCategory | 'all'>('all');
  const { data, isLoading, error, refetch } = useData(['guides'], () => loadGuides());
  const list = useMemo(() => {
    const base = (data?.guides ?? []).filter((g) => cat === 'all' || g.category === cat);
    return q.trim() ? searchGuides(base, q) as GuideWithMeta[] : base;
  }, [data, q, cat]);
  const cats = [...new Set((data?.guides ?? []).map((g) => g.category))];
  const anyDraft = (data?.guides ?? []).some((g) => g.unverifiedPreview);

  return (
    <View style={{ flex: 1, backgroundColor: t.c.background }}>
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center' as const, paddingTop: insets.top + 8, padding: 16, paddingBottom: 120, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Row gap={12}>
          <Stack gap={2} style={{ flex: 1 }}>
            <AppText variant="title">Guides</AppText>
            <AppText color="textMuted">Know your next step.</AppText>
          </Stack>
          <Mascot id="doki" expression="happy" size={64} />
        </Row>
        <TextField label="Search guides" value={q} onChangeText={setQ} placeholder="e.g. NBI clearance, TIN, moving out" icon="search" returnKeyType="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="All" selected={cat === 'all'} onPress={() => setCat('all')} />
          {cats.map((c) => <Chip key={c} label={GUIDE_CATEGORY_LABEL[c]} selected={cat === c} onPress={() => setCat(c)} />)}
        </ScrollView>
        <Notice icon="info" title="Independent app">{GOVERNMENT_DISCLAIMER}</Notice>
        {anyDraft && !IS_PRODUCTION ? (
          <Notice tone="warning" title="Development build: draft guides shown">
            Government guides marked “Draft” have not been verified against official sources and are hidden in the production app until an editor publishes them.
          </Notice>
        ) : null}
        {data?.offline ? <Notice tone="warning" icon="alert-triangle">Showing saved guides from {data.cachedAt?.slice(0, 10)}. Connect to check for updates.</Notice> : null}
        {isLoading ? <LoadingList /> : error ? <ErrorState mascot="doki" onRetry={() => refetch()} /> : !list.length ? (
          q ? <EmptyState mascot="doki" title="No guides found" body={`Nothing matched “${q}”. Try another word, or ask Adu.`} actionLabel="Ask Adu" onAction={() => router.push('/assistant')} />
            : <EmptyState mascot="doki" title="Guides are on the way" body="Verified guides will appear here once our editors publish them. Check back soon." />
        ) : (
          <Stack gap={10}>{list.map((g) => <GuideCard key={g.slug} g={g} />)}</Stack>
        )}
      </ScrollView>
    </View>
  );
}
