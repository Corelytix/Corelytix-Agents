export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export class TokenDataFetcher {
  constructor(private apiBase: string) {}

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string): Promise<TokenDataPoint[]> {
    const url = `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Failed to fetch history for ${symbol}: HTTP ${res.status}`)
    }
    const raw = (await res.json()) as any[]
    return raw.map(r => ({
      timestamp: typeof r.time === "number" ? r.time * 1000 : Date.parse(r.time),
      priceUsd: Number(r.priceUsd),
      volumeUsd: Number(r.volumeUsd),
      marketCapUsd: Number(r.marketCapUsd),
    }))
  }

  /**
   * Fetch the latest datapoint for a token.
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const history = await this.fetchHistory(symbol)
    if (!history.length) return null
    return history[history.length - 1]
  }

  /**
   * Fetch history and filter by time range.
   */
  async fetchInRange(symbol: string, from: number, to: number): Promise<TokenDataPoint[]> {
    const history = await this.fetchHistory(symbol)
    return history.filter(p => p.timestamp >= from && p.timestamp <= to)
  }

  /**
   * Compute simple stats for a token history.
   */
  async fetchStats(symbol: string): Promise<{ count: number; avgPrice: number; maxPrice: number; minPrice: number }> {
    const history = await this.fetchHistory(symbol)
    if (!history.length) return { count: 0, avgPrice: 0, maxPrice: 0, minPrice: 0 }
    const prices = history.map(p => p.priceUsd)
    const sum = prices.reduce((a, b) => a + b, 0)
    return {
      count: history.length,
      avgPrice: sum / prices.length,
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
    }
  }
}
