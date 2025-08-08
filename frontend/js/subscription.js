// Update subscription module to work with backend's Stripe integration
const Subscription = {
    currentPlan: 'free',
    plans: [],
    
    // Initialize subscription system
    async init() {
        await this.loadUserPlan();
        await this.loadSubscriptionPlans();
        this.bindEvents();
        this.updateUI();
    },
    
    // Load user's current plan from token validation
    async loadUserPlan() {
        try {
            if (Auth.isAuthenticated()) {
                const isValid = await Auth.validateToken();
                if (isValid && STATE.currentUser) {
                    this.currentPlan = STATE.currentUser.subscription_plan || 'free';
                }
            }
        } catch (error) {
            console.error('Error loading user plan:', error);
            this.currentPlan = 'free'; // Default to free on error
        }
    },
    
    // Load subscription plans from backend
    async loadSubscriptionPlans() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/subscription-plans`);
            if (response.ok) {
                const data = await response.json();
                this.plans = data.plans || [];
                this.updatePricingDisplay();
            }
        } catch (error) {
            console.error('Error loading subscription plans:', error);
            // Use fallback plans
            this.plans = [
                {
                    id: 'free',
                    name: 'Free',
                    price: 0,
                    currency: 'usd',
                    interval: 'month',
                    features: ['Basic chat features', 'Limited file uploads', 'Basic crypto analysis']
                },
                {
                    id: 'price_pro_monthly',
                    name: 'Pro',
                    price: 1900,
                    currency: 'usd',
                    interval: 'month',
                    features: ['Unlimited chat', 'Unlimited file uploads', 'Advanced crypto analysis', 'Voice features']
                }
            ];
        }
    },
    
    // Update pricing display in modal
    updatePricingDisplay() {
        const proPlan = this.plans.find(plan => plan.id !== 'free');
        if (proPlan) {
            const priceInDollars = (proPlan.price / 100).toFixed(2);
            document.getElementById('proPrice').textContent = priceInDollars;
        }
    },
    
    // Bind event listeners
    bindEvents() {
        // Upgrade button
        document.getElementById('upgradeBtn').addEventListener('click', () => {
            this.showSubscriptionModal();
        });
        
        // Subscribe button
        document.getElementById('subscribeBtn').addEventListener('click', () => {
            this.initiatePurchase();
        });
        
        // Close subscription modal
        document.getElementById('closeSubscriptionBtn').addEventListener('click', () => {
            document.getElementById('subscriptionModal').classList.add('hidden');
        });
        
        // Close modal on outside click
        document.getElementById('subscriptionModal').addEventListener('click', (e) => {
            if (e.target.id === 'subscriptionModal') {
                document.getElementById('subscriptionModal').classList.add('hidden');
            }
        });
    },
    
    // Show subscription modal
    showSubscriptionModal() {
        document.getElementById('subscriptionModal').classList.remove('hidden');
    },
    
    // Update UI based on current plan
    updateUI() {
        const planElement = document.getElementById('userPlan');
        const upgradeBtn = document.getElementById('upgradeBtn');
        
        if (this.currentPlan === 'pro' || this.currentPlan === 'pro_monthly') {
            planElement.textContent = 'Pro Plan';
            upgradeBtn.style.display = 'none';
        } else {
            planElement.textContent = 'Free Plan';
            upgradeBtn.style.display = 'block';
        }
    },
    
    // Initiate purchase with Stripe via backend
    async initiatePurchase() {
        try {
            const proPlan = this.plans.find(plan => plan.id !== 'free');
            if (!proPlan) {
                Utils.showToast('Pro plan not available', 'error');
                return;
            }
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: Auth.getAuthHeaders(),
                body: JSON.stringify({
                    priceId: proPlan.id
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                // Redirect to Stripe checkout
                window.location.href = data.url;
            } else {
                const errorData = await response.json();
                Utils.showToast(errorData.detail || 'Error creating checkout session', 'error');
            }
        } catch (error) {
            console.error('Error initiating purchase:', error);
            Utils.showToast('Error processing payment', 'error');
        }
    },
    
    // Check message limit for free users
    checkMessageLimit() {
        if (this.currentPlan === 'pro' || this.currentPlan === 'pro_monthly') {
            return true; // No limit for pro users
        }
        
        // Check daily message limit for free users
        const today = new Date().toDateString();
        const messageKey = `voxaroid_messages_${today}`;
        const messageCount = parseInt(localStorage.getItem(messageKey) || '0');
        
        if (messageCount >= CONFIG.FREE_MESSAGE_LIMIT) {
            Utils.showToast(`Daily message limit reached (${CONFIG.FREE_MESSAGE_LIMIT} messages). Upgrade to Pro for unlimited messages.`, 'warning', 5000);
            this.showSubscriptionModal();
            return false;
        }
        
        // Increment message count
        localStorage.setItem(messageKey, (messageCount + 1).toString());
        return true;
    },
    
    // Handle user upgrade (called when subscription is successful)
    handleUserUpgrade(plan) {
        this.currentPlan = plan;
        this.updateUI();
        Utils.showToast('Welcome to Voxaroid Pro! 🎉', 'success', 5000);
    },
    
    // Get remaining messages for free users
    getRemainingMessages() {
        if (this.currentPlan === 'pro' || this.currentPlan === 'pro_monthly') {
            return 'Unlimited';
        }
        
        const today = new Date().toDateString();
        const messageKey = `voxaroid_messages_${today}`;
        const messageCount = parseInt(localStorage.getItem(messageKey) || '0');
        return Math.max(0, CONFIG.FREE_MESSAGE_LIMIT - messageCount);
    }
};
