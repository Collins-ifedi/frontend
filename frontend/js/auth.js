// Authentication module
const Auth = {
    // Login user
    async login(email, password) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                STATE.currentUser = {
                    userId: data.userId,
                    email: data.email,
                    name: data.name
                };
                localStorage.setItem('voxaroid_token', data.access_token);
                localStorage.setItem('voxaroid_userId', data.userId);
                localStorage.setItem('voxaroid_userEmail', data.email);
                localStorage.setItem('voxaroid_userName', data.name);
                return { success: true, user: STATE.currentUser };
            } else {
                return { success: false, error: data.detail || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    },
    
    // Register new user
    async signup(name, email, password, phone = null) {
        try {
            // Validate email format
            if (!Utils.isValidEmail(email)) {
                return { success: false, error: 'Please enter a valid email address' };
            }
            
            // Validate password strength
            if (password.length < 6) {
                return { success: false, error: 'Password must be at least 6 characters long' };
            }
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password, phone })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { 
                    success: true, 
                    message: data.message || 'Account created successfully! Please check your email for verification.',
                    needsVerification: true,
                    email: email
                };
            } else {
                return { success: false, error: data.detail || 'Signup failed' };
            }
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    },
    
    // Verify email with code
    async verifyEmail(email, code) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { 
                    success: true, 
                    message: data.message,
                    needsPhoneVerification: data.needsPhoneVerification,
                    phone: data.phone
                };
            } else {
                return { success: false, error: data.detail || 'Verification failed' };
            }
        } catch (error) {
            console.error('Email verification error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    },
    
    // Resend email verification code
    async resendEmailCode(email) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/resend-email-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, message: data.message };
            } else {
                return { success: false, error: data.detail || 'Failed to resend code' };
            }
        } catch (error) {
            console.error('Resend email code error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    },

    // Google Login
    async googleLogin(credential) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ credential })
            });

            const data = await response.json();

            if (response.ok) {
                STATE.currentUser = {
                    userId: data.userId,
                    email: data.email,
                    name: data.name
                };
                localStorage.setItem('voxaroid_token', data.access_token);
                localStorage.setItem('voxaroid_userId', data.userId);
                localStorage.setItem('voxaroid_userEmail', data.email);
                localStorage.setItem('voxaroid_userName', data.name);
                return { success: true, user: STATE.currentUser };
            } else {
                return { success: false, error: data.detail || 'Google sign-in failed' };
            }
        } catch (error) {
            console.error('Google login error:', error);
            return { success: false, error: 'Network error during Google sign-in. Please try again.' };
        }
    },
    
    // Validate token
    async validateToken() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/validate-token`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.valid) {
                    STATE.currentUser = data.user;
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    },
    
    // Logout user
    logout() {
        STATE.currentUser = null;
        localStorage.removeItem('voxaroid_token');
        localStorage.removeItem('voxaroid_userId');
        localStorage.removeItem('voxaroid_userEmail');
        localStorage.removeItem('voxaroid_userName');
        
        // Clear chat data
        STATE.currentChatId = null;
        STATE.chatHistory = [];
        STATE.uploadedFiles = [];
        
        // Show login modal
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
        
        Utils.showToast('Logged out successfully', 'info');
    },
    
    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('voxaroid_token');
        const userId = localStorage.getItem('voxaroid_userId');
        return !!(token && userId);
    },
    
    // Get authentication headers
    getAuthHeaders() {
        const token = localStorage.getItem('voxaroid_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },
    
    // Get current user info
    getCurrentUser() {
        if (STATE.currentUser) {
            return STATE.currentUser;
        }
        
        const userId = localStorage.getItem('voxaroid_userId');
        const userEmail = localStorage.getItem('voxaroid_userEmail');
        const userName = localStorage.getItem('voxaroid_userName');
        
        if (userId && userEmail) {
            STATE.currentUser = { userId, email: userEmail, name: userName };
            return STATE.currentUser;
        }
        
        return null;
    }
};
