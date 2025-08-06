// Main Application
class VoxaroidApp {
    constructor() {
        this.user = null;
        this.isAuthenticated = false;
        this.messages = [];
        this.chats = [];
        this.currentChatId = null;
        this.isVoiceEnabled = true;
        this.isDarkMode = false;
        this.recognition = null;
        this.isListening = false;
        this.selectedFile = null;
        this.dailyUsage = { messages: 0, limit: 10 };
        this.websocket = new WebSocketManager();
        
        this.init();
    }

    async init() {
        this.showLoading();
        this.initializeTheme();
        this.initializeVoiceRecognition();
        this.setupEventListeners();
        this.setupWebSocket();
        
        // Check authentication
        await this.checkAuthStatus();
        
        this.hideLoading();
    }

    showLoading() {
        document.getElementById('loading-screen').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('voxaroid_theme');
        if (savedTheme === 'dark') {
            this.isDarkMode = true;
            document.documentElement.classList.add('dark');
            this.updateThemeIcons();
        }
    }

    initializeVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateVoiceButton();
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.updateVoiceButton();
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    document.getElementById('message-input').value = finalTranscript;
                    this.updateSendButton();
                }
            };
        }
    }

    setupEventListeners() {
        // Authentication
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('verify-form').addEventListener('submit', (e) => this.handleVerifyEmail(e));
        document.getElementById('guest-login').addEventListener('click', () => this.handleGuestLogin());
        
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.tab));
        });
        
        // Theme toggles
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('theme-toggle-main').addEventListener('click', () => this.toggleTheme());
        document.getElementById('settings-theme').addEventListener('click', () => this.toggleTheme());
        
        // Main app controls
        document.getElementById('sidebar-toggle').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('new-chat').addEventListener('click', () => this.startNewChat());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Voice controls
        document.getElementById('voice-toggle').addEventListener('click', () => this.toggleVoice());
        document.getElementById('settings-voice').addEventListener('click', () => this.toggleVoice());
        document.getElementById('voice-record').addEventListener('click', () => this.toggleVoiceRecognition());
        
        // File upload
        document.getElementById('file-upload').addEventListener('click', () => this.triggerFileUpload());
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('remove-file').addEventListener('click', () => this.removeSelectedFile());
        
        // Message input
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('input', () => this.updateSendButton());
        messageInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        
        // Send message
        document.getElementById('send-message').addEventListener('click', () => this.sendMessage());
        
        // Modals
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('close-settings').addEventListener('click', () => this.closeSettings());
        document.getElementById('upgrade-btn').addEventListener('click', () => this.openSubscription());
        document.getElementById('close-subscription').addEventListener('click', () => this.closeSubscription());
        
        // Modal backdrop clicks
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') this.closeSettings();
        });
        document.getElementById('subscription-modal').addEventListener('click', (e) => {
            if (e.target.id === 'subscription-modal') this.closeSubscription();
        });
    }

    setupWebSocket() {
        this.websocket.onMessage((data) => this.handleWebSocketMessage(data));
        this.websocket.onConnectionChange((connected) => this.updateConnectionStatus(connected));
    }

    async checkAuthStatus() {
        const isValid = await AuthManager.validateToken();
        if (isValid) {
            const userData = await AuthManager.getUserData();
            if (userData) {
                this.user = userData;
                this.isAuthenticated = true;
                this.showMainApp();
                this.websocket.connect();
                this.updateUserInterface();
                return;
            }
        }
        
        this.showAuthScreen();
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        this.startNewChat();
    }

    switchAuthTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Show/hide forms
        document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
        document.getElementById(`${tab}-form`).classList.remove('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        this.setFormLoading('login', true);
        this.clearFormError('login');
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const result = await AuthManager.login(email, password);
        
        if (result.success) {
            this.user = result.user;
            this.isAuthenticated = true;
            this.showMainApp();
            this.websocket.connect();
            this.updateUserInterface();
        } else {
            this.showFormError('login', result.error);
        }
        
        this.setFormLoading('login', false);
    }

    async handleSignup(e) {
        e.preventDefault();
        this.setFormLoading('signup', true);
        this.clearFormError('signup');
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const phone = document.getElementById('signup-phone').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;
        
        if (password !== confirmPassword) {
            this.showFormError('signup', 'Passwords do not match');
            this.setFormLoading('signup', false);
            return;
        }
        
        const result = await AuthManager.signup({ name, email, phone, password });
        
        if (result.success) {
            document.getElementById('verify-email').textContent = email;
            this.switchAuthTab('verify-email');
        } else {
            this.showFormError('signup', result.error);
        }
        
        this.setFormLoading('signup', false);
    }

    async handleVerifyEmail(e) {
        e.preventDefault();
        this.setFormLoading('verify', true);
        this.clearFormError('verify');
        
        const email = document.getElementById('verify-email').textContent;
        const code = document.getElementById('verify-code').value;
        
        const result = await AuthManager.verifyEmail(email, code);
        
        if (result.success) {
            if (result.needsPhoneVerification) {
                // Handle phone verification if needed
                this.showFormError('verify', 'Phone verification required');
            } else {
                this.user = result.user;
                this.isAuthenticated = true;
                this.showMainApp();
                this.websocket.connect();
                this.updateUserInterface();
            }
        } else {
            this.showFormError('verify', result.error);
        }
        
        this.setFormLoading('verify', false);
    }

    handleGuestLogin() {
        this.user = AuthManager.createGuestUser();
        this.isAuthenticated = true  {
        this.user = AuthManager.createGuestUser();
        this.isAuthenticated = true;
        this.dailyUsage = { messages: 0, limit: 5 };
        this.showMainApp();
        this.updateUserInterface();
    }

    setFormLoading(form, loading) {
        const button = document.querySelector(`#${form}-form button[type="submit"]`);
        const spinner = button.querySelector('.btn-spinner');
        const text = button.querySelector('.btn-text');
        
        if (loading) {
            spinner.classList.remove('hidden');
            text.style.opacity = '0.7';
            button.disabled = true;
        } else {
            spinner.classList.add('hidden');
            text.style.opacity = '1';
            button.disabled = false;
        }
    }

    showFormError(form, message) {
        const errorElement = document.getElementById(`${form}-error`);
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    clearFormError(form) {
        const errorElement = document.getElementById(`${form}-error`);
        errorElement.classList.add('hidden');
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('voxaroid_theme', this.isDarkMode ? 'dark' : 'light');
        this.updateThemeIcons();
    }

    updateThemeIcons() {
        const icons = ['theme-icon', 'theme-icon-main'];
        icons.forEach(iconId => {
            const icon = document.getElementById(iconId);
            if (icon) {
                icon.setAttribute('data-lucide', this.isDarkMode ? 'sun' : 'moon');
            }
        });
        lucide.createIcons();
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
    }

    toggleVoice() {
        this.isVoiceEnabled = !this.isVoiceEnabled;
        this.updateVoiceIcons();
    }

    updateVoiceIcons() {
        const voiceIcon = document.getElementById('voice-icon');
        const settingsVoiceBtn = document.getElementById('settings-voice');
        const voiceToggleBtn = document.getElementById('voice-toggle');
        
        if (this.isVoiceEnabled) {
            voiceIcon.setAttribute('data-lucide', 'volume-2');
            voiceToggleBtn.classList.add('active');
            settingsVoiceBtn.classList.add('active');
        } else {
            voiceIcon.setAttribute('data-lucide', 'volume-x');
            voiceToggleBtn.classList.remove('active');
            settingsVoiceBtn.classList.remove('active');
        }
        lucide.createIcons();
    }

    toggleVoiceRecognition() {
        if (!this.recognition) return;
        
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateVoiceButton() {
        const voiceBtn = document.getElementById('voice-record');
        const micIcon = document.getElementById('mic-icon');
        
        if (this.isListening) {
            voiceBtn.classList.add('recording');
            micIcon.setAttribute('data-lucide', 'mic-off');
        } else {
            voiceBtn.classList.remove('recording');
            micIcon.setAttribute('data-lucide', 'mic');
        }
        lucide.createIcons();
    }

    startNewChat() {
        const newChatId = `chat_${Date.now()}`;
        const newChat = {
            id: newChatId,
            title: 'New Chat',
            messages: [],
            timestamp: Date.now()
        };
        
        this.chats.unshift(newChat);
        this.currentChatId = newChatId;
        this.messages = [];
        
        this.updateChatList();
        this.renderMessages();
        
        // Add welcome message
        const welcomeMessage = {
            id: Date.now().toString(),
            text: `Hello! I'm Voxaroid, your AI assistant. I can help you with various tasks including analyzing documents, images, and providing insights. ${this.user?.isGuest ? 'As a guest, you have 5 messages available.' : 'How can I assist you today?'}`,
            sender: 'assistant',
            timestamp: Date.now()
        };
        
        this.messages.push(welcomeMessage);
        this.renderMessages();
    }

    updateChatList() {
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';
        
        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${this.currentChatId === chat.id ? 'active' : ''}`;
            chatItem.innerHTML = `
                <div class="chat-info">
                    <div class="chat-title">${chat.title}</div>
                    <div class="chat-date">${new Date(chat.timestamp).toLocaleDateString()}</div>
                </div>
                <button class="chat-delete" data-chat-id="${chat.id}">
                    <i data-lucide="trash-2"></i>
                </button>
            `;
            
            chatItem.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-delete')) {
                    this.switchChat(chat.id);
                }
            });
            
            const deleteBtn = chatItem.querySelector('.chat-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChat(chat.id);
            });
            
            chatList.appendChild(chatItem);
        });
        
        lucide.createIcons();
    }

    switchChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            this.currentChatId = chatId;
            this.messages = chat.messages;
            this.updateChatList();
            this.renderMessages();
        }
    }

    deleteChat(chatId) {
        this.chats = this.chats.filter(c => c.id !== chatId);
        if (this.currentChatId === chatId) {
            this.currentChatId = null;
            this.messages = [];
            this.renderMessages();
        }
        this.updateChatList();
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messages');
        const welcomeScreen = document.getElementById('welcome-screen');
        
        if (this.messages.length === 0) {
            welcomeScreen.classList.remove('hidden');
            messagesContainer.innerHTML = '';
        } else {
            welcomeScreen.classList.add('hidden');
            messagesContainer.innerHTML = this.messages.map(message => `
                <div class="message ${message.sender}">
                    <div class="message-content">
                        <div class="message-text">${message.text}</div>
                        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
                    </div>
                </div>
            `).join('');
        }
        
        // Scroll to bottom
        const container = document.getElementById('messages-container');
        container.scrollTop = container.scrollHeight;
    }

    updateSendButton() {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-message');
        sendBtn.disabled = !input.value.trim() || !this.websocket.isConnected;
    }

    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message || !this.websocket.isConnected) return;
        
        // Check usage limits
        if (this.user?.isGuest && this.dailyUsage.messages >= this.dailyUsage.limit) {
            alert('Daily message limit reached. Please sign up for unlimited messages.');
            return;
        }
        
        // Add user message
        const userMessage = {
            id: Date.now().toString(),
            text: message,
            sender: 'user',
            timestamp: Date.now()
        };
        
        this.messages.push(userMessage);
        this.renderMessages();
        
        // Update current chat
        if (this.currentChatId) {
            const chat = this.chats.find(c => c.id === this.currentChatId);
            if (chat) {
                chat.messages = [...this.messages];
                if (chat.title === 'New Chat') {
                    chat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                    this.updateChatList();
                }
            }
        }
        
        // Clear input and show typing
        input.value = '';
        this.updateSendButton();
        this.showTypingIndicator();
        
        // Send to backend
        const success = this.websocket.send({
            type: 'message',
            text: message,
            chatId: this.currentChatId,
            file: this.selectedFile ? {
                name: this.selectedFile.name,
                type: this.selectedFile.type,
                size: this.selectedFile.size
            } : null
        });
        
        if (!success) {
            this.hideTypingIndicator();
            alert('Failed to send message. Please check your connection.');
        }
        
        // Update usage
        this.dailyUsage.messages++;
        this.updateUsageDisplay();
        
        // Clear selected file
        this.removeSelectedFile();
    }

    showTypingIndicator() {
        document.getElementById('typing-indicator').classList.remove('hidden');
        const container = document.getElementById('messages-container');
        container.scrollTop = container.scrollHeight;
    }

    hideTypingIndicator() {
        document.getElementById('typing-indicator').classList.add('hidden');
    }

    handleWebSocketMessage(data) {
        this.hideTypingIndicator();
        
        if (data.type === 'message') {
            const assistantMessage = {
                id: Date.now().toString(),
                text: data.text,
                sender: 'assistant',
                timestamp: Date.now()
            };
            
            this.messages.push(assistantMessage);
            this.renderMessages();
            
            // Update current chat
            if (this.currentChatId) {
                const chat = this.chats.find(c => c.id === this.currentChatId);
                if (chat) {
                    chat.messages = [...this.messages];
                }
            }
            
            // Speak response if voice is enabled
            if (this.isVoiceEnabled) {
                this.speakText(data.text);
            }
        }
    }

    speakText(text) {
        if (!this.isVoiceEnabled || !window.speechSynthesis) return;
        
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        const statusText = statusElement.querySelector('span');
        
        if (connected) {
            statusElement.className = 'connection-status connected';
            statusText.textContent = 'Connected';
        } else {
            statusElement.className = 'connection-status disconnected';
            statusText.textContent = 'Disconnected';
        }
        
        this.updateSendButton();
    }

    triggerFileUpload() {
        document.getElementById('file-input').click();
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.selectedFile = file;
            this.showFilePreview();
            this.uploadFile(file);
        }
    }

    showFilePreview() {
        if (!this.selectedFile) return;
        
        const preview = document.getElementById('file-preview');
        const fileName = document.getElementById('file-name');
        
        fileName.textContent = this.selectedFile.name;
        preview.classList.remove('hidden');
    }

    removeSelectedFile() {
        this.selectedFile = null;
        document.getElementById('file-preview').classList.add('hidden');
        document.getElementById('file-input').value = '';
    }

    async uploadFile(file) {
        const uploadBtn = document.getElementById('file-upload');
        const uploadIcon = document.getElementById('upload-icon');
        const uploadSpinner = document.getElementById('upload-spinner');
        
        uploadIcon.classList.add('hidden');
        uploadSpinner.classList.remove('hidden');
        uploadBtn.disabled = true;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prompt', 'Please analyze this file and provide insights.');
        
        try {
            const response = await fetch(`${AuthManager.BACKEND_URL}/api/analyze-file`, {
                method: 'POST',
                headers: AuthManager.getAuthHeaders(),
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                const analysisMessage = {
                    id: Date.now().toString(),
                    text: data.analysis,
                    sender: 'assistant',
                    timestamp: Date.now()
                };
                
                this.messages.push(analysisMessage);
                this.renderMessages();
                
                if (this.isVoiceEnabled) {
                    this.speakText(data.analysis);
                }
            } else {
                alert('File analysis failed: ' + data.error);
            }
        } catch (error) {
            alert('File upload error: ' + error.message);
        } finally {
            uploadIcon.classList.remove('hidden');
            uploadSpinner.classList.add('hidden');
            uploadBtn.disabled = false;
        }
    }

    updateUserInterface() {
        if (!this.user) return;
        
        // Update user plan display
        const planElements = document.querySelectorAll('#user-plan, #settings-plan');
        planElements.forEach(el => {
            el.textContent = this.user.subscription_plan;
            el.className = `plan-badge ${this.user.subscription_plan}`;
        });
        
        // Update email in settings
        document.getElementById('settings-email').textContent = this.user.email;
        
        // Show premium badge if applicable
        if (this.user.subscription_plan === 'premium') {
            document.getElementById('premium-badge').classList.remove('hidden');
        }
        
        // Update usage limits
        if (this.user.isGuest) {
            this.dailyUsage.limit = 5;
        } else if (this.user.subscription_plan === 'free') {
            this.dailyUsage.limit = 10;
        } else {
            this.dailyUsage.limit = Infinity;
        }
        
        this.updateUsageDisplay();
    }

    updateUsageDisplay() {
        const usageCount = document.getElementById('usage-count');
        const usageProgress = document.getElementById('usage-progress');
        const upgradeBtn = document.getElementById('upgrade-btn');
        
        if (this.dailyUsage.limit === Infinity) {
            usageCount.textContent = 'Unlimited';
            usageProgress.style.width = '100%';
            upgradeBtn.style.display = 'none';
        } else {
            usageCount.textContent = `${this.dailyUsage.messages}/${this.dailyUsage.limit}`;
            const percentage = (this.dailyUsage.messages / this.dailyUsage.limit) * 100;
            usageProgress.style.width = `${percentage}%`;
            upgradeBtn.style.display = this.user?.subscription_plan === 'free' ? 'block' : 'none';
        }
    }

    openSettings() {
        document.getElementById('settings-modal').classList.remove('hidden');
    }

    closeSettings() {
        document.getElementById('settings-modal').classList.add('hidden');
    }

    openSubscription() {
        this.loadSubscriptionPlans();
        document.getElementById('subscription-modal').classList.remove('hidden');
    }

    closeSubscription() {
        document.getElementById('subscription-modal').classList.add('hidden');
    }

    loadSubscriptionPlans() {
        const plansContainer = document.getElementById('subscription-plans');
        const plans = [
            {
                id: 'free',
                name: 'Free',
                price: 0,
                interval: 'month',
                features: ['10 messages per day', 'Basic AI models', 'Community support'],
                current: this.user?.subscription_plan === 'free'
            },
            {
                id: 'pro',
                name: 'Pro',
                price: 999,
                interval: 'month',
                features: ['Unlimited messages', 'Advanced AI models', 'Priority support', 'File analysis'],
                popular: true,
                current: this.user?.subscription_plan === 'pro'
            },
            {
                id: 'premium',
                name: 'Premium',
                price: 1999,
                interval: 'month',
                features: ['Everything in Pro', 'Custom AI training', 'API access', 'White-label solution'],
                current: this.user?.subscription_plan === 'premium'
            }
        ];
        
        plansContainer.innerHTML = plans.map(plan => `
            <div class="plan-card ${plan.popular ? 'popular' : ''}">
                ${plan.popular ? '<div class="plan-popular-badge">Most Popular</div>' : ''}
                <div class="plan-header">
                    <div class="plan-name">
                        ${plan.name}
                        ${plan.name === 'Premium' ? '<i data-lucide="crown"></i>' : ''}
                    </div>
                    <div class="plan-price">
                        $${plan.price / 100}
                        <span>/${plan.interval}</span>
                    </div>
                </div>
                <ul class="plan-features">
                    ${plan.features.map(feature => `
                        <li>
                            <i data-lucide="check-circle"></i>
                            ${feature}
                        </li>
                    `).join('')}
                </ul>
                <button class="btn ${plan.current ? 'btn-outline' : 'btn-primary'}" 
                        ${plan.current ? 'disabled' : ''} 
                        onclick="app.handleSubscription('${plan.id}')">
                    ${plan.current ? 'Current Plan' : `Subscribe to ${plan.name}`}
                </button>
            </div>
        `).join('');
        
        lucide.createIcons();
    }

    handleSubscription(planId) {
        if (planId === 'free') return;
        
        // In a real implementation, integrate with LemonSqueezy
        const checkoutUrl = `https://your-lemonsqueezy-store.lemonsqueezy.com/checkout/buy/${planId}`;
        window.open(checkoutUrl, '_blank');
    }

    logout() {
        AuthManager.removeToken();
        this.user = null;
        this.isAuthenticated = false;
        this.messages = [];
        this.chats = [];
        this.currentChatId = null;
        this.websocket.disconnect();
        this.showAuthScreen();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Start the app
    window.app = new VoxaroidApp();
});
