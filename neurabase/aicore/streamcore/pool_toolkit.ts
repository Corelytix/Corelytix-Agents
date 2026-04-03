import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Toolkit exposing liquidity-related actions:
 * – fetch raw pool data
 * – run health / risk analysis on a liquidity pool
 * – validate liquidity consistency across tokens
 * – provide quick metadata summary
 */
export const LIQUIDITY_ANALYSIS_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Helper: list all available liquidity tool keys.
 */
export function listLiquidityToolKeys(): string[] {
  return Object.keys(LIQUIDITY_ANALYSIS_TOOLS)
}

/**
 * Helper: check if a tool is available.
 */
export function hasLiquidityTool(key: string): boolean {
  return key in LIQUIDITY_ANALYSIS_TOOLS
}

/**
 * Helper: run a tool by key with optional payload.
 */
export async function runLiquidityTool<T = unknown>(
  key: string,
  payload?: Record<string, unknown>
): Promise<T> {
  const tool = LIQUIDITY_ANALYSIS_TOOLS[key]
  if (!tool) throw new Error(`Liquidity tool not found: ${key}`)
  // @ts-expect-error - dynamic action execution
  return tool.execute(payload)
}
