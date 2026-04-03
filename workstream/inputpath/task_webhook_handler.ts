import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

/** Result shape for Typeform submission handling */
export type HandleResult =
  | { success: true; message: string; taskId: string; payload: TaskFormInput }
  | { success: false; message: string; errors?: string[] }

/** Pretty-print zod issues */
function formatIssues(issues: { path: (string | number)[]; message: string }[]): string[] {
  return issues.map(i => `${i.path.join(".") || "<root>"}: ${i.message}`)
}

/** Normalize parameter values to primitives and strip undefined/null */
function sanitizeParameters(params: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v
    } else {
      // fallback: stringify complex values deterministically
      out[k] = JSON.stringify(v)
    }
  }
  return out
}

/**
 * Processes a Typeform webhook payload to schedule a new task.
 * - Validates payload with zod
 * - Sanitizes parameters
 * - Generates a stable time-based task id
 * - Returns a typed result (no side effects here; hook up your scheduler where noted)
 */
export async function handleTypeformSubmission(raw: unknown): Promise<HandleResult> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = formatIssues(parsed.error.issues as any)
    return { success: false, message: "Validation error", errors }
  }

  const data: TaskFormInput = parsed.data
  const params = sanitizeParameters(data.parameters)

  // Generate a stable (time-based) id without randomness
  const taskId = `task-${Date.now()}`

  // TODO: integrate with your scheduler/queue here.
  // Example:
  // await scheduleTask({
  //   id: taskId,
  //   type: data.taskType,
  //   cron: data.scheduleCron,
  //   name: data.taskName,
  //   params,
  //   priority: data.priority,
  //   enabled: data.enabled,
  //   tags: data.tags,
  // })

  const message = `Task "${data.taskName}" scheduled as ${taskId}`
  return { success: true, message, taskId, payload: { ...data, parameters: params } }
}
