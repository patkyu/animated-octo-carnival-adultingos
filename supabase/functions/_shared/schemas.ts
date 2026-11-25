// AI contracts. The response shape mirrors packages/shared/src/validation.ts
// (aiAnswerSchema); keep both in sync — the mobile app validates responses.
import { z } from 'npm:zod@4.6.7';

export const askRequestSchema = z.object({
  conversationId: z.uuid().nullable().optional(),
  message: z.string().trim().min(1).max(1000),
  includeRecords: z.boolean().optional().default(false),
  timezone: z.string().max(64).optional().default('Asia/Manila'),
});
export type AskRequest = z.infer<typeof askRequestSchema>;

/** What the model must return (validated before anything is stored or shown). */
export const modelOutputSchema = z.object({
  answer: z.string().min(1).max(4000),
  grounding: z.enum(['verified_guides', 'unverified', 'user_records', 'refused']),
  cited_excerpt_ids: z.array(z.string()).max(8),
  proposed_tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        category: z.enum(['government', 'documents', 'finance', 'bills', 'work', 'education', 'household', 'personal', 'wellness']),
        due_in_days: z.number().int().min(0).max(365).nullable(),
        notes: z.string().max(500),
      }),
    )
    .max(10),
});
export type ModelOutput = z.infer<typeof modelOutputSchema>;

/** JSON Schema handed to the model's structured-output mode (same shape as above). */
export const MODEL_OUTPUT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'grounding', 'cited_excerpt_ids', 'proposed_tasks'],
  properties: {
    answer: { type: 'string', description: 'Plain-text answer for the user. Short paragraphs or "- " bullets. No markdown headings.' },
    grounding: {
      type: 'string',
      enum: ['verified_guides', 'unverified', 'user_records', 'refused'],
      description: 'verified_guides only if the answer relies on the provided guide excerpts.',
    },
    cited_excerpt_ids: { type: 'array', items: { type: 'string' }, description: 'IDs of guide excerpts the answer relies on.' },
    proposed_tasks: {
      type: 'array',
      description: 'Optional checklist the user may choose to add. Empty when not helpful.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'category', 'due_in_days', 'notes'],
        properties: {
          title: { type: 'string' },
          category: { type: 'string', enum: ['government', 'documents', 'finance', 'bills', 'work', 'education', 'household', 'personal', 'wellness'] },
          due_in_days: { type: ['integer', 'null'] },
          notes: { type: 'string' },
        },
      },
    },
  },
} as const;
