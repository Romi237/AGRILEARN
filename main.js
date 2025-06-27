// Main JavaScript file for AgriLearn platform
document.addEventListener('DOMContentLoaded', function() {
    // Add global media error handling to prevent AbortError from breaking the page
    setupGlobalMediaErrorHandling();

    // Initialize the application
    initializeApp();

    // Set up event listeners
    setupEventListeners();

    // Initialize components
    initializeComponents();
});

function setupGlobalMediaErrorHandling() {
    // Handle media play/pause AbortErrors globally
    window.addEventListener('error', function(e) {
        if (e.error && e.error.name === 'AbortError' &&
            (e.error.message.includes('play()') || e.error.message.includes('pause()'))) {
            console.log('Global media AbortError caught and suppressed');
            e.preventDefault();
            return false;
        }
    });

    // Handle promise rejections from media operations
    window.addEventListener('unhandledrejection', function(e) {
        if (e.reason && e.reason.name === 'AbortError' &&
            e.reason.message && (e.reason.message.includes('play()') || e.reason.message.includes('pause()'))) {
            console.log('Global media AbortError promise rejection caught and suppressed');
            e.preventDefault();
            return false;
        }
    });

    // Monitor for any media elements and add error handling
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // Check if the node itself is a media element
                    if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
                        addMediaErrorHandling(node);
                    }
                    // Check for media elements within the added node
                    const mediaElements = node.querySelectorAll && node.querySelectorAll('audio, video');
                    if (mediaElements) {
                        mediaElements.forEach(addMediaErrorHandling);
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Add error handling to existing media elements
    document.querySelectorAll('audio, video').forEach(addMediaErrorHandling);
}

function addMediaErrorHandling(mediaElement) {
    mediaElement.addEventListener('error', function(e) {
        console.log('Media element error handled:', e);
    });

    // Override play method to catch AbortErrors
    const originalPlay = mediaElement.play;
    mediaElement.play = function() {
        const playPromise = originalPlay.call(this);
        if (playPromise && playPromise.catch) {
            playPromise.catch(function(error) {
                if (error.name === 'AbortError') {
                    console.log('Media play AbortError caught and handled');
                } else {
                    console.error('Media play error:', error);
                }
            });
        }
        return playPromise;
    };
}

function initializeApp() {
    console.log('AgriLearn platform initialized');
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Initialize theme
    initializeTheme();
    
    // Set up navigation
    setupNavigation();
}

function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('agrilearn_user');
    const currentPage = window.location.pathname;
    
    // Redirect logic based on auth status
    if (!isLoggedIn && (currentPage.includes('dashboard') || currentPage.includes('courses') || currentPage.includes('marketplace'))) {
        window.location.href = 'login.html';
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('agrilearn_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function setupNavigation() {
    // Mobile navigation toggle
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileNavToggle && sidebar) {
        mobileNavToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Active navigation highlighting
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.main-nav a, .mobile-nav a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.parentElement.classList.add('active');
        }
    });
}

function setupEventListeners() {
    // Search functionality
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', handleSearch);
    });
    
    // Filter functionality
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', handleFilter);
    });
    
    // Modal functionality
    setupModals();
    
    // Form submissions
    setupForms();
    
    // Notification handling
    setupNotifications();
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const searchableItems = document.querySelectorAll('.course-card, .product-card, .project-card');
    
    searchableItems.forEach(item => {
        const title = item.querySelector('h3, h4')?.textContent.toLowerCase() || '';
        const description = item.querySelector('p')?.textContent.toLowerCase() || '';
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function handleFilter(event) {
    const filterValue = event.target.value;
    const filterableItems = document.querySelectorAll('.course-card, .product-card, .project-card');
    
    filterableItems.forEach(item => {
        if (filterValue === 'all') {
            item.style.display = 'block';
        } else {
            const itemCategory = item.dataset.category || item.dataset.status || '';
            if (itemCategory === filterValue) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        }
    });
}

function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const modalCloses = document.querySelectorAll('.modal-close');
    
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const modalId = this.dataset.modal;
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    modalCloses.forEach(close => {
        close.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });
    
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });
}

function setupForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmission(this);
        });
    });
}

function handleFormSubmission(form) {
    const formData = new FormData(form);
    const formType = form.id || form.className;
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        // Show success message
        showNotification('Form submitted successfully!', 'success');
        
        // Handle specific form types
        switch (formType) {
            case 'login-form':
                handleLogin(formData);
                break;
            case 'signup-form':
                handleSignup(formData);
                break;
            case 'contact-form':
                handleContact(formData);
                break;
            default:
                console.log('Form submitted:', formData);
        }
    }, 1500);
}

async function handleLogin(formData) {
    try {
        const response = await fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('agrilearn_user', JSON.stringify(data.user));
            localStorage.setItem('agrilearn_token', data.token);

            // Redirect based on role
            if (data.user.role === 'teacher') {
                window.location.href = 'teacher-dashboard.html';
            } else {
                window.location.href = 'student-dashboard.html';
            }
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    }
}

async function handleSignup(formData) {
    try {
        const response = await fetch('http://localhost:5000/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role') || 'student',
                expertise: formData.get('expertise'),
                experience: formData.get('experience')
            })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('agrilearn_user', JSON.stringify(data.user));
            localStorage.setItem('agrilearn_token', data.token);

            showNotification('Account created successfully!', 'success');

            // Redirect based on role
            if (data.user.role === 'teacher') {
                window.location.href = 'teacher-dashboard.html';
            } else {
                window.location.href = 'student-dashboard.html';
            }
        } else {
            showNotification(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Signup failed. Please try again.', 'error');
    }
}

function handleContact(formData) {
    console.log('Contact form submitted:', {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message')
    });
}

function setupNotifications() {
    // Create notification container if it doesn't exist
    if (!document.querySelector('.notification-container')) {
        const container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
}

function showNotification(message, type = 'info', duration = 5000) {
    const container = document.querySelector('.notification-container');
    const notification = document.createElement('div');
    
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        removeNotification(notification);
    }, duration);
    
    // Manual close
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            removeNotification(notification);
        });
    }
}

function removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

function initializeComponents() {
    // Initialize progress bars
    initializeProgressBars();
    
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize lazy loading
    initializeLazyLoading();
    
    // Initialize animations
    initializeAnimations();
}

function initializeProgressBars() {
    const progressBars = document.querySelectorAll('.progress');
    
    progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        
        setTimeout(() => {
            bar.style.width = width;
        }, 500);
    });
}

function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const element = event.target;
    const tooltipText = element.dataset.tooltip;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
    
    element._tooltip = tooltip;
}

function hideTooltip(event) {
    const element = event.target;
    if (element._tooltip) {
        document.body.removeChild(element._tooltip);
        delete element._tooltip;
    }
}

function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

function initializeAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    });
    
    animatedElements.forEach(element => animationObserver.observe(element));
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export functions for use in other files
window.AgriLearn = {
    showNotification,
    formatCurrency,
    formatDate,
    debounce,
    throttle
};