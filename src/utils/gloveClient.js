import { io } from 'socket.io-client'

// WebSocket client for connecting to glove backend
class GloveClient {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.onDataCallback = null
    this.onStatusCallback = null
  }

  // Connect to the backend WebSocket server
  connect(backendUrl = 'http://localhost:5000', onData, onStatus) {
    this.onDataCallback = onData
    this.onStatusCallback = onStatus

    console.log('🔌 [GloveClient] Attempting to connect to:', backendUrl)

    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    })

    // Connection established
    this.socket.on('connect', () => {
      this.isConnected = true
      console.log('✅ [GloveClient] Connected to glove backend')
      if (this.onStatusCallback) {
        this.onStatusCallback('connected')
      }
    })

    // Connection lost
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false
      console.log('❌ [GloveClient] Disconnected:', reason)
      if (this.onStatusCallback) {
        this.onStatusCallback('disconnected')
      }
    })

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('⚠️ [GloveClient] Connection error:', error.message)
      if (this.onStatusCallback) {
        this.onStatusCallback('error')
      }
    })

    // Receive glove data from backend
    this.socket.on('glove_data', (data) => {
      console.log('📦 [GloveClient] Raw glove data received:', data)

      if (this.onDataCallback) {
        this.onDataCallback(data)
      }
    })

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 [GloveClient] Reconnection attempt #${attemptNumber}`)
    })

    // Successfully reconnected
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ [GloveClient] Reconnected after ${attemptNumber} attempts`)
    })
  }

  // Disconnect from the backend
  disconnect() {
    if (this.socket) {
      console.log('🔌 [GloveClient] Disconnecting...')
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  // Get connection status
  getStatus() {
    return this.isConnected ? 'connected' : 'disconnected'
  }
}

// Export singleton instance
export const gloveClient = new GloveClient()
