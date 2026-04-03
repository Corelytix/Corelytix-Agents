import type { SightCoreMessage } from "./web_socket_client"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: any
  lastTimestamp: number
  firstTimestamp?: number
}

export class SignalAggregator {
  private counts: Record<string, AggregatedSignal> = {}

  /**
   * Process an incoming message and update aggregation state.
   */
  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg
    let entry = this.counts[topic]

    if (!entry) {
      entry = {
        topic,
        count: 0,
        lastPayload: null,
        lastTimestamp: 0,
        firstTimestamp: timestamp,
      }
    }

    entry.count += 1
    entry.lastPayload = payload
    entry.lastTimestamp = timestamp
    this.counts[topic] = entry
    return entry
  }

  /**
   * Get aggregated info for a specific topic.
   */
  getAggregated(topic: string): AggregatedSignal | undefined {
    return this.counts[topic]
  }

  /**
   * Get aggregated info for all topics.
   */
  getAllAggregated(): AggregatedSignal[] {
    return Object.values(this.counts)
  }

  /**
   * Compute stats for a given topic (rate per second).
   */
  getStats(topic: string): { topic: string; ratePerSec: number; total: number } | undefined {
    const entry = this.counts[topic]
    if (!entry || !entry.firstTimestamp) return undefined
    const durationSec = (entry.lastTimestamp - entry.firstTimestamp) / 1000
    const rate = durationSec > 0 ? entry.count / durationSec : entry.count
    return { topic, ratePerSec: Number(rate.toFixed(2)), total: entry.count }
  }

  /**
   * Reset all aggregations.
   */
  reset(): void {
    this.counts = {}
  }
}
