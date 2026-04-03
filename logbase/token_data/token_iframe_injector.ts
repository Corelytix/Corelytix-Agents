import type { TokenDataPoint } from "./token_data_fetcher"

export interface DataIframeConfig {
  containerId: string
  iframeUrl: string
  token: string
  refreshMs?: number
  apiBase?: string
}

export class TokenDataIframeEmbedder {
  private iframe?: HTMLIFrameElement
  private refreshTimer?: number

  constructor(private cfg: DataIframeConfig) {}

  async init() {
    const container = document.getElementById(this.cfg.containerId)
    if (!container) {
      throw new Error(`Container not found: ${this.cfg.containerId}`)
    }

    this.iframe = document.createElement("iframe")
    this.iframe.src = this.cfg.iframeUrl
    this.iframe.style.border = "none"
    this.iframe.width = "100%"
    this.iframe.height = "100%"
    this.iframe.onload = () => {
      void this.postTokenData()
    }
    container.appendChild(this.iframe)

    if (this.cfg.refreshMs && this.cfg.refreshMs > 0) {
      this.refreshTimer = window.setInterval(() => {
        void this.postTokenData()
      }, this.cfg.refreshMs)
    }
  }

  private async postTokenData() {
    if (!this.iframe?.contentWindow) return
    try {
      const { TokenDataFetcher } = await import("./token_data_fetcher")
      const fetcher = new TokenDataFetcher(this.cfg.apiBase || this.cfg.iframeUrl)
      const data: TokenDataPoint[] = await fetcher.fetchHistory(this.cfg.token)
      this.iframe.contentWindow.postMessage(
        { type: "TOKEN_DATA", token: this.cfg.token, data },
        "*"
      )
    } catch (err) {
      console.error("Failed to fetch or post token data", err)
    }
  }

  disconnect() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
    if (this.iframe) {
      this.iframe.remove()
      this.iframe = undefined
    }
  }
}
