import type { Signal } from "./signal_api_client"

/**
 * Processes raw signals into actionable events.
 */
export class SignalProcessor {
  /**
   * Filter signals by type and recency.
   * @param signals Array of Signal
   * @param type Desired signal type
   * @param sinceTimestamp Only include signals after this time
   */
  filter(signals: Signal[], type: string, sinceTimestamp: number): Signal[] {
    return signals.filter(s => s.type === type && s.timestamp > sinceTimestamp)
  }

  /**
   * Aggregate signals by type, counting occurrences.
   * @param signals Array of Signal
   */
  aggregateByType(signals: Signal[]): Record<string, number> {
    return signals.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Group signals by type into arrays.
   * @param signals Array of Signal
   */
  groupByType(signals: Signal[]): Record<string, Signal[]> {
    return signals.reduce((acc, s) => {
      if (!acc[s.type]) acc[s.type] = []
      acc[s.type].push(s)
      return acc
    }, {} as Record<string, Signal[]>)
  }

  /**
   * Compute basic stats for a set of signals.
   * @param signals Array of Signal
   */
  computeStats(signals: Signal[]): { total: number; earliest?: number; latest?: number } {
    if (signals.length === 0) return { total: 0 }
    const times = signals.map(s => s.timestamp)
    return {
      total: signals.length,
      earliest: Math.min(...times),
      latest: Math.max(...times),
    }
  }

  /**
   * Transform a signal into a human-readable summary string.
   */
  summarize(signal: Signal): string {
    const time = new Date(signal.timestamp).toISOString()
    return `[${time}] ${signal.type.toUpperCase()}: ${JSON.stringify(signal.payload)}`
  }

  /**
   * Bulk summarize all signals into readable strings.
   */
  summarizeAll(signals: Signal[]): string[] {
    return signals.map(s => this.summarize(s))
  }
}
