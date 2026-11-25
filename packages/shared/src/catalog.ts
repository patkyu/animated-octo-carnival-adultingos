/**
 * Static catalogs: task categories, document templates, bill and subscription
 * categories. Document templates deliberately avoid asserting validity periods
 * or fees — those vary and must come from official sources. `expiry` is only a
 * form default the user can change.
 */

export type MascotId = 'adu' | 'doki' | 'piso' | 'tiki' | 'homi' | 'sunny';

export const TASK_CATEGORIES = [
  { key: 'government', label: 'Government', icon: 'landmark', mascot: 'doki' },
  { key: 'documents', label: 'Documents', icon: 'file-text', mascot: 'doki' },
  { key: 'finance', label: 'Finance', icon: 'wallet', mascot: 'piso' },
  { key: 'bills', label: 'Bills', icon: 'receipt', mascot: 'piso' },
  { key: 'work', label: 'Work', icon: 'briefcase', mascot: 'tiki' },
  { key: 'education', label: 'Education', icon: 'graduation-cap', mascot: 'tiki' },
  { key: 'household', label: 'Household', icon: 'home', mascot: 'homi' },
  { key: 'personal', label: 'Personal', icon: 'user', mascot: 'adu' },
  { key: 'wellness', label: 'Wellness', icon: 'sun', mascot: 'sunny' },
] as const satisfies ReadonlyArray<{ key: string; label: string; icon: string; mascot: MascotId }>;

export type BuiltInCategory = (typeof TASK_CATEGORIES)[number]['key'];
/** Built-in keys, or `custom:<uuid>` for a user category. */
export type CategoryKey = BuiltInCategory | `custom:${string}`;

export function categoryLabel(key: string, custom: ReadonlyArray<{ id: string; name: string }> = []): string {
  const builtIn = TASK_CATEGORIES.find((c) => c.key === key);
  if (builtIn) return builtIn.label;
  if (key.startsWith('custom:')) {
    const id = key.slice(7);
    return custom.find((c) => c.id === id)?.name ?? 'Custom';
  }
  return 'Other';
}

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export type ExpiryDefault = 'usually' | 'varies' | 'no';

export interface DocumentTemplate {
  key: string;
  name: string;
  issuer: string;
  expiry: ExpiryDefault;
  /** Official website homepage. Specific procedure links belong in verified guides. */
  officialUrl?: string;
  guideSlug?: string;
}

export const DOCUMENT_TEMPLATES: readonly DocumentTemplate[] = [
  { key: 'passport', name: 'Philippine passport', issuer: 'Department of Foreign Affairs (DFA)', expiry: 'usually', officialUrl: 'https://consular.dfa.gov.ph', guideSlug: 'dfa-passport' },
  { key: 'national_id', name: 'National ID (PhilSys)', issuer: 'Philippine Statistics Authority (PSA)', expiry: 'varies', officialUrl: 'https://philsys.gov.ph', guideSlug: 'national-id' },
  { key: 'drivers_license', name: "Driver's license", issuer: 'Land Transportation Office (LTO)', expiry: 'usually', officialUrl: 'https://lto.gov.ph', guideSlug: 'lto-drivers-license' },
  { key: 'nbi_clearance', name: 'NBI clearance', issuer: 'National Bureau of Investigation (NBI)', expiry: 'usually', officialUrl: 'https://clearance.nbi.gov.ph', guideSlug: 'nbi-clearance' },
  { key: 'police_clearance', name: 'Police clearance', issuer: 'Philippine National Police (PNP)', expiry: 'usually' },
  { key: 'barangay_clearance', name: 'Barangay clearance', issuer: 'Your barangay hall', expiry: 'usually' },
  { key: 'sss', name: 'SSS records', issuer: 'Social Security System (SSS)', expiry: 'no', officialUrl: 'https://www.sss.gov.ph', guideSlug: 'sss-membership' },
  { key: 'philhealth', name: 'PhilHealth records', issuer: 'Philippine Health Insurance Corporation', expiry: 'no', officialUrl: 'https://www.philhealth.gov.ph', guideSlug: 'philhealth-membership' },
  { key: 'pagibig', name: 'Pag-IBIG records', issuer: 'Home Development Mutual Fund (Pag-IBIG Fund)', expiry: 'no', officialUrl: 'https://www.pagibigfund.gov.ph', guideSlug: 'pagibig-membership' },
  { key: 'bir_tin', name: 'BIR registration / TIN', issuer: 'Bureau of Internal Revenue (BIR)', expiry: 'no', officialUrl: 'https://www.bir.gov.ph', guideSlug: 'bir-tin' },
  { key: 'prc_id', name: 'PRC identification card', issuer: 'Professional Regulation Commission (PRC)', expiry: 'usually', officialUrl: 'https://www.prc.gov.ph' },
  { key: 'psa_docs', name: 'PSA civil registry document', issuer: 'Philippine Statistics Authority (PSA)', expiry: 'no', officialUrl: 'https://psa.gov.ph', guideSlug: 'psa-civil-registry' },
  { key: 'employment_cert', name: 'Employment certificate', issuer: 'Employer', expiry: 'no' },
  { key: 'school_credentials', name: 'School credentials', issuer: 'School or university', expiry: 'no' },
  { key: 'custom', name: 'Custom document', issuer: '', expiry: 'varies' },
];

