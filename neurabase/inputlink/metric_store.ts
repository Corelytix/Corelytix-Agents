export interface MetricEntry {
  key: string
  value: number
  updatedAt: number
  tags?: string[]
  source?: string
}

export class MetricsCache {
  private cache = new Map<string, MetricEntry>()

  get(key: string): MetricEntry | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: number, tags?: string[], source?: string): void {
    this.cache.set(key, { key, value, updatedAt: Date.now(), tags, source })
  }

  hasRecent(key: string, maxAgeMs: number): boolean {
    const entry = this.cache.get(key)
    return !!entry && Date.now() - entry.updatedAt < maxAgeMs
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  entries(): MetricEntry[] {
    return Array.from(this.cache.values())
  }

  /**
   * Retrieve metrics by a given tag.
   */
  findByTag(tag: string): MetricEntry[] {
    return this.entries().filter(e => e.tags?.includes(tag))
  }

  /**
   * Compute average of all metric values.
   */
  average(): number {
    const list = this.entries()
    if (list.length === 0) return 0
    return list.reduce((sum, e) => sum + e.value, 0) / list.length
  }

  /**
   * Prune entries older than given max age.
   */
  prune(maxAgeMs: number): void {
    const now = Date.now()
    for (const [k, v] of this.cache) {
      if (now - v.updatedAt > maxAgeMs) {
        this.cache.delete(k)
      }
    }
  }
}
