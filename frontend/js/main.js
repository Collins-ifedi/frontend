// Update main.js to handle the new authentication flow and add email verification
class VoxaroidApp {
    constructor() {
        this.isInitialized = false;
        this.verificationEmail = null;
    }
    
    // Initialize the application
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Initialize modules
            Settings.init();
            Voice.init();
            FileUpload.init();
            await Subscription.init();
            
            // Check authentication and validate token
            if (Auth.isAuthenticated()) {
                const isValid = await Auth.validateToken();
                if (isValid) {
                    await this.showApp();
                } else {
                    Auth.logout(); // Clear invalid token
                    this.showLogin();
                }
            } else {
                this.showLogin();
            }
            
            // Bind global events
            this.bindGlobalEvents();
            
            // Handle page visibility changes
            this.handleVisibilityChange();
            
            // Handle online/offline status
            this.handleConnectionStatus();
            
            this.isInitialized = true;
            console.log('Voxaroid app initialized successfully');
            
        } catch (error) {
            console.error('Error initializing app:', error);
            Utils.showToast('Error initializing application', 'error');
        }
    }
    
    // Show main application
    async showApp() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        
        // Initialize app components
        WebSocketManager.connect();
        await Chat.loadChatHistory();
        
        // Load user info
        const user = Auth.getCurrentUser();
        if (user) {
            console.log('User logged in:', user.email);
        }
        
        Utils.showToast('Welcome to Voxaroid!', 'success', 2000);
    }
    
    // Show login screen
    showLogin() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
        
        // Disconnect WebSocket if connected
        WebSocketManager.disconnect();
    }
    
    // Bind global event listeners
    bindGlobalEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
        
        // Signup form
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSignup();
        });
        
        // Toggle between login and signup
        document.getElementById('showSignupBtn').addEventListener('click', () => {
            this.toggleAuthForm('signup');
        });
        
        document.getElementById('showLoginBtn').addEventListener('click', () => {
            this.toggleAuthForm('login');
        });
        
        // New chat button
        document.getElementById('newChatBtn').addEventListener('click', () => {
            Chat.newChat();
        });
        
        // Send message
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Message input handling
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
        });
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Sidebar toggle for mobile
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Close modals on outside click
        this.bindModalCloseEvents();
        
        // Keyboard shortcuts
        this.bindKeyboardShortcuts();
    }
    
    // Handle login
    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const loginBtn = document.getElementById('loginBtn');
        
        if (!email || !password) {
            Utils.showToast('Please enter both email and password', 'error');
            return;
        }
        
        // Show loading state
        loginBtn.textContent = 'Signing in...';
        loginBtn.disabled = true;
        
        try {
            const result = await Auth.login(email, password);
            
            if (result.success) {
                await this.showApp();
            } else {
                Utils.showToast(result.error, 'error');
            }
        } finally {
            loginBtn.textContent = 'Sign In';
            loginBtn.disabled = false;
        }
    }
    
    // Handle signup
    async handleSignup() {
        const name = document.getElementById('signupName')?.value?.trim() || 'User';
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const signupBtn = document.getElementById('signupBtn');
        
        if (!email || !password) {
            Utils.showToast('Please enter both email and password', 'error');
            return;
        }
        
        // Show loading state
        signupBtn.textContent = 'Creating account...';
        signupBtn.disabled = true;
        
        try {
            const result = await Auth.signup(name, email, password);
            
            if (result.success) {
                Utils.showToast(result.message, 'success', 5000);
                this.verificationEmail = result.email;
                this.showEmailVerification();
            } else {
                Utils.showToast(result.error, 'error');
            }
        } finally {
            signupBtn.textContent = 'Create Account';
            signupBtn.disabled = false;
        }
    }
    
    // Show email verification form
    showEmailVerification() {
        // Create verification form if it doesn't exist
        if (!document.getElementById('verificationForm')) {
            const verificationHtml = `
                <form id="verificationForm" class="space-y-6 hidden">
                    <div class="text-center mb-6">
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Verify Your Email</h3>
                        <p class="text-gray-600 dark:text-gray-400">We sent a verification code to ${this.verificationEmail}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verification Code</label>
                        <input type="text" id="verificationCode" required maxlength="6"
                               class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
                               placeholder="000000">
                    </div>
                    <button type="submit" id="verifyBtn"
                            class="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200">
                        Verify Email
                    </button>
                    <div class="text-center">
                        <button type="button" id="resendCodeBtn" class="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                            Didn't receive the code? Resend
                        </button>
                    </div>
                </form>
            `;
            
            // Insert after signup form
            document.getElementById('signupForm').insertAdjacentHTML('afterend', verificationHtml);
            
            // Bind verification events
            document.getElementById('verificationForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleEmailVerification();
            });
            
            document.getElementById('resendCodeBtn').addEventListener('click', async () => {
                await this.resendVerificationCode();
            });
        }
        
        // Hide other forms and show verification
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('showSignupBtn').classList.add('hidden');
        document.getElementById('showLoginBtn').classList.add('hidden');
        document.getElementById('verificationForm').classList.remove('hidden');
    }
    
    // Handle email verification
    async handleEmailVerification() {
        const code = document.getElementById('verificationCode').value.trim();
        const verifyBtn = document.getElementById('verifyBtn');
        
        if (!code || code.length !== 6) {
            Utils.showToast('Please enter the 6-digit verification code', 'error');
            return;
        }
        
        verifyBtn.textContent = 'Verifying...';
        verifyBtn.disabled = true;
        
        try {
            const result = await Auth.verifyEmail(this.verificationEmail, code);
            
            if (result.success) {
                Utils.showToast('Email verified successfully!', 'success');
                // Go back to login form
                this.toggleAuthForm('login');
                document.getElementById('loginEmail').value = this.verificationEmail;
                document.getElementById('verificationForm').classList.add('hidden');
            } else {
                Utils.showToast(result.error, 'error');
            }
        } finally {
            verifyBtn.textContent = 'Verify Email';
            verifyBtn.disabled = false;
        }
    }
    
    // Resend verification code
    async resendVerificationCode() {
        const resendBtn = document.getElementById('resendCodeBtn');
        resendBtn.textContent = 'Sending...';
        resendBtn.disabled = true;
        
        try {
            const result = await Auth.resendEmailCode(this.verificationEmail);
            
            if (result.success) {
                Utils.showToast('Verification code sent!', 'success');
            } else {
                Utils.showToast(result.error, 'error');
            }
        } finally {
            resendBtn.textContent = "Didn't receive the code? Resend";
            resendBtn.disabled = false;
        }
    }
    
    // Toggle between login and signup forms
    toggleAuthForm(form) {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const verificationForm = document.getElementById('verificationForm');
        const showSignupBtn = document.getElementById('showSignupBtn');
        const showLoginBtn = document.getElementById('showLoginBtn');
        
        // Hide verification form if it exists
        if (verificationForm) {
            verificationForm.classList.add('hidden');
        }
        
        if (form === 'signup') {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            showSignupBtn.classList.add('hidden');
            showLoginBtn.classList.remove('hidden');
        } else {
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            showLoginBtn.classList.add('hidden');
            showSignupBtn.classList.remove('hidden');
        }
    }
    
    // Send message
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content && STATE.uploadedFiles.length === 0) {
            return;
        }
        
        // Disable send button temporarily
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = true;
        
        try {
            // If there are files, analyze them first
            if (STATE.uploadedFiles.length > 0) {
                for (const file of STATE.uploadedFiles) {
                    try {
                        const analysis = await FileUpload.analyzeFile(file, content || 'Analyze this file');
                        await Chat.sendMessage(`File: ${file.name}\n\nAnalysis: ${analysis}`, []);
                    } catch (error) {
                        Utils.showToast(`Error analyzing ${file.name}: ${error.message}`, 'error');
                    }
                }
                FileUpload.clearUploadedFiles();
            } else {
                await Chat.sendMessage(content, []);
            }
        } finally {
            sendBtn.disabled = false;
            messageInput.focus();
        }
    }
    
    // Auto-resize textarea
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of 120px
        textarea.style.height = newHeight + 'px';
    }
    
    // Handle logout
    handleLogout() {
        if (confirm('Are you sure you want to log out?')) {
            WebSocketManager.disconnect();
            Auth.logout();
        }
    }
    
    // Toggle sidebar for mobile
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('-translate-x-full');
    }
    
    // Bind modal close events
    bindModalCloseEvents() {
        const modals = ['loginModal', 'settingsModal', 'subscriptionModal'];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modals.forEach(modalId => {
                    document.getElementById(modalId).classList.add('hidden');
                });
            }
        });
    }
    
    // Bind keyboard shortcuts
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to send message
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                this.sendMessage();
            }
            
            // Ctrl/Cmd + N for new chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                Chat.newChat();
            }
            
            // Ctrl/Cmd + , for settings
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                document.getElementById('settingsModal').classList.remove('hidden');
            }
        });
    }
    
    // Handle page visibility changes
    handleVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden - disconnect WebSocket to save resources
                if (STATE.isConnected) {
                    WebSocketManager.disconnect();
                }
            } else {
                // Page is visible - reconnect if authenticated
                if (Auth.isAuthenticated() && !STATE.isConnected) {
                    WebSocketManager.connect();
                }
            }
        });
    }
    
    // Handle online/offline status
    handleConnectionStatus() {
        window.addEventListener('online', () => {
            Utils.showToast('Connection restored', 'success');
            if (Auth.isAuthenticated() && !STATE.isConnected) {
                WebSocketManager.connect();
            }
        });
        
        window.addEventListener('offline', () => {
            Utils.showToast('Connection lost - working offline', 'warning');
            WebSocketManager.disconnect();
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new VoxaroidApp();
    app.init().catch(error => {
        console.error('Failed to initialize Voxaroid app:', error);
        Utils.showToast('Failed to initialize application. Please refresh the page.', 'error', 10000);
    });
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Utils.showToast('An unexpected error occurred', 'error');
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Utils.showToast('An unexpected error occurred', 'error');
    event.preventDefault();
});