export function documentTemplate(key: string): DocumentTemplate {
  return DOCUMENT_TEMPLATES.find((t) => t.key === key) ?? DOCUMENT_TEMPLATES[DOCUMENT_TEMPLATES.length - 1]!;
}

export const BILL_CATEGORIES = [
  { key: 'electricity', label: 'Electricity' },
  { key: 'water', label: 'Water' },
  { key: 'internet', label: 'Internet' },
  { key: 'mobile', label: 'Mobile phone' },
  { key: 'rent', label: 'Rent' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'credit_card', label: 'Credit card' },
  { key: 'loan', label: 'Loan installment' },
  { key: 'tuition', label: 'Tuition' },
  { key: 'membership', label: 'Membership' },
  { key: 'gov_contribution', label: 'Government contribution' },
  { key: 'other', label: 'Other' },
] as const;
export type BillCategory = (typeof BILL_CATEGORIES)[number]['key'];

export const SUBSCRIPTION_CATEGORIES = [
  { key: 'streaming', label: 'Streaming' },
  { key: 'music', label: 'Music' },
  { key: 'software', label: 'Software' },
  { key: 'gym', label: 'Gym membership' },
  { key: 'cloud', label: 'Cloud storage' },
  { key: 'ai', label: 'AI service' },
  { key: 'mobile_plan', label: 'Mobile plan' },
  { key: 'other', label: 'Other' },
] as const;
export type SubscriptionCategory = (typeof SUBSCRIPTION_CATEGORIES)[number]['key'];

export function labelFor(list: ReadonlyArray<{ key: string; label: string }>, key: string): string {
  return list.find((x) => x.key === key)?.label ?? 'Other';
}

export const EMPLOYMENT_STATUSES = [
  'student', 'fresh_graduate', 'employed', 'freelancer', 'self_employed', 'looking_for_work', 'prefer_not_to_say',
] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const LIVING_ARRANGEMENTS = ['with_family', 'renting', 'own_place', 'dorm', 'abroad', 'prefer_not_to_say'] as const;
export type LivingArrangement = (typeof LIVING_ARRANGEMENTS)[number];

export const RESPONSIBILITY_AREAS = [
  'documents', 'bills', 'employment', 'finances', 'subscriptions', 'household', 'goals', 'routines', 'milestones',
] as const;
export type ResponsibilityArea = (typeof RESPONSIBILITY_AREAS)[number];

/**
 * Suggests which dashboard cards to show from optional onboarding answers.
 * Everything still exists for everyone; this only orders and highlights.
 */
export function suggestDashboardAreas(input: {
  employment?: EmploymentStatus | null;
  living?: LivingArrangement | null;
  selected?: readonly ResponsibilityArea[];
}): ResponsibilityArea[] {
  const set = new Set<ResponsibilityArea>(input.selected ?? []);
  set.add('documents');
  set.add('bills');
  switch (input.employment) {
    case 'student':
    case 'fresh_graduate':
    case 'looking_for_work':
      set.add('employment');
      break;
    case 'employed':
      set.add('employment');
      set.add('finances');
      break;
    case 'freelancer':
    case 'self_employed':
      set.add('finances');
      set.add('employment');
      break;
    default:
      break;
  }
  if (input.living === 'renting' || input.living === 'own_place') set.add('household');
  set.add('subscriptions');
  return RESPONSIBILITY_AREAS.filter((a) => set.has(a));
}
