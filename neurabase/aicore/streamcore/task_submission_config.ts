import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform (brand-neutral).
 * - Expanded task types
 * - Richer parameters (string | number | boolean)
 * - Added meta fields: priority, enabled, createdBy, description, tags
 * - Safer validation (trimmed strings, non-empty parameters)
 */

export const TaskFormSchema = z
  .object({
    taskName: z.string().trim().min(3, "taskName must be at least 3 characters").max(100),
    taskType: z.enum([
      "anomalyScan",
      "tokenAnalytics",
      "whaleMonitor",
      "liquidityCheck",
      "priceAlert",
      "onchainQuery",
      "customAgent",
    ]),
    description: z.string().trim().max(500).optional(),
    parameters: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .refine(obj => Object.keys(obj).length > 0, { message: "parameters must include at least one key" }),
    scheduleCron: z
      .string()
      .trim()
      .min(1, "cron expression cannot be empty")
      // 5-field cron: m h dom mon dow
      .regex(
        /^(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[1-9]|[12]\d|3[01])\s+(\*|[1-9]|1[0-2])\s+(\*|[0-6])$/,
        "invalid cron expression (expected 5 fields: m h dom mon dow)"
      ),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    enabled: z.boolean().default(true),
    createdBy: z.string().trim().min(1, "createdBy is required"),
    tags: z.array(z.string().trim().min(1)).max(20).default([]),
  })
  .strict()

export type TaskFormInput = z.infer<typeof TaskFormSchema>

/** Validate unknown input against TaskFormSchema; throws zod error on failure */
export function validateTaskForm(input: unknown): TaskFormInput {
  const parsed = TaskFormSchema.safeParse(input)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")
    throw new Error(`Task form validation failed: ${issues}`)
  }
  return parsed.data
}

/** Lightweight cron validator (5 fields) */
export function isValidCron(expr: string): boolean {
  return /^(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[1-9]|[12]\d|3[01])\s+(\*|[1-9]|1[0-2])\s+(\*|[0-6])$/.test(
    expr.trim()
  )
}
