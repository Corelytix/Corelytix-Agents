import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Extended liquidity toolkit:
 * – fetch raw pool data
 * – run health / risk analysis
 * – enumerate registered liquidity actions
 * – validate tool availability before execution
 */
export const EXTENDED_LIQUIDITY_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Get all tool identifiers in this registry.
 */
export function listExtendedLiquidityTools(): string[] {
  return Object.keys(EXTENDED_LIQUIDITY_TOOLS)
}

/**
 * Check if a tool exists in the registry.
 */
export function hasExtendedLiquidityTool(key: string): boolean {
  return key in EXTENDED_LIQUIDITY_TOOLS
}

/**
 * Execute a liquidity tool by key.
 */
export async function runExtendedLiquidityTool<T = unknown>(
  key: string,
  payload?: Record<string, unknown>
): Promise<T> {
  const tool = EXTENDED_LIQUIDITY_TOOLS[key]
  if (!tool) throw new Error(`Liquidity tool not found: ${key}`)
  // @ts-expect-error dynamic action execution
  return tool.execute(payload)
}
