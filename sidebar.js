// Enhanced Sidebar Navigation Component for AgriLearn
class Sidebar {
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
        this.createSidebar();
        this.setupEventListeners();
        this.updateActiveItem();
        this.loadNotificationBadges();
    }

    createSidebar() {
        // Check if sidebar already exists
        if (document.getElementById('agrilearn-sidebar')) {
            return;
        }

        const sidebarHTML = this.generateSidebarHTML();
        document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
        
        // Wrap main content if not already wrapped
        this.wrapMainContent();
    }

    generateSidebarHTML() {
        const navItems = this.getNavigationItems();
        
        const navItemsHTML = navItems.map(item => {
            const isActive = item.page === this.currentPage ? 'active' : '';
            const isHidden = this.shouldHideItem(item) ? 'style="display: none;"' : '';
            
            return `
                <a href="${item.href}" class="sidebar-item ${isActive}" data-page="${item.page}" ${isHidden}>
                    <i class="${item.icon}"></i>
                    <span class="sidebar-text">${item.label}</span>
                    <span class="nav-badge" id="badge-${item.page}" style="display: none;"></span>
                </a>
            `;
        }).join('');

        return `
            <aside class="sidebar" id="agrilearn-sidebar">
                <div class="sidebar-header">
                    <a href="dashboard.html" class="sidebar-brand">
                        <i class="fas fa-graduation-cap"></i>
                        <span class="sidebar-text">AgriLearn</span>
                    </a>
                </div>
                <nav class="sidebar-nav">
                    ${navItemsHTML}
                </nav>
                <div class="sidebar-footer">
                    <div class="sidebar-user-info">
                        <i class="fas fa-user-circle"></i>
                        <span class="sidebar-text">${this.getUserDisplayName()}</span>
                    </div>
                </div>
            </aside>
        `;
    }

    getNavigationItems() {
        const baseItems = [
            { href: 'dashboard.html', icon: 'fas fa-tachometer-alt', label: 'Dashboard', page: 'dashboard' },
            { href: 'courses.html', icon: 'fas fa-book', label: 'Courses', page: 'courses' },
            { href: 'assignments.html', icon: 'fas fa-tasks', label: 'Assignments', page: 'assignments' },
            { href: 'projects.html', icon: 'fas fa-project-diagram', label: 'Projects', page: 'projects' },
            { href: 'marketplace.html', icon: 'fas fa-shopping-cart', label: 'Marketplace', page: 'marketplace' },
            { href: 'resources.html', icon: 'fas fa-tools', label: 'Resources', page: 'resources' },
            { href: 'messages.html', icon: 'fas fa-envelope', label: 'Messages', page: 'messages' },
        ];

        // Add role-specific items
        if (this.userRole === 'teacher') {
            baseItems.push(
                { href: 'students.html', icon: 'fas fa-user-graduate', label: 'Students', page: 'students' }
            );
        }

        baseItems.push(
            { href: 'profile.html', icon: 'fas fa-user', label: 'Profile', page: 'profile' }
        );

        return baseItems;
    }

    shouldHideItem(item) {
        // Hide students page for non-teachers
        if (item.page === 'students' && this.userRole !== 'teacher') {
            return true;
        }
        return false;
    }

    getUserDisplayName() {
        const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');
        return user.name || 'User';
    }

    wrapMainContent() {
        const existingWrapper = document.querySelector('.main-wrapper');
        if (existingWrapper) {
            return; // Already wrapped
        }

        const sidebar = document.getElementById('agrilearn-sidebar');
        const body = document.body;
        const children = Array.from(body.children);
        
        // Create main wrapper
        const mainWrapper = document.createElement('div');
        mainWrapper.className = 'main-wrapper';
        
        // Move all content except sidebar and overlay to wrapper
        children.forEach(child => {
            if (child.id !== 'agrilearn-sidebar' && child.id !== 'sidebar-overlay') {
                mainWrapper.appendChild(child);
            }
        });
        
        body.appendChild(mainWrapper);
    }

    setupEventListeners() {
        // Navigation tracking
        const navItems = document.querySelectorAll('.sidebar-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleNavClick(e, item));
        });
    }



    updateActiveItem() {
        const items = document.querySelectorAll('.sidebar-item');
        items.forEach(item => {
            const page = item.getAttribute('data-page');
            if (page === this.currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    handleNavClick(e, item) {
        const page = item.getAttribute('data-page');

        // Track navigation
        this.trackNavigation(page);

        // Check authentication
        if (this.requiresAuth(page) && !this.isLoggedIn()) {
            e.preventDefault();
            this.redirectToLogin();
            return;
        }
    }

    requiresAuth(page) {
        const authPages = ['dashboard', 'courses', 'assignments', 'projects', 'resources', 'messages', 'students', 'profile'];
        return authPages.includes(page);
    }

    isLoggedIn() {
        return !!(localStorage.getItem('agrilearn_token') && localStorage.getItem('agrilearn_user'));
    }

    redirectToLogin() {
        localStorage.setItem('agrilearn_redirect_after_login', window.location.href);
        window.location.href = 'login.html';
    }

    trackNavigation(page) {
        console.log(`Navigation: ${page}`);
        // Add analytics tracking here
    }

    async loadNotificationBadges() {
        if (!this.isLoggedIn()) return;

        try {
            await Promise.all([
                this.loadMessagesBadge(),
                this.loadAssignmentsBadge()
            ]);
        } catch (error) {
            console.error('Error loading notification badges:', error);
        }
    }

    async loadMessagesBadge() {
        try {
            const token = localStorage.getItem('agrilearn_token');
            if (!token) {
                console.log('No auth token, skipping messages badge');
                return;
            }

            const response = await fetch('http://localhost:5000/messages/unread-count', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateBadge('messages', data.count || 0);
            } else {
                console.warn('Messages API returned:', response.status, response.statusText);
                // Try test endpoint as fallback
                const testResponse = await fetch('http://localhost:5000/messages/test-unread');
                if (testResponse.ok) {
                    const testData = await testResponse.json();
                    this.updateBadge('messages', testData.count || 0);
                } else {
                    throw new Error('Both main and test endpoints failed');
                }
            }
        } catch (error) {
            console.error('Error loading messages badge:', error);
            // Fallback to demo data
            this.updateBadge('messages', Math.floor(Math.random() * 5));
        }
    }

    async loadAssignmentsBadge() {
        try {
            const token = localStorage.getItem('agrilearn_token');
            if (!token) {
                console.log('No auth token, skipping assignments badge');
                return;
            }

            const response = await fetch('http://localhost:5000/assignments/pending-count', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateBadge('assignments', data.count || 0);
            } else {
                console.warn('Assignments API returned:', response.status, response.statusText);
                // Try test endpoint as fallback
                const testResponse = await fetch('http://localhost:5000/assignments/test-count');
                if (testResponse.ok) {
                    const testData = await testResponse.json();
                    this.updateBadge('assignments', testData.count || 0);
                } else {
                    throw new Error('Both main and test endpoints failed');
                }
            }
        } catch (error) {
            console.error('Error loading assignments badge:', error);
            // Fallback to demo data
            this.updateBadge('assignments', Math.floor(Math.random() * 3));
        }
    }

    updateBadge(page, count) {
        const badge = document.getElementById(`badge-${page}`);
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count.toString();
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Public method to refresh badges
    refreshBadges() {
        this.loadNotificationBadges();
    }

    // Public method to update specific badge
    setBadge(page, count) {
        this.updateBadge(page, count);
    }
}

// Auto-initialize sidebar on pages that need it
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const sidebarPages = ['dashboard', 'courses', 'assignments', 'projects', 'marketplace', 'resources', 'messages', 'students', 'profile', 'teacher-dashboard', 'student-dashboard'];
    
    if (sidebarPages.includes(currentPage)) {
        window.agriLearnSidebar = new Sidebar();
    }
});

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sidebar;
}
