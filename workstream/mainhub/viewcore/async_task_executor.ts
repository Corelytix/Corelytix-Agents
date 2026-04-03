/**
 * Task executor: registers handlers and runs tasks from a queue.
 */
export type Handler<T = any, R = any> = (params: T) => Promise<R>

interface Task {
  id: string
  type: string
  params: any
}

interface TaskResult {
  id: string
  result?: any
  error?: string
  durationMs: number
}

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: Task[] = []

  /**
   * Register a handler for a given task type.
   */
  register(type: string, handler: Handler): void {
    if (this.handlers[type]) {
      throw new Error(`Handler for "${type}" is already registered`)
    }
    this.handlers[type] = handler
  }

  /**
   * Enqueue a new task for later execution.
   */
  enqueue(id: string, type: string, params: any): void {
    if (!this.handlers[type]) {
      throw new Error(`No handler registered for "${type}"`)
    }
    this.queue.push({ id, type, params })
  }

  /**
   * Execute all tasks in the queue sequentially.
   */
  async runAll(): Promise<TaskResult[]> {
    const results: TaskResult[] = []
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      const start = Date.now()
      try {
        const data = await this.handlers[task.type](task.params)
        results.push({
          id: task.id,
          result: data,
          durationMs: Date.now() - start,
        })
      } catch (err: any) {
        results.push({
          id: task.id,
          error: err?.message || String(err),
          durationMs: Date.now() - start,
        })
      }
    }
    return results
  }

  /**
   * List all registered handlers.
   */
  listHandlers(): string[] {
    return Object.keys(this.handlers)
  }

  /**
   * Get current queue size.
   */
  size(): number {
    return this.queue.length
  }

  /**
   * Clear all pending tasks without executing.
   */
  clear(): void {
    this.queue = []
  }
}
