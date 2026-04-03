import { z } from "zod"

/**
 * Base types for any Flow action.
 * Cleaned of brand-specific names, expanded with status, error typing, and helpers.
 */

/** Action status enum for consistent responses */
export const ActionStatus = z.enum(["ok", "error"])
export type ActionStatus = z.infer<typeof ActionStatus>

/** Generic schema alias for action inputs */
export type FlowActionSchema = z.ZodObject<z.ZodRawShape>

/** Standardized success response */
export interface FlowActionResponse<T> {
  status: "ok"
  notice: string
  data: T
  meta?: Record<string, unknown>
}

/** Standardized error response */
export interface FlowActionError {
  status: "error"
  notice: string
  error: {
    code?: string
    message: string
    details?: unknown
  }
  meta?: Record<string, unknown>
}

/** Union result type */
export type FlowActionResult<T> = FlowActionResponse<T> | FlowActionError

/** Minimal context shape (extend per app) */
export interface ActionContext {
  requestId?: string
  userId?: string
  now?: () => number
  [k: string]: unknown
}

/** Base Flow Action contract */
export interface BaseFlowAction<S extends FlowActionSchema, R, Ctx = ActionContext> {
  /** Stable identifier for the action (machine-friendly) */
  id: string
  /** Short human-readable description */
  summary: string
  /** Semantic version of the action contract/behavior */
  version: string
  /** Zod schema describing the expected input payload */
  input: S
  /**
   * Execute the action. Implementations should assume payload is validated.
   * Prefer using `executeSafe` helper for validation + error wrapping.
   */
  execute(args: { payload: z.infer<S>; context: Ctx }): Promise<FlowActionResponse<R>>
}

/**
 * Helper to validate input with zod schema.
 * Throws a typed error with `issues` on failure.
 */
export function validateInput<S extends FlowActionSchema>(
  schema: S,
  payload: unknown
): z.infer<S> {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    const err = new Error("Invalid action payload")
    ;(err as any).issues = parsed.error.issues
    throw err
  }
  return parsed.data
}

/**
 * Execute an action with validation and standardized error handling.
 * - Validates input with the action's schema
 * - Wraps errors into FlowActionError with optional code/details
 */
export async function executeSafe<S extends FlowActionSchema, R, Ctx = ActionContext>(
  action: BaseFlowAction<S, R, Ctx>,
  args: { payload: unknown; context: Ctx },
  opts?: { onErrorCode?: (e: unknown) => string | undefined; meta?: Record<string, unknown> }
): Promise<FlowActionResult<R>> {
  try {
    const payload = validateInput(action.input, args.payload)
    const res = await action.execute({ payload, context: args.context })
    return {
      status: "ok",
      notice: res.notice,
      data: res.data,
      meta: { version: action.version, id: action.id, ...(res.meta || {}), ...(opts?.meta || {}) },
    }
  } catch (e: unknown) {
    const code = opts?.onErrorCode?.(e)
    const message = e instanceof Error ? e.message : String(e)
    const details = e instanceof Error && (e as any).issues ? (e as any).issues : e
    return {
      status: "error",
      notice: "Action execution failed",
      error: { code, message, details },
      meta: { version: action.version, id: action.id, ...(opts?.meta || {}) },
    }
  }
}

/* ------------------------ Example usage pattern ------------------------
import { z } from "zod"

const schema = z.object({
  symbol: z.string().min(1),
  limit: z.number().int().positive().max(100).default(20),
})

type Output = { count: number }

const exampleAction: BaseFlowAction<typeof schema, Output> = {
  id: "fetch_signals",
  summary: "Fetch recent signals for a symbol",
  version: "1.0.0",
  input: schema,
  async execute({ payload }) {
    // ... your logic
    return { status: "ok", notice: "Fetched", data: { count: 42 } }
  },
}

const result = await executeSafe(exampleAction, { payload: { symbol: "SOL" }, context: { requestId: "req-1" } })
------------------------------------------------------------------------ */
