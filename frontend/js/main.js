// Global function for Google Sign-In callback
window.handleGoogleSignIn = async (response) => {
  if (response.credential) {
    const result = await Auth.googleLogin(response.credential);
    if (result.success) {
      voxaroidAppInstance.showApp();
    } else {
      Utils.showToast(result.error, 'error');
    }
  } else {
    Utils.showToast('Google sign-in failed: No credential received.', 'error');
  }
};

// Main App
class VoxaroidApp {
  constructor() {
    this.isInitialized = false;
    this.verificationEmail = localStorage.getItem('voxaroid_pending_email') || null;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // Ensure STATE defaults
      window.STATE = window.STATE || {
        currentUser: null,
        currentChatId: null,
        chatHistory: [],
        uploadedFiles: [],
        isConnected: false,
        settings: {
          theme: localStorage.getItem('voxaroid_theme') || 'light',
          fontStyle: localStorage.getItem('voxaroid_fontStyle') || 'font-sans',
          fontSize: localStorage.getItem('voxaroid_fontSize') || 'text-base'
        }
      };

      // Initialize modules
      Settings.init();
      Voice.init();
      FileUpload.init();
      await Subscription.init();

      // Optimistic boot: show UI if token exists; validate in background
      if (Auth.isAuthenticated()) {
        await this.showApp();
        setTimeout(async () => {
          const valid = await Auth.validateToken();
          if (valid === false) {
            Utils.showToast('Session expired. Please sign in again.', 'warning');
            this.showLogin();
          } else if (valid === null) {
            // transient error; keep user in
            console.warn('Token validation skipped due to transient error.');
          }
        }, 0);
      } else {
        this.showLogin();
      }

      // Bind global events
      this.bindGlobalEvents();

      // Visibility and connectivity
      this.handleVisibilityChange();
      this.handleConnectionStatus();

      this.isInitialized = true;
      console.log('Voxaroid app initialized successfully');
    } catch (error) {
      console.error('Error initializing app:', error);
      Utils.showToast('Error initializing application', 'error');
    }
  }

  async showApp() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');

    WebSocketManager.connect();
    await Chat.loadChatHistory();

    const user = Auth.getCurrentUser();
    if (user) console.log('User logged in:', user.email);
  }

  showLogin() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    WebSocketManager.disconnect();
  }

  setVerificationEmail(email) {
    this.verificationEmail = (email || '').trim();
    if (this.verificationEmail) localStorage.setItem('voxaroid_pending_email', this.verificationEmail);
    else localStorage.removeItem('voxaroid_pending_email');
  }

  bindGlobalEvents() {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSignup();
    });
    document.getElementById('showSignupBtn').addEventListener('click', () => this.toggleAuthForm('signup'));
    document.getElementById('showLoginBtn').addEventListener('click', () => this.toggleAuthForm('login'));

    const startVerifyBtn = document.getElementById('startVerificationLink');
    if (startVerifyBtn) {
      startVerifyBtn.addEventListener('click', async () => {
        const typed = (document.getElementById('loginEmail')?.value || '').trim();
        if (typed && Utils.isValidEmail(typed)) this.setVerificationEmail(typed);
        if (!this.verificationEmail) {
          Utils.showToast('Enter your email in the Email field first, then click "Verify email".', 'info');
          return;
        }
        this.showEmailVerification();
        try {
          const r = await Auth.resendEmailCode(this.verificationEmail);
          if (r.success) Utils.showToast('Verification code sent to your email.', 'success');
          else Utils.showToast(r.error || 'Could not resend code', 'error');
        } catch {}
      });
    }

    // Chat
    document.getElementById('newChatBtn').addEventListener('click', () => Chat.newChat());
    document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());

    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    messageInput.addEventListener('input', () => this.autoResizeTextarea(messageInput));

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

    // Sidebar open/close
    document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());
    const closeBtn = document.getElementById('sidebarClose');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeSidebar());

    // Close mobile sidebar on outside click
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return;
      const isOpenMobile = !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 1024;
      if (!isOpenMobile) return;
      const clickedInside = sidebar.contains(e.target);
      const clickedHamburger = document.getElementById('sidebarToggle').contains(e.target);
      if (!clickedInside && !clickedHamburger) this.closeSidebar();
    });

    // ESC closes mobile sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeSidebar();
    });

    // Keep sidebar visible on desktop resize
    window.addEventListener('resize', () => {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return;
      if (window.innerWidth >= 1024) sidebar.classList.remove('-translate-x-full');
    });
  }

  async handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    if (!email || !password) {
      Utils.showToast('Please enter both email and password', 'error');
      return;
    }

    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;

    try {
      const result = await Auth.login(email, password);
      if (result.success) {
        await this.showApp();
      } else {
        if (result.status === 403) {
          this.setVerificationEmail(email);
          this.showEmailVerification();
          Utils.showToast("Email not verified. We've sent you a new code.", 'warning');
          try {
            const resend = await Auth.resendEmailCode(email);
            if (!resend.success) Utils.showToast(resend.error || 'Could not resend code', 'error');
          } catch {}
        } else {
          Utils.showToast(result.error || 'Login failed', 'error');
        }
      }
    } finally {
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled = false;
    }
  }

  async handleSignup() {
    const name = document.getElementById('signupName')?.value?.trim() || 'User';
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const signupBtn = document.getElementById('signupBtn');

    if (!email || !password) {
      Utils.showToast('Please enter both email and password', 'error');
      return;
    }

    signupBtn.textContent = 'Creating account...';
    signupBtn.disabled = true;

    try {
      const result = await Auth.signup(name, email, password);
      if (result.success) {
        Utils.showToast(result.message, 'success', 5000);
        this.setVerificationEmail(result.email);
        this.showEmailVerification();
      } else if (result.code === 'EMAIL_EXISTS') {
        this.setVerificationEmail(result.email || email);
        this.showEmailVerification();
        Utils.showToast("This email is already registered. We've sent you a new verification code.", 'warning', 5000);
        try {
          const resend = await Auth.resendEmailCode(this.verificationEmail);
          if (!resend.success) Utils.showToast(resend.error || 'Could not resend code', 'error');
        } catch {}
      } else {
        Utils.showToast(result.error || 'Signup failed', 'error');
      }
    } finally {
      signupBtn.textContent = 'Create Account';
      signupBtn.disabled = false;
    }
  }

  showEmailVerification() {
    if (!this.verificationEmail) {
      const pending = localStorage.getItem('voxaroid_pending_email');
      if (pending) this.verificationEmail = pending;
    }
    if (!this.verificationEmail) {
      Utils.showToast('No email to verify. Please sign up or enter your email first.', 'warning');
      return;
    }

    if (!document.getElementById('verificationForm')) {
      const verificationHtml = `
        <form id="verificationForm" class="space-y-6 hidden">
          <div class="text-center mb-6">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Verify Your Email</h3>
            <p class="text-gray-600 dark:text-gray-400">We sent a verification code to <span id="verificationEmailText"></span></p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verification Code</label>
            <input type="text" id="verificationCode" required maxlength="6" inputmode="numeric" pattern="\\d{6}"
                   class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
                   placeholder="000000">
          </div>
          <button type="submit" id="verifyBtn"
                  class="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200">
            Verify Email
          </button>
          <div class="text-center space-x-4">
            <button type="button" id="resendCodeBtn" class="text-blue-600 dark:text-blue-400 hover:underline text-sm">Resend code</button>
            <button type="button" id="backToLoginBtn" class="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to login</button>
          </div>
        </form>
      `;
      document.getElementById('signupForm').insertAdjacentHTML('afterend', verificationHtml);

      document.getElementById('verificationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleEmailVerification();
      });
      document.getElementById('resendCodeBtn').addEventListener('click', async () => {
        await this.resendVerificationCode();
      });
      document.getElementById('backToLoginBtn').addEventListener('click', () => {
        this.toggleAuthForm('login');
      });
    }

    const emailSpan = document.getElementById('verificationEmailText');
    if (emailSpan) emailSpan.textContent = this.verificationEmail;

    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('showSignupBtn').classList.add('hidden');
    document.getElementById('showLoginBtn').classList.add('hidden');
    document.getElementById('verificationForm').classList.remove('hidden');
  }

  async handleEmailVerification() {
    const code = (document.getElementById('verificationCode').value || '').trim();
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
        Utils.showToast(result.message || 'Email verified successfully!', 'success');
        const verifiedEmail = this.verificationEmail;
        this.setVerificationEmail(null);
        this.toggleAuthForm('login');
        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) loginEmail.value = verifiedEmail || '';
        document.getElementById('verificationForm').classList.add('hidden');
      } else {
        Utils.showToast(result.error || 'Verification failed', 'error');
      }
    } finally {
      verifyBtn.textContent = 'Verify Email';
      verifyBtn.disabled = false;
    }
  }

  async resendVerificationCode() {
    if (!this.verificationEmail) {
      Utils.showToast('No email to verify. Please sign up or enter your email first.', 'warning');
      return;
    }
    const resendBtn = document.getElementById('resendCodeBtn');
    if (resendBtn) { resendBtn.textContent = 'Sending...'; resendBtn.disabled = true; }
    try {
      const result = await Auth.resendEmailCode(this.verificationEmail);
      if (result.success) Utils.showToast('Verification code sent!', 'success');
      else Utils.showToast(result.error || 'Could not resend code', 'error');
    } finally {
      if (resendBtn) { resendBtn.textContent = 'Resend code'; resendBtn.disabled = false; }
    }
  }

  toggleAuthForm(form) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const verificationForm = document.getElementById('verificationForm');
    const showSignupBtn = document.getElementById('showSignupBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');

    if (verificationForm) verificationForm.classList.add('hidden');

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

  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    if (!content && STATE.uploadedFiles.length === 0) return;

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;

    try {
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
      messageInput.value = '';
      this.autoResizeTextarea(messageInput);
    } finally {
      sendBtn.disabled = false;
      messageInput.focus();
    }
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = newHeight + 'px';
  }

  handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
      WebSocketManager.disconnect();
      Auth.logout();
    }
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth >= 1024) return; // desktop stays open
    sidebar.classList.toggle('-translate-x-full');
  }
  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth >= 1024) return;
    sidebar.classList.add('-translate-x-full');
  }

  handleVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (STATE.isConnected) WebSocketManager.disconnect();
      } else {
        if (Auth.isAuthenticated() && !STATE.isConnected) WebSocketManager.connect();
      }
    });
  }

  handleConnectionStatus() {
    window.addEventListener('online', () => {
      Utils.showToast('Connection restored', 'success');
      if (Auth.isAuthenticated() && !STATE.isConnected) WebSocketManager.connect();
    });

    window.addEventListener('offline', () => {
      Utils.showToast('Connection lost - working offline', 'warning');
      WebSocketManager.disconnect();
    });
  }
}

// Initialize app when DOM is loaded
let voxaroidAppInstance;

document.addEventListener('DOMContentLoaded', () => {
  voxaroidAppInstance = new VoxaroidApp();
  voxaroidAppInstance.init().catch(error => {
    console.error('Failed to initialize Voxaroid app:', error);
    Utils.showToast('Failed to initialize application. Please refresh the page.', 'error', 10000);
  });
});

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  Utils.showToast('An unexpected error occurred', 'error');
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  Utils.showToast('An unexpected error occurred', 'error');
  event.preventDefault();
});
