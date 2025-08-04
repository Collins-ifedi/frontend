class VoxaroidChat {
  constructor() {
    this.currentUser = null
    this.accessToken = null // <-- ADDED: To store the JWT
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
    this.signupPhoneInput = null // <-- ADDED: For signup form specifically

    // Social login
    this.googleAuth = null
    this.appleAuth = null

    // Backend URL
    this.backendUrl = "https://voxai-umxl.onrender.com"
    this.wsUrl = this.backendUrl.replace("https://", "wss://").replace("http://", "ws://") + "/ws"

    // Guest mode
    this.isGuestMode = false

    this.init()
  }

  init() {
    this.accessToken = localStorage.getItem('voxaroid_token'); // <-- ADDED: Load token on init
    this.setupEventListeners()
    this.setupVoiceRecognition()
    this.setupPhoneInput()
    this.setupSocialLogin()
    this.setupStripe()
    this.applySettings()
    this.checkAuthStatus()
    this.updateUsageDisplay()
    this.handlePaymentRedirect(); // <-- ADDED: Check for Stripe redirect
  }

  setupEventListeners() {
    // --- START OF MODIFIED SECTION: FORM LISTENERS ---
    // Use proper form submission events
    document.getElementById("loginForm")?.addEventListener("submit", (e) => { e.preventDefault(); this.loginWithCredentials(); });
    document.getElementById("signupFormElement")?.addEventListener("submit", (e) => { e.preventDefault(); this.signupWithCredentials(); });
    document.getElementById("emailVerifyFormElement")?.addEventListener("submit", (e) => { e.preventDefault(); this.verifyEmail(); });
    document.getElementById("phoneVerifyFormElement")?.addEventListener("submit", (e) => { e.preventDefault(); this.verifyPhone(); });
    // --- END OF MODIFIED SECTION ---

    // Login form events (navigation)
    document.getElementById("showSignupBtn")?.addEventListener("click", () => this.showSignupForm());
    document.getElementById("showLoginBtn")?.addEventListener("click", () => this.showLoginForm());
    document.getElementById("continueAsGuestBtn")?.addEventListener("click", () => this.continueAsGuest());

    // Social login events
    document.getElementById("googleSignIn")?.addEventListener("click", () => this.signInWithGoogle());
    document.getElementById("appleSignIn")?.addEventListener("click", () => this.signInWithApple());
    
    // Chat interface events
    document.getElementById("newChatBtn")?.addEventListener("click", () => this.startNewChat());
    document.getElementById("sendBtn")?.addEventListener("click", () => this.sendMessage());
    document.getElementById("messageInput")?.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }});
    document.getElementById("messageInput")?.addEventListener("input", () => this.handleInputChange());
    
    // --- START OF MODIFIED SECTION: TIERED FEATURE LISTENERS ---
    document.getElementById("fileUploadBtn")?.addEventListener("click", () => this.triggerFileUpload());
    document.getElementById("fileInputForUpload")?.addEventListener("change", (e) => this.analyzeFile(e));
    // --- END OF MODIFIED SECTION ---

    // Subscription events
    document.getElementById("upgradeBtn")?.addEventListener("click", () => this.openSubscriptionModal());
    document.getElementById("upgradeFromWarning")?.addEventListener("click", () => this.openSubscriptionModal());
    document.getElementById("managePlanBtn")?.addEventListener("click", () => this.openSubscriptionModal());
    document.getElementById("subscribeProBtn")?.addEventListener("click", () => this.subscribeToPlan("price_pro_monthly")); // Use Stripe Price ID
    document.getElementById("subscribePremiumBtn")?.addEventListener("click", () => this.subscribeToPlan("price_premium_yearly")); // Use Stripe Price ID
    document.getElementById("closeSubscriptionBtn")?.addEventListener("click", () => this.closeSubscriptionModal());

    // Voice events
    document.getElementById("voiceBtn")?.addEventListener("click", () => this.toggleVoiceRecognition());
    document.getElementById("voiceToggle")?.addEventListener("click", () => this.toggleVoiceOutput());
    document.getElementById("voiceOutputToggle")?.addEventListener("click", () => this.toggleVoiceOutput());
    document.getElementById("voiceSpeed")?.addEventListener("change", () => this.updateVoiceSettings());
    document.getElementById("voicePitch")?.addEventListener("change", () => this.updateVoiceSettings());

    // Sidebar and mobile events
    document.getElementById("sidebarToggle")?.addEventListener("click", () => this.toggleSidebar());
    document.getElementById("mobileOverlay")?.addEventListener("click", () => this.closeSidebar());
    document.getElementById("closeSidebarBtn")?.addEventListener("click", () => this.closeSidebar());

    // Settings events
    document.getElementById("settingsBtn")?.addEventListener("click", () => this.openSettings());
    document.getElementById("closeSettingsBtn")?.addEventListener("click", () => this.closeSettings());
    document.getElementById("themeToggle")?.addEventListener("click", () => this.toggleTheme());
    document.getElementById("themeToggleSettings")?.addEventListener("click", () => this.toggleTheme());
    document.getElementById("timestampToggle")?.addEventListener("click", () => this.toggleTimestamps());
    document.getElementById("fontFamily")?.addEventListener("change", () => this.updateFontSettings());
    document.getElementById("fontSize")?.addEventListener("change", () => this.updateFontSettings());
    document.getElementById("clearDataBtn")?.addEventListener("click", () => this.clearAllData());

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => this.logout());

    // Auto-resize textarea
    const messageInput = document.getElementById("messageInput");
    messageInput?.addEventListener("input", function () { this.style.height = "auto"; this.style.height = Math.min(this.scrollHeight, 120) + "px"; });

    // Verification code resend events
    document.getElementById("resendEmailCode")?.addEventListener("click", () => this.resendCode('email'));
    document.getElementById("resendPhoneCode")?.addEventListener("click", () => this.resendCode('phone'));
    document.getElementById("skipPhoneVerification")?.addEventListener("click", () => this.skipPhoneVerification());

    // Theme toggle for login
    document.getElementById("themeToggleLogin")?.addEventListener("click", () => this.toggleTheme());

    // Auto-format verification codes
    document.getElementById("emailCode")?.addEventListener("input", (e) => this.formatVerificationCode(e));
    document.getElementById("phoneCode")?.addEventListener("input", (e) => this.formatVerificationCode(e));
  }

  setupPhoneInput() {
    const phoneInputElement = document.getElementById("phoneInput");
    if (phoneInputElement) {
      this.phoneInput = window.intlTelInput(phoneInputElement, {
        initialCountry: "auto",
        geoIpLookup: (success) => { fetch("https://ipapi.co/json").then(res => res.json()).then(data => success(data.country_code)).catch(() => success("us")) },
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        preferredCountries: ["us", "gb", "ca", "au", "de", "fr", "jp", "in"],
        separateDialCode: true,
      });
    }

    const signupPhoneElement = document.getElementById("signupPhone");
    if (signupPhoneElement) {
      this.signupPhoneInput = window.intlTelInput(signupPhoneElement, {
        initialCountry: "auto",
        geoIpLookup: (success) => { fetch("https://ipapi.co/json").then(res => res.json()).then(data => success(data.country_code)).catch(() => success("us")) },
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        preferredCountries: ["us", "gb", "ca", "au", "de", "fr", "jp", "in"],
        separateDialCode: true,
      });
    }
  }

  // --- START OF NEW SECTION: API & AUTHENTICATION ---
  
  async apiFetch(endpoint, options = {}) {
      const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
      if (this.accessToken) {
          headers["Authorization"] = `Bearer ${this.accessToken}`;
      }

      const config = {
          method: options.method || 'GET',
          headers: { ...headers, ...options.headers },
      };

      if (options.body) {
          config.body = options.body;
      }
      
      try {
          const response = await fetch(`${this.backendUrl}${endpoint}`, config);

          if (response.status === 401) {
              this.showError("Session expired. Please log in again.");
              this.logout();
              return Promise.reject({ detail: "Unauthorized" });
          }

          const responseData = await response.json().catch(() => null);

          if (!response.ok) {
              const errorMessage = responseData?.detail || `HTTP Error: ${response.status}`;
              return Promise.reject({ detail: errorMessage });
          }
          
          return responseData;
      } catch (error) {
          console.error(`API Fetch Error: ${error.detail || error}`);
          this.showError(error.detail || "Network error. Please check your connection.");
          return Promise.reject(error);
      }
  }

  setAuthState(token, userData) {
    this.accessToken = token;
    localStorage.setItem("voxaroid_token", token);

    this.currentUser = {
      userId: userData.userId,
      email: userData.email,
      name: userData.name,
      loginTime: Date.now(),
    };
    localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser));
    
    // TODO: In the future, fetch user plan from a dedicated backend endpoint
    // For now, we assume plan details come with login or are stored locally
    this.userPlan = this.loadUserPlan();
    this.saveUserPlan();

    this.showChatInterface();
    this.connectWebSocket();
  }

  async loginWithCredentials() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      this.showError("Please enter both email and password");
      return;
    }

    try {
      const data = await this.apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const decodedToken = this.jwt_decode(data.access_token);
      this.setAuthState(data.access_token, { email: decodedToken.sub, userId: decodedToken.userId, name: 'User' }); // Name can be fetched later
      this.showSuccess("Login successful!");
    } catch (error) {
      this.showError(error.detail || "Failed to log in.");
    }
  }

  async signupWithCredentials() {
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const phone = this.signupPhoneInput ? this.signupPhoneInput.getNumber() : "";
    const agreeTerms = document.getElementById("agreeTerms").checked;

    if (!name || !email || !password) { this.showError("Please fill in all required fields"); return; }
    if (!agreeTerms) { this.showError("Please agree to the Terms of Service and Privacy Policy"); return; }
    if (password !== confirmPassword) { this.showError("Passwords do not match"); return; }
    if (password.length < 8) { this.showError("Password must be at least 8 characters"); return; }
    if (!this.isValidEmail(email)) { this.showError("Please enter a valid email address"); return; }

    try {
      await this.apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password, phone: phone || null }),
      });
      this.showEmailVerificationForm(email);
      this.showSuccess("Account created! Please check your email for a verification code.");
    } catch (error) {
      this.showError(error.detail || "Failed to create account.");
    }
  }

  async verifyEmail() {
    const code = document.getElementById("emailCode").value.trim();
    const email = document.getElementById("verificationEmail").textContent;

    if (!code || code.length !== 6) { this.showError("Please enter the 6-digit verification code"); return; }

    try {
      const data = await this.apiFetch("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      
      if (data.needsPhoneVerification && data.phone) {
        this.showPhoneVerificationForm(data.phone);
        this.showSuccess("Email verified! Now, please verify your phone number.");
      } else {
        // If no phone verification is needed, the user must now log in.
        this.showSuccess("Email verification successful! Please log in to continue.");
        this.showLoginForm();
      }
    } catch (error) {
      this.showError(error.detail || "Invalid verification code.");
    }
  }

  async verifyPhone() {
    const code = document.getElementById("phoneCode").value.trim();
    const phone = document.getElementById("verificationPhone").textContent;
    
    if (!code || code.length !== 6) { this.showError("Please enter the 6-digit verification code"); return; }

    try {
      const data = await this.apiFetch("/api/auth/verify-phone", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      this.setAuthState(data.access_token, data);
      this.showSuccess("Welcome to Voxaroid! Your account is fully verified.");
    } catch (error) {
      this.showError(error.detail || "Invalid verification code.");
    }
  }

  async resendCode(type) {
    const identifier = document.getElementById(`verification${type.charAt(0).toUpperCase() + type.slice(1)}`).textContent;
    const endpoint = type === 'email' ? '/api/auth/resend-email-code' : '/api/auth/resend-phone-code';
    const body = type === 'email' ? { email: identifier } : { phone: identifier };
    
    try {
      await this.apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      this.showSuccess(`A new verification code has been sent to your ${type}.`);
      this.startTimer(type, 300);
      document.getElementById(`${type}Code`).value = "";
    } catch (error) {
      this.showError(error.detail || `Failed to resend code to ${type}.`);
    }
  }

  skipPhoneVerification() {
    // After email is verified, user must log in. Direct them there.
    this.showSuccess("You can add and verify your phone later in settings. Please log in.");
    this.showLoginForm();
  }

  async signInWithGoogle() {
      // Assumes the Google Sign-In library is loaded and configured
      if (window.google) {
          window.google.accounts.id.prompt();
      } else {
          this.showError("Google Sign-In is not available.");
      }
  }

  async handleGoogleSignIn(response) {
      try {
          const data = await this.apiFetch('/api/auth/google', {
              method: 'POST',
              body: JSON.stringify({ credential: response.credential }),
          });
          this.setAuthState(data.access_token, data);
          this.showSuccess('Successfully signed in with Google!');
      } catch (error) {
          this.showError(error.detail || 'Google Sign-In failed.');
      }
  }

  async signInWithApple() {
      // Assumes Apple Sign-In library is loaded
      if (window.AppleID) {
          try {
              const data = await window.AppleID.auth.signIn();
              this.handleAppleSignIn(data);
          } catch (error) {
              console.error('Apple Sign-In error:', error);
          }
      } else {
          this.showError("Apple Sign-In is not available.");
      }
  }

  async handleAppleSignIn(appleData) {
      try {
          const data = await this.apiFetch('/api/auth/apple', {
              method: 'POST',
              body: JSON.stringify(appleData),
          });
          this.setAuthState(data.access_token, data);
          this.showSuccess('Successfully signed in with Apple!');
      } catch (error) {
          this.showError(error.detail || 'Apple Sign-In failed.');
      }
  }

  async subscribeToPlan(priceId) {
    if (!this.stripe) {
      this.showError("Payment system is not available.");
      return;
    }

    try {
      const session = await this.apiFetch("/api/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      });
      const result = await this.stripe.redirectToCheckout({ sessionId: session.sessionId });
      if (result.error) {
        this.showError(result.error.message);
      }
    } catch (error) {
      this.showError(error.detail || "Failed to create checkout session.");
    }
  }

  handlePaymentRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const cancelled = window.location.pathname.includes('/payment-cancel');
    const successView = document.getElementById('paymentSuccessView');
    const cancelView = document.getElementById('paymentCancelView');
    const loginContainer = document.getElementById('loginContainer');

    const showView = (viewToShow) => {
        loginContainer?.classList.add('hidden');
        viewToShow?.classList.remove('hidden');
        document.getElementById('backToChatSuccess')?.addEventListener('click', () => window.location.replace('/'));
        document.getElementById('backToChatCancel')?.addEventListener('click', () => window.location.replace('/'));
    };

    if (sessionId) {
        showView(successView);
    } else if (cancelled) {
        showView(cancelView);
    }
  }
  
  triggerFileUpload() {
    if (this.userPlan.type === 'free' || this.userPlan.type === 'guest') {
      this.showError("File analysis is a premium feature. Please upgrade your plan.");
      this.openSubscriptionModal();
      return;
    }
    document.getElementById('fileInputForUpload')?.click();
  }

  async analyzeFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const promptText = prompt("Please enter a prompt to analyze this file:", "Summarize this document.");
    if (!promptText) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("prompt", promptText);

    this.addMessage(`Analyzing file: **${file.name}**...`, 'user', Date.now());
    this.showTypingIndicator();

    try {
      const result = await this.apiFetch("/api/analyze-file", {
        method: "POST",
        body: formData,
      });
      this.hideTypingIndicator();
      this.addMessageWithTyping(result.analysis, "assistant");
    } catch (error) {
      this.hideTypingIndicator();
      this.addMessage( `Error analyzing file: ${error.detail || 'An unknown error occurred.'}`, 'assistant');
    } finally {
        // Reset file input to allow uploading the same file again
        event.target.value = '';
    }
  }
  
  jwt_decode(token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }

  // --- END OF NEW SECTION ---

  continueAsGuest() {
      // Guest mode functionality remains the same
  }

  checkAuthStatus() {
    const token = localStorage.getItem("voxaroid_token");
    if (token) {
      this.accessToken = token;
      const savedUser = localStorage.getItem("voxaroid_user");
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        // Optional: Add a silent API call to a '/api/me' endpoint to verify token validity
        this.showChatInterface();
        this.connectWebSocket();
        return;
      }
    }
    this.showLoginScreen();
  }

  logout() {
    localStorage.removeItem("voxaroid_token");
    localStorage.removeItem("voxaroid_user");
    this.currentUser = null;
    this.accessToken = null;
    if (this.websocket) { this.websocket.close(); }
    if (this.synthesis) { this.synthesis.cancel(); }
    this.showLoginScreen();
    // Use replaceState to clean up URL from payment redirects
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  connectWebSocket() {
    if (this.websocket) { this.websocket.close(); }

    try {
      this.websocket = new WebSocket(this.wsUrl);

      this.websocket.onopen = () => {
        console.log("WebSocket connected");
        this.isConnected = true;
        this.updateConnectionStatus(true);
        // Backend expects userId in an init message
        this.websocket.send(JSON.stringify({ type: "init", userId: this.currentUser.userId }));
      };

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };

      this.websocket.onclose = () => {
        console.log("WebSocket disconnected");
        this.isConnected = false;
        this.updateConnectionStatus(false);
        if (this.currentUser) { setTimeout(() => this.connectWebSocket(), 3000); }
      };

      this.websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.updateConnectionStatus(false);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      this.updateConnectionStatus(false);
    }
  }
  
  handleWebSocketMessage(data) {
    if (data.type === "new_message") {
      this.hideTypingIndicator();
      this.addMessageWithTyping(data.text, data.sender);

      if (this.currentChatId) {
        this.saveChatMessage(this.currentChatId, data.text, data.sender);
      }

      if (data.sender === "assistant") {
        this.streamAndPlayVoice(data.text); // <-- MODIFIED: Call new tiered function
      }
    }
  }

  // --- Premium Voice Streaming (Tiered) ---
  streamAndPlayVoice(text) {
    if (!this.isVoiceEnabled || !this.synthesis) return;

    if (this.userPlan.type === 'free' || this.userPlan.type === 'guest') {
      // Free users get standard browser TTS
      this.speakText(text);
      return;
    }

    // --- Premium Voice Streaming Logic (Placeholder) ---
    console.log("Attempting to use Premium Voice Streaming for:", text);
    // In a real implementation, you would call your backend's text-to-speech streaming endpoint.
    // e.g., this.apiFetch('/api/text-to-speech-stream', { method: 'POST', body: JSON.stringify({ text }) })
    // and then handle the audio stream.
    // For now, we fall back to the standard voice for demonstration.
    this.speakText(text);
  }


  // --- All other methods from your original file remain unchanged below this line ---
  // (Omitted for brevity, but they should be present in your final file)
  
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  showSuccess(message) {
    // This is a simple notification. A toast library would be better in production.
    const errorDiv = document.getElementById("loginError")
    if (!errorDiv) return;
    errorDiv.textContent = message
    errorDiv.className = "mt-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg text-sm"
    errorDiv.classList.remove("hidden")
    setTimeout(() => this.hideError(), 3000)
  }

  showError(message) {
    const errorDiv = document.getElementById("loginError")
    if (!errorDiv) return;
    errorDiv.textContent = message
    errorDiv.className = "mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg text-sm"
    errorDiv.classList.remove("hidden")
    setTimeout(() => this.hideError(), 5000)
  }

  hideError() {
    const errorDiv = document.getElementById("loginError")
    if (errorDiv) errorDiv.classList.add("hidden")
  }
  
  // Stubs for functions that were removed from the primary flow
  setupSocialLogin() {}
  setupStripe() { if (window.Stripe && this.stripeApiKey !== "stripe_api_key") { this.stripe = window.Stripe(this.stripeApiKey); } }
  loadUserPlan() { const saved = localStorage.getItem("voxaroid_user_plan"); return saved ? JSON.parse(saved) : { type: "free", name: "Free Plan", messagesPerDay: 10 }; }
  saveUserPlan() { localStorage.setItem("voxaroid_user_plan", JSON.stringify(this.userPlan)); }
  loadDailyUsage() { const saved = localStorage.getItem("voxaroid_daily_usage"); const today = new Date().toDateString(); if (saved) { const usage = JSON.parse(saved); if (usage.date === today) { return usage; } } return { date: today, messages: 0 }; }
  saveDailyUsage() { localStorage.setItem("voxaroid_daily_usage", JSON.stringify(this.dailyUsage)); }
  updateUsageDisplay() { /* ... unchanged ... */ }
  canSendMessage() { if (this.userPlan.messagesPerDay === -1) return true; return this.dailyUsage.messages < this.userPlan.messagesPerDay; }
  incrementUsage() { this.dailyUsage.messages++; this.saveDailyUsage(); this.updateUsageDisplay(); if (!this.canSendMessage()) { document.getElementById("usageLimitWarning")?.classList.remove("hidden"); } }
  openSubscriptionModal() { document.getElementById("subscriptionModal")?.classList.remove("hidden"); }
  closeSubscriptionModal() { document.getElementById("subscriptionModal")?.classList.add("hidden"); }
  setupVoiceRecognition() { /* ... unchanged ... */ }
  toggleVoiceRecognition() { /* ... unchanged ... */ }
  updateVoiceUI(isListening) { /* ... unchanged ... */ }
  speakText(text) { if (!this.isVoiceEnabled || !this.synthesis) return; this.synthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); /* ... rest of function ... */ this.synthesis.speak(utterance); }
  toggleVoiceOutput() { this.isVoiceEnabled = !this.isVoiceEnabled; this.settings.voiceEnabled = this.isVoiceEnabled; this.saveSettings(); this.updateVoiceToggleUI(); }
  updateVoiceToggleUI() { /* ... unchanged ... */ }
  showChatInterface() { document.getElementById("loginScreen")?.classList.add("hidden"); document.getElementById("chatInterface")?.classList.remove("hidden"); this.renderChatHistory(); this.updateUsageDisplay(); }
  showLoginScreen() { document.getElementById("loginScreen")?.classList.remove("hidden"); document.getElementById("chatInterface")?.classList.add("hidden"); this.showLoginForm(); }
  updateConnectionStatus(connected) { const statusElement = document.getElementById("connectionStatus"); if (statusElement) { statusElement.innerHTML = connected ? '<i class="fas fa-circle text-green-500"></i> Connected' : '<i class="fas fa-circle text-red-500"></i> Disconnected'; } }
  sendMessage() { const input = document.getElementById("messageInput"); const message = input.value.trim(); if (!message || !this.isConnected) return; if (!this.canSendMessage()) { this.showError("You've reached your daily message limit."); return; } this.addMessage(message, "user", Date.now()); this.incrementUsage(); if (this.currentChatId) { this.saveChatMessage(this.currentChatId, message, "user"); this.updateChatTitle(this.currentChatId, message); } this.showTypingIndicator(); if (this.websocket?.readyState === WebSocket.OPEN) { this.websocket.send(JSON.stringify({ type: "send_message", text: message })); } input.value = ""; input.style.height = "auto"; this.updateSendButton(); }
  showTypingIndicator() { document.getElementById("typingIndicator")?.classList.remove("hidden"); this.scrollToBottom(); }
  hideTypingIndicator() { document.getElementById("typingIndicator")?.classList.add("hidden"); }
  addMessage(text, sender, timestamp) { /* ... unchanged ... */ }
  addMessageWithTyping(text, sender, timestamp) { this.typeMessage(text, sender, timestamp); }
  typeMessage(text, sender, timestamp) { /* ... unchanged ... */ }
  scrollToBottom() { const messagesContainer = document.getElementById("chatMessages"); if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight; }
  handleInputChange() { this.updateSendButton(); }
  updateSendButton() { const input = document.getElementById("messageInput"); const sendBtn = document.getElementById("sendBtn"); const hasText = input.value.trim().length > 0; const canSend = hasText && this.isConnected && this.canSendMessage(); if (sendBtn) sendBtn.disabled = !canSend; }
  loadChatHistory() { const saved = localStorage.getItem("voxaroid_chat_history"); return saved ? JSON.parse(saved) : []; }
  saveChatHistory() { localStorage.setItem("voxaroid_chat_history", JSON.stringify(this.chatHistory)); }
  saveChatMessage(chatId, message, sender) { const chat = this.chatHistory.find((c) => c.id === chatId); if (chat) { chat.messages.push({ text: message, sender, timestamp: Date.now() }); this.saveChatHistory(); } }
  renderChatHistory() { /* ... unchanged ... */ }
  loadChat(chatId) { /* ... unchanged ... */ }
  deleteChat(chatId) { /* ... unchanged ... */ }
  toggleSidebar() { document.getElementById("sidebar")?.classList.toggle("sidebar-hidden"); document.getElementById("mobileOverlay")?.classList.toggle("hidden"); }
  closeSidebar() { document.getElementById("sidebar")?.classList.add("sidebar-hidden"); document.getElementById("mobileOverlay")?.classList.add("hidden"); }
  loadSettings() { const saved = localStorage.getItem("voxaroid_settings"); return saved ? JSON.parse(saved) : { theme: "light", showTimestamps: true }; }
  saveSettings() { localStorage.setItem("voxaroid_settings", JSON.stringify(this.settings)); }
  applySettings() { /* ... unchanged ... */ }
  openSettings() { document.getElementById("settingsModal")?.classList.remove("hidden"); }
  closeSettings() { document.getElementById("settingsModal")?.classList.add("hidden"); }
  toggleTheme() { this.settings.theme = document.documentElement.classList.toggle("dark") ? "dark" : "light"; this.saveSettings(); this.applySettings(); }
  toggleTimestamps() { this.settings.showTimestamps = !this.settings.showTimestamps; this.saveSettings(); if (this.currentChatId) { this.loadChat(this.currentChatId); } }
  updateVoiceSettings() { /* ... unchanged ... */ }
  updateFontSettings() { /* ... unchanged ... */ }
  clearAllData() { if (confirm("Are you sure?")) { localStorage.removeItem("voxaroid_chat_history"); this.chatHistory = []; this.startNewChat(); this.closeSettings(); } }
  showLoginForm() { document.getElementById("loginContainer")?.classList.remove("hidden"); document.getElementById("signupForm")?.classList.add("hidden"); document.getElementById("emailVerificationForm")?.classList.add("hidden"); document.getElementById("phoneVerificationForm")?.classList.add("hidden"); this.clearTimers(); }
  showSignupForm() { document.getElementById("loginContainer")?.classList.add("hidden"); document.getElementById("signupForm")?.classList.remove("hidden"); this.clearTimers(); }
  showEmailVerificationForm(email) { document.getElementById("loginContainer")?.classList.add("hidden"); document.getElementById("signupForm")?.classList.add("hidden"); document.getElementById("emailVerificationForm")?.classList.remove("hidden"); document.getElementById("verificationEmail").textContent = email; this.startTimer("email", 300); }
  showPhoneVerificationForm(phone) { document.getElementById("emailVerificationForm")?.classList.add("hidden"); document.getElementById("phoneVerificationForm")?.classList.remove("hidden"); document.getElementById("verificationPhone").textContent = phone; this.startTimer("phone", 300); }
  startTimer(type, seconds) { /* ... unchanged ... */ }
  clearTimers() { /* ... unchanged ... */ }
  formatVerificationCode(e) { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); }
}

document.addEventListener("DOMContentLoaded", () => {
  new VoxaroidChat();
});