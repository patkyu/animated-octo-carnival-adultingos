import { useAppStore } from '@/state/appStore';

/**
 * English is the complete source language. Filipino covers navigation,
 * onboarding and common actions for now and falls back to English elsewhere;
 * it needs review by a native speaker before it is advertised (see
 * docs/architecture/localization.md).
 */
const en = {
  'tab.home': 'Home',
  'tab.tasks': 'Tasks',
  'tab.guides': 'Guides',
  'tab.assistant': 'Ask Adu',
  'tab.profile': 'Profile',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.done': 'Done',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.skip': 'Skip',
  'common.retry': 'Try again',
  'common.add': 'Add',
  'common.close': 'Close',
  'common.continue': 'Continue',
  'common.markDone': 'Mark done',
  'common.reschedule': 'Reschedule',
  'greeting.morning': 'Good morning',
  'greeting.afternoon': 'Good afternoon',
  'greeting.evening': 'Good evening',
  'onb.1.title': 'Adulting, made simpler.',
  'onb.1.body': 'Bills, documents, responsibilities and deadlines — all in one calm place.',
  'onb.2.title': 'Know your next step.',
  'onb.2.body': 'Practical guides and checklists for everyday adult paperwork, with links to official sources.',
  'onb.3.title': 'Meet your adulting buddy.',
  'onb.3.body': 'Adu and friends keep you company, cheer you on and remind you before things are due.',
  'onb.getStarted': 'Get started',
  'home.today': "Today's priorities",
  'home.upcoming': 'Next 7 days',
  'home.areas': 'Life admin',
  'home.quick': 'Quick actions',
  'home.progress': 'This month',
} as const;

export type TKey = keyof typeof en;

const fil: Partial<Record<TKey, string>> = {
  'tab.home': 'Home',
  'tab.tasks': 'Mga Gawain',
  'tab.guides': 'Gabay',
  'tab.assistant': 'Tanong kay Adu',
  'tab.profile': 'Profile',
  'common.save': 'I-save',
  'common.cancel': 'Kanselahin',
  'common.delete': 'Burahin',
  'common.edit': 'I-edit',
  'common.done': 'Tapos na',
  'common.next': 'Susunod',
  'common.back': 'Bumalik',
  'common.skip': 'Laktawan',
  'common.retry': 'Subukan ulit',
  'common.add': 'Magdagdag',
  'common.close': 'Isara',
  'common.continue': 'Magpatuloy',
  'common.markDone': 'Markahang tapos',
  'common.reschedule': 'Ilipat ang petsa',
  'greeting.morning': 'Magandang umaga',
  'greeting.afternoon': 'Magandang hapon',
  'greeting.evening': 'Magandang gabi',
  'onb.1.title': 'Mas pinadaling adulting.',
  'onb.1.body': 'Bayarin, dokumento, responsibilidad at deadline — nasa iisang lugar.',
  'onb.2.title': 'Alamin ang susunod na hakbang.',
  'onb.2.body': 'Mga praktikal na gabay at checklist, may link sa opisyal na sources.',
  'onb.3.title': 'Kilalanin ang iyong adulting buddy.',
  'onb.3.body': 'Kasama mo si Adu at ang mga kaibigan niya para paalalahanan ka bago ang deadline.',
  'onb.getStarted': 'Magsimula',
};

export function translate(lang: 'en' | 'fil', key: TKey): string {
  return (lang === 'fil' ? fil[key] : undefined) ?? en[key];
}

export function useT() {
  const lang = useAppStore((s) => s.profile.language);
  return (key: TKey) => translate(lang, key);
}
