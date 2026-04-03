import type { BaseFlowAction, FlowActionResult } from "./flow_action_types"
import { z } from "zod"

export interface AgentContext {
  apiEndpoint: string
  apiKey: string
  requestId?: string
  debug?: boolean
}

/**
 * Core Agent Router: registers and dispatches actions.
 * Brand references removed, extra utilities added.
 */
export class FlowAgent {
  private actions = new Map<string, BaseFlowAction<any, any, AgentContext>>()

  /**
   * Register a new action by its id.
   */
  register<S, R>(action: BaseFlowAction<S, R, AgentContext>): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action "${action.id}" is already registered`)
    }
    this.actions.set(action.id, action)
  }

  /**
   * Invoke a registered action by id with given payload/context.
   * Returns standardized FlowActionResult.
   */
  async invoke<R>(
    actionId: string,
    payload: unknown,
    ctx: AgentContext
  ): Promise<FlowActionResult<R>> {
    const action = this.actions.get(actionId)
    if (!action) {
      return {
        status: "error",
        notice: `Action not found: ${actionId}`,
        error: { message: "Unknown action" },
      }
    }
    try {
      // @ts-expect-error zod schema infers payload shape
      const result = await action.execute({ payload, context: ctx })
      return { status: "ok", notice: result.notice, data: result.data, meta: { id: action.id } }
    } catch (err: any) {
      return {
        status: "error",
        notice: `Execution failed for ${actionId}`,
        error: { message: err?.message ?? "Unknown error", details: err },
        meta: { id: action.id },
      }
    }
  }

  /**
   * Check if an action exists by id.
   */
  hasAction(actionId: string): boolean {
    return this.actions.has(actionId)
  }

  /**
   * List all registered action ids.
   */
  listActions(): string[] {
    return Array.from(this.actions.keys())
  }

  /**
   * Remove a registered action by id.
   */
  unregister(actionId: string): void {
    this.actions.delete(actionId)
  }

  /**
   * Clear all registered actions.
   */
  clear(): void {
    this.actions.clear()
  }
}
