// Navigation functionality for AgriLearn
class Navigation {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.userRole = this.getUserRole();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '');
    }

    getUserRole() {
        const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');
        return user.role || 'guest';
    }

    init() {
        this.updateActiveNavItem();
        this.setupNavigationListeners();
    }

    updateActiveNavItem() {
        // Remove active class from all nav items (both horizontal and sidebar)
        const navItems = document.querySelectorAll('.nav-item, .sidebar-item');
        navItems.forEach(item => item.classList.remove('active'));

        // Add active class to current page nav item
        const currentNavItem = document.querySelector(`.nav-item[href*="${this.currentPage}"], .sidebar-item[href*="${this.currentPage}"]`);
        if (currentNavItem) {
            currentNavItem.classList.add('active');
        }
    }

    setupNavigationListeners() {
        // Add click tracking for analytics (both horizontal and sidebar)
        const navItems = document.querySelectorAll('.nav-item, .sidebar-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const href = item.getAttribute('href');
                const pageName = href.replace('.html', '');

                // Track navigation event
                this.trackNavigation(pageName);

                // Check if user needs to be logged in for certain pages
                if (this.requiresAuth(pageName) && !this.isLoggedIn()) {
                    e.preventDefault();
                    this.redirectToLogin();
                }
            });
        });
    }

    requiresAuth(pageName) {
        const authRequiredPages = [
            'dashboard', 'courses', 'assignments', 'projects', 
            'resources', 'messages', 'profile'
        ];
        return authRequiredPages.includes(pageName);
    }

    isLoggedIn() {
        const token = localStorage.getItem('agrilearn_token');
        const user = localStorage.getItem('agrilearn_user');
        return !!(token && user);
    }

    redirectToLogin() {
        const currentPage = window.location.href;
        localStorage.setItem('agrilearn_redirect_after_login', currentPage);
        window.location.href = 'login.html';
    }

    trackNavigation(pageName) {
        // Analytics tracking (can be extended with actual analytics service)
        console.log(`Navigation: User navigated to ${pageName}`);
        
        // Store navigation history
        const navHistory = JSON.parse(localStorage.getItem('agrilearn_nav_history') || '[]');
        navHistory.push({
            page: pageName,
            timestamp: new Date().toISOString(),
            userRole: this.userRole
        });
        
        // Keep only last 50 navigation events
        if (navHistory.length > 50) {
            navHistory.splice(0, navHistory.length - 50);
        }
        
        localStorage.setItem('agrilearn_nav_history', JSON.stringify(navHistory));
    }

    // Method to dynamically create navigation HTML
    static createNavigationHTML(activePage = '') {
        const navItems = [
            { href: 'dashboard.html', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
            { href: 'courses.html', icon: 'fas fa-book', label: 'Courses' },
            { href: 'assignments.html', icon: 'fas fa-tasks', label: 'Assignments' },
            { href: 'projects.html', icon: 'fas fa-project-diagram', label: 'Projects' },
            { href: 'marketplace.html', icon: 'fas fa-shopping-cart', label: 'Marketplace' },
            { href: 'resources.html', icon: 'fas fa-tools', label: 'Resources' },
            { href: 'messages.html', icon: 'fas fa-envelope', label: 'Messages' },
            { href: 'profile.html', icon: 'fas fa-user', label: 'Profile' }
        ];

        const navItemsHTML = navItems.map(item => {
            const isActive = item.href.includes(activePage) ? 'active' : '';
            return `
                <a href="${item.href}" class="nav-item ${isActive}">
                    <i class="${item.icon}"></i>
                    <span>${item.label}</span>
                </a>
            `;
        }).join('');

        return `
            <nav class="main-nav">
                <div class="nav-container">
                    ${navItemsHTML}
                </div>
            </nav>
        `;
    }

    // Method to inject navigation into a page
    static injectNavigation(targetSelector = 'header', activePage = '') {
        const targetElement = document.querySelector(targetSelector);
        if (targetElement) {
            const navHTML = Navigation.createNavigationHTML(activePage);
            targetElement.insertAdjacentHTML('afterend', navHTML);
        }
    }

    // Method to update navigation based on user role
    updateNavigationForRole() {
        const navItems = document.querySelectorAll('.nav-item, .sidebar-item');

        // Hide/show navigation items based on user role
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            const pageName = href.replace('.html', '');

            // Example: Hide certain pages for students
            if (this.userRole === 'student') {
                if (pageName === 'resources' && this.isTeacherOnlyResource()) {
                    item.style.display = 'none';
                }
            }

            // Example: Add role-specific styling
            if (this.userRole === 'teacher') {
                item.classList.add('teacher-nav');
            } else if (this.userRole === 'student') {
                item.classList.add('student-nav');
            }
        });
    }

    isTeacherOnlyResource() {
        // Logic to determine if resources page should be teacher-only
        return false; // For now, allow all users
    }

    // Method to add notification badges to navigation items
    addNotificationBadges() {
        this.addMessagesBadge();
        this.addAssignmentsBadge();
    }

    async addMessagesBadge() {
        try {
            const token = localStorage.getItem('agrilearn_token');
            if (!token) return;

            const response = await fetch('http://localhost:5000/messages/unread-count', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const unreadCount = data.count || 0;
                
                if (unreadCount > 0) {
                    this.addBadgeToNavItem('messages.html', unreadCount);
                }
            }
        } catch (error) {
            console.error('Error fetching unread messages count:', error);
        }
    }

    async addAssignmentsBadge() {
        try {
            const token = localStorage.getItem('agrilearn_token');
            if (!token) return;

            const response = await fetch('http://localhost:5000/assignments/pending-count', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const pendingCount = data.count || 0;
                
                if (pendingCount > 0) {
                    this.addBadgeToNavItem('assignments.html', pendingCount);
                }
            }
        } catch (error) {
            console.error('Error fetching pending assignments count:', error);
        }
    }

    addBadgeToNavItem(href, count) {
        const navItem = document.querySelector(`.nav-item[href*="${href}"], .sidebar-item[href*="${href}"]`);
        if (navItem && count > 0) {
            // Remove existing badge
            const existingBadge = navItem.querySelector('.nav-badge');
            if (existingBadge) {
                existingBadge.remove();
            }

            // Add new badge
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = count > 99 ? '99+' : count;

            // Different positioning for sidebar vs horizontal nav
            const isSidebar = navItem.classList.contains('sidebar-item');
            badge.style.cssText = `
                position: absolute;
                top: ${isSidebar ? '50%' : '0.5rem'};
                right: ${isSidebar ? '1rem' : '0.5rem'};
                ${isSidebar ? 'transform: translateY(-50%);' : ''}
                background: #ff4757;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 0.7rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                z-index: 1;
            `;

            navItem.style.position = 'relative';
            navItem.appendChild(badge);
        }
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const navigation = new Navigation();
    
    // Add notification badges if user is logged in
    if (navigation.isLoggedIn()) {
        navigation.updateNavigationForRole();
        navigation.addNotificationBadges();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}
