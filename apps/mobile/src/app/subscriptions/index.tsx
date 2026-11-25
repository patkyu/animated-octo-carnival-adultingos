import { router } from 'expo-router';
import { SUBSCRIPTION_CATEGORIES, daysBetween, formatMinor, labelFor, relativeDayPhrase, todayInZone } from '@adultingos/shared';
import { listSubscriptions } from '@/db/finance';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Card, Row, Stack, StatusBadge } from '@/ui/primitives';
import { Fab, Screen } from '@/ui/layout';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';

export default function Subscriptions() {
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const { data, isLoading, error, refetch } = useData(['subscriptions'], listSubscriptions);
  const active = (data ?? []).filter((s) => s.status === 'active');
  const canceled = (data ?? []).filter((s) => s.status === 'canceled');
  const php = active.filter((s) => s.currency === 'PHP');
  const monthly = php.reduce((n, s) => n + s.monthlyMinor, 0);
  const annual = php.reduce((n, s) => n + s.annualMinor, 0);
  const trials = active.filter((s) => s.trialEndsOn && s.trialEndsOn >= today);

  const SubCard = ({ s }: { s: (typeof active)[number] }) => (
    <Card onPress={() => router.push(`/subscription/${s.obligation.id}`)} accessibilityLabel={`${s.obligation.title}, ${formatMinor(s.amountMinor, s.currency)}`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Stack gap={4} style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{s.obligation.title}</AppText>
          <Row wrap gap={8}>
            <AppText variant="caption" color="textMuted">{labelFor(SUBSCRIPTION_CATEGORIES, s.category)}</AppText>
            {s.status === 'canceled' ? <StatusBadge label="Canceled" tone="neutral" icon="x-circle" /> : s.nextRenewal ? <StatusBadge label={`Renews ${relativeDayPhrase(s.nextRenewal, today)}`} tone={daysBetween(today, s.nextRenewal) <= 3 ? 'warning' : 'neutral'} icon="repeat" /> : null}
            {s.trialEndsOn && s.trialEndsOn >= today && s.status === 'active' ? <StatusBadge label={`Trial ends ${relativeDayPhrase(s.trialEndsOn, today)}`} tone="info" icon="gift" /> : null}
          </Row>
        </Stack>
        <Stack gap={0} style={{ alignItems: 'flex-end' }}>
          <AppText variant="bodyStrong">{formatMinor(s.amountMinor, s.currency)}</AppText>
          <AppText variant="caption" color="textMuted">≈ {formatMinor(s.monthlyMinor, s.currency, { compact: true })}/mo</AppText>
        </Stack>
      </Row>
    </Card>
  );

  return (
    <>
      <Screen title="Subscriptions" largeTitle>
        {isLoading ? <LoadingList /> : error ? <ErrorState onRetry={() => refetch()} /> : !data?.length ? (
          <EmptyState mascot="piso" title="No subscriptions yet" body="Add streaming, apps, gym or mobile plans to see what they cost each month and year." actionLabel="Add a subscription" onAction={() => router.push('/subscription/new')} />
        ) : (
          <>
            <Row gap={12}>
              <Card tone="catCalendar" style={{ flex: 1 }}><Stack gap={2}><AppText variant="caption" color="onCategory">Per month</AppText><AppText variant="number" color="onCategory">{formatMinor(monthly, 'PHP')}</AppText></Stack></Card>
              <Card tone="catCalendar" style={{ flex: 1 }}><Stack gap={2}><AppText variant="caption" color="onCategory">Per year</AppText><AppText variant="number" color="onCategory">{formatMinor(annual, 'PHP')}</AppText></Stack></Card>
            </Row>
            <AppText variant="caption" color="textMuted">Equivalents of active PHP subscriptions, based on the prices you entered.</AppText>
            {trials.length ? <><AppText variant="section">Free trials ending</AppText><Stack gap={8}>{trials.map((s) => <SubCard key={s.id} s={s} />)}</Stack></> : null}
            <AppText variant="section">Active · {active.length}</AppText>
            <Stack gap={8}>{active.map((s) => <SubCard key={s.id} s={s} />)}</Stack>
            {canceled.length ? <><AppText variant="section">Canceled · {canceled.length}</AppText><Stack gap={8}>{canceled.map((s) => <SubCard key={s.id} s={s} />)}</Stack></> : null}
          </>
        )}
      </Screen>
      <Fab label="Add a subscription" onPress={() => router.push('/subscription/new')} />
    </>
  );
}
