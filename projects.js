// Teacher Projects Management System
class TeacherProjectsManager {
    constructor() {
        this.projects = [];
        this.filteredProjects = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.loadProjects();
        this.setupEventListeners();
        this.setupModalEventListeners();
        this.renderProjects();
    }

    checkAuthentication() {
        const user = JSON.parse(localStorage.getItem('agrilearn_user'));
        const token = localStorage.getItem('agrilearn_token');

        if (!user || !token) {
            window.location.href = 'login.html';
            return;
        }

        if (user.role !== 'teacher') {
            alert('Access denied. This page is only accessible to teachers.');
            window.location.href = 'student-dashboard.html';
            return;
        }
    }

    setupEventListeners() {
        // Create Project Button
        const createBtn = document.getElementById('create-project-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.openCreateProjectModal());
        }

        // Filter Buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.filterProjects(e.target.dataset.filter);
            });
        });

        // Search Functionality
        const searchInput = document.getElementById('project-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchProjects(e.target.value);
            });
        }
    }

    setActiveFilter(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    loadProjects() {
        // Sample teacher projects data
        this.projects = [
            {
                id: 1,
                title: "Organic Farming Research Project",
                course: "Sustainable Agriculture 101",
                description: "Students will research and present on organic farming techniques suitable for their local climate.",
                assignedDate: "2024-06-20",
                dueDate: "2024-07-15",
                status: "active",
                studentsAssigned: 25,
                submissionsReceived: 18,
                submissionsPending: 7,
                maxPoints: 100,
                averageGrade: 85
            },
            {
                id: 2,
                title: "Soil Analysis Lab Report",
                course: "Soil Science Fundamentals",
                description: "Comprehensive analysis of soil samples from different agricultural regions.",
                assignedDate: "2024-06-15",
                dueDate: "2024-07-10",
                status: "grading",
                studentsAssigned: 30,
                submissionsReceived: 30,
                submissionsPending: 0,
                maxPoints: 75,
                averageGrade: 78
            },
            {
                id: 3,
                title: "Crop Rotation Planning",
                course: "Advanced Farming Methods",
                description: "Design a 5-year crop rotation plan for sustainable farming practices.",
                assignedDate: "2024-06-01",
                dueDate: "2024-06-30",
                status: "completed",
                studentsAssigned: 20,
                submissionsReceived: 20,
                submissionsPending: 0,
                maxPoints: 120,
                averageGrade: 92
            },
            {
                id: 4,
                title: "Irrigation System Design",
                course: "Water Management in Agriculture",
                description: "Create an efficient irrigation system design for drought-prone areas.",
                assignedDate: "2024-07-01",
                dueDate: "2024-08-01",
                status: "draft",
                studentsAssigned: 0,
                submissionsReceived: 0,
                submissionsPending: 0,
                maxPoints: 100,
                averageGrade: 0
            },
            {
                id: 5,
                title: "Pest Management Case Study",
                course: "Integrated Pest Management",
                description: "Analyze a real-world pest management scenario and propose solutions.",
                assignedDate: "2024-06-10",
                dueDate: "2024-07-05",
                status: "overdue",
                studentsAssigned: 22,
                submissionsReceived: 15,
                submissionsPending: 7,
                maxPoints: 90,
                averageGrade: 73
            }
        ];

        this.filteredProjects = [...this.projects];
    }

    filterProjects(status) {
        this.currentFilter = status;

        switch(status) {
            case 'all':
                this.filteredProjects = [...this.projects];
                break;
            case 'pending':
                this.filteredProjects = this.projects.filter(p => p.status === 'active' && p.submissionsPending > 0);
                break;
            case 'in-progress':
                this.filteredProjects = this.projects.filter(p => p.status === 'active');
                break;
            case 'completed':
                this.filteredProjects = this.projects.filter(p => p.status === 'completed');
                break;
            case 'overdue':
                this.filteredProjects = this.projects.filter(p => p.status === 'overdue');
                break;
            default:
                this.filteredProjects = [...this.projects];
        }

        this.renderProjects();
    }

    searchProjects(query) {
        if (!query.trim()) {
            this.filterProjects(this.currentFilter);
            return;
        }

        const searchTerm = query.toLowerCase();
        this.filteredProjects = this.filteredProjects.filter(project =>
            project.title.toLowerCase().includes(searchTerm) ||
            project.course.toLowerCase().includes(searchTerm) ||
            project.description.toLowerCase().includes(searchTerm)
        );

        this.renderProjects();
    }

    renderProjects() {
        const container = document.getElementById('projects-container');

        if (this.filteredProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-project-diagram"></i>
                    <h3>No projects found</h3>
                    <p>No projects match your current filter criteria.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredProjects.map(project => this.createProjectCard(project)).join('');
        this.attachProjectEventListeners();
    }

    createProjectCard(project) {
        const statusClass = `status-${project.status}`;
        const statusText = this.getStatusText(project.status);
        const progressPercent = project.studentsAssigned > 0 ?
            Math.round((project.submissionsReceived / project.studentsAssigned) * 100) : 0;

        return `
            <div class="project-card ${statusClass}" data-project-id="${project.id}">
                <div class="project-header">
                    <div>
                        <div class="project-title">${project.title}</div>
                        <div class="project-course">${project.course}</div>
                    </div>
                    <span class="project-status ${statusClass}">${statusText}</span>
                </div>

                <div class="project-description">${project.description}</div>

                <div class="project-stats">
                    <div class="stat-item">
                        <span class="stat-label">Students:</span>
                        <span class="stat-value">${project.studentsAssigned}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Submissions:</span>
                        <span class="stat-value">${project.submissionsReceived}/${project.studentsAssigned}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Due:</span>
                        <span class="stat-value">${this.formatDate(project.dueDate)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Points:</span>
                        <span class="stat-value">${project.maxPoints}</span>
                    </div>
                </div>

                <div class="progress-section">
                    <div class="progress-label">
                        <span>Submission Progress</span>
                        <span>${progressPercent}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>

                <div class="project-actions">
                    ${this.getActionButtons(project)}
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        const statusMap = {
            'draft': 'Draft',
            'active': 'Active',
            'grading': 'Grading',
            'completed': 'Completed',
            'overdue': 'Overdue'
        };
        return statusMap[status] || status;
    }

    getActionButtons(project) {
        switch(project.status) {
            case 'draft':
                return `
                    <button type="button" class="btn btn-primary btn-sm edit-btn" data-project-id="${project.id}">
                        <i class="fas fa-edit"></i> Edit Project
                    </button>
                    <button type="button" class="btn btn-success btn-sm assign-btn" data-project-id="${project.id}">
                        <i class="fas fa-paper-plane"></i> Assign to Students
                    </button>
                    <button type="button" class="btn btn-danger btn-sm delete-btn" data-project-id="${project.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                `;
            case 'active':
                return `
                    <button type="button" class="btn btn-outline btn-sm view-submissions-btn" data-project-id="${project.id}">
                        <i class="fas fa-eye"></i> View Submissions (${project.submissionsReceived})
                    </button>
                    <button type="button" class="btn btn-primary btn-sm edit-btn" data-project-id="${project.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button type="button" class="btn btn-warning btn-sm remind-btn" data-project-id="${project.id}">
                        <i class="fas fa-bell"></i> Remind Students
                    </button>
                `;
            case 'grading':
                return `
                    <button type="button" class="btn btn-primary btn-sm grade-btn" data-project-id="${project.id}">
                        <i class="fas fa-star"></i> Grade Submissions
                    </button>
                    <button type="button" class="btn btn-outline btn-sm view-submissions-btn" data-project-id="${project.id}">
                        <i class="fas fa-eye"></i> View All Submissions
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm export-btn" data-project-id="${project.id}">
                        <i class="fas fa-download"></i> Export Grades
                    </button>
                `;
            case 'completed':
                return `
                    <button type="button" class="btn btn-outline btn-sm view-results-btn" data-project-id="${project.id}">
                        <i class="fas fa-chart-bar"></i> View Results
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm export-btn" data-project-id="${project.id}">
                        <i class="fas fa-download"></i> Export Report
                    </button>
                    <button type="button" class="btn btn-primary btn-sm duplicate-btn" data-project-id="${project.id}">
                        <i class="fas fa-copy"></i> Duplicate Project
                    </button>
                `;
            case 'overdue':
                return `
                    <button type="button" class="btn btn-warning btn-sm extend-btn" data-project-id="${project.id}">
                        <i class="fas fa-clock"></i> Extend Deadline
                    </button>
                    <button type="button" class="btn btn-outline btn-sm view-submissions-btn" data-project-id="${project.id}">
                        <i class="fas fa-eye"></i> View Submissions (${project.submissionsReceived})
                    </button>
                    <button type="button" class="btn btn-danger btn-sm close-btn" data-project-id="${project.id}">
                        <i class="fas fa-times"></i> Close Project
                    </button>
                `;
            default:
                return `
                    <button type="button" class="btn btn-outline btn-sm view-btn" data-project-id="${project.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                `;
        }
    }

    attachProjectEventListeners() {
        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.editProject(projectId);
            });
        });

        // Assign buttons
        document.querySelectorAll('.assign-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.assignProject(projectId);
            });
        });

        // View submissions buttons
        document.querySelectorAll('.view-submissions-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.viewSubmissions(projectId);
            });
        });

        // Grade buttons
        document.querySelectorAll('.grade-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.gradeSubmissions(projectId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.deleteProject(projectId);
            });
        });

        // Remind buttons
        document.querySelectorAll('.remind-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.remindStudents(projectId);
            });
        });

        // Export buttons
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.exportData(projectId);
            });
        });

        // Extend deadline buttons
        document.querySelectorAll('.extend-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.extendDeadline(projectId);
            });
        });

        // Duplicate buttons
        document.querySelectorAll('.duplicate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.duplicateProject(projectId);
            });
        });
    }

    // Action Methods
    openCreateProjectModal() {
        const modal = document.getElementById('create-project-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Set minimum due date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const minDate = tomorrow.toISOString().slice(0, 16);
            document.getElementById('project-due-date').min = minDate;

            // Focus on first input
            setTimeout(() => {
                document.getElementById('project-title').focus();
            }, 100);
        }
    }

    closeCreateProjectModal() {
        const modal = document.getElementById('create-project-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';

            // Reset form
            const form = document.getElementById('create-project-form');
            if (form) {
                form.reset();
                this.resetRequirements();
            }
        }
    }

    setupModalEventListeners() {
        const modal = document.getElementById('create-project-modal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-project');
        const saveDraftBtn = document.getElementById('save-draft');
        const form = document.getElementById('create-project-form');

        // Close modal events
        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeCreateProjectModal();
            });
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeCreateProjectModal();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                this.closeCreateProjectModal();
            }
        });

        // Save as draft
        saveDraftBtn.addEventListener('click', () => {
            this.saveProjectAsDraft();
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProject(true); // true = assign immediately
        });

        // Requirements management
        this.setupRequirementsHandlers();
    }

    setupRequirementsHandlers() {
        const addBtn = document.getElementById('add-requirement-btn');
        const requirementsList = document.getElementById('requirements-list');

        addBtn.addEventListener('click', () => {
            this.addRequirement();
        });

        // Handle remove buttons for existing requirements
        requirementsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-requirement')) {
                this.removeRequirement(e.target.closest('.requirement-item'));
            }
        });
    }

    addRequirement() {
        const requirementsList = document.getElementById('requirements-list');
        const newRequirement = document.createElement('div');
        newRequirement.className = 'requirement-item';
        newRequirement.innerHTML = `
            <input type="text" placeholder="Enter a requirement..." name="requirements[]">
            <button type="button" class="remove-requirement" title="Remove requirement">×</button>
        `;
        requirementsList.appendChild(newRequirement);

        // Focus on the new input
        newRequirement.querySelector('input').focus();
    }

    removeRequirement(requirementItem) {
        const requirementsList = document.getElementById('requirements-list');
        if (requirementsList.children.length > 1) {
            requirementItem.remove();
        } else {
            // Clear the input if it's the last one
            requirementItem.querySelector('input').value = '';
        }
    }

    resetRequirements() {
        const requirementsList = document.getElementById('requirements-list');
        requirementsList.innerHTML = `
            <div class="requirement-item">
                <input type="text" placeholder="Enter a requirement..." name="requirements[]">
                <button type="button" class="remove-requirement" title="Remove requirement">×</button>
            </div>
        `;
    }

    saveProjectAsDraft() {
        this.createProject(false); // false = save as draft
    }

    createProject(assignImmediately = false) {
        const form = document.getElementById('create-project-form');
        const formData = new FormData(form);

        // Validate required fields
        if (!this.validateProjectForm(formData)) {
            return;
        }

        // Collect requirements
        const requirements = [];
        const requirementInputs = form.querySelectorAll('input[name="requirements[]"]');
        requirementInputs.forEach(input => {
            if (input.value.trim()) {
                requirements.push(input.value.trim());
            }
        });

        // Create project object
        const projectData = {
            id: Math.max(...this.projects.map(p => p.id)) + 1,
            title: formData.get('title'),
            course: formData.get('course'),
            description: formData.get('description'),
            instructions: formData.get('instructions') || '',
            dueDate: formData.get('dueDate'),
            points: parseInt(formData.get('points')),
            category: formData.get('category'),
            difficulty: formData.get('difficulty'),
            requirements: requirements,
            submissionFormat: formData.get('submissionFormat'),
            maxFileSize: parseInt(formData.get('maxFileSize')),
            gradingRubric: formData.get('gradingRubric') || '',
            status: assignImmediately ? 'active' : 'draft',
            studentsAssigned: assignImmediately ? 25 : 0, // Example number
            submissionsReceived: 0,
            submissionsPending: assignImmediately ? 25 : 0,
            averageGrade: 0,
            createdAt: new Date().toISOString()
        };

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const saveDraftBtn = document.getElementById('save-draft');
        const originalSubmitText = submitBtn.textContent;
        const originalDraftText = saveDraftBtn.textContent;

        if (assignImmediately) {
            submitBtn.textContent = 'Creating...';
            submitBtn.disabled = true;
        } else {
            saveDraftBtn.textContent = 'Saving...';
            saveDraftBtn.disabled = true;
        }

        // Simulate API call
        setTimeout(() => {
            // Add to projects array
            this.projects.push(projectData);

            // Re-render projects
            this.filterProjects(this.currentFilter);

            // Close modal
            this.closeCreateProjectModal();

            // Show success message
            const message = assignImmediately
                ? `Project "${projectData.title}" created and assigned to students!`
                : `Project "${projectData.title}" saved as draft!`;

            this.showNotification(message, 'success');

            // Reset button states
            submitBtn.textContent = originalSubmitText;
            submitBtn.disabled = false;
            saveDraftBtn.textContent = originalDraftText;
            saveDraftBtn.disabled = false;

        }, 1500);
    }

    validateProjectForm(formData) {
        const requiredFields = ['title', 'course', 'description', 'dueDate', 'points'];
        const errors = [];

        requiredFields.forEach(field => {
            if (!formData.get(field) || formData.get(field).trim() === '') {
                errors.push(this.getFieldLabel(field));
            }
        });

        // Validate due date is in the future
        const dueDate = new Date(formData.get('dueDate'));
        const now = new Date();
        if (dueDate <= now) {
            errors.push('Due date must be in the future');
        }

        // Validate points
        const points = parseInt(formData.get('points'));
        if (isNaN(points) || points < 1 || points > 1000) {
            errors.push('Points must be between 1 and 1000');
        }

        if (errors.length > 0) {
            this.showNotification(`Please fix the following errors:\n• ${errors.join('\n• ')}`, 'error');
            return false;
        }

        return true;
    }

    getFieldLabel(fieldName) {
        const labels = {
            'title': 'Project Title',
            'course': 'Course',
            'description': 'Project Description',
            'dueDate': 'Due Date',
            'points': 'Point Value'
        };
        return labels[fieldName] || fieldName;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    padding: 1rem;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease-out;
                }
                .notification-success { border-left: 4px solid #4caf50; }
                .notification-error { border-left: 4px solid #f44336; }
                .notification-info { border-left: 4px solid #2196f3; }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .notification-close {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: #666;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        // Add to page
        document.body.appendChild(notification);

        // Close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    editProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            alert(`Edit Project: ${project.title}\n\nThis would open an edit modal with current project details.`);
        }
    }

    assignProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project && confirm(`Assign "${project.title}" to students?`)) {
            project.status = 'active';
            project.studentsAssigned = 25; // Example number
            this.renderProjects();
            alert('Project assigned to students successfully!');
        }
    }

    viewSubmissions(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            alert(`View Submissions: ${project.title}\n\nSubmissions: ${project.submissionsReceived}/${project.studentsAssigned}\nPending: ${project.submissionsPending}\n\nThis would show a detailed list of all student submissions.`);
        }
    }

    gradeSubmissions(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            alert(`Grade Submissions: ${project.title}\n\nThis would open the grading interface where you can:\n- View each submission\n- Assign grades and feedback\n- Track grading progress`);
        }
    }

    deleteProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project && confirm(`Delete "${project.title}"?\n\nThis action cannot be undone.`)) {
            this.projects = this.projects.filter(p => p.id !== projectId);
            this.filterProjects(this.currentFilter);
            alert('Project deleted successfully!');
        }
    }

    remindStudents(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            alert(`Send Reminder: ${project.title}\n\nThis would send email reminders to ${project.submissionsPending} students who haven't submitted yet.`);
        }
    }

    exportData(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            alert(`Export Data: ${project.title}\n\nThis would export:\n- Student submissions\n- Grades and feedback\n- Project statistics\n\nFormat: Excel/CSV`);
        }
    }

    extendDeadline(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            const newDate = prompt(`Extend deadline for "${project.title}"\n\nCurrent due date: ${project.dueDate}\nEnter new due date (YYYY-MM-DD):`);
            if (newDate) {
                project.dueDate = newDate;
                project.status = 'active';
                this.renderProjects();
                alert('Deadline extended successfully!');
            }
        }
    }

    duplicateProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            const newProject = {
                ...project,
                id: Math.max(...this.projects.map(p => p.id)) + 1,
                title: `${project.title} (Copy)`,
                status: 'draft',
                studentsAssigned: 0,
                submissionsReceived: 0,
                submissionsPending: 0,
                averageGrade: 0
            };
            this.projects.push(newProject);
            this.filterProjects(this.currentFilter);
            alert('Project duplicated successfully!');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize the Teacher Projects Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TeacherProjectsManager();
});