import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View , ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDateLong, formatMinor, greetingForMinutes, minutesOfDayInZone, relativeDayLabel, relativeDayPhrase, weekdayShort, expiryCountdown, type LocalDate } from '@adultingos/shared';
import { MASCOTS } from '@adultingos/brand';
import { loadHome, type HomeData } from '@/features/home';
import { toggleItem } from '@/features/actions';
import { useT } from '@/i18n';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { useSyncStore } from '@/sync/engine';
import { useTheme } from '@/theme/ThemeProvider';
import type { ColorTokens } from '@/theme/tokens';
import { AppText, Button, Card, Icon, IconButton, Row, SectionHeader, Stack, StatusBadge, type IconName } from '@/ui/primitives';
import { DemoBadge, Fab, ProgressRing } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { TaskRow } from '@/ui/TaskRow';
import { RescheduleSheet } from '@/ui/RescheduleSheet';
import { EmptyState, ErrorState, LoadingList, OfflineBanner } from '@/ui/states';
import { IS_DEMO } from '@/config/env';

function Header() {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const profile = useAppStore((s) => s.profile);
  const greet = greetingForMinutes(minutesOfDayInZone(profile.timezone));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: profile.timezone }).format(new Date());
  return (
    <Row style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: t.c.background }} gap={8}>
      <Stack gap={2} style={{ flex: 1 }}>
        <AppText variant="title" numberOfLines={2}>
          {tr(`greeting.${greet}`)}{profile.preferredName ? `, ${profile.preferredName}` : ''}!
        </AppText>
        <AppText color="textMuted">{formatDateLong(today)}</AppText>
      </Stack>
      {IS_DEMO ? <DemoBadge /> : null}
      <IconButton icon="bell" label="Upcoming reminders" onPress={() => router.push('/notifications')} />
      <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push('/profile')} style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: MASCOTS[profile.avatar].surface, alignItems: 'center', justifyContent: 'center' }}>
        <Mascot id={profile.avatar} size={40} animation="none" force />
      </Pressable>
    </Row>
  );
}

function CompanionCard({ data }: { data: HomeData }) {
  const mascot = useAppStore((s) => s.profile.favoriteMascot);
  const exp = data.companion.mood === 'all_clear' ? 'happy' : data.companion.mood === 'overdue' ? 'concern' : data.companion.mood === 'empty' ? 'happy' : 'thoughtful';
  return (
    <Card tone="catPositive">
      <Row gap={12}>
        <Mascot id={mascot} expression={exp} pose={data.companion.mood === 'empty' ? 'wave' : 'idle'} size={84} />
        <Stack gap={4} style={{ flex: 1 }}>
          <AppText variant="supportStrong" color="onCategory">{MASCOTS[mascot].name} says</AppText>
          <AppText variant="bodyStrong" color="onCategory" accessibilityLiveRegion="polite">{data.companion.text}</AppText>
          {data.priorities.length === 0 && data.completedToday.length > 0 ? (
            <AppText variant="support" color="onCategory">{data.completedToday.length} done today. {MASCOTS[mascot].phrase}</AppText>
          ) : null}
        </Stack>
      </Row>
    </Card>
  );
}

function Bento({ title, value, detail, icon, tone, onPress, attention }: { title: string; value: string; detail: string; icon: IconName; tone: keyof ColorTokens; onPress: () => void; attention?: string }) {
  return (
    <Card tone={tone} onPress={onPress} style={{ flexBasis: '47%', flexGrow: 1, minHeight: 132 }} accessibilityLabel={`${title}: ${value}. ${detail}${attention ? `. ${attention}` : ''}`}>
      <Stack gap={6}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Icon name={icon} color="onCategory" />
          <Icon name="arrow-up-right" size={16} color="onCategory" />
        </Row>
        <AppText variant="supportStrong" color="onCategory">{title}</AppText>
        <AppText variant="number" color="onCategory">{value}</AppText>
        <AppText variant="caption" color="onCategory" numberOfLines={2}>{detail}</AppText>
        {attention ? <StatusBadge label={attention} tone="warning" /> : null}
      </Stack>
    </Card>
  );
}

