// Authentication JavaScript for AgriLearn

document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    setupForgotPassword();
    setupResetPassword();
});

function initializeAuth() {
    setupRoleToggle();
    setupFormHandlers();
    setupSocialLogin();
    checkExistingAuth();
}

function setupForgotPassword() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const btn = this.querySelector('button[type="submit"]');
            const originalBtnText = btn.textContent;
            
            try {
                btn.disabled = true;
                btn.textContent = 'Sending...';
                
                const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showNotification('Password reset link sent to your email!', 'success');
                    forgotPasswordForm.reset();
                } else {
                    showNotification(data.message || 'Failed to send reset link', 'error');
                }
            } catch (error) {
                showNotification('An error occurred. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalBtnText;
            }
        });
    }
}

function setupResetPassword() {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        // Extract token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            document.getElementById('token').value = token;
        } else {
            showNotification('Invalid or missing reset token', 'error');
            return;
        }

        resetPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const token = document.getElementById('token').value;
            
            if (newPassword !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            if (newPassword.length < 8) {
                showNotification('Password must be at least 8 characters', 'error');
                return;
            }
            
            const btn = this.querySelector('button[type="submit"]');
            const originalBtnText = btn.textContent;
            
            try {
                btn.disabled = true;
                btn.textContent = 'Updating...';
                
                const response = await fetch('http://localhost:5000/api/auth/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token, newPassword })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showNotification('Password updated successfully! Redirecting to login...', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    showNotification(data.message || 'Failed to reset password', 'error');
                }
            } catch (error) {
                showNotification('An error occurred. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalBtnText;
            }
        });
    }
}

function setupRoleToggle() {
    const roleButtons = document.querySelectorAll('.role-btn');
    roleButtons.forEach(button => {
        button.addEventListener('click', function () {
            roleButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const role = this.dataset.role;
            const roleInput = document.querySelector('#role');
            if (roleInput) roleInput.value = role;

            updateFormForRole(role);
        });
    });
}

function updateFormForRole(role) {
    const form = document.querySelector('.auth-form');
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;

    const isSignup = form.id === 'signup-form';
    submitButton.textContent = isSignup
        ? `Sign Up as ${capitalize(role)}`
        : `Login as ${capitalize(role)}`;

    if (isSignup && role === 'teacher') {
        addTeacherFields(form);
    } else {
        removeTeacherFields(form);
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function addTeacherFields(form) {
    if (form.querySelector('#expertise')) return;

    const confirmPasswordGroup = form.querySelector('#confirm-password')?.parentElement;

    const expertiseGroup = document.createElement('div');
    expertiseGroup.className = 'form-group';
    expertiseGroup.innerHTML = `
        <label for="expertise">Area of Expertise</label>
        <select id="expertise" name="expertise" required>
            <option value="">Select your expertise</option>
            <option value="organic-farming">Organic Farming</option>
            <option value="crop-management">Crop Management</option>
            <option value="livestock">Livestock Management</option>
            <option value="sustainable-agriculture">Sustainable Agriculture</option>
            <option value="soil-science">Soil Science</option>
            <option value="plant-pathology">Plant Pathology</option>
            <option value="agricultural-economics">Agricultural Economics</option>
        </select>
    `;

    const experienceGroup = document.createElement('div');
    experienceGroup.className = 'form-group';
    experienceGroup.innerHTML = `
        <label for="experience">Years of Experience</label>
        <select id="experience" name="experience" required>
            <option value="">Select experience level</option>
            <option value="1-3">1–3 years</option>
            <option value="4-7">4–7 years</option>
            <option value="8-15">8–15 years</option>
            <option value="15+">15+ years</option>
        </select>
    `;

    confirmPasswordGroup?.parentNode.insertBefore(expertiseGroup, confirmPasswordGroup.nextSibling);
    confirmPasswordGroup?.parentNode.insertBefore(experienceGroup, expertiseGroup.nextSibling);
}

function removeTeacherFields(form) {
    const expertise = form.querySelector('#expertise');
    const experience = form.querySelector('#experience');
    if (expertise) expertise.parentElement.remove();
    if (experience) experience.parentElement.remove();
}

function setupFormHandlers() {
    const forms = document.querySelectorAll('.auth-form');

    forms.forEach(form => {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!validateForm(form)) return;

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const endpoint = form.id === 'signup-form' ? '/signup' : '/login';
            const url = `http://localhost:5000${endpoint}`;

            const button = form.querySelector('button[type="submit"]');
            const originalText = button.textContent;
            button.textContent = 'Processing...';
            button.disabled = true;

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();
                button.textContent = originalText;
                button.disabled = false;

                if (res.ok && result.success) {
                    localStorage.setItem('agrilearn_user', JSON.stringify(result.user));
                    localStorage.setItem('agrilearn_token', result.token);

                    showNotification(`${form.id === 'signup-form' ? 'Account created' : 'Login successful'}!`, 'success');

                    // Role-based redirect
                    const dashboard = result.user.role === 'teacher'
                        ? 'teacher-dashboard.html'
                        : 'student-dashboard.html';

                    setTimeout(() => {
                        window.location.href = dashboard;
                    }, 1000);
                } else {
                    showNotification(result.message || 'Something went wrong', 'error');
                }
            } catch (err) {
                button.textContent = originalText;
                button.disabled = false;
                showNotification('Network error. Please try again.', 'error');
            }
        });
    });
}

function validateForm(form) {
    let valid = true;
    const fields = form.querySelectorAll('input[required], select[required]');
    fields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            valid = false;
        } else {
            field.classList.remove('error');
        }
    });

    const password = form.querySelector('#password');
    const confirm = form.querySelector('#confirm-password');
    if (password && confirm && password.value !== confirm.value) {
        confirm.classList.add('error');
        showNotification('Passwords do not match', 'error');
        valid = false;
    }

    return valid;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function setupSocialLogin() {
    const buttons = document.querySelectorAll('.social-btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const provider = button.classList.contains('google')
                ? 'Google'
                : button.classList.contains('facebook')
                ? 'Facebook'
                : 'Twitter';
            showNotification(`${provider} login is not available in demo mode`, 'info');
        });
    });
}

function checkExistingAuth() {
    const user = localStorage.getItem('agrilearn_user');
    const currentPage = window.location.pathname.split('/').pop();

    if (user && !['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html'].includes(currentPage)) {
        const parsedUser = JSON.parse(user);
        const roleDashboard = parsedUser.role === 'teacher'
            ? 'teacher-dashboard.html'
            : 'student-dashboard.html';
        window.location.href = roleDashboard;
    }

    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    if (role) {
        const btn = document.querySelector(`[data-role="${role}"]`);
        if (btn) btn.click();
    }
}

function logout() {
    localStorage.removeItem('agrilearn_user');
    localStorage.removeItem('agrilearn_token');
    showNotification('Logged out successfully', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);
}
window.logout = logout;

async function fetchDashboardData() {
    const token = localStorage.getItem('agrilearn_token');
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5000/dashboard-data', {
            headers: {
                Authorization:` Bearer ${token}`
            }
        });

        const result = await res.json();
        if (res.ok && result.success) {
            console.log('Dashboard data:', result.user);
        } else {
            showNotification('Unauthorized or session expired.', 'error');
            logout();
        }
    } catch (err) {
        showNotification('Failed to load dashboard.', 'error');
    }
}