import { execCommand, ExecOptions, ExecResult } from "./exec_command"

export interface ShellTask {
  id: string
  command: string
  description?: string
  options?: ExecOptions
}

export interface ShellResult {
  taskId: string
  command: string
  description?: string
  output?: string
  error?: string
  exitCode?: number | null
  executedAt: number
  durationMs: number
}

export class ShellTaskRunner {
  private tasks: ShellTask[] = []

  /** Schedule a shell task for execution */
  scheduleTask(task: ShellTask): void {
    this.tasks.push(task)
  }

  /** Clear all scheduled tasks */
  clear(): void {
    this.tasks = []
  }

  /** Peek at current scheduled tasks */
  getTasks(): ShellTask[] {
    return [...this.tasks]
  }

  /** Execute all scheduled tasks in sequence */
  async runAll(): Promise<ShellResult[]> {
    const results: ShellResult[] = []
    for (const task of this.tasks) {
      const startedAt = Date.now()
      try {
        const res: ExecResult = await execCommand(task.command, task.options)
        results.push({
          taskId: task.id,
          command: task.command,
          description: task.description,
          output: res.stdout,
          error: res.stderr || undefined,
          exitCode: res.code,
          executedAt: startedAt,
          durationMs: Date.now() - startedAt,
        })
      } catch (err: any) {
        results.push({
          taskId: task.id,
          command: task.command,
          description: task.description,
          error: err.message,
          executedAt: startedAt,
          durationMs: Date.now() - startedAt,
        })
      }
    }
    this.clear()
    return results
  }
}
