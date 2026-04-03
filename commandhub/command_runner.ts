import { exec } from "child_process"

/**
 * Execute a shell command and return stdout or throw on error.
 * - Supports optional timeout and working directory
 * - Captures both stdout and stderr
 * - Returns trimmed string output
 */
export interface ExecOptions {
  timeoutMs?: number
  cwd?: string
  env?: NodeJS.ProcessEnv
}

export interface ExecResult {
  stdout: string
  stderr: string
  code: number | null
}

export function execCommand(command: string, opts: ExecOptions = {}): Promise<ExecResult> {
  const { timeoutMs = 30_000, cwd, env } = opts
  return new Promise((resolve, reject) => {
    const proc = exec(command, { timeout: timeoutMs, cwd, env }, (error, stdout, stderr) => {
      if (error) {
        return reject(
          new Error(
            `Command failed (exit=${(error as any).code ?? "unknown"}): ${stderr || error.message}`
          )
        )
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: (proc as any).exitCode ?? 0,
      })
    })
  })
}

/** Convenience wrapper for just stdout string */
export async function execStdout(command: string, opts: ExecOptions = {}): Promise<string> {
  const { stdout } = await execCommand(command, opts)
  return stdout
}
