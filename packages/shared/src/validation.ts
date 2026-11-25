import { z } from 'zod';
import { isLocalDate, isLocalTime } from './dates';
import { recurrenceRuleSchema } from './recurrence';
import { PRIORITIES, BILL_CATEGORIES, SUBSCRIPTION_CATEGORIES } from './catalog';
import { DOCUMENT_STAGES } from './documents';
import { MAX_AMOUNT_MINOR, SUPPORTED_CURRENCIES } from './money';

export const localDateSchema = z.string().refine(isLocalDate, { message: 'Enter a valid date (YYYY-MM-DD).' });
export const localTimeSchema = z.string().refine(isLocalTime, { message: 'Enter a valid time (HH:mm).' });
export const uuidSchema = z.uuid();

const title = z.string().trim().min(1, 'Give it a short title.').max(120, 'Keep the title under 120 characters.');
const longText = z.string().trim().max(2000, 'Keep this under 2,000 characters.');
const offsets = z.array(z.number().int().min(0).max(365)).max(6);
const amount = z.number().int().min(0).max(MAX_AMOUNT_MINOR);

/**
 * Rejects text that looks like a full government ID or card number: 10+
 * digits in a row (ignoring spaces/dashes). Used on free-text fields so people
 * don't paste sensitive numbers by accident.
 */
export function looksLikeSensitiveNumber(text: string): boolean {
  return /\d{10,}/.test(text.replace(/[\s-]/g, ''));
}
const safeText = longText.refine((t) => !looksLikeSensitiveNumber(t), {
  message: "This looks like a full ID or card number. Please don't store full numbers — the last 4 digits are enough.",
});

export const taskInputSchema = z.object({
  title: title.refine((t) => !looksLikeSensitiveNumber(t), { message: 'Titles should not contain full ID or card numbers.' }),
  description: safeText.optional().default(''),
  category: z.string().min(1).max(60),
  priority: z.enum(PRIORITIES).default('medium'),
  dueDate: localDateSchema,
  dueTime: localTimeSchema.nullable().optional(),
  recurrence: recurrenceRuleSchema,
  reminderOffsets: offsets.default([0]),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  notes: safeText.optional().default(''),
  checklist: z.array(z.object({ title: z.string().trim().min(1).max(120), done: z.boolean().default(false) })).max(50).default([]),
});
export type TaskInput = z.infer<typeof taskInputSchema>;

export const billInputSchema = z.object({
  name: title,
  provider: z.string().trim().max(80).optional().default(''),
  category: z.enum(BILL_CATEGORIES.map((c) => c.key) as [string, ...string[]]),
  amountMinor: amount.nullable(),
  variableAmount: z.boolean().default(false),
  currency: z.enum(SUPPORTED_CURRENCIES).default('PHP'),
  dueDate: localDateSchema,
  recurrence: recurrenceRuleSchema,
  reminderOffsets: offsets.default([3, 0]),
  notes: safeText.optional().default(''),
});
export type BillInput = z.infer<typeof billInputSchema>;

export const subscriptionInputSchema = z.object({
  name: title,
  category: z.enum(SUBSCRIPTION_CATEGORIES.map((c) => c.key) as [string, ...string[]]),
  amountMinor: amount,
  currency: z.enum(SUPPORTED_CURRENCIES).default('PHP'),
  nextRenewal: localDateSchema,
  recurrence: recurrenceRuleSchema,
  trialEndsOn: localDateSchema.nullable().optional(),
  reminderOffsets: offsets.default([3]),
  notes: safeText.optional().default(''),
});
export type SubscriptionInput = z.infer<typeof subscriptionInputSchema>;

export const documentInputSchema = z
  .object({
    templateKey: z.string().min(1).max(40),
    name: title,
    issuer: z.string().trim().max(120).optional().default(''),
    stage: z.enum(DOCUMENT_STAGES),
    issueDate: localDateSchema.nullable().optional(),
    expiryDate: localDateSchema.nullable().optional(),
    /** Last 4 characters only. Full numbers are rejected. */
    referenceLast4: z
      .string()
      .trim()
      .max(4, 'Only the last 4 characters are stored.')
      .regex(/^[A-Za-z0-9]*$/, 'Letters and digits only.')
      .optional()
      .default(''),
    officialUrl: z.url().optional().or(z.literal('')).default(''),
    reminderOffsets: offsets.default([90, 30, 7]),
    notes: safeText.optional().default(''),
  })
  .refine((d) => !d.issueDate || !d.expiryDate || d.issueDate <= d.expiryDate, {
    message: 'The expiry date must be after the issue date.',
    path: ['expiryDate'],
  });
export type DocumentInput = z.infer<typeof documentInputSchema>;

export const paymentInputSchema = z.object({
  paidOn: localDateSchema,
  amountMinor: amount,
  note: z.string().trim().max(200).optional().default(''),
});

/* ---------- AI assistant contracts (mirrored in supabase/functions/_shared/schemas.ts) ---------- */

export const aiCitationSchema = z.object({
  guideId: z.string(),
  guideTitle: z.string(),
  sourceTitle: z.string(),
  url: z.url(),
  verifiedOn: z.string().nullable(),
});

export const aiProposedTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  category: z.string().max(60).default('personal'),
  dueDate: localDateSchema.nullable().default(null),
  notes: z.string().max(500).default(''),
});
export type AiProposedTask = z.infer<typeof aiProposedTaskSchema>;

export const aiAnswerSchema = z.object({
  conversationId: uuidSchema,
  messageId: uuidSchema,
  answer: z.string().max(6000),
  grounding: z.enum(['verified_guides', 'unverified', 'user_records', 'refused']),
  citations: z.array(aiCitationSchema).max(10),
  proposal: z
    .object({
      id: uuidSchema,
      kind: z.literal('create_tasks'),
      tasks: z.array(aiProposedTaskSchema).min(1).max(15),
    })
    .nullable(),
  disclaimer: z.string(),
});
export type AiAnswer = z.infer<typeof aiAnswerSchema>;

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? 'Please check the form.';
}
