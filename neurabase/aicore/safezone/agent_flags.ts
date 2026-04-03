export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canExplainConsensus?: boolean
  canGuideValidators?: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  allowMultiStep?: boolean
  enforceStrictJson?: boolean
}

export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = {
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canExplainConsensus: true,
  canGuideValidators: false,
}

export const SOLANA_AGENT_FLAGS: AgentFlags = {
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
  allowMultiStep: false,
  enforceStrictJson: true,
}

/**
 * Utility to check if a given capability is enabled.
 */
export function hasCapability(
  capabilities: AgentCapabilities,
  key: keyof AgentCapabilities
): boolean {
  return capabilities[key] === true
}

/**
 * Merge two flag objects into a stricter set.
 * If any flag is true, the merged flag is true.
 */
export function mergeFlags(a: AgentFlags, b: AgentFlags): AgentFlags {
  return {
    requiresExactInvocation: a.requiresExactInvocation || b.requiresExactInvocation,
    noAdditionalCommentary: a.noAdditionalCommentary || b.noAdditionalCommentary,
    allowMultiStep: a.allowMultiStep || b.allowMultiStep,
    enforceStrictJson: a.enforceStrictJson || b.enforceStrictJson,
  }
}
