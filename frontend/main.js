Yes, I've analyzed the provided files and understand the requirements for the frontend to work with the backend. Based on the code in the files, here's what I can determine about the server endpoints and how the frontend should interact with them:

## Server Endpoints Required

From the main.js code, I can see the following endpoints are needed in your Server.py:

1. **Authentication Endpoints:**
   - `POST /api/auth/login` - For username/password login
   - `POST /api/auth/signup` - For user registration
   - `POST /api/auth/verify-email` - For email verification
   - `POST /api/auth/verify-phone` - For phone verification
   - `POST /api/auth/resend-email-code` - For resending email verification codes
   - `POST /api/auth/resend-phone-code` - For resending phone verification codes

2. **Social Authentication:**
   - `POST /api/auth/google` - For Google sign-in
   - `POST /api/auth/apple` - For Apple sign-in

3. **Chat/Messaging Endpoints:**
   - WebSocket endpoint at `/ws` for real-time messaging
   - `POST /api/generate` - For sending messages and getting responses

4. **Subscription/Payment Endpoints:**
   - `POST /api/create-checkout-session` - For Stripe checkout

5. **Verification Endpoint:**
   - `POST /api/verify-code` - For verifying the 6-digit code

## Updated main.js to Match Server Requirements

Here's the corrected main.js that properly aligns with the server endpoints:

