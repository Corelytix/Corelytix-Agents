import type { TokenMetrics } from "./token_analysis_calculator"

export interface IframeConfig {
  containerId: string
  srcUrl: string
  metrics: TokenMetrics
  refreshIntervalMs?: number
  allowedOrigins?: string[]
  debug?: boolean
  onError?: (err: Error) => void
}

type MetricsPayload = {
  type: "TOKEN_ANALYSIS_METRICS"
  payload: TokenMetrics
  version: "1.0"
  sentAt: number
}

export class TokenAnalysisIframe {
  private iframeEl: HTMLIFrameElement | null = null
  private intervalId?: number
  private destroyed = false
  private visible = true

  constructor(private config: IframeConfig) {}

  init(): void {
    if (this.destroyed) throw new Error("Instance destroyed")

    const container = document.getElementById(this.config.containerId)
    if (!container) throw new Error("Container not found: " + this.config.containerId)

    const iframe = document.createElement("iframe")
    iframe.src = this.config.srcUrl
    iframe.setAttribute("loading", "lazy")
    iframe.setAttribute("referrerpolicy", "no-referrer")
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.style.border = "none"
    iframe.onload = () => this.postMetrics().catch(this.reportError)
    container.appendChild(iframe)
    this.iframeEl = iframe

    if (this.config.refreshIntervalMs && this.config.refreshIntervalMs > 0) {
      this.intervalId = window.setInterval(() => {
        if (this.visible) this.postMetrics().catch(this.reportError)
      }, this.config.refreshIntervalMs)
    }

    document.addEventListener("visibilitychange", this.handleVisibility, false)
    this.postMetrics().catch(this.reportError)
  }

  /** Update metrics object and immediately push to iframe */
  async updateMetrics(next: TokenMetrics): Promise<void> {
    this.config.metrics = next
    await this.postMetrics()
  }

  /** Manually trigger a refresh with current metrics */
  async refreshNow(): Promise<void> {
    await this.postMetrics()
  }

  /** Clean up timers, listeners, and remove iframe */
  destroy(): void {
    this.destroyed = true
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    document.removeEventListener("visibilitychange", this.handleVisibility, false)
    if (this.iframeEl?.parentElement) {
      this.iframeEl.parentElement.removeChild(this.iframeEl)
    }
    this.iframeEl = null
  }

  private handleVisibility = (): void => {
    this.visible = document.visibilityState === "visible"
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[TokenAnalysisIframe] visibility -> ${this.visible ? "visible" : "hidden"}`)
    }
  }

  private async postMetrics(): Promise<void> {
    if (this.destroyed) return
    if (!this.iframeEl?.contentWindow) return

    try {
      const payload: MetricsPayload = {
        type: "TOKEN_ANALYSIS_METRICS",
        payload: this.config.metrics,
        version: "1.0",
        sentAt: Date.now(),
      }
      const targetOrigin = this.getTargetOrigin()
      this.iframeEl.contentWindow.postMessage(payload, targetOrigin)
      if (this.config.debug) {
        // eslint-disable-next-line no-console
        console.log("[TokenAnalysisIframe] posted metrics:", payload)
      }
    } catch (err) {
      this.reportError(err)
    }
  }

  /** Restrict postMessage target if allowedOrigins provided; otherwise "*" */
  private getTargetOrigin(): string {
    if (!this.config.allowedOrigins || this.config.allowedOrigins.length === 0) return "*"
    try {
      const origin = new URL(this.config.srcUrl).origin
      return this.config.allowedOrigins.includes(origin) ? origin : "*"
    } catch {
      return "*"
    }
  }

  private reportError = (err: unknown): void => {
    const error = err instanceof Error ? err : new Error(String(err))
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.error("[TokenAnalysisIframe] error:", error)
    }
    this.config.onError?.(error)
  }
}
