import { router } from 'expo-router';
import { BILL_CATEGORIES, FINANCE_DISCLAIMER, formatMinor, formatMonthYear, labelFor, todayInZone } from '@adultingos/shared';
import { listBills, financeOverview } from '@/db/finance';
import { listItems } from '@/db/obligations';
import { toggleItem } from '@/features/actions';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/ThemeProvider';
import { View } from 'react-native';
import { AppText, Button, Card, Row, Stack } from '@/ui/primitives';
import { Fab, Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { TaskRow } from '@/ui/TaskRow';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { isEnabled } from '@/config/env';

export default function Bills() {
  const t = useTheme();
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const { data, isLoading, error, refetch } = useData(['bills-overview'], async () => {
    const [bills, overview, upcoming] = await Promise.all([listBills(), financeOverview(), listItems({ kinds: ['bill'], status: 'open' })]);
    const seen = new Set<string>();
    return { bills, overview, upcoming: upcoming.filter((u) => (seen.has(u.obligationId) ? false : (seen.add(u.obligationId), true))) };
  });
  const maxHist = Math.max(1, ...(data?.overview.history.map((h) => h.totalMinor) ?? [1]));

  return (
    <>
      <Screen title="Bills" largeTitle subtitle="Piso helps you stay ahead of due dates.">
        {isLoading ? <LoadingList /> : error ? <ErrorState mascot="piso" onRetry={() => refetch()} /> : !data?.bills.length ? (
          <EmptyState mascot="piso" title="No bills yet" body="Add rent, utilities or your phone plan. Piso will remind you before they're due." actionLabel="Add a bill" onAction={() => router.push('/bill/new')} />
        ) : (
          <>
            <Card tone="catFinance">
              <Row gap={12}>
                <Mascot id="piso" expression={data.overview.unpaidCount ? 'thoughtful' : 'celebrating'} size={72} />
                <Stack gap={2} style={{ flex: 1 }}>
                  <AppText variant="supportStrong" color="onCategory">Unpaid in the next 31 days</AppText>
                  <AppText variant="display" color="onCategory">{formatMinor(data.overview.unpaidTotalMinor, 'PHP')}</AppText>
                  <AppText variant="caption" color="onCategory">
                    {data.overview.unpaidCount} bill{data.overview.unpaidCount === 1 ? '' : 's'}{data.overview.unknownAmountCount ? ` · ${data.overview.unknownAmountCount} without an amount yet` : ''}
                  </AppText>
                </Stack>
              </Row>
            </Card>
            <Row gap={12}>
              <Card style={{ flex: 1 }}><Stack gap={2}><AppText variant="caption" color="textMuted">Paid this month</AppText><AppText variant="number">{formatMinor(data.overview.paidThisMonthMinor, 'PHP', { compact: true })}</AppText></Stack></Card>
              <Card style={{ flex: 1 }}><Stack gap={2}><AppText variant="caption" color="textMuted">Recurring per month</AppText><AppText variant="number">{formatMinor(data.overview.monthlyRecurringMinor, 'PHP', { compact: true })}</AppText></Stack></Card>
            </Row>

            <AppText variant="section">Upcoming</AppText>
            <Stack gap={8}>{data.upcoming.map((i) => <TaskRow key={i.id} item={i} onToggle={toggleItem} />)}</Stack>

            {data.overview.byCategory.length ? (
              <Card>
                <Stack gap={8}>
                  <AppText variant="section">Spending by category</AppText>
                  <AppText variant="caption" color="textMuted">Recorded payments, last 3 months</AppText>
                  {data.overview.byCategory.map((c) => (
                    <Row key={c.category} style={{ justifyContent: 'space-between' }}>
                      <AppText>{labelFor(BILL_CATEGORIES, c.category)}</AppText>
                      <AppText variant="bodyStrong">{formatMinor(c.totalMinor, 'PHP')}</AppText>
                    </Row>
                  ))}
                </Stack>
              </Card>
            ) : null}

            {data.overview.history.length ? (
              <Card>
                <Stack gap={8}>
                  <AppText variant="section">Monthly history</AppText>
                  {data.overview.history.map((h) => (
                    <Stack key={h.month} gap={4} accessible accessibilityLabel={`${formatMonthYear(`${h.month}-01`)}: ${formatMinor(h.totalMinor, 'PHP')} paid`}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <AppText variant="support">{formatMonthYear(`${h.month}-01`)}</AppText>
                        <AppText variant="supportStrong">{formatMinor(h.totalMinor, 'PHP')}</AppText>
                      </Row>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: t.c.surfaceSunken }}>
                        <View style={{ height: 8, borderRadius: 4, width: `${Math.max(4, (h.totalMinor / maxHist) * 100)}%`, backgroundColor: t.c.primary }} />
                      </View>
                    </Stack>
                  ))}
                </Stack>
              </Card>
            ) : null}

            <AppText variant="section">All bills</AppText>
            <Stack gap={8}>
              {data.bills.map((b) => (
                <Card key={b.id} onPress={() => router.push(`/bill/${b.obligation.id}`)} accessibilityLabel={b.obligation.title}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Stack gap={0} style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{b.obligation.title}</AppText>
                      <AppText variant="caption" color="textMuted">{labelFor(BILL_CATEGORIES, b.category)}{b.current?.status === 'open' ? ` · next ${b.current.dueDate}` : ''}</AppText>
                    </Stack>
                    <AppText variant="bodyStrong">{b.amountMinor !== null ? formatMinor(b.amountMinor, b.currency) : 'Varies'}</AppText>
                  </Row>
                </Card>
              ))}
            </Stack>
            {isEnabled('subscriptions') ? <Button label="Subscriptions" icon="repeat" variant="secondary" onPress={() => router.push('/subscriptions')} /> : null}
          </>
        )}
        <AppText variant="caption" color="textMuted">{FINANCE_DISCLAIMER} {data?.bills.some((b) => b.currency !== 'PHP') ? 'Totals include PHP bills only.' : ''}</AppText>
      </Screen>
      <Fab label="Add a bill" onPress={() => router.push('/bill/new')} />
    </>
  );
}
