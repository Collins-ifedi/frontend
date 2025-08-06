"use client"

import { useState, useEffect } from "react"
import { AuthManager } from "@/utils/auth"

interface User {
  userId: string
  email: string
  name: string
  subscription_plan: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    setIsLoading(true)

    const isValid = await AuthManager.validateToken()
    if (isValid) {
      // Get user data from your backend
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/validate-token`, {
          headers: AuthManager.getAuthHeaders(),
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        AuthManager.removeToken()
      }
    }

    setIsLoading(false)
  }

  const login = async (email: string, password: string) => {
    const result = await AuthManager.login(email, password)
    if (result.success && result.user) {
      setUser(result.user)
      setIsAuthenticated(true)
    }
    return result
  }

  const logout = () => {
    AuthManager.removeToken()
    setUser(null)
    setIsAuthenticated(false)
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus,
  }
}
