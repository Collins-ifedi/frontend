// Main Application Class
class VoxAIApp {
  constructor() {
    this.API_BASE_URL = "https://voxai-umxl.onrender.com"
    this.currentUser = null
    this.websocket = null
    this.currentMode = "chat"
    this.chatHistory = []
    this.selectedFiles = []
    this.isConnected = false
    this.isRecording = false
    this.mediaRecorder = null
    this.audioChunks = []
    this.speechSynthesis = window.speechSynthesis
    this.speechRecognition = null
    this.isVoiceCallActive = false
    this.audioContext = null
    this.currentSubscription = "free"
    this.googleInitialized = false
    this.google = window.google // Declare the google variable

    this.init()
  }

  async init() {
    this.setupEventListeners()
    this.loadTheme()
    this.loadChatHistory()
    this.initializeGoogleSignIn()

    // Check if user is already logged in
    const token = localStorage.getItem("voxai_token")
    if (token) {
      try {
        // FIXED: Use proper token validation endpoint
        await this.validateTokenWithBackend(token)
        this.showApp()
      } catch (error) {
        console.error("Token validation failed:", error)
        localStorage.removeItem("voxai_token")
        this.showWelcome()
      }
    } else {
      this.showWelcome()
    }
  }

  // FIXED: Proper token validation with backend
  async validateTokenWithBackend(token) {
    const response = await fetch(`${this.API_BASE_URL}/api/auth/validate-token`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Token validation failed")
    }

    const data = await response.json()
    if (data.valid) {
      this.currentUser = data.user
      return true
    } else {
      throw new Error("Invalid token")
    }
  }

