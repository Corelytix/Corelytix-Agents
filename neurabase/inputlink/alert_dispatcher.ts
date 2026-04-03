import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  timestamp?: number
  context?: Record<string, unknown>
}

/**
 * Generic alerting service: email + console output.
 * Brand-neutral, includes timestamps, context, and severity handling.
 */
export class AlertService {
  constructor(private cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal) {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? false,
      auth: { user, pass },
    })

    const timestamp = new Date(signal.timestamp ?? Date.now()).toISOString()
    const body =
      `${signal.message}\n\n` +
      `Timestamp: ${timestamp}\n` +
      (signal.context ? `Context: ${JSON.stringify(signal.context, null, 2)}\n` : "")

    await transporter.sendMail({
      from,
      to,
      subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
      text: body,
    })
  }

  private logConsole(signal: AlertSignal) {
    if (!this.cfg.console) return
    const timestamp = new Date(signal.timestamp ?? Date.now()).toISOString()
    console.log(
      `[Alert][${signal.level.toUpperCase()}] ${signal.title} @ ${timestamp}\n${signal.message}`
    )
    if (signal.context) {
      console.log("Context:", signal.context)
    }
  }

  /**
   * Dispatch multiple signals in sequence.
   */
  async dispatch(signals: AlertSignal[]) {
    for (const sig of signals) {
      await this.sendEmail(sig)
      this.logConsole(sig)
    }
  }

  /**
   * Dispatch a single alert.
   */
  async notify(signal: AlertSignal) {
    await this.dispatch([signal])
  }
}
