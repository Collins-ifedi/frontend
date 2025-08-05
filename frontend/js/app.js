// Main Application Class
class VoxAIApp {
  constructor() {
    this.currentUser = null
    this.websocket = null
    this.currentMode = "chat"
    this.chatHistory = []
    this.selectedFiles = []
    this.isConnected = false

    this.init()
  }

  async init() {
    this.setupEventListeners()
    this.loadTheme()
    this.loadChatHistory()

    // Check if user is already logged in
    const token = localStorage.getItem("voxai_token")
    if (token) {
      try {
        await this.validateToken(token)
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

    // Social auth
    document.getElementById("googleSignIn").addEventListener("click", () => this.handleGoogleAuth())

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
  }

  // Authentication Methods
  async handleLogin(e) {
    e.preventDefault()
    const email = document.getElementById("loginEmail").value
    const password = document.getElementById("loginPassword").value

    try {
      this.showLoading()
      const response = await fetch("/api/auth/login", {
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
      } else {
        throw new Error(data.detail || "Login failed")
      }
    } catch (error) {
      this.hideLoading()
      this.showError(error.message)
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
      const response = await fetch("/api/auth/signup", {
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
      } else {
        throw new Error(data.detail || "Signup failed")
      }
    } catch (error) {
      this.hideLoading()
      this.showError(error.message)
    }
  }

  async handleVerification(e) {
    e.preventDefault()
    const code = document.getElementById("verificationCode").value

    try {
      this.showLoading()
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.pendingEmail, code }),
      })

      const data = await response.json()

      if (response.ok) {
        this.hideLoading()
        this.hideModal("verificationModal")

        if (data.needsPhoneVerification) {
          // Handle phone verification if needed
          this.showSuccess("Email verified! Please check your phone for SMS verification.")
        } else {
          this.showSuccess("Account verified successfully! Please log in.")
          this.showModal("loginModal")
        }
      } else {
        throw new Error(data.detail || "Verification failed")
      }
    } catch (error) {
      this.hideLoading()
      this.showError(error.message)
    }
  }

  async resendVerificationCode() {
    try {
      const response = await fetch("/api/auth/resend-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.pendingEmail }),
      })

      if (response.ok) {
        this.showSuccess("Verification code resent!")
      } else {
        const data = await response.json()
        throw new Error(data.detail || "Failed to resend code")
      }
    } catch (error) {
      this.showError(error.message)
    }
  }

  async handleGoogleAuth() {
    // This would integrate with Google Sign-In JavaScript API
    this.showError("Google Sign-In integration requires additional setup")
  }

  async validateToken(token) {
    // Decode token to get user info (simplified)
    const payload = JSON.parse(atob(token.split(".")[1]))
    this.currentUser = {
      userId: payload.userId,
      email: payload.sub,
      name: payload.name || "User",
    }
    return true
  }

  // WebSocket Connection
  async connectWebSocket() {
    const token = localStorage.getItem("voxai_token")
    if (!token) {
      throw new Error("No authentication token")
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/ws`

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
    const response = await fetch("/api/generate", {
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

      const response = await fetch("/api/analyze-file", {
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

  showError(message) {
    // Simple error display - could be enhanced with toast notifications
    alert("Error: " + message)
  }

  showSuccess(message) {
    // Simple success display - could be enhanced with toast notifications
    alert(message)
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
