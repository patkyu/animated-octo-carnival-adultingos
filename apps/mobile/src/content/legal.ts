/**
 * DRAFT legal texts — single source for the in-app screens and the published
 * web pages (scripts/build-legal.ts renders docs/privacy/*.md and the
 * public HTML). They describe what this codebase actually does. They MUST be
 * reviewed by qualified Philippine counsel and a Data Protection Officer before
 * release; bracketed items are placeholders to be completed by the operator.
 */
export interface LegalDoc {
  title: string;
  version: string;
  effective: string;
  sections: { heading: string; body: string[] }[];
}

export const PRIVACY_POLICY: LegalDoc = {
  title: 'AdultingOS Privacy Policy (draft)',
  version: '2026-11-draft',
  effective: '[effective date — set at launch]',
  sections: [
    {
      heading: 'Who we are',
      body: [
        'AdultingOS ("we") is an independent personal organization app operated by [legal entity name and address]. We are not affiliated with, endorsed by, or operated by the Philippine government or any government agency.',
        'Data Protection Officer: [name], [dpo e-mail address]. You may also contact the National Privacy Commission of the Philippines.',
      ],
    },
    {
      heading: 'What we collect',
      body: [
        'Account data (only if you create an account): your e-mail address and a password managed by our authentication provider, or your Google account e-mail if you use Google Sign-In.',
        'Information you enter: tasks, bills and payment records you type in, subscriptions, document metadata (type, issuer, issue and expiry dates, and at most the last 4 characters of a reference number), notes, checklists and categories. We do not ask for or store full government ID numbers, photos or scans of IDs, bank credentials, or card numbers.',
        'Optional profile answers: preferred name, language, time zone, employment status, living arrangement, areas of interest and favorite mascot. You can skip all of them.',
        'Ask Adu: the questions you send and the answers generated, plus your consent choices. Long numbers are removed from messages before processing.',
        'Reports and feedback you choose to send.',
        'Technical data: app version, platform and error codes needed to operate sync and the AI service. We do not use advertising identifiers and the app has no ads.',
      ],
    },
    {
      heading: 'Guest use',
      body: ['You can use AdultingOS without an account. Your information then stays only on your phone and is not sent to us, except guide content your phone downloads.'],
    },
    {
      heading: 'How we use it',
      body: [
        'To provide the app: store and sync your records across your devices, schedule reminders, show your dashboard and export or delete your data.',
        'To answer Ask Adu questions, only after you consent. If you separately allow it, Adu may read the titles and due dates of your next 14 days of items and documents expiring soon, only when you ask about your schedule. Amounts, notes and reference numbers are never sent to the AI provider.',
        'To review reports about guides or AI answers, and to respond to support requests.',
        'To keep the service secure and to meet legal obligations.',
        'We do not sell your personal information, do not use it for advertising, and do not use your content to train AI models.',
      ],
    },
    {
      heading: 'Legal bases',
      body: ['We process your information to provide the service you request (contract), with your consent (Ask Adu and optional record access, which you can withdraw at any time in Settings), and for our legitimate interests in securing the service, in line with the Data Privacy Act of 2012 (Republic Act No. 10173).'],
    },
    {
      heading: 'Who we share it with',
      body: [
        'Service providers acting on our instructions: Supabase (database, authentication and server functions; hosting region [region]), and our AI provider, Anthropic, which processes Ask Adu messages to generate answers. [Add the actual crash-reporting or analytics provider here if one is enabled; none is included in this version.]',
        'Google, if you choose Google Sign-In.',
        'Authorities, only when required by law.',
        'Notifications are generated on your phone; reminder content is not sent to a push service.',
      ],
    },
    {
      heading: 'Storage and security',
      body: [
        'Data is encrypted in transit (HTTPS) and at rest by our infrastructure provider. Each account can only access its own records; this is enforced by database row-level security. Sign-in tokens are stored in Android\'s secure keystore. Lock-screen reminders hide details by default.',
        'No system is perfectly secure. We will notify affected users and the National Privacy Commission of a personal data breach as required by law.',
      ],
    },
    {
      heading: 'Retention',
      body: [
        'Your records are kept while your account exists. Deleted records are removed from sync within 90 days. AI conversations idle for 12 months are deleted automatically, and you can delete them any time. Audit logs (which contain no content) are kept for 24 months.',
        'When you delete your account, your personal data is deleted immediately from our database; backups are overwritten within [30] days. We keep a record that a deletion happened (without your identity) and the text of feedback or reports you sent, with your identity removed.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'Under the Data Privacy Act you may be informed, access, correct, object, have your data erased or blocked, receive a copy (data portability), and file a complaint with the National Privacy Commission.',
        'In the app: edit your profile and records at any time; Settings → Export my data (JSON and CSV); Settings → Privacy to withdraw AI consent or delete AI history; Settings → Delete account. Without the app, use [https://adultingos.app/delete-account] or e-mail [dpo e-mail address].',
      ],
    },
    {
      heading: 'Children',
      body: ['AdultingOS is intended for adults aged 18 and above.'],
    },
    {
      heading: 'Changes',
      body: ['We will notify you in the app before material changes take effect.'],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: 'AdultingOS Terms of Use (draft)',
  version: '2026-11-draft',
  effective: '[effective date — set at launch]',
  sections: [
    { heading: 'The service', body: ['AdultingOS helps you organize personal responsibilities: tasks, bills, document renewals, subscriptions and reminders, with general guides and an AI assistant. You must be 18 or older to use it.'] },
    {
      heading: 'Not a government service',
      body: [
        'AdultingOS is an independent lifestyle and personal organization application. It is not affiliated with, endorsed by, or operated by the Philippine government or any government agency. Government-related information is provided for general guidance. Always verify requirements directly through official government sources.',
        'AdultingOS does not process government applications, submit forms, execute bank transactions or payments, or provide regulated financial services.',
      ],
    },
    {
      heading: 'No professional advice',
      body: ['Guides and Ask Adu provide general information only and are not legal, tax, medical or financial advice. AI-generated content may be incomplete or inaccurate. Check official sources and consult a qualified professional for decisions about your situation.'],
    },
    { heading: 'Your content', body: ['You own what you enter. You give us permission to store and process it only to provide the service. Do not enter full ID numbers, card details or passwords.'] },
    { heading: 'Amounts are yours', body: ['Financial figures are entered by you and are not verified balances. Reminders are a convenience; you remain responsible for meeting your obligations and deadlines.'] },
    { heading: 'Acceptable use', body: ['Do not misuse the service, attempt to access other users\' data, overload or reverse-engineer it, or use Ask Adu to create harmful content.'] },
    { heading: 'Availability', body: ['We work to keep AdultingOS available, but features such as sync and Ask Adu may be interrupted. Your data stays usable on your device.'] },
    { heading: 'Ending your use', body: ['You can stop using AdultingOS and delete your account at any time in Settings. We may suspend accounts that break these terms.'] },
    { heading: 'Liability', body: ['To the extent permitted by Philippine law, AdultingOS is provided "as is" and we are not liable for indirect losses or for missed deadlines. [Counsel to complete.]'] },
    { heading: 'Governing law and contact', body: ['These terms are governed by the laws of the Republic of the Philippines. Contact: [support e-mail address].'] },
  ],
};

export const FAQ: { q: string; a: string }[] = [
  { q: 'Do I need an account?', a: 'No. You can use AdultingOS on one phone without an account. An account adds backup, sync across devices and Ask Adu. If you sign up later, your existing items move over without duplicates.' },
  { q: 'Is AdultingOS a government app?', a: 'No. It is an independent app and is not affiliated with any government agency. Guides link to official sources — always confirm requirements there.' },
  { q: 'Why can I only enter the last 4 characters of an ID number?', a: 'To protect you. AdultingOS never stores full ID numbers, scans or photos of IDs.' },
  { q: 'Why didn\'t I get a reminder?', a: 'Check that notifications are allowed for AdultingOS in Android settings and in Settings → Notifications, and that the item has reminders set. Reminders during quiet hours arrive when quiet hours end. Battery savers can delay reminders by a few minutes.' },
  { q: 'What happens when I mark a recurring bill as paid?', a: 'The payment is recorded and exactly one next due date is created. Monthly bills on the 29th–31st fall on the last day of shorter months.' },
  { q: 'Can AdultingOS pay my bills or cancel subscriptions?', a: 'No. It only tracks what you enter. Pay or cancel with the provider, then record it in the app.' },
  { q: 'How accurate is Ask Adu?', a: 'Adu answers from guides our editors have verified and tells you when it couldn\'t verify something. It can still be wrong — check official sources, and use “Report this answer” if something looks off.' },
  { q: 'How do I delete my data?', a: 'Settings → Privacy and security. You can delete AI conversations, individual records, or your whole account. Signed-out users can delete all data on the device.' },
];
