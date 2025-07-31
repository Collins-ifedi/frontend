class VoxaroidChat {
  constructor() {
    this.currentUser = null
    this.currentChatId = null
    this.websocket = null
    this.isConnected = false
    this.chatHistory = this.loadChatHistory()
    this.settings = this.loadSettings()
    this.isTyping = false
    this.currentTypingMessage = null
    this.typingSpeed = 30 // milliseconds per character

    // Voice recognition and synthesis
    this.recognition = null
    this.synthesis = window.speechSynthesis
    this.isListening = false
    this.isVoiceEnabled = true

    // Subscription and usage tracking
    this.userPlan = this.loadUserPlan()
    this.dailyUsage = this.loadDailyUsage()

    // Stripe integration
    this.stripe = null
    this.stripeApiKey = "stripe_api_key" // Replace with your actual Stripe publishable key

    // Phone input
    this.phoneInput = null

    // Social login
    this.googleAuth = null
    this.appleAuth = null

    // Backend URL - Update this to match your backend
    this.backendUrl = "https://voxai-umxl.onrender.com"
    this.wsUrl = this.backendUrl.replace("https://", "wss://").replace("http://", "ws://") + "/ws"

    // Guest mode
    this.isGuestMode = false

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.setupVoiceRecognition()
    this.setupPhoneInput() // Keep existing
    this.setupSocialLogin()
    this.setupStripe()
    this.applySettings()
    this.checkAuthStatus()
    this.updateUsageDisplay()
  }

  setupEventListeners() {
    // Login form events
    document.getElementById("sendVerificationBtn").addEventListener("click", () => this.sendVerificationCode())
    document.getElementById("verifyCodeBtn").addEventListener("click", () => this.verifyCode())
    document.getElementById("backToEmailBtn").addEventListener("click", () => this.showLoginForm())

    // Social login events
    document.getElementById("googleSignIn").addEventListener("click", () => this.signInWithGoogle())
    document.getElementById("appleSignIn").addEventListener("click", () => this.signInWithApple())

    // Chat interface events
    document.getElementById("newChatBtn").addEventListener("click", () => this.startNewChat())
    document.getElementById("sendBtn").addEventListener("click", () => this.sendMessage())
    document.getElementById("messageInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })
    document.getElementById("messageInput").addEventListener("input", () => this.handleInputChange())

    // Subscription events
    document.getElementById("upgradeBtn").addEventListener("click", () => this.openSubscriptionModal())
    document.getElementById("upgradeFromWarning").addEventListener("click", () => this.openSubscriptionModal())
    document.getElementById("managePlanBtn").addEventListener("click", () => this.openSubscriptionModal())
    document.getElementById("subscribeProBtn").addEventListener("click", () => this.subscribeToPlan("pro"))
    document.getElementById("subscribePremiumBtn").addEventListener("click", () => this.subscribeToPlan("premium"))
    document.getElementById("closeSubscriptionBtn").addEventListener("click", () => this.closeSubscriptionModal())

    // Voice events
    document.getElementById("voiceBtn").addEventListener("click", () => this.toggleVoiceRecognition())
    document.getElementById("voiceToggle").addEventListener("click", () => this.toggleVoiceOutput())
    document.getElementById("voiceOutputToggle").addEventListener("click", () => this.toggleVoiceOutput())
    document.getElementById("timestampToggle").addEventListener("click", () => this.toggleTimestamps())
    document.getElementById("voiceSpeed").addEventListener("change", () => this.updateVoiceSettings())
    document.getElementById("voicePitch").addEventListener("change", () => this.updateVoiceSettings())

    // Sidebar and mobile events
    document.getElementById("sidebarToggle").addEventListener("click", () => this.toggleSidebar())
    document.getElementById("mobileOverlay").addEventListener("click", () => this.closeSidebar())
    document.getElementById("closeSidebarBtn").addEventListener("click", () => this.closeSidebar())

    // Settings events
    document.getElementById("settingsBtn").addEventListener("click", () => this.openSettings())
    document.getElementById("closeSettingsBtn").addEventListener("click", () => this.closeSettings())
    document.getElementById("themeToggle").addEventListener("click", () => this.toggleTheme())
    document.getElementById("themeToggleSettings").addEventListener("click", () => this.toggleTheme())
    document.getElementById("fontFamily").addEventListener("change", () => this.updateFontSettings())
    document.getElementById("fontSize").addEventListener("change", () => this.updateFontSettings())
    document.getElementById("clearDataBtn").addEventListener("click", () => this.clearAllData())

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => this.logout())

    // Auto-resize textarea
    const messageInput = document.getElementById("messageInput")
    messageInput.addEventListener("input", function () {
      this.style.height = "auto"
      this.style.height = Math.min(this.scrollHeight, 120) + "px"
    })

    // Form navigation events
    document.getElementById("showSignupBtn").addEventListener("click", () => this.showSignupForm())
    document.getElementById("showLoginBtn").addEventListener("click", () => this.showLoginForm())
    document.getElementById("continueAsGuestBtn").addEventListener("click", () => this.continueAsGuest())

    // Form submission events
    document.getElementById("signupFormElement").addEventListener("submit", (e) => {
      e.preventDefault()
      this.signupWithCredentials()
    })

    document.getElementById("emailVerifyFormElement").addEventListener("submit", (e) => {
      e.preventDefault()
      this.verifyEmail()
    })

    document.getElementById("phoneVerifyFormElement").addEventListener("submit", (e) => {
      e.preventDefault()
      this.verifyPhone()
    })

    // Verification code resend events
    document.getElementById("resendEmailCode").addEventListener("click", () => this.resendEmailCode())
    document.getElementById("resendPhoneCode").addEventListener("click", () => this.resendPhoneCode())
    document.getElementById("skipPhoneVerification").addEventListener("click", () => this.skipPhoneVerification())

    // Theme toggle for login
    document.getElementById("themeToggleLogin").addEventListener("click", () => this.toggleTheme())

    // Auto-format verification codes
    document.getElementById("emailCode").addEventListener("input", (e) => this.formatVerificationCode(e))
    document.getElementById("phoneCode").addEventListener("input", (e) => this.formatVerificationCode(e))
    document.getElementById("codeInput").addEventListener("input", (e) => this.formatVerificationCode(e))
  }

  // Phone Input Setup
  setupPhoneInput() {
    const phoneInputElement = document.getElementById("phoneInput")
    if (phoneInputElement) {
      this.phoneInput = window.intlTelInput(phoneInputElement, {
        initialCountry: "auto",
        geoIpLookup: (success, failure) => {
          fetch("https://ipapi.co/json")
            .then((res) => res.json())
            .then((data) => success(data.country_code))
            .catch(() => success("us"))
        },
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        preferredCountries: ["us", "gb", "ca", "au", "de", "fr", "jp", "in"],
        separateDialCode: true,
        formatOnDisplay: true,
      })
    }

    // Setup signup phone input
    const signupPhoneElement = document.getElementById("signupPhone")
    if (signupPhoneElement) {
      this.signupPhoneInput = window.intlTelInput(signupPhoneElement, {
        initialCountry: "auto",
        geoIpLookup: (success, failure) => {
          fetch("https://ipapi.co/json")
            .then((res) => res.json())
            .then((data) => success(data.country_code))
            .catch(() => success("us"))
        },
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        preferredCountries: ["us", "gb", "ca", "au", "de", "fr", "jp", "in"],
        separateDialCode: true,
        formatOnDisplay: true,
      })
    }
  }

  // Simple guest login
  async continueAsGuest() {
    try {
      this.currentUser = {
        email: "guest@voxaroid.com",
        username: "Guest User",
        userId: this.generateUserId(),
        loginTime: Date.now(),
        provider: "guest",
        isGuest: true,
      }

      // Set guest limitations
      this.userPlan = {
        type: "guest",
        name: "Guest Mode",
        messagesPerDay: 5,
        features: ["Basic features only", "Limited messages"],
        expiresAt: null,
      }

      localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser))
      this.showChatInterface()
      this.connectWebSocket()
      this.showSuccess("Welcome! You're using Voxaroid as a guest with 5 messages.")
    } catch (error) {
      console.error("Guest login error:", error)
      this.showError("Failed to continue as guest")
    }
  }

  // Show signup information
  showSignupInfo() {
    alert("Sign up functionality coming soon! For now, you can continue as a guest or use social login.")
  }

  // Username/password login
  async loginWithCredentials() {
    const username = document.getElementById("loginUsername").value.trim()
    const password = document.getElementById("loginPassword").value.trim()

    if (!username || !password) {
      this.showError("Please enter both username and password")
      return
    }

    try {
      const response = await fetch(`${this.backendUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        this.currentUser = {
          email: data.email,
          username: data.username,
          userId: data.userId,
          loginTime: Date.now(),
          provider: "credentials",
        }
        localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser))
        this.showChatInterface()
        this.connectWebSocket()
        this.showSuccess("Login successful!")
      } else {
        this.showError(data.error || "Invalid credentials")
      }
    } catch (error) {
      console.error("Login error:", error)
      this.showError("Network error. Please try again.")
    }
  }

  // Enhanced signup with Brevo integration
  async signupWithCredentials() {
    const name = document.getElementById("signupName").value.trim()
    const email = document.getElementById("signupEmail").value.trim()
    const password = document.getElementById("signupPassword").value.trim()
    const confirmPassword = document.getElementById("confirmPassword").value.trim()
    const phone = this.signupPhoneInput
      ? this.signupPhoneInput.getNumber()
      : document.getElementById("signupPhone").value.trim()
    const agreeTerms = document.getElementById("agreeTerms").checked

    // Validation
    if (!name || !email || !password) {
      this.showError("Please fill in all required fields")
      return
    }

    if (!agreeTerms) {
      this.showError("Please agree to the Terms of Service and Privacy Policy")
      return
    }

    if (password !== confirmPassword) {
      this.showError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      this.showError("Password must be at least 8 characters")
      return
    }

    if (!this.isValidEmail(email)) {
      this.showError("Please enter a valid email address")
      return
    }

    try {
      const response = await fetch(`${this.backendUrl}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: phone || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Show email verification form
        this.showEmailVerificationForm(email)
        this.showSuccess("Account created! Please check your email for verification code.")
      } else {
        this.showError(data.error || "Failed to create account")
      }
    } catch (error) {
      console.error("Signup error:", error)
      this.showError("Network error. Please try again.")
    }
  }

  // Email verification
  async verifyEmail() {
    const code = document.getElementById("emailCode").value.trim()
    const email = document.getElementById("verificationEmail").textContent

    if (!code || code.length !== 6) {
      this.showError("Please enter the 6-digit verification code")
      return
    }

    try {
      const response = await fetch(`${this.backendUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      })

      const data = await response.json()

      if (response.ok) {
        // Check if phone verification is needed
        if (data.needsPhoneVerification && data.phone) {
          this.showPhoneVerificationForm(data.phone)
          this.showSuccess("Email verified! Now verify your phone number.")
        } else {
          // Complete registration
          this.currentUser = {
            email: data.email,
            name: data.name,
            userId: data.userId,
            loginTime: Date.now(),
            provider: "email",
          }
          localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser))
          this.showChatInterface()
          this.connectWebSocket()
          this.showSuccess("Welcome to Voxaroid! Your account is ready.")
        }
      } else {
        this.showError(data.error || "Invalid verification code")
      }
    } catch (error) {
      console.error("Email verification error:", error)
      this.showError("Network error. Please try again.")
    }
  }

  // Phone verification
  async verifyPhone() {
    const code = document.getElementById("phoneCode").value.trim()
    const phone = document.getElementById("verificationPhone").textContent

    if (!code || code.length !== 6) {
      this.showError("Please enter the 6-digit verification code")
      return
    }

    try {
      const response = await fetch(`${this.backendUrl}/api/auth/verify-phone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, code }),
      })

      const data = await response.json()

      if (response.ok) {
        // Complete registration
        this.currentUser = {
          email: data.email,
          name: data.name,
          userId: data.userId,
          loginTime: Date.now(),
          provider: "phone",
        }
        localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser))
        this.showChatInterface()
        this.connectWebSocket()
        this.showSuccess("Welcome to Voxaroid! Your account is fully verified.")
      } else {
        this.showError(data.error || "Invalid verification code")
      }
    } catch (error) {
      console.error("Phone verification error:", error)
      this.showError("Network error. Please try again.")
    }
  }

  // Resend codes with Brevo
  async resendEmailCode() {
    const email = document.getElementById("verificationEmail").textContent

    try {
      const response = await fetch(`${this.backendUrl}/api/auth/resend-email-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        this.showSuccess("Verification code resent to your email!")
        this.startTimer("email", 300)
        document.getElementById("emailCode").value = ""
        document.getElementById("emailCode").focus()
      } else {
        const data = await response.json()
        this.showError(data.error || "Failed to resend code")
      }
    } catch (error) {
      this.showError("Network error")
    }
  }

  async resendPhoneCode() {
    const phone = document.getElementById("verificationPhone").textContent

    try {
      const response = await fetch(`${this.backendUrl}/api/auth/resend-phone-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      })

      if (response.ok) {
        this.showSuccess("Verification code resent to your phone!")
        this.startTimer("phone", 300)
        document.getElementById("phoneCode").value = ""
        document.getElementById("phoneCode").focus()
      } else {
        const data = await response.json()
        this.showError(data.error || "Failed to resend code")
      }
    } catch (error) {
      this.showError("Network error")
    }
  }

  // Skip phone verification
  skipPhoneVerification() {
    const email = document.getElementById("verificationEmail").textContent

    this.currentUser = {
      email: email,
      name: email.split("@")[0], // Use email prefix as name
      userId: this.generateUserId(),
      loginTime: Date.now(),
      provider: "email",
    }
    localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser))
    this.showChatInterface()
    this.connectWebSocket()
    this.showSuccess("Welcome to Voxaroid!")
  }

  // Theme toggle for login
  toggleLoginTheme() {
    document.documentElement.classList.toggle("dark")
    const isDark = document.documentElement.classList.contains("dark")
    localStorage.setItem("voxaroid_theme", isDark ? "dark" : "light")
  }

  // Social Login Setup
  setupSocialLogin() {
    // Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "your-google-client-id.apps.googleusercontent.com", // Replace with your Google Client ID
        callback: this.handleGoogleSignIn.bind(this),
      })
    }

    // Apple Sign-In
    if (window.AppleID) {
      window.AppleID.auth.init({
        clientId: "your.apple.service.id", // Replace with your Apple Service ID
        scope: "name email",
        redirectURI: window.location.origin,
        state: "signin",
        usePopup: true,
      })
    }
  }

  async signInWithGoogle() {
    try {
      if (window.google) {
        window.google.accounts.id.prompt()
      } else {
        this.showError("Google Sign-In is not available")
      }
    } catch (error) {
      console.error("Google sign-in error:", error)
      this.showError("Failed to sign in with Google")
    }
  }

  async handleGoogleSignIn(response) {
    try {
      const result = await fetch(`${this.backendUrl}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential: response.credential }),
      })

      const data = await result.json()

      if (result.ok) {
        this.currentUser = {
          email: data.email,
          name: data.name,
          userId: data.userId,
          loginTime: Date.now(),
          provider: "google",
        }
        localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser))
        this.showChatInterface()
        this.connectWebSocket()
        this.showSuccess("Successfully signed in with Google!")
      } else {
        this.showError(data.error || "Failed to sign in with Google")
      }
    } catch (error) {
      console.error("Google authentication error:", error)
      this.showError("Network error during Google sign-in")
    }
  }

  async signInWithApple() {
    try {
      if (window.AppleID) {
        const data = await window.AppleID.auth.signIn()
        await this.handleAppleSignIn(data)
      } else {
        this.showError("Apple Sign-In is not available")
      }
    } catch (error) {
      console.error("Apple sign-in error:", error)
      this.showError("Failed to sign in with Apple")
    }
  }

  async handleAppleSignIn(appleData) {
    try {
      const result = await fetch(`${this.backendUrl}/api/auth/apple`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appleData),
      })

      const data = await result.json()

      if (result.ok) {
        this.currentUser = {
          email: data.email,
          name: data.name,
          userId: data.userId,
          loginTime: Date.now(),
          provider: "apple",
        }
        localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser))
        this.showChatInterface()
        this.connectWebSocket()
        this.showSuccess("Successfully signed in with Apple!")
      } else {
        this.showError(data.error || "Failed to sign in with Apple")
      }
    } catch (error) {
      console.error("Apple authentication error:", error)
      this.showError("Network error during Apple sign-in")
    }
  }

  // Stripe Setup
  setupStripe() {
    if (window.Stripe && this.stripeApiKey !== "stripe_api_key") {
      this.stripe = window.Stripe(this.stripeApiKey)
    }
  }

  // Subscription Management
  loadUserPlan() {
    const saved = localStorage.getItem("voxaroid_user_plan")
    return saved
      ? JSON.parse(saved)
      : {
          type: "free",
          name: "Free Plan",
          messagesPerDay: 10,
          features: ["Basic voice features", "Standard response time"],
          expiresAt: null,
        }
  }

  saveUserPlan() {
    localStorage.setItem("voxaroid_user_plan", JSON.stringify(this.userPlan))
  }

  loadDailyUsage() {
    const saved = localStorage.getItem("voxaroid_daily_usage")
    const today = new Date().toDateString()

    if (saved) {
      const usage = JSON.parse(saved)
      if (usage.date === today) {
        return usage
      }
    }

    // Reset for new day
    return {
      date: today,
      messages: 0,
    }
  }

  saveDailyUsage() {
    localStorage.setItem("voxaroid_daily_usage", JSON.stringify(this.dailyUsage))
  }

  updateUsageDisplay() {
    const messageCount = document.getElementById("messageCount")
    const usageBar = document.getElementById("usageBar")
    const userPlanBadge = document.getElementById("userPlanBadge")
    const currentPlan = document.getElementById("currentPlan")
    const planDetails = document.getElementById("planDetails")

    if (messageCount && usageBar) {
      const maxMessages = this.userPlan.messagesPerDay
      const usedMessages = this.dailyUsage.messages
      const percentage = maxMessages === -1 ? 0 : (usedMessages / maxMessages) * 100

      messageCount.textContent = maxMessages === -1 ? `${usedMessages}/∞` : `${usedMessages}/${maxMessages}`
      usageBar.style.width = `${Math.min(percentage, 100)}%`

      // Show warning if approaching limit
      if (percentage >= 80 && maxMessages !== -1) {
        usageBar.className = "bg-yellow-500 h-2 rounded-full transition-all duration-300"
      } else if (percentage >= 100) {
        usageBar.className = "bg-red-500 h-2 rounded-full transition-all duration-300"
      } else {
        usageBar.className = "bg-voxaroid-primary h-2 rounded-full transition-all duration-300"
      }
    }

    // Update plan badges
    if (userPlanBadge) {
      userPlanBadge.textContent = this.userPlan.name
    }

    if (currentPlan && planDetails) {
      currentPlan.textContent = this.userPlan.name
      planDetails.textContent =
        this.userPlan.messagesPerDay === -1 ? "Unlimited messages" : `${this.userPlan.messagesPerDay} messages per day`
    }

    // Show premium badge
    const premiumBadge = document.getElementById("premiumBadge")
    if (premiumBadge) {
      if (this.userPlan.type === "premium") {
        premiumBadge.classList.remove("hidden")
      } else {
        premiumBadge.classList.add("hidden")
      }
    }
  }

  canSendMessage() {
    if (this.userPlan.messagesPerDay === -1) return true // Unlimited
    return this.dailyUsage.messages < this.userPlan.messagesPerDay
  }

  incrementUsage() {
    this.dailyUsage.messages++
    this.saveDailyUsage()
    this.updateUsageDisplay()

    // Show usage limit warning
    if (!this.canSendMessage()) {
      document.getElementById("usageLimitWarning").classList.remove("hidden")
    }
  }

  openSubscriptionModal() {
    document.getElementById("subscriptionModal").classList.remove("hidden")
  }

  closeSubscriptionModal() {
    document.getElementById("subscriptionModal").classList.add("hidden")
  }

  async subscribeToPlan(planType) {
    if (!this.stripe) {
      this.showError("Payment system is not available")
      return
    }

    const planConfig = {
      pro: {
        priceId: "price_pro_monthly", // Replace with your Stripe Price ID for $5/month
        name: "Pro Plan",
        messagesPerDay: -1,
        features: ["Unlimited messages", "Advanced voice features", "Priority support", "GPT-4 access"],
        price: "$5/month",
      },
      premium: {
        priceId: "price_premium_yearly", // Replace with your Stripe Price ID for $50/year
        name: "Premium Plan",
        messagesPerDay: -1,
        features: [
          "Everything in Pro",
          "Custom voice training",
          "Instant response time",
          "24/7 priority support",
          "Latest AI models",
        ],
        price: "$50/year",
      },
    }

    const plan = planConfig[planType]
    if (!plan) return

    try {
      // Create checkout session
      const response = await fetch(`${this.backendUrl}/api/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.currentUser?.userId}`,
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: this.currentUser?.userId,
          email: this.currentUser?.email,
        }),
      })

      const session = await response.json()

      if (response.ok) {
        // Redirect to Stripe Checkout
        const result = await this.stripe.redirectToCheckout({
          sessionId: session.sessionId,
        })

        if (result.error) {
          this.showError(result.error.message)
        }
      } else {
        this.showError(session.error || "Failed to create checkout session")
      }
    } catch (error) {
      console.error("Subscription error:", error)
      this.showError("Failed to process subscription")
    }
  }

  // Voice Recognition Setup (unchanged)
  setupVoiceRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()

      this.recognition.continuous = false
      this.recognition.interimResults = true
      this.recognition.lang = "en-US"

      this.recognition.onstart = () => {
        this.isListening = true
        this.updateVoiceUI(true)
      }

      this.recognition.onresult = (event) => {
        let finalTranscript = ""
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        const messageInput = document.getElementById("messageInput")
        if (finalTranscript) {
          messageInput.value = finalTranscript
          this.handleInputChange()
        } else {
          messageInput.placeholder = interimTranscript || "Listening..."
        }
      }

      this.recognition.onend = () => {
        this.isListening = false
        this.updateVoiceUI(false)
        document.getElementById("messageInput").placeholder = "Type your message or use voice..."
      }

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        this.isListening = false
        this.updateVoiceUI(false)
      }
    } else {
      console.warn("Speech recognition not supported")
      document.getElementById("voiceBtn").style.display = "none"
    }
  }

  toggleVoiceRecognition() {
    if (!this.recognition) return

    if (this.isListening) {
      this.recognition.stop()
    } else {
      this.recognition.start()
    }
  }

  updateVoiceUI(isListening) {
    const voiceBtn = document.getElementById("voiceBtn")
    const voiceStatus = document.getElementById("voiceStatus")
    const voiceVisualizer = document.getElementById("voiceVisualizer")
    const messageInput = document.getElementById("messageInput")

    if (isListening) {
      voiceBtn.classList.add("voice-recording", "text-red-500")
      voiceBtn.innerHTML = '<i class="fas fa-stop"></i>'
      voiceStatus.classList.remove("hidden")
      voiceVisualizer.classList.remove("hidden")
      messageInput.style.opacity = "0.5"
    } else {
      voiceBtn.classList.remove("voice-recording", "text-red-500")
      voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>'
      voiceStatus.classList.add("hidden")
      voiceVisualizer.classList.add("hidden")
      messageInput.style.opacity = "1"
    }
  }

  // Text-to-Speech
  speakText(text) {
    if (!this.isVoiceEnabled || !this.synthesis) return

    // Cancel any ongoing speech
    this.synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = Number.parseFloat(this.settings.voiceSpeed || 1)
    utterance.pitch = Number.parseFloat(this.settings.voicePitch || 1)
    utterance.volume = 0.8

    // Try to use a more natural voice
    const voices = this.synthesis.getVoices()
    const preferredVoice = voices.find(
      (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.lang.startsWith("en"),
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    this.synthesis.speak(utterance)
  }

  toggleVoiceOutput() {
    this.isVoiceEnabled = !this.isVoiceEnabled
    this.settings.voiceEnabled = this.isVoiceEnabled
    this.saveSettings()
    this.updateVoiceToggleUI()
  }

  updateVoiceToggleUI() {
    const toggles = [document.getElementById("voiceToggle"), document.getElementById("voiceOutputToggle")]
    toggles.forEach((toggle) => {
      if (toggle) {
        const icon = toggle.querySelector("i")
        if (this.isVoiceEnabled) {
          toggle.classList.add("text-voxaroid-primary")
          toggle.classList.remove("text-gray-600", "dark:text-gray-400")
          if (icon) icon.className = "fas fa-volume-up"
        } else {
          toggle.classList.remove("text-voxaroid-primary")
          toggle.classList.add("text-gray-600", "dark:text-gray-400")
          if (icon) icon.className = "fas fa-volume-mute"
        }
      }
    })
  }

  // Enhanced Authentication with phone number
  async sendVerificationCode() {
    const email = document.getElementById("emailInput").value.trim()
    const phoneNumber = this.phoneInput ? this.phoneInput.getNumber() : ""

    if (!email || !this.isValidEmail(email)) {
      this.showError("Please enter a valid email address")
      return
    }

    if (!phoneNumber || !this.phoneInput.isValidNumber()) {
      this.showError("Please enter a valid phone number")
      return
    }

    const btn = document.getElementById("sendVerificationBtn")
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending via Brevo...'

    try {
      const response = await fetch(`${this.backendUrl}/api/send-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          phone: phoneNumber,
          countryCode: this.phoneInput.getSelectedCountryData().dialCode,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        this.showVerificationForm()
        this.hideError()
        this.showSuccess("Verification code sent to your email and phone!")
      } else {
        this.showError(data.error || "Failed to send verification code")
      }
    } catch (error) {
      console.error("Email sending error:", error)
      this.showError("Network error. Please check your connection and try again.")
    } finally {
      btn.disabled = false
      btn.innerHTML = "Send Verification Code"
    }
  }

  async verifyCode() {
    const email = document.getElementById("emailInput").value.trim()
    const phoneNumber = this.phoneInput ? this.phoneInput.getNumber() : ""
    const code = document.getElementById("codeInput").value.trim()

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      this.showError("Please enter the 6-digit verification code")
      return
    }

    const btn = document.getElementById("verifyCodeBtn")
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Verifying...'

    try {
      const response = await fetch(`${this.backendUrl}/api/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, phone: phoneNumber, code }),
      })

      const data = await response.json()

      if (response.ok) {
        this.currentUser = {
          email: email,
          phone: phoneNumber,
          userId: this.generateUserId(),
          loginTime: Date.now(),
          provider: "email",
        }
        localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser))
        this.showChatInterface()
        this.connectWebSocket()
        this.showSuccess("Login successful! Welcome to Voxaroid!")
      } else {
        this.showError(data.error || "Invalid verification code")
      }
    } catch (error) {
      console.error("Code verification error:", error)
      this.showError("Network error. Please try again.")
    } finally {
      btn.disabled = false
      btn.innerHTML = "Verify & Login"
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  showSuccess(message) {
    const errorDiv = document.getElementById("loginError")
    errorDiv.textContent = message
    errorDiv.className =
      "mt-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg text-sm"
    errorDiv.classList.remove("hidden")
    setTimeout(() => this.hideError(), 3000)
  }

  generateUserId() {
    return Math.floor(Math.random() * 1000000) + Date.now()
  }

  checkAuthStatus() {
    const savedUser = localStorage.getItem("voxaroid_user")
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser)
      // Check if login is still valid (24 hours)
      if (Date.now() - this.currentUser.loginTime < 24 * 60 * 60 * 1000) {
        this.showChatInterface()
        this.connectWebSocket()
        return
      }
    }
    this.showLoginScreen()
  }

  showLoginScreen() {
    document.getElementById("loginScreen").classList.remove("hidden")
    document.getElementById("chatInterface").classList.add("hidden")
  }

  showChatInterface() {
    document.getElementById("loginScreen").classList.add("hidden")
    document.getElementById("chatInterface").classList.remove("hidden")
    this.renderChatHistory()
    this.updateUsageDisplay()
  }

  showEmailForm() {
    this.showLoginForm()
  }

  showVerificationForm() {
    document.getElementById("loginForm").classList.add("hidden")
    document.getElementById("verificationForm").classList.remove("hidden")
    document.getElementById("codeInput").focus()
  }

  showError(message) {
    const errorDiv = document.getElementById("loginError")
    errorDiv.textContent = message
    errorDiv.className =
      "mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg text-sm"
    errorDiv.classList.remove("hidden")
  }

  hideError() {
    document.getElementById("loginError").classList.add("hidden")
  }

  logout() {
    localStorage.removeItem("voxaroid_user")
    this.currentUser = null
    if (this.websocket) {
      this.websocket.close()
    }
    if (this.synthesis) {
      this.synthesis.cancel()
    }
    this.showLoginScreen()
  }

  // Enhanced WebSocket with typing indicators
  connectWebSocket() {
    if (this.websocket) {
      this.websocket.close()
    }

    try {
      this.websocket = new WebSocket(`${this.wsUrl}`)

      this.websocket.onopen = () => {
        console.log("WebSocket connected")
        this.isConnected = true
        this.updateConnectionStatus(true)

        // Send initialization message matching your server format
        this.websocket.send(
          JSON.stringify({
            type: "init",
            userId: Number.parseInt(this.currentUser.userId), // Ensure it's an integer
          }),
        )
      }

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.handleWebSocketMessage(data)
      }

      this.websocket.onclose = () => {
        console.log("WebSocket disconnected")
        this.isConnected = false
        this.updateConnectionStatus(false)

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (this.currentUser) {
            this.connectWebSocket()
          }
        }, 3000)
      }

      this.websocket.onerror = (error) => {
        console.error("WebSocket error:", error)
        this.updateConnectionStatus(false)
      }
    } catch (error) {
      console.error("Failed to connect WebSocket:", error)
      this.updateConnectionStatus(false)
    }
  }

  handleWebSocketMessage(data) {
    if (data.type === "new_message") {
      this.hideTypingIndicator()
      this.addMessageWithTyping(data.text, data.sender)

      // Save to current chat
      if (this.currentChatId) {
        this.saveChatMessage(this.currentChatId, data.text, data.sender)
      }

      // Speak the response if voice is enabled
      if (data.sender === "assistant" && this.isVoiceEnabled) {
        setTimeout(() => this.speakText(data.text), 500)
      }
    }
  }

  updateConnectionStatus(connected) {
    const statusElement = document.getElementById("connectionStatus")
    if (connected) {
      statusElement.innerHTML = '<i class="fas fa-circle text-green-500"></i> Connected'
    } else {
      statusElement.innerHTML = '<i class="fas fa-circle text-red-500"></i> Disconnected'
    }
  }

  // Enhanced Chat Methods with usage tracking
  startNewChat() {
    this.currentChatId = this.generateChatId()
    this.clearChatMessages()
    this.addWelcomeMessage()

    // Create new chat in history
    const newChat = {
      id: this.currentChatId,
      title: "New Chat",
      messages: [],
      timestamp: Date.now(),
    }

    this.chatHistory.unshift(newChat)
    this.saveChatHistory()
    this.renderChatHistory()
  }

  generateChatId() {
    return "chat_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  }

  addWelcomeMessage() {
    const welcomeText = `Hello! I'm Voxaroid, your AI voice assistant. I can help you with trading insights, market analysis, and much more. ${
      this.userPlan.type === "free"
        ? `You have ${this.userPlan.messagesPerDay - this.dailyUsage.messages} messages remaining today.`
        : "You have unlimited messages with your premium plan!"
    } Try speaking to me using the microphone button!`
    this.addMessageWithTyping(welcomeText, "assistant")
  }

  sendMessage() {
    const input = document.getElementById("messageInput")
    const message = input.value.trim()

    if (!message || !this.isConnected) return

    // Check usage limits
    if (!this.canSendMessage()) {
      this.showError("You've reached your daily message limit. Please upgrade your plan to continue.")
      document.getElementById("usageLimitWarning").classList.remove("hidden")
      return
    }

    // Add user message to chat
    this.addMessage(message, "user", Date.now())

    // Increment usage
    this.incrementUsage()

    // Save to current chat
    if (this.currentChatId) {
      this.saveChatMessage(this.currentChatId, message, "user")
      this.updateChatTitle(this.currentChatId, message)
    }

    // Show typing indicator
    this.showTypingIndicator()

    // Send via WebSocket matching your server format
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(
        JSON.stringify({
          type: "send_message",
          text: message,
        }),
      )
    }

    // Clear input
    input.value = ""
    input.style.height = "auto"
    this.updateSendButton()
  }

  async sendMessageHTTP(message) {
    try {
      const response = await fetch(`${this.backendUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: message,
          userId: Number.parseInt(this.currentUser.userId),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        this.hideTypingIndicator()
        this.addMessageWithTyping(data.response, "assistant")

        // Save to current chat
        if (this.currentChatId) {
          this.saveChatMessage(this.currentChatId, data.response, "assistant")
        }

        // Speak the response if voice is enabled
        if (this.isVoiceEnabled) {
          setTimeout(() => this.speakText(data.response), 500)
        }
      } else {
        this.hideTypingIndicator()
        this.showError(data.error || "Failed to get response")
      }
    } catch (error) {
      console.error("HTTP API error:", error)
      this.hideTypingIndicator()
      this.showError("Network error. Please try again.")
    }
  }

  showTypingIndicator() {
    document.getElementById("typingIndicator").classList.remove("hidden")
    this.scrollToBottom()
  }

  hideTypingIndicator() {
    document.getElementById("typingIndicator").classList.add("hidden")
  }

  addMessage(text, sender, timestamp = Date.now()) {
    const messagesContainer = document.getElementById("chatMessages")

    // Remove welcome message if it exists
    const welcomeMsg = messagesContainer.querySelector(".text-center")
    if (welcomeMsg) {
      welcomeMsg.remove()
    }

    const messageDiv = document.createElement("div")
    messageDiv.className = `message-fade-in ${sender === "user" ? "flex justify-end" : "flex justify-start"} mb-4`

    const messageContent = document.createElement("div")
    messageContent.className = `max-w-[80%] px-4 py-3 rounded-2xl ${
      sender === "user"
        ? "bg-gradient-to-r from-voxaroid-primary to-voxaroid-secondary text-white"
        : "bg-message-assistant dark:bg-message-assistant-dark text-gray-900 dark:text-gray-100"
    }`

    // Handle images in messages
    if (text.includes("<img") || text.includes("![")) {
      messageContent.innerHTML = this.parseMessageContent(text)
    } else {
      messageContent.textContent = text
    }

    // Add timestamp if enabled
    if (this.settings.showTimestamps) {
      const timestampDiv = document.createElement("div")
      timestampDiv.className = `message-timestamp text-right ${sender === "user" ? "text-white" : "text-gray-500 dark:text-gray-400"}`
      timestampDiv.textContent = this.formatTimestamp(timestamp)
      messageContent.appendChild(timestampDiv)
    }

    messageDiv.appendChild(messageContent)
    messagesContainer.appendChild(messageDiv)

    this.scrollToBottom()
  }

  addMessageWithTyping(text, sender, timestamp = Date.now()) {
    if (sender === "assistant" && this.settings.enableTypingAnimation !== false) {
      this.typeMessage(text, sender, timestamp)
    } else {
      this.addMessage(text, sender, timestamp)
    }
  }

  typeMessage(text, sender, timestamp) {
    const messagesContainer = document.getElementById("chatMessages")

    // Remove welcome message if it exists
    const welcomeMsg = messagesContainer.querySelector(".text-center")
    if (welcomeMsg) {
      welcomeMsg.remove()
    }

    const messageDiv = document.createElement("div")
    messageDiv.className = `message-fade-in flex justify-start mb-4`

    const messageContent = document.createElement("div")
    messageContent.className = `max-w-[80%] px-4 py-3 rounded-2xl bg-message-assistant dark:bg-message-assistant-dark text-gray-900 dark:text-gray-100`

    const textSpan = document.createElement("span")
    messageContent.appendChild(textSpan)

    // Add timestamp if enabled
    if (this.settings.showTimestamps) {
      const timestampDiv = document.createElement("div")
      timestampDiv.className = "message-timestamp text-gray-500 dark:text-gray-400"
      timestampDiv.textContent = this.formatTimestamp(timestamp)
      messageContent.appendChild(timestampDiv)
    }

    messageDiv.appendChild(messageContent)
    messagesContainer.appendChild(messageDiv)

    // Type the message character by character
    let i = 0
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        textSpan.textContent = text.substring(0, i + 1)
        i++
        this.scrollToBottom()
      } else {
        clearInterval(typeInterval)
      }
    }, this.typingSpeed)

    this.scrollToBottom()
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById("chatMessages")
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  parseMessageContent(text) {
    // Simple markdown image parsing
    text = text.replace(
      /!\[([^\]]*)\]$$([^)]+)$$/g,
      '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg mt-2">',
    )

    // Handle HTML images
    text = text.replace(/<img([^>]+)>/g, '<img$1 class="max-w-full h-auto rounded-lg mt-2">')

    return text
  }

  clearChatMessages() {
    const messagesContainer = document.getElementById("chatMessages")
    messagesContainer.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                <svg class="w-16 h-16 text-voxaroid-primary mx-auto mb-4" viewBox="0 0 64 64" fill="currentColor">
                    <path d="M8 12 L24 48 L32 32 L40 48 L56 12 L48 12 L36 36 L32 28 L28 36 L16 12 Z" opacity="0.8"/>
                    <path d="M20 20 L44 44 M44 20 L20 44" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
                    <circle cx="32" cy="32" r="3" fill="currentColor"/>
                </svg>
                <p>Start a conversation with Voxaroid</p>
                <p class="text-xs mt-2">Try voice input by clicking the microphone</p>
            </div>
        `
  }

  handleInputChange() {
    this.updateSendButton()
  }

  updateSendButton() {
    const input = document.getElementById("messageInput")
    const sendBtn = document.getElementById("sendBtn")
    const hasText = input.value.trim().length > 0
    const canSend = hasText && this.isConnected && this.canSendMessage()

    sendBtn.disabled = !canSend
  }

  // Chat History Methods (using voxaroid prefix)
  loadChatHistory() {
    const saved = localStorage.getItem("voxaroid_chat_history")
    return saved ? JSON.parse(saved) : []
  }

  saveChatHistory() {
    localStorage.setItem("voxaroid_chat_history", JSON.stringify(this.chatHistory))
  }

  saveChatMessage(chatId, message, sender) {
    const chat = this.chatHistory.find((c) => c.id === chatId)
    if (chat) {
      chat.messages.push({ text: message, sender, timestamp: Date.now() })
      this.saveChatHistory()
    }
  }

  updateChatTitle(chatId, firstMessage) {
    const chat = this.chatHistory.find((c) => c.id === chatId)
    if (chat && chat.title === "New Chat") {
      chat.title = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? "..." : "")
      this.saveChatHistory()
      this.renderChatHistory()
    }
  }

  renderChatHistory() {
    const historyContainer = document.getElementById("chatHistory")
    historyContainer.innerHTML = ""

    this.chatHistory.forEach((chat) => {
      const chatItem = document.createElement("div")
      chatItem.className = `group p-3 rounded-lg cursor-pointer transition duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
        chat.id === this.currentChatId ? "bg-blue-100 dark:bg-blue-900" : ""
      }`

      chatItem.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">${chat.title}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${this.formatDate(chat.timestamp)}</p>
                    </div>
                    <button class="delete-chat ml-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" data-chat-id="${chat.id}">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            `

      chatItem.addEventListener("click", (e) => {
        if (!e.target.closest(".delete-chat")) {
          this.loadChat(chat.id)
        }
      })

      const deleteBtn = chatItem.querySelector(".delete-chat")
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        this.deleteChat(chat.id)
      })

      historyContainer.appendChild(chatItem)
    })
  }

  loadChat(chatId) {
    const chat = this.chatHistory.find((c) => c.id === chatId)
    if (!chat) return

    this.currentChatId = chatId
    this.clearChatMessages()

    // Load messages
    chat.messages.forEach((msg) => {
      this.addMessage(msg.text, msg.sender, msg.timestamp)
    })

    this.renderChatHistory()
  }

  deleteChat(chatId) {
    if (confirm("Are you sure you want to delete this chat?")) {
      this.chatHistory = this.chatHistory.filter((c) => c.id !== chatId)
      this.saveChatHistory()

      if (this.currentChatId === chatId) {
        this.startNewChat()
      } else {
        this.renderChatHistory()
      }
    }
  }

  formatDate(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Today"
    if (diffDays === 2) return "Yesterday"
    if (diffDays <= 7) return `${diffDays} days ago`

    return date.toLocaleDateString()
  }

  // UI Methods
  toggleSidebar() {
    const sidebar = document.getElementById("sidebar")
    const overlay = document.getElementById("mobileOverlay")

    if (window.innerWidth < 768) {
      sidebar.classList.toggle("sidebar-hidden")
      overlay.classList.toggle("hidden")
    }
  }

  closeSidebar() {
    const sidebar = document.getElementById("sidebar")
    const overlay = document.getElementById("mobileOverlay")

    sidebar.classList.add("sidebar-hidden")
    overlay.classList.add("hidden")
  }

  // Enhanced Settings Methods
  loadSettings() {
    const saved = localStorage.getItem("voxaroid_settings")
    return saved
      ? JSON.parse(saved)
      : {
          theme: "light",
          fontFamily: "system",
          fontSize: "medium",
          voiceEnabled: true,
          voiceSpeed: "1",
          voicePitch: "1",
          showTimestamps: true,
          enableTypingAnimation: true,
        }
  }

  saveSettings() {
    localStorage.setItem("voxaroid_settings", JSON.stringify(this.settings))
  }

  applySettings() {
    // Apply theme
    if (this.settings.theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }

    // Apply voice settings
    this.isVoiceEnabled = this.settings.voiceEnabled !== false
    this.updateVoiceToggleUI()

    // Apply font settings
    const fontFamilyMap = {
      system:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    }

    const fontSizeMap = {
      small: "14px",
      medium: "16px",
      large: "18px",
    }

    document.body.style.fontFamily = fontFamilyMap[this.settings.fontFamily]
    document.body.style.fontSize = fontSizeMap[this.settings.fontSize]

    // Update settings form
    if (document.getElementById("fontFamily")) {
      document.getElementById("fontFamily").value = this.settings.fontFamily
      document.getElementById("fontSize").value = this.settings.fontSize
      document.getElementById("voiceSpeed").value = this.settings.voiceSpeed
      document.getElementById("voicePitch").value = this.settings.voicePitch
    }

    this.updateToggleButtons()
  }

  updateToggleButtons() {
    // Update theme toggle
    const themeToggles = [document.getElementById("themeToggleSettings")]
    themeToggles.forEach((toggle) => {
      if (toggle) {
        const isDark = this.settings.theme === "dark"
        toggle.className = `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isDark ? "bg-voxaroid-primary" : "bg-gray-200"
        }`
        const span = toggle.querySelector("span")
        if (span) {
          span.className = `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isDark ? "translate-x-6" : ""
          }`
        }
      }
    })

    // Update timestamp toggle
    const timestampToggle = document.getElementById("timestampToggle")
    if (timestampToggle) {
      const showTimestamps = this.settings.showTimestamps !== false
      timestampToggle.className = `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        showTimestamps ? "bg-voxaroid-primary" : "bg-gray-200"
      }`
      const span = timestampToggle.querySelector("span")
      if (span) {
        span.className = `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          showTimestamps ? "translate-x-6" : ""
        }`
      }
    }

    // Update voice output toggle
    const voiceOutputToggle = document.getElementById("voiceOutputToggle")
    if (voiceOutputToggle) {
      const voiceEnabled = this.settings.voiceEnabled !== false
      voiceOutputToggle.className = `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        voiceEnabled ? "bg-voxaroid-primary" : "bg-gray-200"
      }`
      const span = voiceOutputToggle.querySelector("span")
      if (span) {
        span.className = `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          voiceEnabled ? "translate-x-6" : ""
        }`
      }
    }
  }

  openSettings() {
    document.getElementById("settingsModal").classList.remove("hidden")
    this.updateToggleButtons()
  }

  closeSettings() {
    document.getElementById("settingsModal").classList.add("hidden")
  }

  toggleTheme() {
    this.settings.theme = this.settings.theme === "light" ? "dark" : "light"
    this.saveSettings()
    this.applySettings()
  }

  toggleTimestamps() {
    this.settings.showTimestamps = !this.settings.showTimestamps
    this.saveSettings()
    this.updateToggleButtons()

    // Refresh current chat to show/hide timestamps
    if (this.currentChatId) {
      this.loadChat(this.currentChatId)
    }
  }

  updateVoiceSettings() {
    this.settings.voiceSpeed = document.getElementById("voiceSpeed").value
    this.settings.voicePitch = document.getElementById("voicePitch").value
    this.saveSettings()
  }

  updateFontSettings() {
    this.settings.fontFamily = document.getElementById("fontFamily").value
    this.settings.fontSize = document.getElementById("fontSize").value
    this.saveSettings()
    this.applySettings()
  }

  clearAllData() {
    if (confirm("Are you sure you want to clear all chat data? This action cannot be undone.")) {
      localStorage.removeItem("voxaroid_chat_history")
      this.chatHistory = []
      this.startNewChat()
      this.closeSettings()
    }
  }

  // Form switching methods
  showLoginForm() {
    document.getElementById("loginForm").classList.remove("hidden")
    document.getElementById("signupForm").classList.add("hidden")
    document.getElementById("emailVerificationForm").classList.add("hidden")
    document.getElementById("phoneVerificationForm").classList.add("hidden")
    document.getElementById("verificationForm").classList.add("hidden")
    this.clearTimers()
  }

  showSignupForm() {
    document.getElementById("loginForm").classList.add("hidden")
    document.getElementById("signupForm").classList.remove("hidden")
    document.getElementById("emailVerificationForm").classList.add("hidden")
    document.getElementById("phoneVerificationForm").classList.add("hidden")
    document.getElementById("verificationForm").classList.add("hidden")
    this.clearTimers()
  }

  showEmailVerificationForm(email) {
    document.getElementById("loginForm").classList.add("hidden")
    document.getElementById("signupForm").classList.add("hidden")
    document.getElementById("emailVerificationForm").classList.remove("hidden")
    document.getElementById("phoneVerificationForm").classList.add("hidden")
    document.getElementById("verificationForm").classList.add("hidden")
    document.getElementById("verificationEmail").textContent = email
    this.startTimer("email", 300) // 5 minutes
    document.getElementById("emailCode").focus()
  }

  showPhoneVerificationForm(phone) {
    document.getElementById("loginForm").classList.add("hidden")
    document.getElementById("signupForm").classList.add("hidden")
    document.getElementById("emailVerificationForm").classList.add("hidden")
    document.getElementById("phoneVerificationForm").classList.remove("hidden")
    document.getElementById("verificationForm").classList.add("hidden")
    document.getElementById("verificationPhone").textContent = phone
    this.startTimer("phone", 300) // 5 minutes
    document.getElementById("phoneCode").focus()
  }

  // Timer functionality
  startTimer(type, seconds) {
    const timerElement = document.getElementById(`${type}Timer`)
    let timeLeft = seconds

    // Clear existing timer
    if (this.verificationTimers && this.verificationTimers[type]) {
      clearInterval(this.verificationTimers[type])
    }

    if (!this.verificationTimers) {
      this.verificationTimers = {}
    }

    this.verificationTimers[type] = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60)
      const secs = timeLeft % 60
      timerElement.textContent = `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`

      if (timeLeft <= 0) {
        clearInterval(this.verificationTimers[type])
        timerElement.textContent = "Expired"
        timerElement.classList.add("text-red-600")
      }
      timeLeft--
    }, 1000)
  }

  clearTimers() {
    if (this.verificationTimers) {
      Object.values(this.verificationTimers).forEach((timer) => {
        if (timer) clearInterval(timer)
      })
      this.verificationTimers = {}
    }
  }

  // Format verification code input
  formatVerificationCode(e) {
    let value = e.target.value.replace(/\D/g, "") // Remove non-digits
    if (value.length > 6) value = value.slice(0, 6)
    e.target.value = value
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new VoxaroidChat()
})
