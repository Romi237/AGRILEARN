// Profile page functionality
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeProfile();
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('agrilearn_user'));
    const token = localStorage.getItem('agrilearn_token');
    
    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    // Update user name in header
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.name;
    }
}

function initializeProfile() {
    loadUserProfile();
    loadUserStats();
    setupEventListeners();
}

function setupEventListeners() {
    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Password form submission
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
}

function loadUserProfile() {
    // Update profile header
    const profileName = document.getElementById('profile-display-name');
    const profileRole = document.getElementById('profile-display-role');
    const avatarIcon = document.getElementById('profile-avatar-icon');
    const profilePicture = document.getElementById('profile-picture');

    if (profileName) profileName.textContent = currentUser.name;
    if (profileRole) profileRole.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

    // Handle profile picture
    if (currentUser.profilePicture && profilePicture && avatarIcon) {
        profilePicture.src = currentUser.profilePicture.startsWith('http')
            ? currentUser.profilePicture
            : `http://localhost:5000${currentUser.profilePicture}`;
        profilePicture.classList.remove('profile-picture-hidden');
        avatarIcon.style.display = 'none';
    } else if (avatarIcon) {
        avatarIcon.className = currentUser.role === 'teacher' ? 'fas fa-chalkboard-teacher' : 'fas fa-user-graduate';
        avatarIcon.style.display = 'block';
        if (profilePicture) profilePicture.classList.add('profile-picture-hidden');
    }

    // Populate form fields
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    const expertiseField = document.getElementById('expertise');
    const experienceField = document.getElementById('experience');

    if (nameField) nameField.value = currentUser.name || '';
    if (emailField) emailField.value = currentUser.email || '';
    if (expertiseField) expertiseField.value = currentUser.expertise || '';
    if (experienceField) experienceField.value = currentUser.experience || '';
}

async function loadUserStats() {
    try {
        const token = localStorage.getItem('agrilearn_token');

        // Load user statistics from dashboard endpoint
        const response = await fetch('http://localhost:5000/dashboard-data', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            const user = data.user;

            // Update statistics based on user role
            if (user.role === 'student') {
                updateStats({
                    coursesCompleted: user.enrolledCourses?.length || 0,
                    assignmentsSubmitted: user.completedProjects?.length || 0,
                    projectsCompleted: user.completedProjects?.filter(p => p.status === 'approved')?.length || 0,
                    certificatesEarned: user.certificates?.length || 0
                });
            } else if (user.role === 'teacher') {
                updateStats({
                    coursesCreated: user.myCourses?.length || 0,
                    totalStudents: user.totalStudents || 0,
                    projectsAssigned: user.totalProjects || 0,
                    pendingReviews: user.pendingReviews || 0
                });
            }
        } else {
            throw new Error(data.message || 'Failed to load stats');
        }

    } catch (error) {
        console.error('Error loading user stats:', error);
        // Use default values based on role
        const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');
        if (user.role === 'teacher') {
            updateStats({
                coursesCreated: 0,
                totalStudents: 0,
                projectsAssigned: 0,
                pendingReviews: 0
            });
        } else {
            updateStats({
                coursesCompleted: 0,
                assignmentsSubmitted: 0,
                projectsCompleted: 0,
                certificatesEarned: 0
            });
        }
    }
}