  setupEventListeners() {
    // Welcome modal
    document.getElementById("getStartedBtn").addEventListener("click", () => {
      this.hideModal("welcomeModal")
      this.showModal("loginModal")
    })

    // Auth modals
    document.getElementById("showSignup").addEventListener("click", (e) => {
      e.preventDefault()
      this.hideModal("loginModal")
      this.showModal("signupModal")
    })

    document.getElementById("showLogin").addEventListener("click", (e) => {
      e.preventDefault()
      this.hideModal("signupModal")
      this.showModal("loginModal")
    })

    // Auth forms
    document.getElementById("loginForm").addEventListener("submit", (e) => this.handleLogin(e))
    document.getElementById("signupForm").addEventListener("submit", (e) => this.handleSignup(e))
    document.getElementById("verificationForm").addEventListener("submit", (e) => this.handleVerification(e))

    // Resend code
    document.getElementById("resendCode").addEventListener("click", (e) => {
      e.preventDefault()
      this.resendVerificationCode()
    })

    // App navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => this.switchMode(item.dataset.mode))
    })

    // Mobile menu
    document.getElementById("mobileMenuToggle").addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("open")
    })

    // Theme toggle
    document.getElementById("themeToggle").addEventListener("click", () => this.toggleTheme())

    // Chat functionality
    document.getElementById("messageInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    document.getElementById("sendBtn").addEventListener("click", () => this.sendMessage())

    // File handling
    document.getElementById("attachBtn").addEventListener("click", () => {
      document.getElementById("fileInput").click()
    })

    document.getElementById("fileInput").addEventListener("change", (e) => this.handleFileSelect(e))

    // Drag and drop
    const fileUploadArea = document.getElementById("fileUploadArea")
    fileUploadArea.addEventListener("click", () => document.getElementById("fileInput").click())
    fileUploadArea.addEventListener("dragover", (e) => this.handleDragOver(e))
    fileUploadArea.addEventListener("drop", (e) => this.handleFileDrop(e))

    // Quick actions
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("quick-action")) {
        const prompt = e.target.dataset.prompt
        document.getElementById("messageInput").value = prompt
        this.sendMessage()
      }
    })

    // Clear history
    document.getElementById("clearHistory").addEventListener("click", () => this.clearChatHistory())

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => this.logout())

    // Auto-resize textarea
    const messageInput = document.getElementById("messageInput")
    messageInput.addEventListener("input", () => {
      messageInput.style.height = "auto"
      messageInput.style.height = messageInput.scrollHeight + "px"
    })

    // Voice controls
    document.getElementById("sttBtn").addEventListener("click", () => {
      if (this.isRecording) {
        this.stopRecording()
      } else {
        this.startRecording()
      }
    })

    document.getElementById("ttsBtn").addEventListener("click", () => {
      const lastBotMessage = this.getLastBotMessage()
      if (lastBotMessage) {
        this.speakText(lastBotMessage)
      }
    })

    document.getElementById("voiceCallBtn").addEventListener("click", () => {
      this.toggleVoiceCall()
    })

    // Subscription
    document.getElementById("upgradeBtn").addEventListener("click", () => {
      this.showSubscriptionModal()
    })

    // Initialize speech recognition
    this.initializeSpeechRecognition()
  }

  async handleLogin(e) {
    e.preventDefault()
    const email = document.getElementById("loginEmail").value
    const password = document.getElementById("loginPassword").value

    try {
      this.showLoading()
      const response = await fetch(`${this.API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("voxai_token", data.access_token)
        this.currentUser = {
          userId: data.userId,
          email: data.email,
          name: data.name,
        }
        this.hideLoading()
        this.hideModal("loginModal")
        this.showApp()
        this.showToast("Welcome back!", "success")
      } else {
        throw new Error(data.detail || "Login failed")
      }
    } catch (error) {
      this.hideLoading()
      this.showToast(error.message, "error")
    }
  }

  async handleSignup(e) {
    e.preventDefault()
    const name = document.getElementById("signupName").value
    const email = document.getElementById("signupEmail").value
    const password = document.getElementById("signupPassword").value
    const phone = document.getElementById("signupPhone").value

    try {
      this.showLoading()
      const response = await fetch(`${this.API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone }),
      })

      const data = await response.json()

      if (response.ok) {
        this.hideLoading()
        this.hideModal("signupModal")
        this.showModal("verificationModal")
        this.pendingEmail = email
        this.showToast("Account created! Please check your email for verification code.", "success")
      } else {
        throw new Error(data.detail || "Signup failed")
      }
    } catch (error) {
      this.hideLoading()
      this.showToast(error.message, "error")
    }
  }

  async handleVerification(e) {
    e.preventDefault()
    const code = document.getElementById("verificationCode").value

    try {
      this.showLoading()
      const response = await fetch(`${this.API_BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.pendingEmail, code }),
      })

      const data = await response.json()

      if (response.ok) {
        this.hideLoading()
        this.hideModal("verificationModal")

        if (data.needsPhoneVerification) {
          this.showToast("Email verified! Please check your phone for SMS verification.", "success")
        } else {
          this.showToast("Account verified successfully! Please log in.", "success")
          this.showModal("loginModal")
        }
      } else {
        throw new Error(data.detail || "Verification failed")
      }
    } catch (error) {
      this.hideLoading()
      this.showToast(error.message, "error")
    }
  }

  async resendVerificationCode() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/resend-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.pendingEmail }),
      })

      if (response.ok) {
        this.showToast("Verification code resent!", "success")
      } else {
        const data = await response.json()
        throw new Error(data.detail || "Failed to resend code")
      }
    } catch (error) {
      this.showToast(error.message, "error")
    }
  }

  // Google Sign-In implementation
  initializeGoogleSignIn() {
    // Wait for Google Identity Services to load
    if (typeof this.google !== "undefined" && this.google.accounts) {
      this.setupGoogleSignIn()
    } else {
      // Retry after a short delay if Google hasn't loaded yet
      setTimeout(() => this.initializeGoogleSignIn(), 100)
    }
  }

  setupGoogleSignIn() {
    try {
      // Initialize Google Sign-In
      this.google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID", // This should be set from environment or config
        callback: this.handleGoogleSignInResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      // Render the Google Sign-In button
      this.google.accounts.id.renderButton(document.getElementById("googleSignInButton"), {
        theme: "outline",
        size: "large",
        width: "100%",
        text: "continue_with",
      })

      this.googleInitialized = true
    } catch (error) {
      console.error("Failed to initialize Google Sign-In:", error)
      // Fallback: show a simple button
      document.getElementById("googleSignInButton").innerHTML =
        "<button class=\"btn-social google\" onclick=\"app.showToast('Google Sign-In not available', 'error')\">Continue with Google</button>"
    }
  }

  async handleGoogleSignInResponse(response) {
    try {
      this.showLoading()

      // Send the credential to our backend
      const backendResponse = await fetch(`${this.API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      })

      const data = await backendResponse.json()

      if (backendResponse.ok) {
        localStorage.setItem("voxai_token", data.access_token)
        this.currentUser = {
          userId: data.userId,
          email: data.email,
          name: data.name,
        }
        this.hideLoading()
        this.hideModal("loginModal")
        this.showApp()
        this.showToast("Successfully signed in with Google!", "success")
      } else {
        throw new Error(data.detail || "Google sign-in failed")
      }
    } catch (error) {
      this.hideLoading()
      this.showToast(error.message, "error")
    }
  }

  // WebSocket Connection
  async connectWebSocket() {
    const token = localStorage.getItem("voxai_token")
    if (!token) {
      throw new Error("No authentication token")
    }

    const wsUrl = `wss://voxai-umxl.onrender.com/ws`

    this.websocket = new WebSocket(wsUrl)

    return new Promise((resolve, reject) => {
      this.websocket.onopen = () => {
        // Send authentication message
        this.websocket.send(
          JSON.stringify({
            type: "init",
            token: token,
          }),
        )
      }

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.handleWebSocketMessage(data)
        if (!this.isConnected) {
          this.isConnected = true
          resolve()
        }
      }

      this.websocket.onerror = (error) => {
        console.error("WebSocket error:", error)
        reject(error)
      }

      this.websocket.onclose = () => {
        this.isConnected = false
        console.log("WebSocket connection closed")
      }
    })
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case "new_message":
        if (data.sender === "assistant") {
          this.addMessage(data.text, "bot")
          this.removeTypingIndicator()
        }
        break
      default:
        console.log("Unknown message type:", data.type)
    }
  }

  // Chat Functionality
  async sendMessage() {
    const input = document.getElementById("messageInput")
    const message = input.value.trim()

    if (!message && this.selectedFiles.length === 0) return

    // Handle file uploads
    if (this.selectedFiles.length > 0) {
      await this.handleFileUpload(message)
      return
    }

    // Add user message to chat
    this.addMessage(message, "user")
    input.value = ""
    input.style.height = "auto"

    // Show typing indicator
    this.showTypingIndicator()

    try {
      if (this.currentMode === "crypto") {
        await this.handleCryptoQuery(message)
      } else if (this.websocket && this.isConnected) {
        // Send via WebSocket
        this.websocket.send(
          JSON.stringify({
            type: "send_message",
            text: message,
          }),
        )
      } else {
        // Fallback to HTTP API
        await this.sendHttpMessage(message)
      }
    } catch (error) {
      this.removeTypingIndicator()
      this.addMessage("Sorry, I encountered an error processing your request.", "bot")
      console.error("Send message error:", error)
    }
  }

  async sendHttpMessage(message) {
    const token = localStorage.getItem("voxai_token")
    const response = await fetch(`${this.API_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: message,
        userId: this.currentUser.userId,
      }),
    })

    const data = await response.json()
    this.removeTypingIndicator()

    if (response.ok) {
      this.addMessage(data.response, "bot")
    } else {
      throw new Error(data.error || "Request failed")
    }
  }

  async handleCryptoQuery(message) {
    // Simulate crypto analysis response
    this.removeTypingIndicator()

    if (message.toLowerCase().includes("btc") || message.toLowerCase().includes("bitcoin")) {
      this.addCryptoCard({
        symbol: "BTC",
        name: "Bitcoin",
        price: "$45,230.50",
        change: "+2.34%",
        volume: "$28.5B",
        rsi: "65.2",
        trend: "bullish",
      })
    } else {
      this.addMessage(
        "I can help you analyze cryptocurrency data. Try asking about BTC, ETH, or other crypto symbols.",
        "bot",
      )
    }
  }

  async handleFileUpload(prompt) {
    const formData = new FormData()

    if (this.selectedFiles.length > 0) {
      formData.append("file", this.selectedFiles[0])
    }
    formData.append("prompt", prompt || "Analyze this file")

    try {
      this.showTypingIndicator()
      const token = localStorage.getItem("voxai_token")

      const response = await fetch(`${this.API_BASE_URL}/api/analyze-file`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      this.removeTypingIndicator()

      if (response.ok) {
        this.addMessage(data.analysis, "bot")
      } else {
        throw new Error(data.detail || "File analysis failed")
      }
    } catch (error) {
      this.removeTypingIndicator()
      this.addMessage("Sorry, I couldn't analyze the file. Please try again.", "bot")
      console.error("File upload error:", error)
    } finally {
      this.clearSelectedFiles()
    }
  }

  // UI Methods
  addMessage(content, sender) {
    const messagesContainer = document.getElementById("chatMessages")
    const messageDiv = document.createElement("div")
    messageDiv.className = `message ${sender}`

    if (sender === "bot") {
      messageDiv.innerHTML = `
      <div class="bot-avatar">🤖</div>
      <div class="message-content">
        ${this.formatMessage(content)}
      </div>
    `

      // Auto-speak in voice call mode
      if (this.isVoiceCallActive) {
        setTimeout(() => {
          this.speakText(content)
        }, 500)
      }
    } else {
      messageDiv.innerHTML = `
      <div class="message-content">
        ${this.formatMessage(content)}
      </div>
    `
    }

    messagesContainer.appendChild(messageDiv)
    this.scrollToBottom()

    // Save to history
    this.chatHistory.push({ content, sender, timestamp: Date.now() })
    this.saveChatHistory()
  }

  addCryptoCard(data) {
    const messagesContainer = document.getElementById("chatMessages")
    const messageDiv = document.createElement("div")
    messageDiv.className = "message bot"

    const trendClass = data.trend === "bullish" ? "price-positive" : "price-negative"

    messageDiv.innerHTML = `
            <div class="bot-avatar">🤖</div>
            <div class="message-content">
                <div class="crypto-card">
                    <div class="crypto-header">
                        <div>
                            <div class="crypto-symbol">${data.symbol}</div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">${data.name}</div>
                        </div>
                        <div class="crypto-price ${trendClass}">${data.price}</div>
                    </div>
                    <div class="crypto-metrics">
                        <div class="metric">
                            <div class="metric-label">24h Change</div>
                            <div class="metric-value ${trendClass}">${data.change}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Volume</div>
                            <div class="metric-value">${data.volume}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">RSI</div>
                            <div class="metric-value">${data.rsi}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Trend</div>
                            <div class="metric-value ${trendClass}">${data.trend.toUpperCase()}</div>
                        </div>
                    </div>
                </div>
                <p>Based on current market data, ${data.symbol} is showing ${data.trend} signals with an RSI of ${data.rsi}.</p>
            </div>
        `

    messagesContainer.appendChild(messageDiv)
    this.scrollToBottom()
  }

  formatMessage(content) {
    // Basic markdown-like formatting
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>")

    // Handle code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || "javascript"
      return `<pre><code class="language-${language}">${code.trim()}</code><button class="copy-btn" onclick="copyCode(this)">Copy</button></pre>`
    })

    return formatted
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById("chatMessages")
    const typingDiv = document.createElement("div")
    typingDiv.className = "typing-indicator"
    typingDiv.id = "typingIndicator"
    typingDiv.innerHTML = `
            <div class="bot-avatar">🤖</div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `
    messagesContainer.appendChild(typingDiv)
    this.scrollToBottom()
  }

  removeTypingIndicator() {
    const typingIndicator = document.getElementById("typingIndicator")
    if (typingIndicator) {
      typingIndicator.remove()
    }
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById("chatMessages")
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  // File Handling
  handleFileSelect(e) {
    const files = Array.from(e.target.files)
    this.selectedFiles = files
    this.updateFilePreview()
  }

  handleDragOver(e) {
    e.preventDefault()
    e.currentTarget.classList.add("dragover")
  }

  handleFileDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove("dragover")

    const files = Array.from(e.dataTransfer.files)
    this.selectedFiles = files
    this.updateFilePreview()
  }

  updateFilePreview() {
    const preview = document.getElementById("filePreview")

    if (this.selectedFiles.length === 0) {
      preview.style.display = "none"
      return
    }

    preview.style.display = "flex"
    preview.innerHTML = this.selectedFiles
      .map(
        (file, index) => `
            <div class="file-item">
                <span>${file.name}</span>
                <button class="file-remove" onclick="app.removeFile(${index})">×</button>
            </div>
        `,
      )
      .join("")
  }

  removeFile(index) {
    this.selectedFiles.splice(index, 1)
    this.updateFilePreview()
  }

  clearSelectedFiles() {
    this.selectedFiles = []
    this.updateFilePreview()
    document.getElementById("fileInput").value = ""
  }

  // Mode Switching
  switchMode(mode) {
    this.currentMode = mode

    // Update active nav item
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active")
    })
    document.querySelector(`[data-mode="${mode}"]`).classList.add("active")

    // Update header
    const modeNames = {
      chat: "General Chat",
      crypto: "Crypto Assistant",
      document: "Document Analysis",
      image: "Image Analysis",
    }
    document.getElementById("currentMode").textContent = modeNames[mode]

    // Show/hide file upload area
    const fileUploadArea = document.getElementById("fileUploadArea")
    if (mode === "document" || mode === "image") {
      fileUploadArea.style.display = "block"
    } else {
      fileUploadArea.style.display = "none"
    }

    // Close mobile menu
    document.getElementById("sidebar").classList.remove("open")
  }

  // Theme Management
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme")
    const newTheme = currentTheme === "dark" ? "light" : "dark"

    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("voxai_theme", newTheme)

    // Update theme icon
    const themeIcon = document.querySelector(".theme-icon")
    themeIcon.textContent = newTheme === "dark" ? "☀️" : "🌙"
  }

  loadTheme() {
    const savedTheme = localStorage.getItem("voxai_theme") || "light"
    document.documentElement.setAttribute("data-theme", savedTheme)

    const themeIcon = document.querySelector(".theme-icon")
    themeIcon.textContent = savedTheme === "dark" ? "☀️" : "🌙"
  }

  // Chat History Management
  saveChatHistory() {
    localStorage.setItem("voxai_chat_history", JSON.stringify(this.chatHistory))
  }

  loadChatHistory() {
    const saved = localStorage.getItem("voxai_chat_history")
    if (saved) {
      this.chatHistory = JSON.parse(saved)
      // Optionally restore messages to UI
    }
  }

  clearChatHistory() {
    if (confirm("Are you sure you want to clear all chat history?")) {
      this.chatHistory = []
      localStorage.removeItem("voxai_chat_history")

      // Clear UI
      const messagesContainer = document.getElementById("chatMessages")
      messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="bot-avatar">🤖</div>
                    <div class="message-content">
                        <p>Chat history cleared. How can I help you today?</p>
                    </div>
                </div>
            `
    }
  }

  // Toast notification system
  showToast(message, type = "info", duration = 4000) {
    const toastContainer = document.getElementById("toastContainer")
    const toast = document.createElement("div")
    toast.className = `toast toast-${type}`

    // Create toast content
    const icon =
      {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
      }[type] || "ℹ️"

    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `

    // Add toast to container
    toastContainer.appendChild(toast)

    // Animate in
    setTimeout(() => toast.classList.add("show"), 10)

    // Auto remove after duration
    setTimeout(() => {
      toast.classList.remove("show")
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove()
        }
      }, 300)
    }, duration)
  }

  // UI State Management
  showModal(modalId) {
    document.getElementById(modalId).classList.add("show")
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.remove("show")
  }

  showLoading() {
    document.getElementById("loadingOverlay").style.display = "flex"
  }

  hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none"
  }

  showWelcome() {
    this.showModal("welcomeModal")
  }

  async showApp() {
    document.getElementById("app").style.display = "flex"
    document.getElementById("userName").textContent = this.currentUser.name

    // Connect WebSocket
    try {
      await this.connectWebSocket()
    } catch (error) {
      console.error("WebSocket connection failed:", error)
      // Continue with HTTP fallback
    }
  }

  logout() {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("voxai_token")
      localStorage.removeItem("voxai_chat_history")

      if (this.websocket) {
        this.websocket.close()
      }

      this.currentUser = null
      this.isConnected = false

      document.getElementById("app").style.display = "none"
      this.showWelcome()
    }
  }

  initializeSpeechRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.speechRecognition = new SpeechRecognition()
      this.speechRecognition.continuous = false
      this.speechRecognition.interimResults = false
      this.speechRecognition.lang = "en-US"

      this.speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        document.getElementById("messageInput").value = transcript
        this.stopRecording()
      }

      this.speechRecognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        this.stopRecording()
      }

      this.speechRecognition.onend = () => {
        this.stopRecording()
      }
    }
  }

  startRecording() {
    if (!this.speechRecognition) {
      this.showToast("Speech recognition not supported in this browser", "error")
      return
    }

    this.isRecording = true
    document.getElementById("sttBtn").classList.add("recording")
    this.speechRecognition.start()
  }

  stopRecording() {
    if (this.speechRecognition && this.isRecording) {
      this.speechRecognition.stop()
    }
    this.isRecording = false
    document.getElementById("sttBtn").classList.remove("recording")
  }

  speakText(text) {
    if (this.speechSynthesis) {
      // Cancel any ongoing speech
      this.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      // Use a more natural voice if available
      const voices = this.speechSynthesis.getVoices()
      const preferredVoice = voices.find(
        (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.lang.startsWith("en"),
      )
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      this.speechSynthesis.speak(utterance)
    }
  }

  toggleVoiceCall() {
    this.isVoiceCallActive = !this.isVoiceCallActive
    const voiceCallBtn = document.getElementById("voiceCallBtn")

    if (this.isVoiceCallActive) {
      voiceCallBtn.classList.add("active")
      voiceCallBtn.innerHTML = '<span class="voice-icon">📞</span>'
      this.showToast("Voice call mode activated", "success")
    } else {
      voiceCallBtn.classList.remove("active")
      voiceCallBtn.innerHTML = '<span class="voice-icon">🎤</span>'
      this.speechSynthesis.cancel()
    }
  }

  // Stripe Integration Methods
  async createCheckoutSession(priceId) {
    try {
      const token = localStorage.getItem("voxai_token")
      const response = await fetch(`${this.API_BASE_URL}/api/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (response.ok) {
        // FIXED: Use the URL returned from backend instead of constructing manually
        window.location.href = data.url
      } else {
        throw new Error(data.detail || "Failed to create checkout session")
      }
    } catch (error) {
      this.showToast(error.message, "error")
    }
  }

  // FIXED: Dynamic subscription modal loading
  async showSubscriptionModal() {
    this.showModal("subscriptionModal")
    await this.loadSubscriptionPlans()
  }

  async loadSubscriptionPlans() {
    const pricingPlansContainer = document.getElementById("pricingPlans")

    try {
      // Show loading state
      pricingPlansContainer.innerHTML = `
        <div class="loading-plans">
          <div class="loading-spinner"></div>
          <p>Loading plans...</p>
        </div>
      `

      const response = await fetch(`${this.API_BASE_URL}/api/subscription-plans`)
      const data = await response.json()

      if (response.ok && data.plans) {
        this.renderSubscriptionPlans(data.plans)
      } else {
        throw new Error("Failed to load subscription plans")
      }
    } catch (error) {
      console.error("Error loading subscription plans:", error)
      // Show fallback plans
      this.renderFallbackPlans()
    }
  }

  renderSubscriptionPlans(plans) {
    const pricingPlansContainer = document.getElementById("pricingPlans")

    pricingPlansContainer.innerHTML = plans
      .map((plan) => {
        const price = plan.price === 0 ? "Free" : `$${(plan.price / 100).toFixed(0)}`
        const interval = plan.interval === "month" ? "/month" : `/${plan.interval}`
        const isCurrentPlan = plan.id === "free" // Assume free for now
        const isFeatured = plan.id !== "free"

        return `
        <div class="plan ${isFeatured ? "featured" : ""}">
          <h3>${plan.name}</h3>
          <div class="price">${price}<span>${plan.price === 0 ? "" : interval}</span></div>
          <ul>
            ${plan.features.map((feature) => `<li>${feature.startsWith("✓") || feature.startsWith("✗") ? feature : "✓ " + feature}</li>`).join("")}
          </ul>
          <button 
            class="${isCurrentPlan ? "btn-secondary" : "btn-primary"}" 
            ${isCurrentPlan ? "disabled" : `onclick="app.createCheckoutSession('${plan.id}')"`}
          >
            ${isCurrentPlan ? "Current Plan" : "Upgrade Now"}
          </button>
        </div>
      `
      })
      .join("")
  }

  renderFallbackPlans() {
    const pricingPlansContainer = document.getElementById("pricingPlans")

    pricingPlansContainer.innerHTML = `
      <div class="plan">
        <h3>Free</h3>
        <div class="price">$0<span>/month</span></div>
        <ul>
          <li>✓ Basic chat features</li>
          <li>✓ Limited file uploads</li>
          <li>✓ Basic crypto analysis</li>
          <li>✗ Voice features</li>
          <li>✗ Priority support</li>
        </ul>
        <button class="btn-secondary" disabled>Current Plan</button>
      </div>
      <div class="plan featured">
        <h3>Pro</h3>
        <div class="price">$19<span>/month</span></div>
        <ul>
          <li>✓ Unlimited chat</li>
          <li>✓ Unlimited file uploads</li>
          <li>✓ Advanced crypto analysis</li>
          <li>✓ Voice features</li>
          <li>✓ Priority support</li>
        </ul>
        <button class="btn-primary" onclick="app.createCheckoutSession('price_pro_monthly')">Upgrade Now</button>
      </div>
    `
  }

  getLastBotMessage() {
    const messages = document.querySelectorAll(".message.bot .message-content")
    if (messages.length > 0) {
      return messages[messages.length - 1].textContent
    }
    return null
  }
}

// Global functions for inline event handlers
window.copyCode = (button) => {
  const code = button.parentElement.querySelector("code")
  navigator.clipboard.writeText(code.textContent).then(() => {
    button.textContent = "Copied!"
    setTimeout(() => {
      button.textContent = "Copy"
    }, 2000)
  })
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new VoxAIApp()
  // Handle Prism.js code highlighting
  if (typeof window.Prism !== "undefined") {
    window.Prism.highlightAll()
  }
})
