"use client"

import type React from "react"
import { useAuth } from "@/hooks/useAuth"
import { AuthManager } from "@/utils/auth"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Mic,
  MicOff,
  Send,
  Settings,
  LogOut,
  Plus,
  Upload,
  Crown,
  Moon,
  Sun,
  Menu,
  X,
  Volume2,
  VolumeX,
  Trash2,
  Mail,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import type { SpeechRecognition } from "types/speech-recognition" // Assuming SpeechRecognition is imported from a custom types file

// Types
interface AppUser {
  userId: string
  email: string
  name: string
  subscription_plan: string
  isGuest?: boolean
}

interface Message {
  id: string
  text: string
  sender: "user" | "assistant"
  timestamp: number
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  timestamp: number
}

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: string
  features: string[]
  current: boolean
}

// Main App Component
export default function VoxaroidApp() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([])
  const [dailyUsage, setDailyUsage] = useState({ messages: 0, limit: 10 })
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    code: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://voxai-umxl.onrender.com"
  const [authStep, setAuthStep] = useState("login") // Declare setAuthStep and authStep

  const sendMessage = async (message: string | null) => {
    // Placeholder for sendMessage function
  }

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    const savedTheme = localStorage.getItem("voxaroid_theme")
    if (savedTheme === "dark") {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }

    initializeVoiceRecognition()
  }

  const initializeVoiceRecognition = () => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()

      recognitionInstance.continuous = false
      recognitionInstance.interimResults = true
      recognitionInstance.lang = "en-US"

      recognitionInstance.onstart = () => setIsListening(true)
      recognitionInstance.onend = () => setIsListening(false)

      recognitionInstance.onresult = (event) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setInputMessage(finalTranscript)
        }
      }

      setRecognition(recognitionInstance)
    }
  }

  const speakText = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 0.8
    window.speechSynthesis.speak(utterance)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthStep("login") // Use setAuthStep
    setFormErrors({})

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        login(data.access_token)
      } else {
        setFormErrors({ general: data.error || "Login failed" })
      }
    } catch (error) {
      setFormErrors({ general: "Network error. Please try again." })
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthStep("signup") // Use setAuthStep
    setFormErrors({})

    if (formData.password !== formData.confirmPassword) {
      setFormErrors({ confirmPassword: "Passwords do not match" })
      return
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setAuthStep("verify-email") // Use setAuthStep
      } else {
        setFormErrors({ general: data.error || "Signup failed" })
      }
    } catch (error) {
      setFormErrors({ general: "Network error. Please try again." })
    }
  }

  const handleEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthStep("verify-email") // Use setAuthStep
    setFormErrors({})

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: formData.code,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.needsPhoneVerification) {
          setAuthStep("verify-phone") // Use setAuthStep
        } else {
          login(data.access_token)
        }
      } else {
        setFormErrors({ code: data.error || "Invalid verification code" })
      }
    } catch (error) {
      setFormErrors({ code: "Network error. Please try again." })
    }
  }

  const handleGuestLogin = () => {
    const guestUser: AppUser = {
      userId: `guest_${Date.now()}`,
      email: "guest@voxaroid.com",
      name: "Guest User",
      subscription_plan: "guest",
      isGuest: true,
    }
    login(null, guestUser)
    setDailyUsage({ messages: 0, limit: 5 })
  }

  const startNewChat = () => {
    const newChatId = `chat_${Date.now()}`
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      timestamp: Date.now(),
    }

    setChats((prev) => [newChat, ...prev])
    setCurrentChatId(newChatId)
    setMessages([])

    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: `Hello! I'm Voxaroid, your AI assistant. I can help you with various tasks including analyzing documents, images, and providing insights. ${user?.isGuest ? "As a guest, you have 5 messages available." : "How can I assist you today?"}`,
      sender: "assistant",
      timestamp: Date.now(),
    }
    setMessages([welcomeMessage])
  }

  const handleWebSocketMessage = (data: any) => {
    if (data.type === "new_message") {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: data.text,
        sender: data.sender,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, newMessage])
      setIsTyping(false)

      if (data.sender === "assistant" && isVoiceEnabled) {
        speakText(data.text)
      }
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("prompt", "Please analyze this file and provide insights.")

    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-file`, {
        method: "POST",
        headers: AuthManager.getAuthHeaders(),
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        const analysisMessage: Message = {
          id: Date.now().toString(),
          text: data.analysis,
          sender: "assistant",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, analysisMessage])
      } else {
        console.error("File analysis failed:", data.error)
      }
    } catch (error) {
      console.error("File upload error:", error)
    } finally {
      setIsUploading(false)
      setSelectedFile(null)
    }
  }

  const handleSubscription = async (planId: string) => {
    window.open(`https://your-lemonsqueezy-store.lemonsqueezy.com/checkout/buy/${planId}`, "_blank")
  }

  const toggleVoiceRecognition = () => {
    if (!recognition) return

    if (isListening) {
      recognition.stop()
    } else {
      recognition.start()
    }
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
    localStorage.setItem("voxaroid_theme", !isDarkMode ? "dark" : "light")
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading Voxaroid...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="text-white font-bold text-2xl">V</div>
              </div>
            </div>
            <CardTitle className="text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription>Sign in to your Voxaroid account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authStep} onValueChange={(value) => setAuthStep(value as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  {formErrors.general && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{formErrors.general}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="tel"
                      placeholder="Phone (Optional)"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                    {formErrors.confirmPassword && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.confirmPassword}</p>
                    )}
                  </div>
                  {formErrors.general && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{formErrors.general}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="verify-email">
                <form onSubmit={handleEmailVerification} className="space-y-4">
                  <div className="text-center mb-4">
                    <Mail className="w-12 h-12 mx-auto text-green-600 mb-2" />
                    <p className="text-sm text-gray-600">Code sent to {formData.email}</p>
                  </div>
                  <div>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={formData.code}
                      onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                      required
                    />
                    {formErrors.code && <p className="text-sm text-red-600 mt-1">{formErrors.code}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify Email
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 space-y-3">
              <Separator />
              <Button variant="outline" onClick={handleGuestLogin} className="w-full bg-transparent">
                <Mail className="w-4 h-4 mr-2" />
                Continue as Guest
              </Button>
              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={toggleTheme}>
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div
        className={`${isSidebarOpen ? "w-64" : "w-0"} transition-all duration-300 overflow-hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <div className="text-white font-bold text-sm">V</div>
            </div>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900 dark:text-white">Voxaroid</h1>
              <Badge variant="secondary" className="text-xs">
                {user?.subscription_plan || "Free"}
              </Badge>
            </div>
          </div>
          <Button onClick={startNewChat} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Daily Usage</div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Messages</span>
            <span className="text-sm font-medium">
              {dailyUsage.messages}/{dailyUsage.limit}
            </span>
          </div>
          <Progress value={(dailyUsage.messages / dailyUsage.limit) * 100} className="mb-3" />
          {user?.subscription_plan === "free" && (
            <Button size="sm" onClick={() => setIsSubscriptionOpen(true)} className="w-full">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  currentChatId === chat.id
                    ? "bg-indigo-100 dark:bg-indigo-900"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={() => {
                  setCurrentChatId(chat.id)
                  setMessages(chat.messages)
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-gray-500">{new Date(chat.timestamp).toLocaleDateString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setChats((prev) => prev.filter((c) => c.id !== chat.id))
                      if (currentChatId === chat.id) {
                        setCurrentChatId(null)
                        setMessages([])
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={toggleTheme}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={isVoiceEnabled ? "text-indigo-600" : ""}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button size="sm" variant="ghost" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-3">
              <Menu className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold">Voxaroid Assistant</h2>
            {user?.subscription_plan === "premium" && (
              <Badge className="ml-3 bg-gradient-to-r from-yellow-400 to-yellow-600">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center text-sm ${isConnected ? "text-green-600" : "text-red-600"}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? "bg-green-600" : "bg-red-600"}`} />
              {isConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="text-white font-bold text-2xl">V</div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Welcome to Voxaroid</h3>
                <p className="text-gray-600 dark:text-gray-400">Start a conversation or upload a file to analyze</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.sender === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-2 ${message.sender === "user" ? "text-indigo-200" : "text-gray-500"}`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            {selectedFile && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Upload className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="text-sm">{selectedFile.name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="flex items-end space-x-3">
              <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleVoiceRecognition}
                className={isListening ? "text-red-600" : ""}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <div className="flex-1">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message or use voice..."
                  className="min-h-[44px] max-h-32 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(null)
                    }
                  }}
                />
              </div>
              <Button onClick={() => sendMessage(null)} disabled={!inputMessage.trim() || !isConnected}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setSelectedFile(file)
            handleFileUpload(file)
          }
        }}
      />

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Customize your Voxaroid experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Account</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-gray-600">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <Badge variant="secondary">{user?.subscription_plan}</Badge>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3">Preferences</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Dark Mode</span>
                  <Button size="sm" variant="ghost" onClick={toggleTheme}>
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Voice Output</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                    className={isVoiceEnabled ? "text-indigo-600" : ""}
                  >
                    {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubscriptionOpen} onOpenChange={setIsSubscriptionOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>Upgrade to unlock unlimited messages and premium features</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.name === "Pro" ? "border-indigo-600" : ""}`}>
                {plan.name === "Pro" && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-indigo-600">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {plan.name}
                    {plan.name === "Premium" && <Crown className="w-4 h-4 ml-2 text-yellow-600" />}
                  </CardTitle>
                  <div className="text-2xl font-bold">
                    ${plan.price / 100}
                    <span className="text-sm text-gray-600">/{plan.interval}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.current ? "secondary" : "default"}
                    onClick={() => (plan.current ? null : handleSubscription(plan.id))}
                    disabled={plan.current}
                  >
                    {plan.current ? "Current Plan" : `Subscribe to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
