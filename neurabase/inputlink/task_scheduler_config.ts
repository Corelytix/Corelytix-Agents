import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission.
 * Improvements:
 * - Removed brand reference
 * - Expanded task types
 * - Added description, priority, tags, and enabled flags
 * - Stronger validation and error context
 */
export const TaskFormSchema = z
  .object({
    taskName: z.string().trim().min(3, "Task name too short").max(100, "Task name too long"),
    taskType: z.enum([
      "anomalyScan",
      "tokenAnalytics",
      "whaleMonitor",
      "liquidityCheck",
      "priceAlert",
      "customAgent",
    ]),
    description: z.string().trim().max(300).optional(),
    parameters: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .refine(obj => Object.keys(obj).length > 0, {
        message: "Parameters must include at least one key",
      }),
    scheduleCron: z
      .string()
      .regex(
        /^(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[1-9]|[12]\d|3[01])\s+(\*|[1-9]|1[0-2])\s+(\*|[0-6])$/,
        "Invalid cron expression"
      ),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    enabled: z.boolean().default(true),
    tags: z.array(z.string().trim().min(1)).max(10).default([]),
  })
  .strict()

export type TaskFormInput = z.infer<typeof TaskFormSchema>

/**
 * Validate input safely and return typed result.
 */
export function validateTaskForm(input: unknown): TaskFormInput {
  const parsed = TaskFormSchema.safeParse(input)
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")
    throw new Error(`Task form validation failed: ${details}`)
  }
  return parsed.data
}

/**
 * Quick utility to check if a cron expression matches our expected format.
 */
export function isValidCron(expr: string): boolean {
  return /^(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[1-9]|[12]\d|3[01])\s+(\*|[1-9]|1[0-2])\s+(\*|[0-6])$/.test(
    expr.trim()
  )
}
