/**
 * Feature flags. `production` is the value for release builds and the seed
 * for the server-side feature_flags table (which can switch flags on remotely
 * once the backend is configured). `development` applies to dev/demo builds.
 *
 * Unreleased modules stay off in production so their screens are unreachable.
 */
export interface FlagDef {
  description: string;
  production: boolean;
  development: boolean;
}

export const FEATURE_FLAGS = {
  ai_assistant: { description: 'Ask Adu AI assistant (requires configured AI gateway).', production: true, development: true },
  subscriptions: { description: 'Subscription tracker.', production: true, development: true },
  achievements: { description: 'Adulting Milestones achievements.', production: true, development: true },
  guides_unverified_preview: {
    description: 'Show draft government guides that are not yet verified (clearly labelled). Never enable in production.',
    production: false,
    development: true,
  },
  account_sign_in: {
    description: 'E-mail/Google sign-in screens. Off: every installation gets a private no-sign-in account (no e-mail or SMTP needed).',
    production: false,
    development: false,
  },
  savings_goals: { description: 'Savings goals (Phase 4).', production: false, development: false },
  life_milestones: { description: 'Life milestone templates (Phase 4).', production: false, development: false },
  household: { description: 'Household management (Phase 4).', production: false, development: false },
  routines: { description: 'Wellness routines (Phase 4).', production: false, development: false },
  premium: { description: 'AdultingOS Plus subscription (requires Google Play Billing).', production: false, development: false },
  document_vault: { description: 'Encrypted document uploads (requires security assessment).', production: false, development: false },
} as const satisfies Record<string, FlagDef>;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
