export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  network?: string
  gasLimit?: number
  dryRun?: boolean
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  deployedAt?: number
  network?: string
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  /**
   * Deploy a contract using the provided configuration.
   * Supports optional dry-run and gas limit parameters.
   */
  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, dryRun, gasLimit, network } =
      this.config
    try {
      const res = await fetch(deployEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ contractName, parameters, dryRun, gasLimit, network }),
      })
      if (!res.ok) {
        const text = await res.text()
        return {
          success: false,
          error: `HTTP ${res.status}: ${text}`,
          network,
        }
      }
      const json = await res.json()
      return {
        success: true,
        address: json.contractAddress,
        transactionHash: json.txHash,
        deployedAt: Date.now(),
        network,
      }
    } catch (err: any) {
      return { success: false, error: err.message, network }
    }
  }

  /**
   * Run a connectivity check on the deploy endpoint.
   */
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(this.config.deployEndpoint, { method: "HEAD" })
      return res.ok
    } catch {
      return false
    }
  }
}