function QuickAction({ icon, label, to }: { icon: IconName; label: string; to: string }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(to as never)} style={({ pressed }) => ({ width: 88, alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: t.c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.c.border }}>
        <Icon name={icon} color="primary" size={22} />
      </View>
      <AppText variant="caption" align="center" numberOfLines={2}>{label}</AppText>
    </Pressable>
  );
}

export default function Home() {
  const t = useTheme();
  const tr = useT();
  const { data, isLoading, error, refetch } = useData(['home'], loadHome);
  const sync = useSyncStore();
  const [resched, setResched] = useState<{ id: string; title: string } | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: t.c.background }}>
      <Header />
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center' as const, padding: 16, paddingBottom: 120, gap: 16 }}>
        <OfflineBanner />
        {sync.status === 'error' ? <StatusBadge label="Sync paused — changes are safe on this device" tone="warning" icon="cloud-off" /> : null}
        {isLoading ? <LoadingList label="Loading your dashboard" /> : error || !data ? <ErrorState onRetry={() => refetch()} /> : (
          <>
            <CompanionCard data={data} />
            {!data.hasAnyItems ? (
              <EmptyState
                mascot="adu"
                title="Your dashboard is ready"
                body="Add a task, bill or document and it will show up here with reminders before it's due."
                actionLabel="Add your first item"
                onAction={() => router.push('/add')}
                secondaryLabel="Browse guides"
                onSecondary={() => router.push('/guides')}
              />
            ) : (
              <>
                <SectionHeader title={tr('home.today')} action="All tasks" onAction={() => router.push('/tasks')} />
                {data.priorities.length === 0 ? (
                  <Card><Row gap={10}><Icon name="check-circle" color="success" /><AppText>Nothing overdue or due today.</AppText></Row></Card>
                ) : (
                  <Stack gap={8}>
                    {data.priorities.map((i) => (
                      <View key={i.id} style={{ gap: 4 }}>
                        <TaskRow item={i} onToggle={toggleItem} />
                        {i.dueDate < data.today ? (
                          <Button label="Reschedule" icon="calendar" variant="ghost" compact style={{ alignSelf: 'flex-end' }} onPress={() => setResched({ id: i.id, title: i.title })} />
                        ) : null}
                      </View>
                    ))}
                  </Stack>
                )}
                {data.completedToday.length ? (
                  <AppText variant="support" color="textMuted">Completed today: {data.completedToday.map((i) => i.title).join(', ')}</AppText>
                ) : null}

                <SectionHeader title={tr('home.upcoming')} action="Calendar" onAction={() => router.push('/calendar')} />
                {data.timeline.length === 0 ? (
                  <AppText color="textMuted">Nothing else in the next 7 days.</AppText>
                ) : (
                  <Card>
                    <Stack gap={10}>
                      {data.timeline.slice(0, 8).map((e) => (
                        <Pressable
                          key={`${e.kind}-${e.item?.id ?? e.doc?.id}`}
                          accessibilityRole="button"
                          onPress={() => router.push(e.doc ? `/document/${e.doc.id}` : e.item!.kind === 'bill' ? `/bill/${e.item!.obligationId}` : e.item!.kind === 'subscription' ? `/subscription/${e.item!.obligationId}` : `/task/${e.item!.obligationId}`)}
                          style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 48 }}
                        >
                          <Stack gap={0} style={{ width: 44, alignItems: 'center' }}>
                            <AppText variant="caption" color="textMuted">{weekdayShort(e.date)}</AppText>
                            <AppText variant="bodyStrong">{Number(e.date.slice(8))}</AppText>
                          </Stack>
                          <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: e.doc ? t.c.catDocuments : e.item!.kind === 'bill' ? t.c.catFinance : t.c.catCalendar }} />
                          <Stack gap={0} style={{ flex: 1 }}>
                            <AppText variant="bodyStrong" numberOfLines={1}>{e.doc ? `${e.doc.name} expires` : e.item!.title}</AppText>
                            <AppText variant="caption" color="textMuted">{relativeDayLabel(e.date as LocalDate, data.today)}{e.item?.kind === 'bill' ? ' · Bill' : e.doc ? ' · Document' : ''}</AppText>
                          </Stack>
                          <Icon name="chevron-right" color="textMuted" size={18} />
                        </Pressable>
                      ))}
                    </Stack>
                  </Card>
                )}
              </>
            )}

            <SectionHeader title={tr('home.areas')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Bento title="Documents" icon="file-text" tone="catDocuments" onPress={() => router.push('/documents')}
                value={`${data.documents.tracked} tracked`}
                detail={data.documents.next ? `${data.documents.next.name}: ${expiryCountdown(data.documents.next.expiryDate, data.today).toLowerCase()}` : 'Add IDs and clearances to get renewal reminders'}
                attention={data.documents.attention ? `${data.documents.attention} need attention` : undefined} />
              <Bento title="Bills" icon="credit-card" tone="catFinance" onPress={() => router.push('/bills')}
                value={data.finance.unpaidCount ? formatMinor(data.finance.unpaidTotalMinor, 'PHP', { compact: true }) : 'All clear'}
                detail={data.finance.unpaidCount ? `${data.finance.unpaidCount} unpaid in the next 31 days${data.finance.unknownAmountCount ? ` (${data.finance.unknownAmountCount} without amount)` : ''}` : 'No unpaid bills coming up'} />
              <Bento title="Subscriptions" icon="repeat" tone="catCalendar" onPress={() => router.push('/subscriptions')}
                value={data.subscriptions.active ? `${formatMinor(data.subscriptions.monthlyMinor, 'PHP', { compact: true })}/mo` : 'None yet'}
                detail={data.subscriptions.active ? `${data.subscriptions.active} active${data.subscriptions.nextRenewal ? ` · next ${relativeDayPhrase(data.subscriptions.nextRenewal, data.today)}` : ''}` : 'Track streaming, apps and plans'} />
              <Bento title="Tasks" icon="briefcase" tone="catHome" onPress={() => router.push('/tasks')}
                value={`${data.openTasksWeek} open`}
                detail="Tasks due within the next 7 days, including overdue" />
            </View>

            {data.monthProgress ? (
              <Card>
                <Row gap={16}>
                  <ProgressRing done={data.monthProgress.done} total={data.monthProgress.total} label={`${data.monthProgress.done} of ${data.monthProgress.total} things due this month are done`} />
                  <Stack gap={4} style={{ flex: 1 }}>
                    <AppText variant="section">{tr('home.progress')}</AppText>
                    <AppText color="textMuted">{data.monthProgress.done} of {data.monthProgress.total} things due this month are done.</AppText>
                    <Button label="Milestones" variant="ghost" compact style={{ alignSelf: 'flex-start' }} onPress={() => router.push('/achievements')} />
                  </Stack>
                </Row>
              </Card>
            ) : null}

            <SectionHeader title={tr('home.quick')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              <QuickAction icon="check-square" label="Add task" to="/task/new" />
              <QuickAction icon="credit-card" label="Add bill" to="/bill/new" />
              <QuickAction icon="file-text" label="Track document" to="/document/new" />
              <QuickAction icon="bell" label="Create reminder" to="/task/new?reminder=1" />
              <QuickAction icon="book-open" label="Browse guides" to="/guides" />
              <QuickAction icon="message-circle" label="Ask Adu" to="/assistant" />
            </View>
          </>
        )}
      </ScrollView>
      <Fab label="Add something new" onPress={() => router.push('/add')} />
      <RescheduleSheet visible={!!resched} occurrenceId={resched?.id ?? null} title={resched?.title ?? ''} onClose={() => setResched(null)} />
    </View>
  );
}
