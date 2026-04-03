import React from "react"

interface MarketSentimentWidgetProps {
  sentimentScore: number // value from 0 to 100
  trend: "Bullish" | "Bearish" | "Neutral"
  dominantToken: string
  totalVolume24h: number
  updatedAt?: string
}

const getSentimentColor = (score: number): string => {
  if (score >= 70) return "#4caf50" // green
  if (score >= 40) return "#ff9800" // orange
  return "#f44336" // red
}

export const MarketSentimentWidget: React.FC<MarketSentimentWidgetProps> = ({
  sentimentScore,
  trend,
  dominantToken,
  totalVolume24h,
  updatedAt,
}) => {
  return (
    <div className="market-sentiment-widget p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-3">Market Sentiment</h3>
      <div className="flex items-center space-x-4">
        <div
          className="score-circle flex items-center justify-center w-16 h-16 rounded-full text-white font-bold"
          style={{ backgroundColor: getSentimentColor(sentimentScore) }}
        >
          {sentimentScore}%
        </div>
        <ul className="sentiment-details space-y-1">
          <li>
            <strong>Trend:</strong> {trend}
          </li>
          <li>
            <strong>Dominant Token:</strong> {dominantToken}
          </li>
          <li>
            <strong>24h Volume:</strong> ${totalVolume24h.toLocaleString()}
          </li>
          {updatedAt && (
            <li>
              <strong>Updated:</strong> {updatedAt}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default MarketSentimentWidget