function updateStats(stats) {
    const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');

    if (user.role === 'teacher') {
        // Update teacher stats
        const coursesElement = document.getElementById('header-courses');
        const studentsElement = document.getElementById('header-assignments'); // Reuse for students
        const projectsElement = document.getElementById('header-certificates'); // Reuse for projects
        const reviewsElement = document.getElementById('header-points'); // Reuse for reviews

        if (coursesElement) coursesElement.textContent = stats.coursesCreated || 0;
        if (studentsElement) studentsElement.textContent = stats.totalStudents || 0;
        if (projectsElement) projectsElement.textContent = stats.projectsAssigned || 0;
        if (reviewsElement) reviewsElement.textContent = stats.pendingReviews || 0;

        // Update labels for teacher context
        const coursesLabel = document.querySelector('[data-label="courses"]');
        const assignmentsLabel = document.querySelector('[data-label="assignments"]');
        const certificatesLabel = document.querySelector('[data-label="certificates"]');
        const pointsLabel = document.querySelector('[data-label="points"]');

        if (coursesLabel) coursesLabel.textContent = 'COURSES';
        if (assignmentsLabel) assignmentsLabel.textContent = 'STUDENTS';
        if (certificatesLabel) certificatesLabel.textContent = 'PROJECTS';
        if (pointsLabel) pointsLabel.textContent = 'REVIEWS';
    } else {
        // Update student stats
        const coursesElement = document.getElementById('header-courses');
        const assignmentsElement = document.getElementById('header-assignments');
        const certificatesElement = document.getElementById('header-certificates');
        const pointsElement = document.getElementById('header-points');

        if (coursesElement) coursesElement.textContent = stats.coursesCompleted || 0;
        if (assignmentsElement) assignmentsElement.textContent = stats.assignmentsSubmitted || 0;
        if (certificatesElement) certificatesElement.textContent = stats.certificatesEarned || 0;
        if (pointsElement) pointsElement.textContent = stats.projectsCompleted || 0;
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const profileData = {
        name: formData.get('name'),
        email: formData.get('email'),
        expertise: formData.get('expertise'),
        experience: formData.get('experience')
    };
    
    try {
        const token = localStorage.getItem('agrilearn_token');
        const response = await fetch(`http://localhost:5000/users/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local storage
            const updatedUser = { ...currentUser, ...profileData };
            localStorage.setItem('agrilearn_user', JSON.stringify(updatedUser));
            currentUser = updatedUser;
            
            // Update display
            loadUserProfile();
            
            showMessage('Profile updated successfully!', 'success');
        } else {
            showMessage(data.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Failed to update profile. Please try again.', 'error');
    }
}

async function handlePasswordChange(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('New password must be at least 6 characters long', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('agrilearn_token');
        const response = await fetch('http://localhost:5000/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Password changed successfully!', 'success');
            event.target.reset();
        } else {
            showMessage(data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showMessage('Failed to change password. Please try again.', 'error');
    }
}

function showMessage(message, type) {
    const successElement = document.getElementById('success-message');
    const errorElement = document.getElementById('error-message');
    
    // Hide both messages first
    if (successElement) successElement.style.display = 'none';
    if (errorElement) errorElement.style.display = 'none';
    
    // Show appropriate message
    if (type === 'success' && successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    } else if (type === 'error' && errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// User menu functionality
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function logout() {
    localStorage.removeItem('agrilearn_user');
    localStorage.removeItem('agrilearn_token');
    window.location.href = 'login.html';
}

// Close user menu when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('user-dropdown');
    
    if (userMenu && dropdown && !userMenu.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// Load achievements and notifications
function loadAchievements() {
    // This would typically load from an API
    const achievements = [
        {
            icon: 'fas fa-trophy',
            title: 'First Course Completed',
            description: 'Congratulations on completing your first course!'
        },
        {
            icon: 'fas fa-star',
            title: 'Perfect Score',
            description: 'Achieved 100% on an assignment!'
        },
        {
            icon: 'fas fa-medal',
            title: 'Quick Learner',
            description: 'Completed 3 courses in one month'
        }
    ];
    
    const achievementsList = document.getElementById('achievements-list');
    if (achievementsList) {
        achievementsList.innerHTML = achievements.map(achievement => `
            <div class="achievement-item">
                <div class="achievement-icon">
                    <i class="${achievement.icon}"></i>
                </div>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                </div>
            </div>
        `).join('');
    }
}

function loadNotifications() {
    // This would typically load from an API
    const notifications = [
        {
            icon: 'fas fa-book',
            title: 'New Course Available',
            description: 'Advanced Organic Farming Techniques is now available',
            time: '2 hours ago'
        },
        {
            icon: 'fas fa-tasks',
            title: 'Assignment Due Soon',
            description: 'Composting Project due in 2 days',
            time: '1 day ago'
        },
        {
            icon: 'fas fa-certificate',
            title: 'Certificate Ready',
            description: 'Your Organic Farming certificate is ready for download',
            time: '3 days ago'
        }
    ];
    
    const notificationsList = document.getElementById('notifications-list');
    if (notificationsList) {
        notificationsList.innerHTML = notifications.map(notification => `
            <div class="notification-item">
                <div class="notification-icon">
                    <i class="${notification.icon}"></i>
                </div>
                <div class="notification-content">
                    <h5>${notification.title}</h5>
                    <p>${notification.description}</p>
                </div>
                <div class="notification-time">${notification.time}</div>
            </div>
        `).join('');
    }
}

// Avatar upload functionality
async function uploadAvatar() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showMessage('File size must be less than 5MB', 'error');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showMessage('Please select a valid image file', 'error');
                return;
            }

            try {
                const token = localStorage.getItem('agrilearn_token');
                const formData = new FormData();
                formData.append('avatar', file);

                const response = await fetch('http://localhost:5000/upload-avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    // Update profile picture display
                    const profilePicture = document.getElementById('profile-picture');
                    const avatarIcon = document.getElementById('profile-avatar-icon');

                    if (profilePicture && avatarIcon) {
                        profilePicture.src = `http://localhost:5000${data.avatarUrl}`;
                        profilePicture.classList.remove('profile-picture-hidden');
                        avatarIcon.style.display = 'none';
                    }

                    // Update user data in localStorage
                    const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');
                    user.profilePicture = data.avatarUrl;
                    localStorage.setItem('agrilearn_user', JSON.stringify(user));

                    showMessage('Profile picture updated successfully!', 'success');
                } else {
                    throw new Error(data.message || 'Upload failed');
                }
            } catch (error) {
                console.error('Error uploading avatar:', error);
                showMessage('Failed to upload profile picture. Please try again.', 'error');
            }
        }
    });

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// Make uploadAvatar globally available
window.uploadAvatar = uploadAvatar;

// Load achievements and notifications on page load
setTimeout(() => {
    loadAchievements();
    loadNotifications();
}, 1000);
