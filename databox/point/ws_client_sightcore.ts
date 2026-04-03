export interface SightCoreConfig {
  url: string
  protocols?: string[]
  reconnectIntervalMs?: number
  maxReconnectAttempts?: number
  debug?: boolean
}

export type SightCoreMessage = {
  topic: string
  payload: any
  timestamp: number
}

export class SightCoreWebSocket {
  private socket?: WebSocket
  private url: string
  private protocols?: string[]
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private reconnectAttempts = 0
  private debug: boolean

  constructor(config: SightCoreConfig) {
    this.url = config.url
    this.protocols = config.protocols
    this.reconnectInterval = config.reconnectIntervalMs ?? 5000
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? Infinity
    this.debug = config.debug ?? false
  }

  connect(
    onMessage: (msg: SightCoreMessage) => void,
    onOpen?: () => void,
    onClose?: () => void,
    onError?: (err: Event) => void
  ): void {
    this.log(`Connecting to ${this.url}`)
    this.socket = this.protocols
      ? new WebSocket(this.url, this.protocols)
      : new WebSocket(this.url)

    this.socket.onopen = () => {
      this.log("WebSocket connected")
      this.reconnectAttempts = 0
      onOpen?.()
    }

    this.socket.onmessage = event => {
      try {
        const msg = JSON.parse(event.data) as SightCoreMessage
        onMessage(msg)
      } catch (err) {
        this.log("Invalid message received", err)
      }
    }

    this.socket.onclose = () => {
      this.log("WebSocket closed")
      onClose?.()
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => {
          this.connect(onMessage, onOpen, onClose, onError)
        }, this.reconnectInterval)
      } else {
        this.log("Max reconnect attempts reached")
      }
    }

    this.socket.onerror = (err: Event) => {
      this.log("WebSocket error", err)
      onError?.(err)
      this.socket?.close()
    }
  }

  send(topic: string, payload: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ topic, payload, timestamp: Date.now() })
      this.socket.send(msg)
      this.log("Sent message", msg)
    } else {
      this.log("Cannot send, socket not open")
    }
  }

  disconnect(): void {
    this.log("Disconnecting WebSocket")
    this.socket?.close()
  }

  private log(...args: any[]): void {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log("[SightCoreWebSocket]", ...args)
    }
  }
}
