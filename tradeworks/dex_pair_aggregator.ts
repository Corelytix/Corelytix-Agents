export interface PairInfo {
  exchange: string
  pairAddress: string
  baseSymbol: string
  quoteSymbol: string
  liquidityUsd: number
  volume24hUsd: number
  priceUsd: number
}

export interface ApiEndpoint {
  name: string
  baseUrl: string
  apiKey?: string
}

export interface DexSuiteConfig {
  apis: ApiEndpoint[]
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
  cacheTtlMs?: number
}

type PairInfoCacheEntry = { value: PairInfo[]; expiresAt: number }

export class DexSuite {
  private cache = new Map<string, PairInfoCacheEntry>()

  constructor(private config: DexSuiteConfig) {}

  /* ------------------------------- Internals ------------------------------- */

  private get timeoutMs(): number {
    return this.config.timeoutMs ?? 10_000
  }

  private get retries(): number {
    return Math.max(0, this.config.retries ?? 1) // attempts = retries + 1
  }

  private get retryDelayMs(): number {
    return Math.max(0, this.config.retryDelayMs ?? 300)
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private headersFor(api: ApiEndpoint): HeadersInit {
    return api.apiKey ? { Authorization: `Bearer ${api.apiKey}` } : {}
  }

  private async fetchWithTimeout(url: string, headers: HeadersInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await fetch(url, { headers, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  private async fetchFromApi<T>(api: ApiEndpoint, path: string): Promise<T> {
    const url = `${api.baseUrl}${path}`
    let lastError: unknown
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await this.fetchWithTimeout(url, this.headersFor(api))
        if (!res.ok) throw new Error(`${api.name} ${path} HTTP ${res.status}`)
        return (await res.json()) as T
      } catch (e) {
        lastError = e
        if (attempt < this.retries) {
          await this.delay(this.retryDelayMs)
          continue
        }
        throw lastError
      }
    }
    // Unreachable, but keeps TS happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw new Error(String(lastError as any))
  }

  private normalizePairInfo(api: ApiEndpoint, pairAddress: string, data: any): PairInfo {
    return {
      exchange: api.name,
      pairAddress,
      baseSymbol: String(data?.token0?.symbol ?? data?.base?.symbol ?? ""),
      quoteSymbol: String(data?.token1?.symbol ?? data?.quote?.symbol ?? ""),
      liquidityUsd: Number(data?.liquidityUsd ?? data?.liquidity_usd ?? 0),
      volume24hUsd: Number(data?.volume24hUsd ?? data?.volume_24h_usd ?? 0),
      priceUsd: Number(data?.priceUsd ?? data?.price_usd ?? 0),
    }
  }

  private readCache(pairAddress: string): PairInfo[] | null {
    const ttl = this.config.cacheTtlMs
    if (!ttl || ttl <= 0) return null
    const entry = this.cache.get(pairAddress)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(pairAddress)
      return null
    }
    return entry.value
  }

  private writeCache(pairAddress: string, value: PairInfo[]): void {
    const ttl = this.config.cacheTtlMs
    if (!ttl || ttl <= 0) return
    this.cache.set(pairAddress, { value, expiresAt: Date.now() + ttl })
  }

  /* ------------------------------- Public API ------------------------------ */

  /**
   * Retrieve aggregated pair info across all configured DEX APIs.
   * Returns an array (possibly empty) sorted by liquidity descending.
   */
  async getPairInfo(pairAddress: string): Promise<PairInfo[]> {
    const cached = this.readCache(pairAddress)
    if (cached) return cached

    const results: PairInfo[] = []
    await Promise.all(
      this.config.apis.map(async api => {
        try {
          const data = await this.fetchFromApi<any>(api, `/pair/${encodeURIComponent(pairAddress)}`)
          results.push(this.normalizePairInfo(api, pairAddress, data))
        } catch {
          // skip failed API
        }
      })
    )

    const sorted = results.sort((a, b) => b.liquidityUsd - a.liquidityUsd)
    this.writeCache(pairAddress, sorted)
    return sorted
  }

  /**
   * Compare a list of pairs across exchanges, returning the best volume and liquidity per pair.
   * If no data is available for a pair, both fields are null.
   */
  async comparePairs(
    pairs: string[]
  ): Promise<Record<string, { bestVolume: PairInfo | null; bestLiquidity: PairInfo | null }>> {
    const entries = await Promise.all(
      pairs.map(async addr => {
        const infos = await this.getPairInfo(addr)
        if (!infos.length) {
          return [addr, { bestVolume: null, bestLiquidity: null }] as const
        }
        const bestVolume = infos.reduce((a, b) => (b.volume24hUsd > a.volume24hUsd ? b : a))
        const bestLiquidity = infos.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a))
        return [addr, { bestVolume, bestLiquidity }] as const
      })
    )
    return Object.fromEntries(entries)
  }

  /**
   * Get the best price across exchanges for a given pair.
   * mode: "max" | "min" (default: "max")
   */
  async getBestPrice(
    pairAddress: string,
    mode: "max" | "min" = "max"
  ): Promise<PairInfo | null> {
    const infos = await this.getPairInfo(pairAddress)
    if (!infos.length) return null
    return infos.reduce((a, b) =>
      mode === "max" ? (b.priceUsd > a.priceUsd ? b : a) : (b.priceUsd < a.priceUsd ? b : a)
    )
  }

  /**
   * Lightweight summary metrics for a pair across all exchanges.
   */
  async summarizePair(pairAddress: string): Promise<{
    exchanges: number
    totalLiquidityUsd: number
    totalVolume24hUsd: number
    avgPriceUsd: number
  }> {
    const infos = await this.getPairInfo(pairAddress)
    if (!infos.length) {
      return { exchanges: 0, totalLiquidityUsd: 0, totalVolume24hUsd: 0, avgPriceUsd: 0 }
    }
    const totalLiquidityUsd = infos.reduce((s, x) => s + x.liquidityUsd, 0)
    const totalVolume24hUsd = infos.reduce((s, x) => s + x.volume24hUsd, 0)
    const avgPriceUsd = infos.reduce((s, x) => s + x.priceUsd, 0) / infos.length
    return {
      exchanges: infos.length,
      totalLiquidityUsd,
      totalVolume24hUsd,
      avgPriceUsd,
    }
  }

  /** Clear internal cache (if enabled). */
  clearCache(): void {
    this.cache.clear()
  }
}
