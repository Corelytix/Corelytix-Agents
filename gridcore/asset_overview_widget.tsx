import React, { useEffect, useState } from "react"

interface AssetOverviewPanelProps {
  assetId: string
  apiBase?: string
}

interface AssetOverview {
  name: string
  priceUsd: number
  supply: number
  holders: number
  marketCap?: number
  volume24h?: number
}

export const AssetOverviewPanel: React.FC<AssetOverviewPanelProps> = ({ assetId, apiBase = "/api" }) => {
  const [info, setInfo] = useState<AssetOverview | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchInfo() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${apiBase}/assets/${encodeURIComponent(assetId)}`)
        if (!res.ok) {
          throw new Error(`Failed to fetch asset ${assetId}: ${res.status}`)
        }
        const json = (await res.json()) as AssetOverview
        if (active) setInfo(json)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (active) setError(msg)
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchInfo()
    return () => {
      active = false
    }
  }, [assetId, apiBase])

  if (loading) return <div className="p-4 bg-white rounded shadow">Loading asset overview…</div>
  if (error) return <div className="p-4 bg-red-100 text-red-800 rounded shadow">Error: {error}</div>
  if (!info) return null

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Asset Overview</h2>
      <p><strong>ID:</strong> {assetId}</p>
      <p><strong>Name:</strong> {info.name}</p>
      <p><strong>Price (USD):</strong> ${info.priceUsd.toFixed(2)}</p>
      <p><strong>Circulating Supply:</strong> {info.supply.toLocaleString()}</p>
      <p><strong>Holders:</strong> {info.holders.toLocaleString()}</p>
      {info.marketCap !== undefined && (
        <p><strong>Market Cap (USD):</strong> ${info.marketCap.toLocaleString()}</p>
      )}
      {info.volume24h !== undefined && (
        <p><strong>24h Volume (USD):</strong> ${info.volume24h.toLocaleString()}</p>
      )}
    </div>
  )
}

export default AssetOverviewPanel
