"use client"

import { useEffect, useRef, useState } from "react"
import { AuthManager } from "@/utils/auth"

interface WebSocketManagerProps {
  onMessage: (data: any) => void
  onConnectionChange: (connected: boolean) => void
}

export function WebSocketManager({ onMessage, onConnectionChange }: WebSocketManagerProps) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [])

  const connect = () => {
    // Clear any existing connection
    disconnect()

    const ws = AuthManager.createWebSocketConnection()
    if (!ws) return

    wsRef.current = ws

    ws.onopen = () => {
      console.log("WebSocket connected")
      setIsConnected(true)
      onConnectionChange(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error("WebSocket message parse error:", error)
      }
    }

    ws.onclose = () => {
      console.log("WebSocket disconnected")
      setIsConnected(false)
      onConnectionChange(false)

      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (AuthManager.getToken()) {
          connect()
        }
      }, 3000)
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }

  return { isConnected, sendMessage, connect, disconnect }
}
