/**
 * Initial guide drafts.
 *
 * STATUS: every government guide here is a DRAFT awaiting editorial
 * verification. They were written without access to the official sites
 * (blocked from the build environment), so they deliberately:
 *   - avoid fees, processing times, form versions and document counts;
 *   - phrase requirements as "commonly asked for" and defer to the agency;
 *   - list official homepages with verifiedOn = null.
 * Production builds only show guides that a reviewer has published through
 * the admin portal (which requires a verified official source).
 * See docs/content/guide-verification.md.
 */

export type GuideCategory = 'government' | 'employment' | 'independent_living' | 'freelancing' | 'life_events';
export type GuideStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'needs_update' | 'archived';

export interface GuideSource {
  title: string;
  url: string;
  publisher: string;
  isOfficial: boolean;
  verifiedOn: string | null;
}

export interface GuideStep {
  title: string;
  body: string;
  optional?: boolean;
  offsetDays?: number;
}

export interface Guide {
  slug: string;
  title: string;
  category: GuideCategory;
  agency?: string;
  jurisdiction: 'PH';
  audience: string;
  summary: string;
  eligibilityCaveats: string;
  requirements: string[];
  steps: GuideStep[];
  feesText: string | null;
  processingTimeText: string | null;
  helpfulNotes: string;
  sources: GuideSource[];
  related: string[];
  status: GuideStatus;
  contentVersion: number;
  lastVerifiedOn: string | null;
}

const UNVERIFIED_CAVEAT =
  'Requirements differ by situation and change over time. Treat this as a planning checklist and confirm every requirement on the official website or with the agency before you go.';

const src = (title: string, url: string, publisher: string, isOfficial = true): GuideSource => ({
  title, url, publisher, isOfficial, verifiedOn: null,
});

const base = { jurisdiction: 'PH' as const, feesText: null, processingTimeText: null, status: 'in_review' as GuideStatus, contentVersion: 0, lastVerifiedOn: null };

