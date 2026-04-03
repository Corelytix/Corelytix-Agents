import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  constructor(private readonly apiUrl: string) {}

  /** Fetch recent OHLC candles */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const url = `${this.apiUrl}/markets/${encodeURIComponent(symbol)}/candles?limit=${limit}`
    const res = await fetch(url, { timeout: 10_000 as any })
    if (!res.ok) {
      throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText}`)
    }
    const data = (await res.json()) as Candle[]
    return data
      .filter(c => isFinite(c.open) && isFinite(c.high) && isFinite(c.low) && isFinite(c.close))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isHammer(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const lowerWick = Math.min(c.open, c.close) - c.low
    const full = c.high - c.low || 1
    const ratio = body > 0 ? lowerWick / body : 0
    // prefer smaller bodies overall
    const bodyShare = body / full
    return ratio > 2 && bodyShare < 0.3 ? clamp01((ratio / 3) * (1 - bodyShare)) : 0
  }

  private isShootingStar(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const upperWick = c.high - Math.max(c.open, c.close)
    const full = c.high - c.low || 1
    const ratio = body > 0 ? upperWick / body : 0
    const bodyShare = body / full
    return ratio > 2 && bodyShare < 0.3 ? clamp01((ratio / 3) * (1 - bodyShare)) : 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close > prev.open &&
      curr.open < prev.close
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    const k = bodyPrev > 0 ? bodyCurr / bodyPrev : 1
    return clamp01(0.6 + 0.4 * Math.min(k, 1))
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.open > prev.close &&
      curr.close < prev.open
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    const k = bodyPrev > 0 ? bodyCurr / bodyPrev : 1
    return clamp01(0.6 + 0.4 * Math.min(k, 1))
  }

  private isDoji(c: Candle): number {
    const range = c.high - c.low
    const body = Math.abs(c.close - c.open)
    const ratio = range > 0 ? body / range : 1
    return ratio < 0.1 ? clamp01(1 - ratio * 10) : 0
  }

  /* ------------------------- Public API --------------------------- */

  /**
   * Analyze a list of candles and return detected pattern signals.
   * - minConfidence: minimum score [0..1] to accept a detection
   * - dedupeWindow: skip repeating the same pattern within N candles
   * - maxSignals: optional cap on number of signals returned (most recent kept)
   */
  analyzeCandles(
    candles: Candle[],
    opts: { minConfidence?: number; dedupeWindow?: number; maxSignals?: number } = {}
  ): PatternSignal[] {
    const minConfidence = opts.minConfidence ?? 0.6
    const dedupeWindow = Math.max(0, opts.dedupeWindow ?? 2)
    if (!Array.isArray(candles) || candles.length === 0) return []

    const signals: PatternSignal[] = []
    const lastIdxForPattern: Partial<Record<CandlestickPattern, number>> = {}

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]

      // Single-candle patterns
      const singles: Array<[CandlestickPattern, number]> = [
        ["Hammer", this.isHammer(c)],
        ["ShootingStar", this.isShootingStar(c)],
        ["Doji", this.isDoji(c)],
      ]

      // Two-candle patterns
      if (i > 0) {
        const prev = candles[i - 1]
        singles.push(["BullishEngulfing", this.isBullishEngulfing(prev, c)])
        singles.push(["BearishEngulfing", this.isBearishEngulfing(prev, c)])
      }

      for (const [pattern, score] of singles) {
        if (score >= minConfidence) {
          const lastIdx = lastIdxForPattern[pattern]
          if (lastIdx === undefined || i - lastIdx > dedupeWindow) {
            signals.push({
              timestamp: c.timestamp,
              pattern,
              confidence: round2(score),
            })
            lastIdxForPattern[pattern] = i
          }
        }
      }
    }

    // If capped, keep the most recent signals
    if (opts.maxSignals && signals.length > opts.maxSignals) {
      return signals.slice(-opts.maxSignals)
    }
    return signals
  }

  /**
   * End-to-end: fetch candles for a symbol and detect patterns.
   */
  async detectForSymbol(
    symbol: string,
    options?: {
      limit?: number
      minConfidence?: number
      dedupeWindow?: number
      maxSignals?: number
    }
  ): Promise<PatternSignal[]> {
    const candles = await this.fetchCandles(symbol, options?.limit ?? 100)
    return this.analyzeCandles(candles, {
      minConfidence: options?.minConfidence,
      dedupeWindow: options?.dedupeWindow,
      maxSignals: options?.maxSignals,
    })
  }
}

/*------------------------------------------------------
 * Utils
 *----------------------------------------------------*/

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}
