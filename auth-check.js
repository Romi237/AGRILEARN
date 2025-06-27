// Authentication check utility
// This script should be included on all protected pages

class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Check authentication on page load
        this.checkAuth();
        
        // Set up periodic token validation
        this.setupTokenValidation();
    }

    checkAuth() {
        const user = this.getUser();
        const token = this.getToken();
        
        if (!user || !token) {
            console.warn('User not authenticated, redirecting to login');
            this.redirectToLogin();
            return false;
        }
        
        // Check if token is expired
        if (this.isTokenExpired(token)) {
            console.warn('Token expired, redirecting to login');
            this.logout();
            return false;
        }
        
        return true;
    }

    getUser() {
        try {
            const userStr = localStorage.getItem('agrilearn_user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }

    getToken() {
        return localStorage.getItem('agrilearn_token');
    }

    isTokenExpired(token) {
        try {
            // Simple JWT expiration check
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp && payload.exp < currentTime;
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true; // Assume expired if we can't parse
        }
    }

    logout() {
        localStorage.removeItem('agrilearn_token');
        localStorage.removeItem('agrilearn_user');
        this.redirectToLogin();
    }

    redirectToLogin() {
        // Don't redirect if already on login page
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    setupTokenValidation() {
        // Check token validity every 5 minutes
        setInterval(() => {
            if (!this.checkAuth()) {
                console.log('Token validation failed, user logged out');
            }
        }, 5 * 60 * 1000);
    }

    // Utility method for making authenticated API calls
    async makeAuthenticatedRequest(url, options = {}) {
        const token = this.getToken();
        
        if (!token) {
            throw new Error('No authentication token available');
        }

        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const requestOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, requestOptions);
            
            if (response.status === 401) {
                console.warn('Authentication failed during API call');
                this.logout();
                throw new Error('Authentication failed');
            }
            
            return response;
        } catch (error) {
            console.error('Authenticated request failed:', error);
            throw error;
        }
    }

    // Get user role for role-based access control
    getUserRole() {
        const user = this.getUser();
        return user ? user.role : null;
    }

    // Check if user has specific role
    hasRole(role) {
        return this.getUserRole() === role;
    }

    // Check if user is teacher
    isTeacher() {
        return this.hasRole('teacher');
    }

    // Check if user is student
    isStudent() {
        return this.hasRole('student');
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
