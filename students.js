document.addEventListener('DOMContentLoaded', () => {
    // Debug function to check element existence
    function debugElements() {
        const requiredElements = [
            'students-container',
            'student-search',
            'student-modal',
            'confirm-modal',
            'message-modal'
        ];
        
        console.group('DOM Elements Check');
        requiredElements.forEach(id => {
            const el = document.getElementById(id);
            console.log(`${id}:`, el ? '✅ Found' : '❌ Missing');
        });
        console.groupEnd();
    }

    // Run debug check
    debugElements();

    // DOM Elements
    const studentsContainer = document.getElementById('students-container');
    const studentSearch = document.getElementById('student-search');
    const searchStudentsBtn = document.getElementById('search-students-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const exportStudentsBtn = document.getElementById('export-students-btn');
    
    // Modals
    const studentModal = document.getElementById('student-modal');
    const messageModal = document.getElementById('message-modal');
    const confirmModal = document.getElementById('confirm-modal');
    
    // Modal buttons
    const closeBtns = document.querySelectorAll('.close-btn');
    const sendMessageBtn = document.getElementById('send-message-btn');
    const deactivateBtn = document.getElementById('deactivate-btn');
    const cancelMessageBtn = document.getElementById('cancel-message-btn');
    const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');
    
    // Forms
    const messageForm = document.getElementById('message-form');
    
    // State
    let students = [];
    let currentFilter = 'all';
    let currentStudentId = null;
    let currentAction = null;

    // Initialize application
    checkAuth();
    loadStudents();
    setupEventListeners();

    // Add demo data functionality
    window.createDemoStudents = createDemoStudents;
    window.clearDemoStudents = clearDemoStudents;

    function setupEventListeners() {
        // Search functionality
        if (studentSearch && searchStudentsBtn) {
            searchStudentsBtn.addEventListener('click', searchStudents);
            studentSearch.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') searchStudents();
            });
        }
        
        // Filter buttons
        if (filterBtns.length > 0) {
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentFilter = btn.dataset.status;
                    filterStudents(currentFilter);
                });
            });
        }
        
        // Export button
        if (exportStudentsBtn) {
            exportStudentsBtn.addEventListener('click', exportStudents);
        }
        
        // Modal close buttons
        if (closeBtns.length > 0) {
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (studentModal) studentModal.style.display = 'none';
                    if (messageModal) messageModal.style.display = 'none';
                    if (confirmModal) confirmModal.style.display = 'none';
                });
            });
        }
        
        // Message button
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', openMessageModal);
        }
        
        // Deactivate/Activate button
        if (deactivateBtn) {
            deactivateBtn.addEventListener('click', toggleStudentStatus);
        }
        
        // Cancel buttons
        if (cancelMessageBtn) {
            cancelMessageBtn.addEventListener('click', () => {
                if (messageModal) messageModal.style.display = 'none';
            });
        }
        
        if (cancelConfirmBtn) {
            cancelConfirmBtn.addEventListener('click', () => {
                if (confirmModal) confirmModal.style.display = 'none';
            });
        }
        
        // Form submissions
        if (messageForm) {
            messageForm.addEventListener('submit', sendMessage);
        }
        
        // Confirm action button
        const confirmActionBtn = document.getElementById('confirm-action-btn');
        if (confirmActionBtn) {
            confirmActionBtn.addEventListener('click', executeConfirmedAction);
        }
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (studentModal && e.target === studentModal) studentModal.style.display = 'none';
            if (messageModal && e.target === messageModal) messageModal.style.display = 'none';
            if (confirmModal && e.target === confirmModal) confirmModal.style.display = 'none';
        });
    }

    // ======================== CORE FUNCTIONS ========================
    function checkAuth() {
        const token = localStorage.getItem('agrilearn_token');
        const user = JSON.parse(localStorage.getItem('agrilearn_user'));
        
        if (!token || !user || user.role !== 'teacher') {
            window.location.href = 'login.html';
        }
    }

    function setLoading(loading) {
        if (studentsContainer) {
            studentsContainer.innerHTML = loading ? `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="loading-spinner">
                            <div class="spinner"></div>
                            <p>Loading students...</p>
                        </div>
                    </td>
                </tr>
            ` : '';
        }
    }

    async function loadStudents() {
    setLoading(true);
    try {
        const token = localStorage.getItem('agrilearn_token');
        const response = await fetch('http://localhost:5000/students', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // More detailed error message
            const error = await response.json().catch(() => ({}));
            throw new Error(
                error.message || 
                `Server returned ${response.status} ${response.statusText}`
            );
        }
        
        const data = await response.json();
        if (data.success) {
            students = data.students;
            renderStudents(students);
        } else {
            throw new Error(data.message || 'Failed to load students');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showErrorState({
            message: error.message.includes('404') 
                ? 'Students endpoint not found. Please contact support.'
                : error.message
        });
    } finally {
        setLoading(false);
    }
}

    function showErrorState(error) {
    if (studentsContainer) {
        studentsContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Unable to load students</h3>
                        <p>${error.message}</p>
                        <button class="retry-btn" id="retry-load-students">
                            <i class="fas fa-sync-alt"></i> Try Again
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        const retryBtn = document.getElementById('retry-load-students');
        if (retryBtn) {
            retryBtn.addEventListener('click', loadStudents);
        }
    }
}

    function renderStudents(studentsToRender) {
        if (!studentsContainer) return;
        
        studentsContainer.innerHTML = '';
        
        if (studentsToRender.length === 0) {
            studentsContainer.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-user-graduate"></i>
                            <h3>No students found</h3>
                            <p>${getEmptyStateMessage(currentFilter)}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        studentsToRender.forEach(student => {
            const studentRow = document.createElement('tr');
            studentRow.className = `student-row ${student.isActive ? '' : 'inactive'}`;
            
            studentRow.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${student.avatar || 'images/default-avatar.png'}" 
                             alt="${student.name}" 
                             class="student-avatar">
                        <div class="ml-3">
                            <strong>${student.name}</strong>
                            <div class="text-muted small">ID: ${student._id.slice(-6)}</div>
                        </div>
                    </div>
                </td>
                <td>${student.email}</td>
                <td>${formatDate(student.joinedDate)}</td>
                <td>${student.enrolledCourses?.length || 0}</td>
                <td>
                    <span class="status-badge ${student.isActive ? 'status-active' : 'status-inactive'}">
                        ${student.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="action-btn view-btn" data-id="${student._id}" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn message-btn" data-id="${student._id}" title="Message">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button class="action-btn ${student.isActive ? 'deactivate-btn' : 'activate-btn'}" 
                            data-id="${student._id}" 
                            title="${student.isActive ? 'Deactivate' : 'Activate'}">
                        <i class="fas ${student.isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                </td>
            `;
            
            studentsContainer.appendChild(studentRow);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.id;
                viewStudentDetails(studentId);
            });
        });
        
        document.querySelectorAll('.message-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentStudentId = e.currentTarget.dataset.id;
                openMessageModal();
            });
        });
        
        document.querySelectorAll('.deactivate-btn, .activate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentStudentId = e.currentTarget.dataset.id;
                currentAction = e.currentTarget.classList.contains('deactivate-btn') ? 'deactivate' : 'activate';
                showConfirmationModal(
                    `${currentAction === 'deactivate' ? 'Deactivate' : 'Activate'} Student`,
                    `Are you sure you want to ${currentAction} this student's account?`,
                    currentAction === 'deactivate' ? 'Deactivate' : 'Activate'
                );
            });
        });
    }

    function searchStudents() {
        const searchTerm = studentSearch.value.trim().toLowerCase();
        
        if (!searchTerm) {
            filterStudents(currentFilter);
            return;
        }
        
        const filtered = students.filter(student => 
            student.name.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm) ||
            student._id.toLowerCase().includes(searchTerm)
        );
        
        renderStudents(filtered);
    }

    function filterStudents(status) {
        let filteredStudents = [...students];
        
        switch(status) {
            case 'active':
                filteredStudents = students.filter(s => s.isActive);
                break;
            case 'inactive':
                filteredStudents = students.filter(s => !s.isActive);
                break;
            case 'recent':
                filteredStudents = students
                    .sort((a, b) => new Date(b.joinedDate) - new Date(a.joinedDate))
                    .slice(0, 10);
                break;
            case 'all':
            default:
                filteredStudents = [...students];
        }
        
        renderStudents(filteredStudents);
    }

    async function viewStudentDetails(studentId) {
        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`http://localhost:5000/students/${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load student details');
            
            const { student } = await response.json();
            displayStudentModal(student);
        } catch (error) {
            console.error('Error viewing student:', error);
            showAlert('Failed to load student details', 'error');
        }
    }

    function displayStudentModal(student) {
        if (!studentModal) return;
        
        // Set basic info
        document.getElementById('student-name').textContent = student.name;
        document.getElementById('student-email').textContent = student.email;
        document.getElementById('student-joined').textContent = `Joined: ${formatDate(student.joinedDate)}`;
        
        // Set avatar
        const avatarImg = document.getElementById('student-avatar-img');
        if (avatarImg) {
            avatarImg.src = student.avatar || 'images/default-avatar.png';
            avatarImg.alt = student.name;
        }
        
        // Set status
        const statusBadge = document.querySelector('#student-status .status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${student.isActive ? 'status-active' : 'status-inactive'}`;
            statusBadge.textContent = student.isActive ? 'Active' : 'Inactive';
        }
        
        // Set courses
        const coursesList = document.getElementById('student-courses-list');
        if (coursesList) {
            coursesList.innerHTML = student.enrolledCourses?.length > 0 
                ? student.enrolledCourses.map(course => `
                    <div class="course-progress">
                        <div class="course-title">${course.title}</div>
                        <div class="progress-text">${course.progress}% completed</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${course.progress}%"></div>
                        </div>
                    </div>
                `).join('')
                : '<p>No enrolled courses</p>';
        }
        
        // Update action button
        if (deactivateBtn) {
            deactivateBtn.className =` btn ${student.isActive ? 'btn-danger' : 'btn-success'}`;
            deactivateBtn.innerHTML = `<i class="fas ${student.isActive ? 'fa-user-slash' : 'fa-user-check'}"></i> ${student.isActive ? 'Deactivate' : 'Activate'}`;
        }
        
        currentStudentId = student._id;
        studentModal.style.display = 'block';
    }

    function openMessageModal() {
        if (!messageModal || !currentStudentId) return;
        
        const student = students.find(s => s._id === currentStudentId);
        if (!student) return;
        
        document.getElementById('message-recipient').textContent = student.name;
        messageForm.reset();
        messageModal.style.display = 'block';
    }

    async function sendMessage(e) {
        e.preventDefault();
        
        const messageData = {
            studentId: currentStudentId,
            subject: document.getElementById('message-subject').value.trim(),
            content: document.getElementById('message-content').value.trim()
        };
        
        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch('http://localhost:5000/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(messageData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }
            
            showAlert('Message sent successfully!', 'success');
            messageModal.style.display = 'none';
        } catch (error) {
            console.error('Error sending message:', error);
            showAlert(error.message, 'error');
        }
    }

    function toggleStudentStatus() {
        currentAction = deactivateBtn.classList.contains('btn-danger') ? 'deactivate' : 'activate';
        showConfirmationModal(
            `${currentAction === 'deactivate' ? 'Deactivate' : 'Activate'} Student`,
            `Are you sure you want to ${currentAction} this student's account?`,
            currentAction === 'deactivate' ? 'Deactivate' : 'Activate'
        );
    }

    async function executeConfirmedAction() {
        if (!currentStudentId || !currentAction) return;
        
        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`http://localhost:5000/students/${currentStudentId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    isActive: currentAction === 'activate'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update student status');
            }
            
            showAlert(`Student account ${currentAction}d successfully`, 'success');
            confirmModal.style.display = 'none';
            
            // Update local data and UI
            const studentIndex = students.findIndex(s => s._id === currentStudentId);
            if (studentIndex !== -1) {
                students[studentIndex].isActive = currentAction === 'activate';
                renderStudents(students);
                
                // If student modal is open, update it
                if (studentModal.style.display === 'block') {
                    displayStudentModal(students[studentIndex]);
                }
            }
        } catch (error) {
            console.error('Error updating student status:', error);
            showAlert(error.message, 'error');
        }
    }

    function showConfirmationModal(title, message, actionText) {
        if (!confirmModal) return;
        
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-message').textContent = message;
        document.getElementById('confirm-action-btn').textContent = actionText;
        
        // Set appropriate button color
        const confirmBtn = document.getElementById('confirm-action-btn');
        confirmBtn.className =` btn ${actionText === 'Deactivate' ? 'btn-danger' : 'btn-success'}`;
        
        confirmModal.style.display = 'block';
    }

    function exportStudents() {
        // Simple CSV export implementation
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Headers
        csvContent += "Name,Email,Joined Date,Status,Courses\n";
        
        // Data rows
        students.forEach(student => {
            const row = [
                "${student.name}",
                student.email,
                formatDate(student.joinedDate),
                student.isActive ? 'Active' : 'Inactive',
                student.enrolledCourses?.length || 0
            ].join(',');
            
            csvContent += row + "\n";
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "agrilearn_students.csv");
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        document.body.removeChild(link);
        
        showAlert('Student list exported successfully', 'success');
    }

    // ======================== HELPER FUNCTIONS ========================
    function showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span>${message}</span>
            <button class="close-alert">&times;</button>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.add('fade-out');
            setTimeout(() => alert.remove(), 300);
        }, 3000);
        
        alert.querySelector('.close-alert').addEventListener('click', () => {
            alert.remove();
        });
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function getEmptyStateMessage(filter) {
        switch(filter) {
            case 'active': return "You don't have any active students";
            case 'inactive': return "You don't have any inactive students";
            case 'recent': return "No recent student activity";
            default: return "No students found";
        }
    }

    // Demo data functions
    async function createDemoStudents() {
        try {
            const token = localStorage.getItem('agrilearn_token');
            if (!token) {
                alert('Please login first');
                return;
            }

            // First, get available courses to enroll students in
            const coursesResponse = await fetch('http://localhost:5000/courses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let availableCourses = [];
            if (coursesResponse.ok) {
                const coursesData = await coursesResponse.json();
                availableCourses = coursesData.courses || [];
                console.log('Available courses:', availableCourses.length);
            }

            // Create a new student using the real API
            const success = await createStudent(studentData);
            if (success) {
                loadStudents(); // Refresh the list
            }
            return;

        } catch (error) {
            console.error('Error creating demo students:', error);
            alert('Error creating demo students. Check console for details.');
        }
    }

    async function createStudent(studentData) {
        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch('http://localhost:5000/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(studentData)
            });

            const data = await response.json();

            if (data.success) {
                alert('Student created successfully!');
                return true;
            } else {
                alert('Error creating student: ' + data.message);
                return false;
            }
        } catch (error) {
            console.error('Error creating student:', error);
            alert('Error creating student: ' + error.message);
            return false;
        }
    }

    async function enrollStudentInCourse(studentId, courseId) {
        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`http://localhost:5000/students/${studentId}/enroll/${courseId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId,
                    courseId,
                    progress: Math.floor(Math.random() * 100) // Random progress 0-99%
                })
            });

            if (response.ok) {
                console.log(`Enrolled student ${studentId} in course ${courseId}`);
            }
        } catch (error) {
            console.error('Error enrolling student:', error);
        }
    }

    async function clearDemoStudents() {
        if (!confirm('Are you sure you want to delete all demo students? This action cannot be undone.')) {
            return;
        }

        try {
            // For now, show a message to use the script
            alert('To clear demo data, please run:\nnode clear-demo-data.js\n\nThen refresh this page.');
            return;
        } catch (error) {
            console.error('Error clearing demo students:', error);
            alert('Error clearing demo students. Check console for details.');
        }
    }
});