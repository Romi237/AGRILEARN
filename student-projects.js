// Student Projects Management
class StudentProjectsManager {
    constructor() {
        this.projects = [];
        this.filteredProjects = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.loadProjects();
        this.setupEventListeners();
        this.renderProjects();
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.filterProjects(e.target.dataset.status);
            });
        });

        // Search functionality
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
        // Sample projects data - mix of enrolled and preview projects
        this.projects = [
            {
                id: 1,
                title: "Organic Farming Techniques",
                course: "Sustainable Agriculture 101",
                description: "Research and implement organic farming methods for small-scale agriculture.",
                status: "assigned",
                enrolled: true,
                dueDate: "2024-07-15",
                assignedDate: "2024-06-20",
                progress: 0,
                teacher: "Dr. Sarah Johnson"
            },
            {
                id: 2,
                title: "Soil Composition Analysis",
                course: "Soil Science Fundamentals",
                description: "Analyze different soil types and their impact on crop growth.",
                status: "in-progress",
                enrolled: true,
                dueDate: "2024-07-10",
                assignedDate: "2024-06-15",
                progress: 65,
                teacher: "Prof. Michael Chen"
            },
            {
                id: 3,
                title: "Crop Rotation Planning",
                course: "Advanced Farming Methods",
                description: "Design a comprehensive crop rotation plan for sustainable farming.",
                status: "submitted",
                enrolled: true,
                dueDate: "2024-06-30",
                assignedDate: "2024-06-01",
                progress: 100,
                submittedDate: "2024-06-28",
                teacher: "Dr. Emily Rodriguez"
            },
            {
                id: 4,
                title: "Irrigation System Design",
                course: "Water Management in Agriculture",
                description: "Create an efficient irrigation system for drought-prone areas.",
                status: "preview",
                enrolled: false,
                dueDate: "2024-08-01",
                assignedDate: "2024-07-01",
                progress: 0,
                teacher: "Dr. James Wilson",
                previewAvailable: true
            },
            {
                id: 5,
                title: "Pest Control Strategies",
                course: "Integrated Pest Management",
                description: "Develop eco-friendly pest control methods for organic farming.",
                status: "preview",
                enrolled: false,
                dueDate: "2024-08-15",
                assignedDate: "2024-07-15",
                progress: 0,
                teacher: "Dr. Lisa Thompson",
                previewAvailable: true
            },
            {
                id: 6,
                title: "Greenhouse Management",
                course: "Controlled Environment Agriculture",
                description: "Optimize greenhouse conditions for maximum crop yield.",
                status: "graded",
                enrolled: true,
                dueDate: "2024-06-15",
                assignedDate: "2024-05-20",
                progress: 100,
                submittedDate: "2024-06-14",
                grade: "A",
                feedback: "Excellent work on greenhouse optimization techniques!",
                teacher: "Dr. Robert Kim"
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
            case 'enrolled':
                this.filteredProjects = this.projects.filter(p => p.enrolled);
                break;
            case 'preview':
                this.filteredProjects = this.projects.filter(p => !p.enrolled && p.previewAvailable);
                break;
            case 'assigned':
                this.filteredProjects = this.projects.filter(p => p.status === 'assigned' && p.enrolled);
                break;
            case 'in-progress':
                this.filteredProjects = this.projects.filter(p => p.status === 'in-progress' && p.enrolled);
                break;
            case 'submitted':
                this.filteredProjects = this.projects.filter(p => p.status === 'submitted' && p.enrolled);
                break;
            case 'graded':
                this.filteredProjects = this.projects.filter(p => p.status === 'graded' && p.enrolled);
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
            project.description.toLowerCase().includes(searchTerm) ||
            project.teacher.toLowerCase().includes(searchTerm)
        );
        
        this.renderProjects();
    }

    renderProjects() {
        const container = document.getElementById('projects-container');
        
        if (this.filteredProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
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
        const statusClass = project.enrolled ? `status-${project.status}` : 'status-preview';
        const statusText = project.enrolled ? project.status.replace('-', ' ') : 'Preview Available';
        
        const progressSection = project.enrolled && project.status !== 'preview' ? `
            <div class="project-progress">
                <div class="progress-label">
                    <span>Progress</span>
                    <span>${project.progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.progress}%"></div>
                </div>
            </div>
        ` : '';

        const gradeSection = project.grade ? `
            <div class="project-meta">
                <span><strong>Grade:</strong> ${project.grade}</span>
                <span><strong>Feedback:</strong> ${project.feedback}</span>
            </div>
        ` : '';

        const actionButtons = this.getActionButtons(project);

        return `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-header">
                    <div>
                        <div class="project-title">${project.title}</div>
                        <div class="project-course">${project.course}</div>
                    </div>
                    <span class="project-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="project-description">${project.description}</div>
                
                <div class="project-meta">
                    <span><i class="fas fa-user"></i> ${project.teacher}</span>
                    <span><i class="fas fa-calendar"></i> Due: ${this.formatDate(project.dueDate)}</span>
                </div>
                
                ${progressSection}
                ${gradeSection}
                
                <div class="project-actions">
                    ${actionButtons}
                </div>
            </div>
        `;
    }

    getActionButtons(project) {
        if (!project.enrolled) {
            return `
                <button type="button" class="btn btn-outline btn-sm preview-btn" data-project-id="${project.id}">
                    <i class="fas fa-eye"></i> Preview Project
                </button>
                <button type="button" class="btn btn-primary btn-sm enroll-btn" data-course="${project.course}">
                    <i class="fas fa-plus"></i> Enroll in Course
                </button>
            `;
        }

        switch(project.status) {
            case 'assigned':
                return `
                    <button type="button" class="btn btn-primary btn-sm start-btn" data-project-id="${project.id}">
                        <i class="fas fa-play"></i> Start Project
                    </button>
                    <button type="button" class="btn btn-outline btn-sm view-btn" data-project-id="${project.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                `;
            case 'in-progress':
                return `
                    <button type="button" class="btn btn-primary btn-sm continue-btn" data-project-id="${project.id}">
                        <i class="fas fa-edit"></i> Continue Work
                    </button>
                    <button type="button" class="btn btn-success btn-sm submit-btn" data-project-id="${project.id}">
                        <i class="fas fa-upload"></i> Submit Project
                    </button>
                `;
            case 'submitted':
                return `
                    <button type="button" class="btn btn-outline btn-sm view-btn" data-project-id="${project.id}">
                        <i class="fas fa-eye"></i> View Submission
                    </button>
                    <span class="text-muted">Waiting for grade...</span>
                `;
            case 'graded':
                return `
                    <button type="button" class="btn btn-outline btn-sm view-btn" data-project-id="${project.id}">
                        <i class="fas fa-eye"></i> View Results
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm download-btn" data-project-id="${project.id}">
                        <i class="fas fa-download"></i> Download
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
        // Preview buttons
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.previewProject(projectId);
            });
        });

        // Enroll buttons
        document.querySelectorAll('.enroll-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const course = e.target.closest('button').dataset.course;
                this.enrollInCourse(course);
            });
        });

        // Start project buttons
        document.querySelectorAll('.start-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.startProject(projectId);
            });
        });

        // Continue work buttons
        document.querySelectorAll('.continue-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.continueProject(projectId);
            });
        });

        // Submit buttons
        document.querySelectorAll('.submit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.submitProject(projectId);
            });
        });

        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = parseInt(e.target.closest('button').dataset.projectId);
                this.viewProject(projectId);
            });
        });
    }

    previewProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            alert(`Preview: ${project.title}\n\nThis is a preview of the project from "${project.course}". To work on this project, you need to enroll in the course first.`);
        }
    }

    enrollInCourse(courseName) {
        alert(`Redirecting to course enrollment for: ${courseName}`);
        // In a real app, this would redirect to the marketplace or course enrollment page
        window.location.href = 'marketplace.html';
    }

    startProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            project.status = 'in-progress';
            project.progress = 10;
            this.renderProjects();
            alert(`Started working on: ${project.title}`);
        }
    }

    continueProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            alert(`Continuing work on: ${project.title}\n\nCurrent progress: ${project.progress}%`);
        }
    }

    submitProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project && confirm(`Submit "${project.title}" for grading?`)) {
            project.status = 'submitted';
            project.progress = 100;
            project.submittedDate = new Date().toISOString().split('T')[0];
            this.renderProjects();
            alert('Project submitted successfully!');
        }
    }

    viewProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            alert(`Viewing: ${project.title}\n\nStatus: ${project.status}\nProgress: ${project.progress}%`);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StudentProjectsManager();
});
