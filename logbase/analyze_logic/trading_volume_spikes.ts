export interface VolumePoint {
  timestamp: number
  volumeUsd: number
}

export interface SpikeEvent {
  timestamp: number
  volume: number
  spikeRatio: number
  avgWindow: number
  windowStart: number
  windowEnd: number
}

/**
 * Detect spikes in trading volume compared to a rolling average window.
 */
export function detectVolumeSpikes(
  points: VolumePoint[],
  windowSize: number = 10,
  spikeThreshold: number = 2.0
): SpikeEvent[] {
  const events: SpikeEvent[] = []
  if (!points || points.length < windowSize) return events

  const volumes = points.map(p => p.volumeUsd)

  for (let i = windowSize; i < volumes.length; i++) {
    const window = volumes.slice(i - windowSize, i)
    const avg = window.reduce((sum, v) => sum + v, 0) / window.length
    const curr = volumes[i]
    const ratio = avg > 0 ? curr / avg : Infinity

    if (ratio >= spikeThreshold) {
      const start = points[i - windowSize].timestamp
      const end = points[i - 1].timestamp
      events.push({
        timestamp: points[i].timestamp,
        volume: curr,
        spikeRatio: Math.round(ratio * 100) / 100,
        avgWindow: Math.round(avg * 100) / 100,
        windowStart: start,
        windowEnd: end,
      })
    }
  }

  return events
}

/**
 * Summarize spike detection results.
 */
export function summarizeSpikes(events: SpikeEvent[]): {
  count: number
  maxSpikeRatio: number
  avgSpikeRatio: number
} {
  if (!events.length) return { count: 0, maxSpikeRatio: 0, avgSpikeRatio: 0 }
  const ratios = events.map(e => e.spikeRatio)
  const max = Math.max(...ratios)
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length
  return {
    count: events.length,
    maxSpikeRatio: Math.round(max * 100) / 100,
    avgSpikeRatio: Math.round(avg * 100) / 100,
  }
}