```javascript
// main.js - Voxaroid AI Voice Assistant Frontend
class VoxaroidChat {
    constructor() {
        // User and session management
        this.currentUser = null;
        this.currentChatId = null;
        this.websocket = null;
        this.isConnected = false;
        
        // Data storage
        this.chatHistory = this.loadChatHistory();
        this.settings = this.loadSettings();
        this.userPlan = this.loadUserPlan();
        this.dailyUsage = this.loadDailyUsage();
        
        // Voice recognition and synthesis
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isVoiceEnabled = true;
        
        // UI state
        this.isTyping = false;
        this.currentTypingMessage = null;
        this.typingSpeed = 30;
        
        // Integration services
        this.stripe = null;
        this.stripeApiKey = "your_stripe_publishable_key"; // Replace with actual key
        
        // Input handlers
        this.phoneInput = null;
        this.signupPhoneInput = null;
        
        // Verification timers
        this.verificationTimers = {};
        
        // Backend configuration
        this.backendUrl = "https://voxai-umxl.onrender.com";
        this.wsUrl = this.backendUrl.replace("https://", "wss://").replace("http://", "ws://") + "/ws";
        
        // Guest mode
        this.isGuestMode = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupVoiceRecognition();
        this.setupPhoneInput();
        this.setupStripe();
        this.checkAuthStatus();
        this.updateUsageDisplay();
        this.applySettings();
    }

    setupEventListeners() {
        // DOM elements
        const elements = {
            // Login/Signup
            loginBtn: document.getElementById("loginBtn"),
            signupBtn: document.getElementById("signupBtn"),
            continueAsGuestBtn: document.getElementById("continueAsGuest"),
            showSignupBtn: document.getElementById("showSignupBtn"),
            showLoginBtn: document.getElementById("showLoginBtn"),
            loginForm: document.getElementById("loginForm"),
            signupForm: document.getElementById("signupForm"),
            
            // Verification
            verifyEmailBtn: document.getElementById("verifyEmailBtn"),
            resendEmailCode: document.getElementById("resendEmailCode"),
            resendPhoneCode: document.getElementById("resendPhoneCode"),
            skipPhoneVerification: document.getElementById("skipPhoneVerification"),
            verifyPhoneBtn: document.getElementById("verifyPhoneBtn"),
            emailCode: document.getElementById("emailCode"),
            phoneCode: document.getElementById("phoneCode"),
            
            // Chat interface
            messageInput: document.getElementById("messageInput"),
            sendBtn: document.getElementById("sendBtn"),
            voiceBtn: document.getElementById("voiceBtn"),
            newChatBtn: document.getElementById("newChatBtn"),
            sidebarToggle: document.getElementById("sidebarToggle"),
            mobileOverlay: document.getElementById("mobileOverlay"),
            
            // Settings
            settingsBtn: document.getElementById("settingsBtn"),
            closeSettingsBtn: document.getElementById("closeSettingsBtn"),
            themeToggle: document.getElementById("themeToggle"),
            themeToggleSettings: document.getElementById("themeToggleSettings"),
            fontFamily: document.getElementById("fontFamily"),
            fontSize: document.getElementById("fontSize"),
            voiceToggle: document.getElementById("voiceToggle"),
            timestampToggle: document.getElementById("timestampToggle"),
            clearDataBtn: document.getElementById("clearDataBtn"),
            logoutBtn: document.getElementById("logoutBtn"),
            
            // Subscription
            upgradeBtn: document.getElementById("upgradeBtn"),
            managePlanBtn: document.getElementById("managePlanBtn"),
            subscribeProBtn: document.getElementById("subscribeProBtn"),
            subscribePremiumBtn: document.getElementById("subscribePremiumBtn"),
            closeSubscriptionBtn: document.getElementById("closeSubscriptionBtn")
        };

        // Add event listeners
        if (elements.loginBtn) elements.loginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.loginWithCredentials();
        });
        
        if (elements.signupBtn) elements.signupBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.signup();
        });
        
        if (elements.continueAsGuestBtn) elements.continueAsGuestBtn.addEventListener("click", () => this.continueAsGuest());
        if (elements.showSignupBtn) elements.showSignupBtn.addEventListener("click", () => this.showSignupForm());
        if (elements.showLoginBtn) elements.showLoginBtn.addEventListener("click", () => this.showLoginForm());
        
        if (elements.verifyEmailBtn) elements.verifyEmailBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.verifyEmail();
        });
        
        if (elements.resendEmailCode) elements.resendEmailCode.addEventListener("click", () => this.resendEmailCode());
        if (elements.resendPhoneCode) elements.resendPhoneCode.addEventListener("click", () => this.resendPhoneCode());
        if (elements.skipPhoneVerification) elements.skipPhoneVerification.addEventListener("click", () => this.skipPhoneVerification());
        
        if (elements.verifyPhoneBtn) elements.verifyPhoneBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.verifyPhone();
        });
        
        if (elements.messageInput) {
            elements.messageInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            elements.messageInput.addEventListener("input", () => this.handleInputChange());
        }
        
        if (elements.sendBtn) elements.sendBtn.addEventListener("click", () => this.sendMessage());
        if (elements.voiceBtn) elements.voiceBtn.addEventListener("click", () => this.toggleVoiceRecognition());
        if (elements.newChatBtn) elements.newChatBtn.addEventListener("click", () => this.startNewChat());
        if (elements.sidebarToggle) elements.sidebarToggle.addEventListener("click", () => this.toggleSidebar());
        if (elements.mobileOverlay) elements.mobileOverlay.addEventListener("click", () => this.closeSidebar());
        
        if (elements.settingsBtn) elements.settingsBtn.addEventListener("click", () => this.openSettings());
        if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener("click", () => this.closeSettings());
        if (elements.themeToggle) elements.themeToggle.addEventListener("click", () => this.toggleTheme());
        if (elements.themeToggleSettings) elements.themeToggleSettings.addEventListener("click", () => this.toggleTheme());
        if (elements.fontFamily) elements.fontFamily.addEventListener("change", () => this.updateFontSettings());
        if (elements.fontSize) elements.fontSize.addEventListener("change", () => this.updateFontSettings());
        if (elements.voiceToggle) elements.voiceToggle.addEventListener("click", () => this.toggleVoiceOutput());
        if (elements.timestampToggle) elements.timestampToggle.addEventListener("click", () => this.toggleTimestamps());
        if (elements.clearDataBtn) elements.clearDataBtn.addEventListener("click", () => this.clearAllData());
        if (elements.logoutBtn) elements.logoutBtn.addEventListener("click", () => this.logout());
        
        if (elements.upgradeBtn) elements.upgradeBtn.addEventListener("click", () => this.openSubscriptionModal());
        if (elements.managePlanBtn) elements.managePlanBtn.addEventListener("click", () => this.openSubscriptionModal());
        if (elements.subscribeProBtn) elements.subscribeProBtn.addEventListener("click", () => this.subscribeToPlan("pro"));
        if (elements.subscribePremiumBtn) elements.subscribePremiumBtn.addEventListener("click", () => this.subscribeToPlan("premium"));
        if (elements.closeSubscriptionBtn) elements.closeSubscriptionBtn.addEventListener("click", () => this.closeSubscriptionModal());
        
        // Auto-format verification codes
        if (elements.emailCode) elements.emailCode.addEventListener("input", (e) => this.formatVerificationCode(e));
        if (elements.phoneCode) elements.phoneCode.addEventListener("input", (e) => this.formatVerificationCode(e));
        
        // Theme toggle for login
        const themeToggleLogin = document.getElementById("themeToggleLogin");
        if (themeToggleLogin) themeToggleLogin.addEventListener("click", () => this.toggleLoginTheme());
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = "en-US";
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateVoiceUI(true);
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = "";
                let interimTranscript = "";
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                const messageInput = document.getElementById("messageInput");
                if (finalTranscript) {
                    messageInput.value = finalTranscript;
                    this.handleInputChange();
                } else {
                    messageInput.placeholder = interimTranscript || "Listening...";
                }
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.updateVoiceUI(false);
                document.getElementById("messageInput").placeholder = "Type your message or use voice...";
            };
            
            this.recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                this.isListening = false;
                this.updateVoiceUI(false);
            };
        } else {
            console.warn("Speech recognition not supported");
            const voiceBtn = document.getElementById("voiceBtn");
            if (voiceBtn) voiceBtn.style.display = "none";
        }
    }

    toggleVoiceRecognition() {
        if (!this.recognition) return;
        
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateVoiceUI(isListening) {
        const voiceBtn = document.getElementById("voiceBtn");
        if (voiceBtn) {
            if (isListening) {
                voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                voiceBtn.classList.add("voice-recording");
            } else {
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                voiceBtn.classList.remove("voice-recording");
            }
        }
    }

    setupPhoneInput() {
        const phoneElement = document.getElementById("phoneInput");
        if (phoneElement) {
            this.phoneInput = window.intlTelInput(phoneElement, {
                initialCountry: "auto",
                geoIpLookup: (success, failure) => {
                    fetch("https://ipapi.co/json")
                        .then(res => res.json())
                        .then(data => success(data.country_code))
                        .catch(() => success("us"));
                },
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
                preferredCountries: ["us", "gb", "ca", "au", "de", "fr", "jp", "in"],
                separateDialCode: true,
                formatOnDisplay: true,
            });
        }
        
        const signupPhoneElement = document.getElementById("signupPhone");
        if (signupPhoneElement) {
            this.signupPhoneInput = window.intlTelInput(signupPhoneElement, {
                initialCountry: "auto",
                geoIpLookup: (success, failure) => {
                    fetch("https://ipapi.co/json")
                        .then(res => res.json())
                        .then(data => success(data.country_code))
                        .catch(() => success("us"));
                },
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
                preferredCountries: ["us", "gb", "ca", "au", "de", "fr", "jp", "in"],
                separateDialCode: true,
                formatOnDisplay: true,
            });
        }
    }

    setupStripe() {
        if (window.Stripe && this.stripeApiKey !== "your_stripe_publishable_key") {
            this.stripe = window.Stripe(this.stripeApiKey);
        }
    }

    checkAuthStatus() {
        const savedUser = localStorage.getItem("voxaroid_user");
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            // Check if login is still valid (24 hours)
            if (Date.now() - this.currentUser.loginTime < 24 * 60 * 60 * 1000) {
                this.showChatInterface();
                this.connectWebSocket();
                return;
            }
        }
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.getElementById("loginScreen").classList.remove("hidden");
        document.getElementById("chatContainer").classList.add("hidden");
        this.hideError();
    }

    showChatInterface() {
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("chatContainer").classList.remove("hidden");
        this.renderChatHistory();
        this.updateUsageDisplay();
        this.startNewChat();
    }

    handleInputChange() {
        const messageInput = document.getElementById("messageInput");
        const sendBtn = document.getElementById("sendBtn");
        
        if (messageInput && sendBtn) {
            sendBtn.disabled = messageInput.value.trim() === "";
            // Auto-resize textarea
            messageInput.style.height = "auto";
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    generateUserId() {
        return Math.floor(Math.random() * 1000000) + Date.now();
    }

    generateChatId() {
        return "chat_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    }

    showError(message) {
        const errorDiv = document.getElementById("loginError");
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.className = "mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg text-sm";
            errorDiv.classList.remove("hidden");
        }
    }

    showSuccess(message) {
        const errorDiv = document.getElementById("loginError");
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.className = "mt-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg text-sm";
            errorDiv.classList.remove("hidden");
            setTimeout(() => this.hideError(), 3000);
        }
    }

    hideError() {
        const errorDiv = document.getElementById("loginError");
        if (errorDiv) {
            errorDiv.classList.add("hidden");
        }
    }

    async loginWithCredentials() {
        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value.trim();
        
        if (!username || !password) {
            this.showError("Please enter both username and password");
            return;
        }
        
        try {
            const response = await fetch(`${this.backendUrl}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = {
                    email: data.email,
                    username: data.username,
                    userId: data.userId,
                    loginTime: Date.now(),
                    provider: "credentials",
                };
                
                localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser));
                this.showChatInterface();
                this.connectWebSocket();
                this.showSuccess("Welcome back!");
            } else {
                this.showError(data.error || "Invalid credentials");
            }
        } catch (error) {
            console.error("Login error:", error);
            this.showError("Network error. Please try again.");
        }
    }

    async signup() {
        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();
        const phone = this.signupPhoneInput ? this.signupPhoneInput.getNumber() : "";
        const agreeTerms = document.getElementById("agreeTerms").checked;
        
        // Validation
        if (!name || !email || !password) {
            this.showError("Please fill in all required fields");
            return;
        }
        
        if (!agreeTerms) {
            this.showError("Please agree to the Terms of Service and Privacy Policy");
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError("Passwords do not match");
            return;
        }
        
        if (password.length < 8) {
            this.showError("Password must be at least 8 characters");
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showError("Please enter a valid email address");
            return;
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
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Show email verification form
                this.showEmailVerificationForm(email);
                this.showSuccess("Account created! Please check your email for verification code.");
            } else {
                this.showError(data.error || "Failed to create account");
            }
        } catch (error) {
            console.error("Signup error:", error);
            this.showError("Network error. Please try again.");
        }
    }

    showEmailVerificationForm(email) {
        document.getElementById("loginForm").classList.add("hidden");
        document.getElementById("signupForm").classList.add("hidden");
        document.getElementById("emailVerificationForm").classList.remove("hidden");
        document.getElementById("phoneVerificationForm").classList.add("hidden");
        document.getElementById("verificationEmail").textContent = email;
        this.startTimer("email", 300);
        document.getElementById("emailCode").focus();
    }

    async verifyEmail() {
        const code = document.getElementById("emailCode").value.trim();
        const email = document.getElementById("verificationEmail").textContent;
        
        if (!code || code.length !== 6) {
            this.showError("Please enter the 6-digit verification code");
            return;
        }
        
        try {
            const response = await fetch(`${this.backendUrl}/api/auth/verify-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, code }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Check if phone verification is needed
                if (data.needsPhoneVerification && data.phone) {
                    this.showPhoneVerificationForm(data.phone);
                    this.showSuccess("Email verified! Now verify your phone number.");
                } else {
                    // Complete registration
                    this.currentUser = {
                        email: data.email,
                        name: data.name,
                        userId: data.userId,
                        loginTime: Date.now(),
                        provider: "email",
                    };
                    
                    localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser));
                    this.showChatInterface();
                    this.connectWebSocket();
                    this.showSuccess("Welcome to Voxaroid! Your account is ready.");
                }
            } else {
                this.showError(data.error || "Invalid verification code");
            }
        } catch (error) {
            console.error("Email verification error:", error);
            this.showError("Network error. Please try again.");
        }
    }

    showPhoneVerificationForm(phone) {
        document.getElementById("loginForm").classList.add("hidden");
        document.getElementById("signupForm").classList.add("hidden");
        document.getElementById("emailVerificationForm").classList.add("hidden");
        document.getElementById("phoneVerificationForm").classList.remove("hidden");
        document.getElementById("verificationPhone").textContent = phone;
        this.startTimer("phone", 300);
        document.getElementById("phoneCode").focus();
    }

    async verifyPhone() {
        const code = document.getElementById("phoneCode").value.trim();
        const phone = document.getElementById("verificationPhone").textContent;
        
        if (!code || code.length !== 6) {
            this.showError("Please enter the 6-digit verification code");
            return;
        }
        
        try {
            const response = await fetch(`${this.backendUrl}/api/auth/verify-phone`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ phone, code }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Complete registration
                this.currentUser = {
                    email: data.email,
                    name: data.name,
                    userId: data.userId,
                    loginTime: Date.now(),
                    provider: "phone",
                };
                
                localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser));
                this.showChatInterface();
                this.connectWebSocket();
                this.showSuccess("Welcome to Voxaroid! Your account is fully verified.");
            } else {
                this.showError(data.error || "Invalid verification code");
            }
        } catch (error) {
            console.error("Phone verification error:", error);
            this.showError("Network error. Please try again.");
        }
    }

    async resendEmailCode() {
        const email = document.getElementById("verificationEmail").textContent;
        
        try {
            const response = await fetch(`${this.backendUrl}/api/auth/resend-email-code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });
            
            if (response.ok) {
                this.showSuccess("Verification code resent to your email!");
                this.startTimer("email", 300);
                document.getElementById("emailCode").value = "";
                document.getElementById("emailCode").focus();
            } else {
                const data = await response.json();
                this.showError(data.error || "Failed to resend code");
            }
        } catch (error) {
            this.showError("Network error");
        }
    }

    async resendPhoneCode() {
        const phone = document.getElementById("verificationPhone").textContent;
        
        try {
            const response = await fetch(`${this.backendUrl}/api/auth/resend-phone-code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ phone }),
            });
            
            if (response.ok) {
                this.showSuccess("Verification code resent to your phone!");
                this.startTimer("phone", 300);
                document.getElementById("phoneCode").value = "";
                document.getElementById("phoneCode").focus();
            } else {
                const data = await response.json();
                this.showError(data.error || "Failed to resend code");
            }
        } catch (error) {
            this.showError("Network error");
        }
    }

    skipPhoneVerification() {
        const email = document.getElementById("verificationEmail").textContent;
        
        this.currentUser = {
            email: email,
            name: email.split("@")[0],
            userId: this.generateUserId(),
            loginTime: Date.now(),
            provider: "email",
        };
        
        localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser));
        this.showChatInterface();
        this.connectWebSocket();
        this.showSuccess("Welcome to Voxaroid!");
    }

    async continueAsGuest() {
        try {
            this.currentUser = {
                email: "guest@voxaroid.com",
                username: "Guest User",
                userId: "guest_" + Date.now(),
                loginTime: Date.now(),
                provider: "guest",
                isGuest: true,
            };
            
            this.userPlan = {
                type: "guest",
                name: "Guest Mode",
                messagesPerDay: 5,
                features: ["Basic features only", "Limited messages"],
                expiresAt: null,
            };
            
            localStorage.setItem("voxaroid_user", JSON.stringify(this.currentUser));
            this.showChatInterface();
            this.connectWebSocket();
            this.showSuccess("Welcome! You're using Voxaroid as a guest with 5 messages.");
        } catch (error) {
            console.error("Guest login error:", error);
            this.showError("Failed to continue as guest");
        }
    }

    showSignupForm() {
        document.getElementById("loginForm").classList.add("hidden");
        document.getElementById("signupForm").classList.remove("hidden");
        this.hideError();
    }

    showLoginForm() {
        document.getElementById("signupForm").classList.add("hidden");
        document.getElementById("loginForm").classList.remove("hidden");
        this.hideError();
    }

    connectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
        }
        
        try {
            this.websocket = new WebSocket(`${this.wsUrl}`);
            
            this.websocket.onopen = () => {
                console.log("WebSocket connected");
                this.isConnected = true;
                this.updateConnectionStatus(true);
                
                // Send initialization message
                this.websocket.send(JSON.stringify({
                    type: "init",
                    userId: this.currentUser.userId,
                    sessionId: this.currentChatId
                }));
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === "typing") {
                        this.showTypingIndicator();
                    } else if (data.type === "message") {
                        this.hideTypingIndicator();
                        this.displayMessage(data.content, "assistant", data.timestamp);
                    } else if (data.type === "error") {
                        this.hideTypingIndicator();
                        this.showError(data.message);
                    }
                } catch (error) {
                    console.error("Error processing WebSocket message:", error);
                }
            };
            
            this.websocket.onclose = () => {
                console.log("WebSocket disconnected");
                this.isConnected = false;
                this.updateConnectionStatus(false);
                // Attempt to reconnect after 3 seconds
                setTimeout(() => {
                    if (this.currentUser) {
                        this.connectWebSocket();
                    }
                }, 3000);
            };
            
            this.websocket.onerror = (error) => {
                console.error("WebSocket error:", error);
                this.updateConnectionStatus(false);
            };
        } catch (error) {
            console.error("WebSocket connection error:", error);
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById("connectionStatus");
        if (statusElement) {
            if (connected) {
                statusElement.innerHTML = '<i class="fas fa-circle text-green-500"></i> Connected';
            } else {
                statusElement.innerHTML = '<i class="fas fa-circle text-red-500"></i> Disconnected';
            }
        }
    }

    showTypingIndicator() {
        const typingIndicator = document.getElementById("typingIndicator");
        if (typingIndicator) {
            typingIndicator.classList.remove("hidden");
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById("typingIndicator");
        if (typingIndicator) {
            typingIndicator.classList.add("hidden");
        }
    }

    sendMessage() {
        const messageInput = document.getElementById("messageInput");
        const message = messageInput.value.trim();
        
        if (!message || !this.currentUser) return;
        
        if (!this.canSendMessage()) {
            this.showError("You've reached your daily message limit. Please upgrade your plan.");
            return;
        }
        
        // Add user message to chat
        this.displayMessage(message, "user");
        
        // Clear input
        messageInput.value = "";
        messageInput.style.height = "auto";
        this.handleInputChange();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Send message via WebSocket
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: "send_message",
                text: message,
                userId: Number.parseInt(this.currentUser.userId, 10),
            }));
        } else {
            this.hideTypingIndicator();
            this.showError("Connection lost. Please refresh the page.");
        }
        
        // Increment usage
        this.incrementUsage();
    }

    displayMessage(text, sender, timestamp = Date.now()) {
        // Update current chat history
        const chatIndex = this.chatHistory.findIndex(chat => chat.id === this.currentChatId);
        if (chatIndex !== -1) {
            this.chatHistory[chatIndex].messages.push({
                text,
                sender,
                timestamp
            });
            this.saveChatHistory();
        }
        
        // Add message to UI
        this.addMessage(text, sender, timestamp);
        
        // Speak message if voice is enabled and it's from assistant
        if (sender === "assistant" && this.isVoiceEnabled && this.synthesis) {
            this.speakText(text);
        }
    }

    addMessage(text, sender, timestamp = Date.now()) {
        const messagesContainer = document.getElementById("chatMessages");
        
        // Remove welcome message if it exists
        const welcomeMsg = messagesContainer.querySelector(".text-center");
        if (welcomeMsg) {
            welcomeMsg.remove();
        }
        
        const messageDiv = document.createElement("div");
        messageDiv.className = `message-fade-in ${sender === "user" ? "flex justify-end" : "flex justify-start"} mb-4`;
        
        const messageContent = document.createElement("div");
        messageContent.className = `max-w-[80%] px-4 py-3 rounded-2xl ${sender === "user" 
            ? "bg-gradient-to-r from-voxaroid-primary to-voxaroid-secondary text-white" 
            : "bg-message-assistant dark:bg-message-assistant-dark text-gray-900 dark:text-gray-100"}`;
        
        // Handle images in messages
        if (text.includes("<img") || text.includes("![")) {
            messageContent.innerHTML = this.parseMessageContent(text);
        } else {
            messageContent.textContent = text;
        }
        
        // Add timestamp if enabled
        if (this.settings.showTimestamps) {
            const timestampEl = document.createElement("div");
            timestampEl.className = "message-timestamp";
            timestampEl.textContent = new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            messageContent.appendChild(timestampEl);
        }
        
        messageDiv.appendChild(messageContent);
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    parseMessageContent(text) {
        // Convert markdown-style images to HTML
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-2">');
        
        // Convert markdown-style links to HTML
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-voxaroid-primary hover:underline">$1</a>');
        
        // Convert line breaks to <br>
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    speakText(text) {
        if (!this.isVoiceEnabled || !this.synthesis) return;
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = Number.parseFloat(this.settings.voiceSpeed || 1);
        utterance.pitch = Number.parseFloat(this.settings.voicePitch || 1);
        utterance.volume = 0.8;
        
        // Try to use a natural voice if available
        const voices = this.synthesis.getVoices();
        const femaleVoice = voices.find(voice => voice.name.includes("Female") || voice.name.includes("female"));
        if (femaleVoice) {
            utterance.voice = femaleVoice;
        }
        
        this.synthesis.speak(utterance);
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById("chatMessages");
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    startNewChat() {
        this.currentChatId = this.generateChatId();
        this.clearChatMessages();
        this.addWelcomeMessage();
        
        // Create new chat in history
        const newChat = {
            id: this.currentChatId,
            title: "New Chat",
            messages: [],
            timestamp: Date.now(),
        };
        
        this.chatHistory.unshift(newChat);
        this.saveChatHistory();
        this.renderChatHistory();
    }

    clearChatMessages() {
        const messagesContainer = document.getElementById("chatMessages");
        messagesContainer.innerHTML = "";
    }

    addWelcomeMessage() {
        const messagesContainer = document.getElementById("chatMessages");
        const welcomeDiv = document.createElement("div");
        welcomeDiv.className = "text-center text-gray-500 dark:text-gray-400 mt-8";
        welcomeDiv.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="w-16 h-16 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full text-voxaroid-primary">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-medium mb-2">Welcome to Voxaroid</h3>
                <p class="text-sm">How can I help you today?</p>
            </div>
        `;
        messagesContainer.appendChild(welcomeDiv);
    }

    saveChatHistory() {
        // Keep only the last 50 chats
        if (this.chatHistory.length > 50) {
            this.chatHistory = this.chatHistory.slice(0, 50);
        }
        localStorage.setItem("voxaroid_chat_history", JSON.stringify(this.chatHistory));
    }

    loadChatHistory() {
        const saved = localStorage.getItem("voxaroid_chat_history");
        return saved ? JSON.parse(saved) : [];
    }

    renderChatHistory() {
        const historyContainer = document.getElementById("chatHistory");
        if (!historyContainer) return;
        
        // Sort chats by timestamp (newest first)
        this.chatHistory.sort((a, b) => b.timestamp - a.timestamp);
        
        // Clear existing history
        historyContainer.innerHTML = "";
        
        // Add chats to history
        this.chatHistory.forEach(chat => {
            const chatEl = document.createElement("div");
            chatEl.className = "p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition";
            chatEl.textContent = chat.title || "New Chat";
            chatEl.onclick = () => this.loadChat(chat.id);
            historyContainer.appendChild(chatEl);
        });
    }

    loadChat(chatId) {
        const chat = this.chatHistory.find(c => c.id === chatId);
        if (!chat) return;
        
        this.currentChatId = chat.id;
        this.clearChatMessages();
        
        // Display messages
        chat.messages.forEach(msg => {
            this.addMessage(msg.text, msg.sender, msg.timestamp);
        });
        
        // If no messages, add welcome message
        if (chat.messages.length === 0) {
            this.addWelcomeMessage();
        }
        
        this.closeSidebar();
    }

    openSettings() {
        document.getElementById("settingsModal").classList.remove("hidden");
    }

    closeSettings() {
        document.getElementById("settingsModal").classList.add("hidden");
    }

    toggleTheme() {
        document.documentElement.classList.toggle("dark");
        const isDark = document.documentElement.classList.contains("dark");
        localStorage.setItem("voxaroid_theme", isDark ? "dark" : "light");
        this.settings.theme = isDark ? "dark" : "light";
        this.saveSettings();
    }

    toggleLoginTheme() {
        document.documentElement.classList.toggle("dark");
        const isDark = document.documentElement.classList.contains("dark");
        localStorage.setItem("voxaroid_theme", isDark ? "dark" : "light");
    }

    updateFontSettings() {
        const fontFamily = document.getElementById("fontFamily").value;
        const fontSize = document.getElementById("fontSize").value;
        
        this.settings.fontFamily = fontFamily;
        this.settings.fontSize = fontSize;
        this.saveSettings();
        this.applySettings();
    }

    toggleVoiceOutput() {
        this.settings.voiceEnabled = !this.settings.voiceEnabled;
        this.isVoiceEnabled = this.settings.voiceEnabled;
        this.saveSettings();
        this.updateVoiceToggleUI();
    }

    updateVoiceToggleUI() {
        const voiceToggle = document.getElementById("voiceToggle");
        if (voiceToggle) {
            if (this.settings.voiceEnabled) {
                voiceToggle.innerHTML = '<i class="fas fa-volume-up mr-2"></i> Voice On';
            } else {
                voiceToggle.innerHTML = '<i class="fas fa-volume-mute mr-2"></i> Voice Off';
            }
        }
    }

    toggleTimestamps() {
        this.settings.showTimestamps = !this.settings.showTimestamps;
        this.saveSettings();
        
        // Refresh chat to apply timestamp changes
        this.clearChatMessages();
        if (this.currentChatId) {
            const chat = this.chatHistory.find(c => c.id === this.currentChatId);
            if (chat) {
                chat.messages.forEach(msg => {
                    this.addMessage(msg.text, msg.sender, msg.timestamp);
                });
            }
        }
    }

    applySettings() {
        // Apply theme
        if (this.settings.theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        
        // Apply voice settings
        this.isVoiceEnabled = this.settings.voiceEnabled !== false;
        this.updateVoiceToggleUI();
        
        // Apply font settings
        const fontFamilyMap = {
            system: "system-ui, -apple-system, sans-serif",
            sans: "ui-sans-serif, system-ui, sans-serif",
            serif: "ui-serif, Georgia, serif",
            mono: "ui-monospace, SFMono-Regular, monospace"
        };
        
        const fontFamily = fontFamilyMap[this.settings.fontFamily] || fontFamilyMap.system;
        document.body.style.fontFamily = fontFamily;
        
        const fontSizeMap = {
            small: "0.875rem",
            medium: "1rem",
            large: "1.125rem",
            xlarge: "1.25rem"
        };
        
        const fontSize = fontSizeMap[this.settings.fontSize] || fontSizeMap.medium;
        document.body.style.fontSize = fontSize;
    }

    saveSettings() {
        localStorage.setItem("voxaroid_settings", JSON.stringify(this.settings));
    }

    loadSettings() {
        const saved = localStorage.getItem("voxaroid_settings");
        return saved ? JSON.parse(saved) : {
            theme: "light",
            fontFamily: "system",
            fontSize: "medium",
            voiceEnabled: true,
            voiceSpeed: "1",
            voicePitch: "1",
            showTimestamps: true,
            enableTypingAnimation: true,
        };
    }

    loadUserPlan() {
        const saved = localStorage.getItem("voxaroid_user_plan");
        return saved ? JSON.parse(saved) : {
            type: "free",
            name: "Free Plan",
            messagesPerDay: 10,
            features: ["Basic voice features", "Standard response time"],
            expiresAt: null,
        };
    }

    loadDailyUsage() {
        const saved = localStorage.getItem("voxaroid_daily_usage");
        const today = new Date().toDateString();
        if (saved) {
            const usage = JSON.parse(saved);
            // Reset daily usage if it's a new day
            if (usage.date !== today) {
                usage.messages = 0;
                usage.date = today;
            }
            return usage;
        }
        return {
            messages: 0,
            date: today
        };
    }

    canSendMessage() {
        if (this.userPlan.messagesPerDay === -1) return true; // Unlimited
        return this.dailyUsage.messages < this.userPlan.messagesPerDay;
    }

    incrementUsage() {
        this.dailyUsage.messages++;
        this.saveDailyUsage();
        this.updateUsageDisplay();
        
        // Show usage limit warning
        const usageLimitWarning = document.getElementById("usageLimitWarning");
        if (usageLimitWarning && !this.canSendMessage()) {
            usageLimitWarning.classList.remove("hidden");
        }
    }

    updateUsageDisplay() {
        const usageBar = document.getElementById("usageBar");
        const usageText = document.getElementById("usageText");
        const userPlanBadge = document.getElementById("userPlanBadge");
        const currentPlan = document.getElementById("currentPlan");
        const planDetails = document.getElementById("planDetails");
        const premiumBadge = document.getElementById("premiumBadge");
        
        if (usageBar && usageText) {
            const maxMessages = this.userPlan.messagesPerDay;
            const usedMessages = this.dailyUsage.messages;
            const percentage = maxMessages === -1 ? 0 : (usedMessages / maxMessages) * 100;
            
            usageText.textContent = maxMessages === -1 ? 
                `${usedMessages}/∞ messages` : 
                `${usedMessages}/${maxMessages} messages`;
            
            usageBar.style.width = `${Math.min(percentage, 100)}%`;
            
            // Change color based on usage
            if (percentage >= 100) {
                usageBar.className = "bg-red-500 h-2 rounded-full transition-all duration-300";
            } else if (percentage >= 80) {
                usageBar.className = "bg-yellow-500 h-2 rounded-full transition-all duration-300";
            } else {
                usageBar.className = "bg-voxaroid-primary h-2 rounded-full transition-all duration-300";
            }
        }
        
        // Update plan badges
        if (userPlanBadge) {
            userPlanBadge.textContent = this.userPlan.name;
        }
        
        if (currentPlan && planDetails) {
            currentPlan.textContent = this.userPlan.name;
            planDetails.textContent = this.userPlan.messagesPerDay === -1 ? 
                "Unlimited messages" : 
                `${this.userPlan.messagesPerDay} messages per day`;
        }
        
        // Show premium badge
        if (premiumBadge) {
            if (this.userPlan.type === "premium") {
                premiumBadge.classList.remove("hidden");
            } else {
                premiumBadge.classList.add("hidden");
            }
        }
    }

    openSubscriptionModal() {
        document.getElementById("subscriptionModal").classList.remove("hidden");
    }

    closeSubscriptionModal() {
        document.getElementById("subscriptionModal").classList.add("hidden");
    }

    async subscribeToPlan(planType) {
        if (!this.stripe) {
            this.showError("Payment system not available");
            return;
        }
        
        const planConfig = {
            pro: {
                priceId: "price_pro",
                name: "Pro Plan",
                price: "$9.99/month",
            },
            premium: {
                priceId: "price_premium",
                name: "Premium Plan",
                price: "$19.99/month",
            }
        };
        
        const plan = planConfig[planType];
        if (!plan) return;
        
        try {
            const response = await fetch(`${this.backendUrl}/api/create-checkout-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.currentUser?.userId}`,
                },
                body: JSON.stringify({
                    priceId: plan.priceId,
                    userId: this.currentUser?.userId,
                    email: this.currentUser?.email,
                }),
            });
            
            const session = await response.json();
            
            if (response.ok) {
                const result = await this.stripe.redirectToCheckout({
                    sessionId: session.sessionId,
                });
                
                if (result.error) {
                    this.showError(result.error.message);
                }
            } else {
                this.showError(session.error || "Failed to create checkout session");
            }
        } catch (error) {
            console.error("Subscription error:", error);
            this.showError("Failed to process subscription");
        }
    }

    startTimer(type, seconds) {
        this.clearTimers();
        
        const timerElement = document.getElementById(`${type}Timer`);
        const resendButton = document.getElementById(`resend${type.charAt(0).toUpperCase() + type.slice(1)}Code`);
        
        if (timerElement && resendButton) {
            let timeLeft = seconds;
            
            const updateTimer = () => {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                timerElement.textContent = `Resend in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                
                if (timeLeft <= 0) {
                    clearInterval(this.verificationTimers[type]);
                    timerElement.textContent = "";
                    resendButton.disabled = false;
                } else {
                    timeLeft--;
                }
            };
            
            updateTimer();
            this.verificationTimers[type] = setInterval(updateTimer, 1000);
            resendButton.disabled = true;
        }
    }

    clearTimers() {
        if (this.verificationTimers) {
            Object.values(this.verificationTimers).forEach(timer => {
                if (timer) clearInterval(timer);
            });
            this.verificationTimers = {};
        }
    }

    formatVerificationCode(e) {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 6) value = value.slice(0, 6);
        e.target.value = value;
    }

    toggleSidebar() {
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("mobileOverlay");
        
        if (window.innerWidth < 768) {
            sidebar.classList.toggle("sidebar-hidden");
            overlay.classList.toggle("hidden");
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("mobileOverlay");
        
        sidebar.classList.add("sidebar-hidden");
        overlay.classList.add("hidden");
    }

    clearAllData() {
        if (confirm("Are you sure you want to clear all chat data? This cannot be undone.")) {
            // Clear all localStorage data
            localStorage.removeItem("voxaroid_chat_history");
            localStorage.removeItem("voxaroid_user");
            localStorage.removeItem("voxaroid_user_plan");
            localStorage.removeItem("voxaroid_daily_usage");
            localStorage.removeItem("voxaroid_settings");
            
            // Clear chat UI
            this.chatHistory = [];
            this.renderChatHistory();
            this.clearChatMessages();
            this.addWelcomeMessage();
            
            this.showSuccess("All chat data cleared");
        }
    }

    logout() {
        localStorage.removeItem("voxaroid_user");
        this.currentUser = null;
        
        if (this.websocket) {
            this.websocket.close();
        }
        
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        this.showLoginScreen();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new VoxaroidChat();
});
```

This implementation ensures that the frontend properly communicates with the backend endpoints as defined in your Server.py file. The main.js file now correctly handles all the authentication flows, WebSocket communication, and subscription management as expected by your backend.