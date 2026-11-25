import { addDays, makeRule, todayInZone, type TaskInput } from '@adultingos/shared';
import { kvGet, kvSet } from './database';
import { createTask, completeOccurrence, listItems } from './obligations';
import { createBill, createSubscription, markBillPaid } from './finance';
import { createDocument } from './documents';
import { updateAppState, updateProfile, updateNotificationPrefs } from './settings';
import { IS_DEMO } from '@/config/env';

/**
 * SYNTHETIC demo data for the separate demo environment only (APP_ENV=demo or
 * ?demo=1 on web, which also uses a separate database file). All names and
 * amounts are invented. Never runs in development or production databases.
 */
export async function seedDemoIfNeeded(): Promise<void> {
  if (!IS_DEMO) return;
  if (await kvGet('demo_seeded', false)) return;
  const tz = 'Asia/Manila';
  const today = todayInZone(tz);
  const d = (n: number) => addDays(today, n);
  await updateProfile({ preferredName: 'Alex', employmentStatus: 'employed', livingArrangement: 'renting', responsibilityAreas: ['documents', 'bills', 'employment', 'subscriptions'] });
  await updateNotificationPrefs({ permissionAsked: true });

  const task = (title: string, category: string, due: string, extra: Partial<TaskInput> = {}): TaskInput => ({
    title, category, priority: 'medium', dueDate: due, dueTime: null, recurrence: { freq: 'none', interval: 1 }, reminderOffsets: [1, 0],
    tags: [], notes: '', description: '', checklist: [], ...extra,
  });
  await createTask(task('Submit pre-employment requirements', 'work', d(2), { priority: 'high', checklist: [{ title: 'Ask HR for the list', done: true }, { title: 'Prepare photocopies', done: false }, { title: 'Submit to HR', done: false }] }));
  await createTask(task('Book passport renewal appointment', 'government', d(5), { priority: 'high' }));
  await createTask(task('Water the plants', 'household', d(0), { recurrence: makeRule('weekly', d(0)) }));
  await createTask(task('Review monthly budget', 'finance', d(3), { recurrence: makeRule('monthly', d(3)) }));
  await createTask(task('Schedule annual check-up', 'wellness', d(12)));
  await createTask(task('Update resume', 'personal', d(-1)));
  const done1 = await createTask(task('Organize important documents folder', 'documents', d(-3)));
  await completeOccurrence(done1.occurrenceId, d(-3));
  const done2 = await createTask(task('Renew gym membership card', 'personal', d(-2)));
  await completeOccurrence(done2.occurrenceId, d(-2));

  await createDocument({ templateKey: 'passport', name: 'Philippine passport', issuer: 'Department of Foreign Affairs (DFA)', stage: 'obtained', issueDate: addDays(today, -3600), expiryDate: d(48), referenceLast4: '4821', officialUrl: 'https://consular.dfa.gov.ph', reminderOffsets: [90, 30, 7], notes: '' });
  await createDocument({ templateKey: 'drivers_license', name: "Driver's license", issuer: 'Land Transportation Office (LTO)', stage: 'obtained', issueDate: addDays(today, -1400), expiryDate: d(420), referenceLast4: '0937', officialUrl: '', reminderOffsets: [60, 30, 7], notes: '' });
  await createDocument({ templateKey: 'nbi_clearance', name: 'NBI clearance', issuer: 'National Bureau of Investigation (NBI)', stage: 'obtained', issueDate: addDays(today, -370), expiryDate: d(-5), referenceLast4: '', officialUrl: '', reminderOffsets: [30, 7], notes: '' });
  await createDocument({ templateKey: 'sss', name: 'SSS records', issuer: 'Social Security System (SSS)', stage: 'obtained', issueDate: null, expiryDate: null, referenceLast4: '5512', officialUrl: '', reminderOffsets: [], notes: '' });
  await createDocument({ templateKey: 'bir_tin', name: 'BIR registration / TIN', issuer: 'Bureau of Internal Revenue (BIR)', stage: 'in_progress', issueDate: null, expiryDate: null, referenceLast4: '', officialUrl: '', reminderOffsets: [], notes: '' });

  const elec = await createBill({ name: 'Electricity', provider: 'City Power Co.', category: 'electricity', amountMinor: 245050, variableAmount: true, currency: 'PHP', dueDate: d(4), recurrence: makeRule('monthly', d(4)), reminderOffsets: [3, 0], notes: '' });
  await createBill({ name: 'Fiber internet', provider: 'HomeNet', category: 'internet', amountMinor: 169900, variableAmount: false, currency: 'PHP', dueDate: d(9), recurrence: makeRule('monthly', d(9)), reminderOffsets: [3, 0], notes: '' });
  await createBill({ name: 'Apartment rent', provider: 'Landlord', category: 'rent', amountMinor: 1200000, variableAmount: false, currency: 'PHP', dueDate: d(14), recurrence: makeRule('monthly', d(14)), reminderOffsets: [5, 1], notes: '' });
  await createBill({ name: 'Mobile postpaid', provider: 'TelcoOne', category: 'mobile', amountMinor: 99900, variableAmount: false, currency: 'PHP', dueDate: d(1), recurrence: makeRule('monthly', d(1)), reminderOffsets: [2, 0], notes: '' });
  // One paid electricity cycle for history.
  const elecItems = await listItems({ kinds: ['bill'], status: 'open' });
  const firstElec = elecItems.find((i) => i.obligationId === elec);
  if (firstElec) {
    await markBillPaid(firstElec.id, d(0), 231275);
  }

  await createSubscription({ name: 'Music streaming', category: 'music', amountMinor: 14900, currency: 'PHP', nextRenewal: d(6), recurrence: makeRule('monthly', d(6)), trialEndsOn: null, reminderOffsets: [3], notes: '' });
  await createSubscription({ name: 'Cloud storage', category: 'cloud', amountMinor: 79900, currency: 'PHP', nextRenewal: d(40), recurrence: makeRule('yearly', d(40)), trialEndsOn: null, reminderOffsets: [7], notes: '' });
  await createSubscription({ name: 'Video streaming', category: 'streaming', amountMinor: 54900, currency: 'PHP', nextRenewal: d(11), recurrence: makeRule('monthly', d(11)), trialEndsOn: d(4), reminderOffsets: [3], notes: '' });

  await updateAppState({ onboardingComplete: true, introSeen: true, mode: 'guest' });
  await kvSet('demo_seeded', true);
}