export const GUIDE_PACK: readonly Guide[] = [
  {
    ...base,
    slug: 'sss-membership',
    title: 'Getting started with SSS',
    category: 'government',
    agency: 'Social Security System (SSS)',
    audience: 'First-time employees, freelancers and self-employed people who need an SSS number.',
    summary: 'The SSS runs social insurance for private-sector workers. Most people need an SS number when they start working, and employers commonly ask for it during onboarding.',
    eligibilityCaveats: UNVERIFIED_CAVEAT,
    requirements: [
      'A valid ID or supporting document (check the SSS list of accepted documents)',
      'Your basic personal details',
      'A working e-mail address if you register online',
    ],
    steps: [
      { title: 'Check if you already have an SS number', body: 'If you had a previous job, you may already have one. Avoid registering twice — ask your previous employer or SSS if unsure.' },
      { title: 'Open the official SSS website', body: 'Use the official site linked below to find the current registration process for your membership type (employee, self-employed, voluntary, OFW).', offsetDays: 1 },
      { title: 'Prepare the documents SSS asks for', body: 'Gather the documents listed on the official page for your situation.', offsetDays: 3 },
      { title: 'Register and keep your SS number safe', body: 'Note only the last 4 digits in AdultingOS. Keep the full number in a secure place.', offsetDays: 7 },
      { title: 'Give your SS number to your employer', body: 'If you are employed, your employer handles contributions once they have your number.', optional: true, offsetDays: 10 },
    ],
    helpfulNotes: 'Only use the official SSS website and channels. SSS does not ask for your password through text messages.',
    sources: [src('Social Security System — official website', 'https://www.sss.gov.ph', 'Social Security System')],
    related: ['first-job-requirements', 'philhealth-membership', 'pagibig-membership'],
  },
  {
    ...base,
    slug: 'philhealth-membership',
    title: 'Getting started with PhilHealth',
    category: 'government',
    agency: 'Philippine Health Insurance Corporation (PhilHealth)',
    audience: 'Anyone who needs a PhilHealth Identification Number (PIN), often first-time employees.',
    summary: 'PhilHealth manages the national health insurance program. Employers commonly ask for your PhilHealth number when you start a job.',
    eligibilityCaveats: UNVERIFIED_CAVEAT,
    requirements: ['A valid ID or supporting document accepted by PhilHealth', 'Your basic personal details'],
    steps: [
      { title: 'Check whether you already have a PIN', body: 'You may already be registered, for example as a dependent or from an earlier job.' },
      { title: 'Open the official PhilHealth website', body: 'Find the current member registration process for your membership category.', offsetDays: 1 },
      { title: 'Prepare and submit your registration', body: 'Follow the steps on the official page, online or at a PhilHealth office.', offsetDays: 5 },
      { title: 'Share your PIN with your employer', body: 'If employed, your employer needs it for contributions.', optional: true, offsetDays: 10 },
    ],
    helpfulNotes: 'Store only the last 4 digits of your PIN in AdultingOS.',
    sources: [src('PhilHealth — official website', 'https://www.philhealth.gov.ph', 'Philippine Health Insurance Corporation')],
    related: ['sss-membership', 'pagibig-membership', 'first-job-requirements'],
  },
  {
    ...base,
    slug: 'pagibig-membership',
    title: 'Getting started with Pag-IBIG Fund',
    category: 'government',
    agency: 'Home Development Mutual Fund (Pag-IBIG Fund)',
    audience: 'Workers who need a Pag-IBIG MID number.',
    summary: 'Pag-IBIG Fund runs a savings and housing loan program. Employers commonly ask for your Pag-IBIG MID number during onboarding.',
    eligibilityCaveats: UNVERIFIED_CAVEAT,
    requirements: ['A valid ID or supporting document accepted by Pag-IBIG Fund', 'Your basic personal details'],
    steps: [
      { title: 'Check if you are already a member', body: 'Avoid duplicate registration if you had a previous employer.' },
      { title: 'Open the official Pag-IBIG Fund website', body: 'Find the current membership registration process.', offsetDays: 1 },
      { title: 'Register and save your MID number', body: 'Keep the full number somewhere secure; store only the last 4 digits here.', offsetDays: 5 },
    ],
    helpfulNotes: '',
    sources: [src('Pag-IBIG Fund — official website', 'https://www.pagibigfund.gov.ph', 'Home Development Mutual Fund')],
    related: ['sss-membership', 'philhealth-membership'],
  },
  {
    ...base,
    slug: 'bir-tin',
    title: 'Getting your TIN from the BIR',
    category: 'government',
    agency: 'Bureau of Internal Revenue (BIR)',
    audience: 'First-time employees, freelancers and self-employed people who need a Taxpayer Identification Number.',
    summary: 'A TIN identifies you for tax purposes. You should only ever have one TIN. The registration route differs for employees and for self-employed people or freelancers.',
    eligibilityCaveats: `${UNVERIFIED_CAVEAT} Having more than one TIN is not allowed — check first if you already have one.`,
    requirements: ['Documents listed by the BIR for your taxpayer type', 'Details from your employer, if you are employed'],
    steps: [
      { title: 'Check if you already have a TIN', body: 'Previous jobs or applications may have given you one. Do not register again.' },
      { title: 'Identify your taxpayer type', body: 'Employees and self-employed people or freelancers follow different registration routes. Confirm yours on the BIR website.', offsetDays: 1 },
      { title: 'Follow the official registration process', body: 'Use the official BIR website and online services linked there.', offsetDays: 5 },
      { title: 'Ask your employer about the process', body: 'If you are employed, your employer may handle part of the registration with you.', optional: true, offsetDays: 2 },
    ],
    helpfulNotes: 'Freelancers usually have ongoing filing obligations after registration — see the freelancer guides.',
    sources: [src('Bureau of Internal Revenue — official website', 'https://www.bir.gov.ph', 'Bureau of Internal Revenue')],
    related: ['freelancer-records', 'first-job-requirements'],
  },
  {
    ...base,
    slug: 'dfa-passport',
    title: 'Applying for or renewing a passport',
    category: 'government',
    agency: 'Department of Foreign Affairs (DFA)',
    audience: 'Filipino citizens applying for a first passport or renewing one.',
    summary: 'Passports are handled by the DFA, typically by online appointment. Plan ahead: renewals can take time, and some countries require several months of passport validity for travel.',
    eligibilityCaveats: UNVERIFIED_CAVEAT,
    requirements: ['Documents required by the DFA for your application type (first-time, renewal, minor)', 'Your appointment confirmation'],
    steps: [
      { title: 'Check your passport expiry date', body: 'Add it to the Document tracker so AdultingOS can remind you well before it expires.' },
      { title: 'Book an appointment on the official DFA website', body: 'Only use the official DFA appointment website linked below.', offsetDays: 1 },
      { title: 'Prepare the documents for your application type', body: 'The DFA lists different requirements for first-time and renewal applications.', offsetDays: 7 },
      { title: 'Attend your appointment', body: 'Bring the documents listed in your confirmation.', offsetDays: 14 },
      { title: 'Update your new expiry date', body: 'Use "Record renewal" on the document so your history is kept.', offsetDays: 30 },
    ],
    helpfulNotes: 'Watch out for fixers and unofficial appointment sites.',
    sources: [src('DFA — official consular website', 'https://consular.dfa.gov.ph', 'Department of Foreign Affairs')],
    related: ['travel-abroad-checklist'],
  },
  {
    ...base,
    slug: 'nbi-clearance',
    title: 'Getting an NBI clearance',
    category: 'government',
    agency: 'National Bureau of Investigation (NBI)',
    audience: 'People who need an NBI clearance, often for employment or travel.',
    summary: 'An NBI clearance is commonly requested by employers. Applications usually start online on the official NBI clearance website.',
    eligibilityCaveats: UNVERIFIED_CAVEAT,
    requirements: ['Valid IDs accepted by the NBI', 'An online account on the official NBI clearance website'],
    steps: [
      { title: 'Check who needs it and by when', body: 'Ask the requesting employer or office for their deadline.' },
      { title: 'Apply on the official NBI clearance website', body: 'Create an account and follow the current process listed there.', offsetDays: 1 },
      { title: 'Attend your appointment', body: 'Bring the IDs you declared.', offsetDays: 7 },
      { title: 'Track the clearance in AdultingOS', body: 'Add it to the Document tracker with its validity so you know when to renew.', offsetDays: 8 },
    ],
    helpfulNotes: '',
    sources: [src('NBI Clearance — official website', 'https://clearance.nbi.gov.ph', 'National Bureau of Investigation')],
    related: ['first-job-requirements'],
  },
  {
    ...base,
    slug: 'psa-civil-registry',
    title: 'Requesting PSA civil registry documents',
    category: 'government',
    agency: 'Philippine Statistics Authority (PSA)',
    audience: 'People who need a copy of a birth, marriage or other civil registry certificate.',
    summary: 'The PSA issues copies of civil registry documents such as birth certificates, which are commonly asked for by employers, schools and other agencies.',
    eligibilityCaveats: UNVERIFIED_CAVEAT,
    requirements: ['Details of the record you are requesting', 'Any ID or authorization the PSA requires'],
    steps: [
      { title: 'Confirm which document and how many copies you need', body: 'Ask the requesting office.' },
      { title: 'Request through an official PSA channel', body: 'Use the PSA website to find official request channels.', offsetDays: 1 },
      { title: 'Track the request', body: 'Add a task with the expected date so you can follow up.', offsetDays: 3 },
    ],
    helpfulNotes: '',
    sources: [src('Philippine Statistics Authority — official website', 'https://psa.gov.ph', 'Philippine Statistics Authority')],
    related: ['first-job-requirements', 'national-id'],
  },
  {
    ...base,
    slug: 'national-id',
    title: 'Registering for the National ID (PhilSys)',
    category: 'government',
    agency: 'Philippine Statistics Authority (PSA) — PhilSys',
    audience: 'Filipino citizens and resident aliens who want to register for the Philippine Identification System.',
    summary: 'PhilSys is the national identification system managed by the PSA. Check the official PhilSys website for current registration options.',
    eligibilityCaveats: UNVERIFIED_CAVEAT,
    requirements: ['Supporting documents accepted by PhilSys'],
    steps: [
      { title: 'Check the official PhilSys website', body: 'Find current registration options near you.' },
      { title: 'Prepare your supporting documents', body: 'Bring what the PhilSys page lists.', offsetDays: 3 },
      { title: 'Register and keep your records safe', body: 'Track the ID in AdultingOS without storing the full number.', offsetDays: 7 },
    ],
    helpfulNotes: '',
    sources: [src('PhilSys — official website', 'https://philsys.gov.ph', 'Philippine Statistics Authority')],
    related: ['psa-civil-registry'],
  },
  {
    ...base,
    slug: 'lto-drivers-license',
    title: "Driver's license basics (LTO)",
    category: 'government',
    agency: 'Land Transportation Office (LTO)',
    audience: "People applying for or renewing a Philippine driver's license.",
    summary: "Driver's licenses are issued by the LTO. Requirements depend on the license type and whether you are applying for the first time or renewing.",
    eligibilityCaveats: UNVERIFIED_CAVEAT,
    requirements: ['Requirements published by the LTO for your license type'],
    steps: [
      { title: 'Check your license expiry date', body: 'Track it in the Document tracker for renewal reminders.' },
      { title: 'Review the official LTO requirements', body: 'Use the official LTO website and online portal linked there.', offsetDays: 1 },
      { title: 'Complete the process and record the new expiry date', body: 'Use "Record renewal" to keep your history.', offsetDays: 14 },
    ],
    helpfulNotes: '',
    sources: [src('Land Transportation Office — official website', 'https://lto.gov.ph', 'Land Transportation Office')],
    related: [],
  },
  // ---- Non-government organizational guides (general guidance, not official procedures) ----
  {
    ...base,
    slug: 'first-job-requirements',
    title: 'Preparing for your first job',
    category: 'employment',
    audience: 'Students and fresh graduates about to start their first job.',
    summary: "Employers usually send a list of pre-employment requirements. This checklist helps you get organized early — your employer's list is always the source of truth.",
    eligibilityCaveats: 'Every employer has its own list. Use this to organize, not as an official requirement list.',
    requirements: [
      "Your employer's pre-employment requirements list",
      'Government numbers employers commonly ask for (see the SSS, PhilHealth, Pag-IBIG and BIR guides)',
      'Clearances or civil registry documents your employer requests',
    ],
    steps: [
      { title: "Ask HR for the official requirements list and deadline", body: 'Write down the deadline — AdultingOS will remind you.' },
      { title: 'Check which government numbers you already have', body: 'Avoid duplicate registrations.', offsetDays: 1 },
      { title: 'Start requests that take the longest first', body: 'Appointments and document requests can take time, so begin early.', offsetDays: 2 },
      { title: 'Make copies and organize a folder', body: 'Keep physical and digital copies in a safe place.', offsetDays: 7 },
      { title: 'Submit everything before the deadline', body: 'Keep a record of what you submitted and when.', offsetDays: 14 },
    ],
    helpfulNotes: 'Never send full ID numbers over chat apps to unverified contacts.',
    sources: [],
    related: ['sss-membership', 'philhealth-membership', 'pagibig-membership', 'bir-tin', 'nbi-clearance', 'psa-civil-registry'],
    status: 'published',
    lastVerifiedOn: null,
  },
  {
    ...base,
    slug: 'moving-out',
    title: 'Moving out: a practical checklist',
    category: 'independent_living',
    audience: 'Anyone moving out of their family home for the first time.',
    summary: 'A step-by-step checklist to plan your budget, find a place and set up your new home without missing the boring-but-important parts.',
    eligibilityCaveats: 'General guidance only. Read your lease carefully and ask questions before signing.',
    requirements: ['A realistic monthly budget', 'Savings for move-in costs', 'Your lease or rental agreement'],
    steps: [
      { title: 'Set your monthly housing budget', body: 'Include rent, utilities, internet, transport and food.' },
      { title: 'Save for move-in costs', body: 'Landlords often ask for an advance and a deposit — ask what applies.', offsetDays: 7 },
      { title: 'Visit places and ask questions', body: 'Check water pressure, safety, commute and what utilities are included.', offsetDays: 14 },
      { title: 'Read the lease before signing', body: 'Note the rent due date, renewal date and deposit terms. Track them as bills and reminders.', offsetDays: 21 },
      { title: 'Set up utilities and internet', body: 'Add each one as a recurring bill in AdultingOS.', offsetDays: 28 },
      { title: 'Update your address where needed', body: 'Employer, bank and other accounts.', offsetDays: 35, optional: true },
    ],
    helpfulNotes: '',
    sources: [],
    related: ['household-budget', 'emergency-fund'],
    status: 'published',
  },
  {
    ...base,
    slug: 'household-budget',
    title: 'Creating a simple household budget',
    category: 'independent_living',
    audience: 'Anyone managing their own bills for the first time.',
    summary: 'A simple way to see where your money goes each month. This is an organizing method, not financial advice.',
    eligibilityCaveats: 'General guidance only — not professional financial advice.',
    requirements: ['Your monthly take-home pay', 'Your recurring bills'],
    steps: [
      { title: 'List your recurring bills', body: 'Add them as bills in AdultingOS to see your monthly total.' },
      { title: 'Add subscriptions', body: 'The Subscriptions view shows their monthly equivalent.', offsetDays: 1 },
      { title: 'Decide what is left for everyday spending and savings', body: 'Adjust as you learn your real spending.', offsetDays: 3 },
      { title: 'Review monthly', body: 'Set a monthly reminder to review.', offsetDays: 30 },
    ],
    helpfulNotes: '',
    sources: [],
    related: ['emergency-fund', 'moving-out'],
    status: 'published',
  },
  {
    ...base,
    slug: 'emergency-fund',
    title: 'Starting an emergency fund',
    category: 'independent_living',
    audience: 'Anyone who wants a cushion for unexpected expenses.',
    summary: 'An emergency fund is money set aside for unexpected costs. This guide helps you organize the habit — it is not investment advice.',
    eligibilityCaveats: 'General guidance only — not professional financial advice.',
    requirements: [],
    steps: [
      { title: 'Pick a first, small target', body: 'Start with an amount that feels achievable.' },
      { title: 'Choose a separate place to keep it', body: 'Separate from everyday spending money.', offsetDays: 3 },
      { title: 'Set a recurring reminder to set money aside', body: 'Align it with your payday.', offsetDays: 7 },
    ],
    helpfulNotes: '',
    sources: [],
    related: ['household-budget'],
    status: 'published',
  },
  {
    ...base,
    slug: 'freelancer-records',
    title: 'Record keeping for freelancers',
    category: 'freelancing',
    audience: 'Freelancers and self-employed people.',
    summary: 'Good records make taxes, invoicing and client work easier. This guide covers organizing habits; check BIR requirements for your official obligations.',
    eligibilityCaveats: 'Tax obligations depend on your registration. Confirm requirements with the BIR or a licensed professional.',
    requirements: [],
    steps: [
      { title: 'Keep one list of clients and invoices', body: 'Record invoice date, amount and payment date.' },
      { title: 'Save receipts for business expenses', body: 'Keep them organized by month.', offsetDays: 1 },
      { title: 'Set monthly reminders for your filing deadlines', body: 'Confirm your exact deadlines with the BIR, then add them as recurring tasks.', offsetDays: 3 },
      { title: 'Review your records every quarter', body: 'Catch missing invoices or receipts early.', offsetDays: 90 },
    ],
    helpfulNotes: '',
    sources: [],
    related: ['bir-tin'],
    status: 'published',
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDE_PACK.find((g) => g.slug === slug);
}

export const GUIDE_CATEGORY_LABEL: Record<GuideCategory, string> = {
  government: 'Government services',
  employment: 'Employment',
  independent_living: 'Independent living',
  freelancing: 'Freelancing',
  life_events: 'Life events',
};

/** A guide may be shown in a production build only if a reviewer published it with a verified official source (government guides) — or it is a published general guide. */
export function isGuideReleasable(g: Guide): boolean {
  if (g.status !== 'published' && g.status !== 'needs_update') return false;
  if (g.category === 'government') return g.sources.some((s) => s.isOfficial && s.verifiedOn !== null);
  return true;
}

/** Simple ranked search used offline and as the client-side library search. */
export function searchGuides(guides: readonly Guide[], query: string): Guide[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...guides];
  return guides
    .map((g) => {
      const hay = [g.title, g.agency ?? '', g.summary, ...g.requirements, ...g.steps.map((s) => s.title)].join(' ').toLowerCase();
      const title = g.title.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (title.includes(t)) score += 3;
        else if (hay.includes(t)) score += 1;
        else return { g, score: -1 };
      }
      return { g, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.g);
}
