export interface InputLink {
  id: string
  source: string
  url: string
  metadata?: Record<string, any>
  createdAt?: number
  tags?: string[]
}

export interface InputLinkResult {
  success: boolean
  link?: InputLink
  error?: string
}

export class InputLinkHandler {
  private links = new Map<string, InputLink>()

  register(link: InputLink): InputLinkResult {
    if (this.links.has(link.id)) {
      return { success: false, error: `Link with id "${link.id}" already exists.` }
    }
    this.links.set(link.id, { ...link, createdAt: Date.now() })
    return { success: true, link: this.links.get(link.id) }
  }

  get(id: string): InputLinkResult {
    const link = this.links.get(id)
    if (!link) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    return { success: true, link }
  }

  list(): InputLink[] {
    return Array.from(this.links.values())
  }

  unregister(id: string): boolean {
    return this.links.delete(id)
  }

  /**
   * Update link metadata or tags without replacing the whole link.
   */
  updateMetadata(id: string, metadata: Record<string, any>): InputLinkResult {
    const link = this.links.get(id)
    if (!link) return { success: false, error: `No link found for id "${id}".` }
    const updated: InputLink = { ...link, metadata: { ...link.metadata, ...metadata } }
    this.links.set(id, updated)
    return { success: true, link: updated }
  }

  /**
   * Find all links matching a given tag.
   */
  findByTag(tag: string): InputLink[] {
    return this.list().filter(l => l.tags?.includes(tag))
  }

  /**
   * Clear all stored links.
   */
  clear(): void {
    this.links.clear()
  }
}
