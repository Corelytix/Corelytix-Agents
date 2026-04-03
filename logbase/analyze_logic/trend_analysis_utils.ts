export interface PricePoint {
  timestamp: number
  priceUsd: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
  length: number
  startPrice: number
  endPrice: number
}

/**
 * Analyze a series of price points to determine overall trend segments.
 * Splits data into segments of consistent direction, respecting minSegmentLength.
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5
): TrendResult[] {
  const results: TrendResult[] = []
  if (!points || points.length < minSegmentLength) return results

  let segStart = 0
  let lastDirection = 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].priceUsd
    const curr = points[i].priceUsd
    const direction = curr > prev ? 1 : curr < prev ? -1 : 0

    // detect change of direction or reaching last point
    const directionChanged = lastDirection !== 0 && direction !== lastDirection
    const isLastPoint = i === points.length - 1
    const reachedMinLen = i - segStart + 1 >= minSegmentLength

    if ((directionChanged && reachedMinLen) || (isLastPoint && reachedMinLen)) {
      const start = points[segStart]
      const end = points[i]
      const changePct = ((end.priceUsd - start.priceUsd) / start.priceUsd) * 100
      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend: changePct > 0 ? "upward" : changePct < 0 ? "downward" : "neutral",
        changePct: Math.round(changePct * 100) / 100,
        length: i - segStart + 1,
        startPrice: start.priceUsd,
        endPrice: end.priceUsd,
      })
      segStart = i
    }
    if (direction !== 0) {
      lastDirection = direction
    }
  }
  return results
}

/**
 * Utility: summarize overall trend from multiple segments.
 */
export function summarizeTrends(results: TrendResult[]): {
  totalSegments: number
  upward: number
  downward: number
  neutral: number
} {
  return results.reduce(
    (acc, seg) => {
      acc.totalSegments++
      acc[seg.trend]++
      return acc
    },
    { totalSegments: 0, upward: 0, downward: 0, neutral: 0 }
  )
}
