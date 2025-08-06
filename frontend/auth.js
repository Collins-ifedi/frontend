// Authentication Manager
class AuthManager {
    static TOKEN_KEY = 'voxaroid_token';
    static BACKEND_URL = 'https://voxai-umxl.onrender.com';

    // Store JWT token from backend
    static setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    // Get stored JWT token
    static getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    // Remove JWT token
    static removeToken() {
        localStorage.removeItem(this.TOKEN_KEY);
    }

    // Create Authorization header for API calls
    static getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Validate token with backend
    static async validateToken() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${this.BACKEND_URL}/api/auth/validate-token`, {
                headers: this.getAuthHeaders()
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    // Login and store token
    static async login(email, password) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.setToken(data.access_token);
                return {
                    success: true,
                    user: {
                        userId: data.userId,
                        email: data.email,
                        name: data.name,
                        subscription_plan: data.subscription_plan || 'free'
                    }
                };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    // Signup
    static async signup(userData) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            return { success: response.ok, data, error: data.error };
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    // Verify email
    static async verifyEmail(email, code) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/api/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.access_token) {
                    this.setToken(data.access_token);
                    return {
                        success: true,
                        user: {
                            userId: data.userId,
                            email: data.email,
                            name: data.name,
                            subscription_plan: data.subscription_plan || 'free'
                        }
                    };
                } else {
                    return { success: true, needsPhoneVerification: data.needsPhoneVerification };
                }
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    // Get user data
    static async getUserData() {
        try {
            const response = await fetch(`${this.BACKEND_URL}/api/auth/validate-token`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return data.user;
            }
            return null;
        } catch (error) {
            console.error('Failed to get user data:', error);
            return null;
        }
    }

    // Create guest user
    static createGuestUser() {
        return {
            userId: `guest_${Date.now()}`,
            email: 'guest@voxaroid.com',
            name: 'Guest User',
            subscription_plan: 'guest',
            isGuest: true
        };
    }
}
