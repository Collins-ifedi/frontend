// Frontend JWT handling utilities
export class AuthManager {
  private static readonly TOKEN_KEY = "voxaroid_token"
  private static readonly BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://voxai-umxl.onrender.com"

  // Store JWT token from backend
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  // Get stored JWT token
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  // Remove JWT token
  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY)
  }

  // Create Authorization header for API calls
  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Validate token with backend
  static async validateToken(): Promise<boolean> {
    const token = this.getToken()
    if (!token) return false

    try {
      const response = await fetch(`${this.BACKEND_URL}/api/auth/validate-token`, {
        headers: this.getAuthHeaders(),
      })
      return response.ok
    } catch {
      return false
    }
  }

  // Login and store token
  static async login(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store the JWT token that your Server.py created
        this.setToken(data.access_token)
        return {
          success: true,
          user: {
            userId: data.userId,
            email: data.email,
            name: data.name,
          },
        }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  // WebSocket connection with JWT
  static createWebSocketConnection(): WebSocket | null {
    const token = this.getToken()
    if (!token) return null

    const wsUrl = this.BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws"
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      // Send JWT token for WebSocket authentication
      ws.send(
        JSON.stringify({
          type: "init",
          token: token, // Your Server.py expects this
        }),
      )
    }

    return ws
  }
}
