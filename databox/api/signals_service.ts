export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

export interface Pagination {
  page: number
  pageSize: number
  total?: number
}

export class SignalApiClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private async handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const status = res.status
    if (!res.ok) {
      return { success: false, error: `HTTP ${status}`, status }
    }
    try {
      const data = (await res.json()) as T
      return { success: true, data, status }
    } catch (err: any) {
      return { success: false, error: err.message, status }
    }
  }

  async fetchAllSignals(pagination?: { page?: number; pageSize?: number }): Promise<ApiResponse<Signal[]>> {
    try {
      const params: string[] = []
      if (pagination?.page) params.push(`page=${pagination.page}`)
      if (pagination?.pageSize) params.push(`pageSize=${pagination.pageSize}`)
      const url = `${this.baseUrl}/signals${params.length ? "?" + params.join("&") : ""}`

      const res = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      })
      return this.handleResponse<Signal[]>(res)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      return this.handleResponse<Signal>(res)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async createSignal(signal: Omit<Signal, "id" | "timestamp">): Promise<ApiResponse<Signal>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(signal),
      })
      return this.handleResponse<Signal>(res)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async deleteSignal(id: string): Promise<ApiResponse<null>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      })
      return this.handleResponse<null>(res)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
