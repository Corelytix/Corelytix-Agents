/**
 * Stable identifier for the Solana Knowledge Agent.
 * Used across routing, logging, and invocation.
 */
export const SOLANA_KNOWLEDGE_AGENT_ID = "solana-knowledge-agent" as const

/**
 * Utility: check if a given id matches the Solana agent.
 */
export function isSolanaKnowledgeAgent(id: string): boolean {
  return id === SOLANA_KNOWLEDGE_AGENT_ID
}

/**
 * Utility: return all known agent ids.
 * Extend here as you add more agents.
 */
export function listAgentIds(): string[] {
  return [SOLANA_KNOWLEDGE_AGENT_ID]
}
