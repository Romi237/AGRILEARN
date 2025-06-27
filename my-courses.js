document.addEventListener('DOMContentLoaded', () => {
  // Debug function to check element existence
  function debugElements() {
    const requiredElements = [
      'courses-container',
      'create-course-btn', 
      'open-builder-btn',
      'course-modal',
      'confirm-modal',
      'course-form',
      'course-builder-modal'
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

  // DOM Elements with null checks
  const coursesContainer = document.getElementById('courses-container');
  const createCourseBtn = document.getElementById('create-course-btn');
  const openBuilderBtn = document.getElementById('open-builder-btn');
  
  // Check for absolutely required elements
  if (!coursesContainer || !createCourseBtn || !openBuilderBtn) {
    console.error('Critical DOM elements missing - cannot initialize application');
    
    // Show error message if courses container exists
    if (coursesContainer) {
      coursesContainer.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Application Error</h3>
          <p>Required components failed to load.</p>
          <p>Please refresh the page or contact support.</p>
        </div>
      `;
    }
    
    return; // Stop execution if critical elements are missing
  }

  // Proceed with initialization since required elements exist
  console.log('All required elements found - initializing application');
  
  // Rest of your DOM elements (non-critical)
  const filterBtns = document.querySelectorAll('.filter-btn');
  const courseModal = document.getElementById('course-modal');
  const confirmModal = document.getElementById('confirm-modal');
  const closeBtns = document.querySelectorAll('.close-btn, #cancel-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  const courseForm = document.getElementById('course-form');
  const modalTitle = document.getElementById('modal-title');
  
  // Course Builder Elements
  const courseBuilderModal = document.getElementById('course-builder-modal');
  const closeBuilderBtn = document.getElementById('close-builder');
  const chaptersContainer = document.getElementById('chapters-container');
  const addChapterBtn = document.getElementById('add-chapter-btn');
  const saveCourseBtn = document.getElementById('save-course-btn');
  
  // Templates
  const chapterTemplate = document.getElementById('chapter-template');
  const lessonTemplate = document.getElementById('lesson-template');
  const videoTemplate = document.getElementById('video-template');
  const pdfTemplate = document.getElementById('pdf-template');
  const quizTemplate = document.getElementById('quiz-template');
  const questionTemplate = document.getElementById('question-template');
  const examTemplate = document.getElementById('exam-template');

  // State
  let currentCourseId = null;
  let courses = [];
  let currentFilter = 'all';

  // Initialize application
  checkAuth();
  loadCourses();

  // Debug function to test Course Builder elements
  window.debugCourseBuilder = function() {
    console.log('=== Course Builder Debug ===');
    console.log('Modal:', !!courseBuilderModal);
    console.log('Title input:', !!document.getElementById('builder-course-title'));
    console.log('Description input:', !!document.getElementById('builder-course-description'));
    console.log('Category select:', !!document.getElementById('builder-course-category'));
    console.log('Level select:', !!document.getElementById('builder-course-level'));
    console.log('Chapters container:', !!chaptersContainer);
    console.log('Save button:', !!saveCourseBtn);

    // Check if Course Information section is visible
    const courseInfoSection = document.querySelector('.builder-section');
    if (courseInfoSection) {
      const rect = courseInfoSection.getBoundingClientRect();
      console.log('Course Info Section position:', rect);
      console.log('Is visible:', rect.top >= 0 && rect.bottom <= window.innerHeight);
    }

    // Test opening Course Builder
    if (courseBuilderModal) {
      openCourseBuilder();
    }
  };

  // Test function to create a sample course
  window.testCourseCreation = function() {
    console.log('=== Testing Course Creation ===');

    // Open Course Builder
    openCourseBuilder();

    // Fill in form data
    setTimeout(() => {
      const titleInput = document.getElementById('builder-course-title');
      const descInput = document.getElementById('builder-course-description');
      const categorySelect = document.getElementById('builder-course-category');
      const levelSelect = document.getElementById('builder-course-level');

      if (titleInput) titleInput.value = 'Test Course ' + Date.now();
      if (descInput) descInput.value = 'This is a comprehensive test course created to verify the Course Builder functionality. It includes detailed information about agricultural practices and modern farming techniques that will help students learn effectively.';
      if (categorySelect) categorySelect.value = 'organic-farming';
      if (levelSelect) levelSelect.value = 'beginner';

      console.log('Form filled with test data');

      // Add a test chapter
      if (addChapterBtn) {
        addChapterBtn.click();
        console.log('Test chapter added');
      }

    }, 500);
  };
  setupEventListeners();

  // Check if Course Builder was open and restore state
  checkAndRestoreCourseBuilder();

  function setupEventListeners() {
    // Main interface
    createCourseBtn.addEventListener('click', () => openCourseModal());
    
    if (openBuilderBtn) {
      openBuilderBtn.addEventListener('click', () => openCourseBuilder());
    }
    
    // Filter buttons
    if (filterBtns.length > 0) {
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.status;
          filterCourses(currentFilter);
        });
      });
    }

     // Add close builder button listener
  if (closeBuilderBtn) {
    closeBuilderBtn.addEventListener('click', () => {
      if (courseBuilderModal) courseBuilderModal.style.display = 'none';
    });
  }

    
    // Modal controls
    if (closeBtns.length > 0) {
      closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (courseModal) courseModal.style.display = 'none';
          if (confirmModal) confirmModal.style.display = 'none';
          if (courseBuilderModal) courseBuilderModal.style.display = 'none';
        });
      });
    }
    
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => {
        if (confirmModal) confirmModal.style.display = 'none';
      });
    }
    
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', deleteCourse);
    }
    
    // Form submissions
    if (courseForm) {
      courseForm.addEventListener('submit', handleCourseSubmit);
    }
    
    if (saveCourseBtn) {
      saveCourseBtn.addEventListener('click', saveCourseFromBuilder);
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      if (courseModal && e.target === courseModal) courseModal.style.display = 'none';
      if (confirmModal && e.target === confirmModal) confirmModal.style.display = 'none';
      if (courseBuilderModal && e.target === courseBuilderModal) courseBuilderModal.style.display = 'none';
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
    if (coursesContainer) {
      coursesContainer.innerHTML = loading ? `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Loading courses...</p>
        </div>
      ` : '';
    }
  }

  async function loadCourses() {
    setLoading(true);
    try {
      const token = localStorage.getItem('agrilearn_token');
      const response = await fetch('http://localhost:5000/courses?teacher=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load courses');
      
      const data = await response.json();
      courses = data.courses;
      renderCourses(courses);
    } catch (error) {
      console.error('Error loading courses:', error);
      showErrorState(error);
    } finally {
      setLoading(false);
    }
  }

  function showErrorState(error) {
    if (coursesContainer) {
      coursesContainer.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error loading courses</h3>
          <p>${error.message}</p>
          <button class="retry-btn" id="retry-load-courses">Retry</button>
        </div>
      `;
      
      const retryBtn = document.getElementById('retry-load-courses');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => loadCourses());
      }
    }
  }

  function renderCourses(coursesToRender) {
    if (!coursesContainer) return;
    
    coursesContainer.innerHTML = '';
    
    if (coursesToRender.length === 0) {
      coursesContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-book-open"></i>
          <h3>No courses found</h3>
          <p>${getEmptyStateMessage(currentFilter)}</p>
          ${currentFilter === 'all' ? '<button class="create-btn" id="empty-state-create">Create Course</button>' : ''}
        </div>
      `;
      
      if (currentFilter === 'all') {
        const emptyStateBtn = document.getElementById('empty-state-create');
        if (emptyStateBtn) {
          emptyStateBtn.addEventListener('click', () => openCourseModal());
        }
      }
      return;
    }
    
    coursesToRender.forEach(course => {
      const courseCard = document.createElement('div');
      courseCard.className = `course-card ${course.isArchived ? 'archived' : ''}`;
      
      // Use default image path that works in production
      const imagePath = course.image ? course.image : './images/course-placeholder.jpg';
      
      courseCard.innerHTML = `
        <div class="course-image" style="background-image: url('${imagePath}')">
          ${course.isPublished ? '<div class="course-badge published">Published</div>' : ''}
          ${course.isArchived ? '<div class="course-badge archived">Archived</div>' : ''}
        </div>
        <div class="course-content">
          <div class="course-header">
            <h3 class="course-title">${course.title}</h3>
            <span class="enrollment-count">
              <i class="fas fa-users"></i> ${course.enrolledStudents?.length || 0}
            </span>
          </div>
          <div class="course-meta">
            <span><i class="fas fa-layer-group"></i> ${formatCategory(course.category)}</span>
            <span><i class="fas fa-signal"></i> ${capitalizeFirstLetter(course.level)}</span>
            <span><i class="far fa-clock"></i> ${course.duration || 'N/A'}</span>
          </div>
          <p class="course-description">${truncateText(course.shortDescription || course.description, 100)}</p>
          <div class="course-actions">
            <button class="action-btn preview-btn" data-id="${course._id}" title="Preview">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn edit-btn" data-id="${course._id}" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn stats-btn" data-id="${course._id}" title="Statistics">
              <i class="fas fa-chart-line"></i>
            </button>
            <button class="action-btn delete-btn" data-id="${course._id}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      coursesContainer.appendChild(courseCard);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const courseId = e.currentTarget.dataset.id;
        editCourse(courseId);
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentCourseId = e.currentTarget.dataset.id;
        if (confirmModal) confirmModal.style.display = 'block';
      });
    });
    
    document.querySelectorAll('.preview-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const courseId = e.currentTarget.dataset.id;
        window.open(`course-preview.html?id=${courseId}`, '_blank');
      });
    });

    document.querySelectorAll('.stats-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const courseId = e.currentTarget.dataset.id;
        showCourseStatistics(courseId);
      });
    });
  }

  async function showCourseStatistics(courseId) {
    try {
      const token = localStorage.getItem('agrilearn_token');

      // Fetch course details with statistics
      const courseResponse = await fetch(`http://localhost:5000/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!courseResponse.ok) throw new Error('Failed to load course details');
      const courseData = await courseResponse.json();
      const course = courseData.course;

      // Fetch assignments for this course
      const assignmentsResponse = await fetch(`http://localhost:5000/assignments?course=${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let assignments = [];
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        assignments = assignmentsData.assignments || [];
      }

      // Calculate statistics
      const stats = {
        enrolledStudents: course.enrolledStudents?.length || 0,
        totalAssignments: assignments.length,
        pendingSubmissions: assignments.reduce((total, assignment) => {
          return total + (assignment.submissions?.filter(s => s.status === 'submitted').length || 0);
        }, 0),
        averageRating: course.averageRating || 0,
        totalReviews: course.reviews?.length || 0,
        chaptersCount: course.curriculum?.length || 0,
        lessonsCount: course.curriculum?.reduce((total, chapter) => total + (chapter.lessons?.length || 0), 0) || 0
      };

      // Create and show statistics modal
      showStatisticsModal(course, stats);

    } catch (error) {
      console.error('Error loading course statistics:', error);
      showAlert('Failed to load course statistics', 'error');
    }
  }

  function showStatisticsModal(course, stats) {
    // Create modal if it doesn't exist
    let statsModal = document.getElementById('stats-modal');
    if (!statsModal) {
      statsModal = document.createElement('div');
      statsModal.id = 'stats-modal';
      statsModal.className = 'modal';
      document.body.appendChild(statsModal);
    }

    statsModal.innerHTML = `
      <div class="modal-content" style="max-width: 800px;">
        <span class="close-btn">&times;</span>
        <h2><i class="fas fa-chart-line"></i> Course Statistics</h2>
        <h3>${course.title}</h3>

        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
          <div class="stat-card">
            <div class="stat-number">${stats.enrolledStudents}</div>
            <div class="stat-label">Enrolled Students</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.totalAssignments}</div>
            <div class="stat-label">Total Assignments</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.pendingSubmissions}</div>
            <div class="stat-label">Pending Reviews</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.averageRating.toFixed(1)}</div>
            <div class="stat-label">Average Rating</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.totalReviews}</div>
            <div class="stat-label">Total Reviews</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.chaptersCount}</div>
            <div class="stat-label">Chapters</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.lessonsCount}</div>
            <div class="stat-label">Lessons</div>
          </div>
        </div>

        <div class="stats-actions" style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
          <a href="students.html?course=${course._id}" class="btn btn-primary">
            <i class="fas fa-users"></i> Manage Students
          </a>
          <a href="assignments.html?course=${course._id}" class="btn btn-outline">
            <i class="fas fa-tasks"></i> View Assignments
          </a>
          <a href="course-detail.html?id=${course._id}" class="btn btn-outline">
            <i class="fas fa-eye"></i> View Course
          </a>
        </div>
      </div>
    `;

    // Add close functionality
    const closeBtn = statsModal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
      statsModal.style.display = 'none';
    });

    // Close on outside click
    statsModal.addEventListener('click', (e) => {
      if (e.target === statsModal) {
        statsModal.style.display = 'none';
      }
    });

    statsModal.style.display = 'block';
  }

  function filterCourses(status) {
    let filteredCourses = [...courses];

    switch(status) {
      case 'published':
        filteredCourses = courses.filter(c => c.isPublished && !c.isArchived);
        break;
      case 'draft':
        filteredCourses = courses.filter(c => !c.isPublished && !c.isArchived);
        break;
      case 'archived':
        filteredCourses = courses.filter(c => c.isArchived);
        break;
      case 'all':
      default:
        filteredCourses = [...courses];
    }

    renderCourses(filteredCourses);
  }

  function openCourseModal(course = null) {
    if (course) {
      modalTitle.textContent = 'Edit Course';
      document.getElementById('course-id').value = course._id;
      document.getElementById('course-title').value = course.title;
      document.getElementById('course-category').value = course.category;
      document.getElementById('course-level').value = course.level;
      document.getElementById('course-description').value = course.description;
      document.getElementById('course-image').value = course.image || '';
    } else {
      modalTitle.textContent = 'Create New Course';
      courseForm.reset();
    }
    
    courseModal.style.display = 'block';
  }

  async function handleCourseSubmit(e) {
    e.preventDefault();
    
    const courseData = {
      title: document.getElementById('course-title').value.trim(),
      category: document.getElementById('course-category').value,
      level: document.getElementById('course-level').value,
      description: document.getElementById('course-description').value.trim(),
      image: document.getElementById('course-image').value.trim() || 'images/course-placeholder.jpg'
    };
    
    const courseId = document.getElementById('course-id').value;
    const isEdit = !!courseId;
    
    try {
      const token = localStorage.getItem('agrilearn_token');
      const url = isEdit 
        ? `http://localhost:5000/courses/${courseId}`
        : 'http://localhost:5000/courses';
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save course');
      }
      
      showAlert(`Course ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
      courseModal.style.display = 'none';
      loadCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      showAlert(error.message, 'error');
    }
  }

  async function editCourse(courseId) {
    try {
      const token = localStorage.getItem('agrilearn_token');
      const response = await fetch(`http://localhost:5000/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load course details');
      
      const { course } = await response.json();
      openCourseModal(course);
    } catch (error) {
      console.error('Error editing course:', error);
      showAlert('Failed to load course details', 'error');
    }
  }

  async function deleteCourse() {
    try {
      const token = localStorage.getItem('agrilearn_token');
      const response = await fetch(`http://localhost:5000/courses/${currentCourseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete course');
      
      showAlert('Course deleted successfully', 'success');
      confirmModal.style.display = 'none';
      loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      showAlert('Failed to delete course', 'error');
    }
  }

  // ======================== COURSE BUILDER FUNCTIONS ========================
  function openCourseBuilder(course = null) {
    console.log('Opening Course Builder...');
    courseBuilderModal.style.display = 'block';
    chaptersContainer.innerHTML = '';

    // Force modal to be visible and scroll to top
    setTimeout(() => {
      const modalContent = courseBuilderModal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.scrollTop = 0;
        modalContent.style.display = 'block';
      }

      // Ensure Course Information section is visible
      const courseInfoSection = document.querySelector('.builder-section');
      if (courseInfoSection) {
        courseInfoSection.style.display = 'block';
        courseInfoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    // Ensure all form elements are visible and accessible
    const titleInput = document.getElementById('builder-course-title');
    const descInput = document.getElementById('builder-course-description');
    const categorySelect = document.getElementById('builder-course-category');
    const levelSelect = document.getElementById('builder-course-level');

    console.log('Form elements found:', {
      title: !!titleInput,
      description: !!descInput,
      category: !!categorySelect,
      level: !!levelSelect
    });

    // Focus on the title input to ensure the section is visible
    if (titleInput) {
      setTimeout(() => {
        titleInput.focus();
        titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('Title input focused and scrolled into view');
      }, 200);
    } else {
      console.error('Title input not found!');
    }

    // Additional debugging
    setTimeout(() => {
      const allSections = document.querySelectorAll('.builder-section');
      console.log('All builder sections found:', allSections.length);
      allSections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        console.log(`Section ${index}:`, {
          visible: rect.top >= 0 && rect.bottom <= window.innerHeight,
          position: rect,
          display: getComputedStyle(section).display,
          visibility: getComputedStyle(section).visibility
        });
      });
    }, 300);

    if (course) {
      document.getElementById('builder-course-title').value = course.title;
      document.getElementById('builder-course-description').value = course.description;
      document.getElementById('builder-course-category').value = course.category || '';
      document.getElementById('builder-course-level').value = course.level || '';
      currentCourseId = course._id;
      // Save to localStorage for persistence
      saveCourseBuilderState();
    } else {
      // Check if there's saved state to restore
      const savedState = loadCourseBuilderState();
      if (savedState) {
        restoreCourseBuilderState(savedState);
      } else {
        document.getElementById('builder-course-title').value = '';
        document.getElementById('builder-course-description').value = '';
        document.getElementById('builder-course-category').value = '';
        document.getElementById('builder-course-level').value = '';
        currentCourseId = null;
      }
    }

    // Auto-save form data on input changes
    setupAutoSave();
  }

  function saveCourseBuilderState() {
    const state = {
      title: document.getElementById('builder-course-title').value,
      description: document.getElementById('builder-course-description').value,
      category: document.getElementById('builder-course-category').value,
      level: document.getElementById('builder-course-level').value,
      currentCourseId: currentCourseId,
      chapters: buildChaptersStateFromDOM(),
      timestamp: Date.now()
    };
    localStorage.setItem('agrilearn_course_builder_state', JSON.stringify(state));

    // Show auto-save indicator
    showAutoSaveIndicator();
  }

  function showAutoSaveIndicator() {
    // Remove existing indicator
    const existing = document.getElementById('auto-save-indicator');
    if (existing) existing.remove();

    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'auto-save-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 12px;
      z-index: 10001;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    indicator.innerHTML = '<i class="fas fa-check"></i> Auto-saved';

    document.body.appendChild(indicator);

    // Animate in
    setTimeout(() => indicator.style.opacity = '1', 100);

    // Animate out and remove
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(indicator)) {
          document.body.removeChild(indicator);
        }
      }, 300);
    }, 2000);
  }

  function loadCourseBuilderState() {
    const saved = localStorage.getItem('agrilearn_course_builder_state');
    if (saved) {
      const state = JSON.parse(saved);
      // Only restore if saved within last 24 hours
      if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
        return state;
      }
    }
    return null;
  }

  function clearCourseBuilderState() {
    localStorage.removeItem('agrilearn_course_builder_state');
  }

  function restoreCourseBuilderState(state) {
    document.getElementById('builder-course-title').value = state.title || '';
    document.getElementById('builder-course-description').value = state.description || '';
    document.getElementById('builder-course-category').value = state.category || '';
    document.getElementById('builder-course-level').value = state.level || '';
    currentCourseId = state.currentCourseId || null;

    // Restore chapters
    if (state.chapters && state.chapters.length > 0) {
      state.chapters.forEach(chapterState => {
        addChapterFromState(chapterState);
      });
    }
  }

  function setupAutoSave() {
    // Auto-save on title, description, category, and level changes
    const titleInput = document.getElementById('builder-course-title');
    const descInput = document.getElementById('builder-course-description');
    const categorySelect = document.getElementById('builder-course-category');
    const levelSelect = document.getElementById('builder-course-level');

    titleInput.addEventListener('input', debounce(saveCourseBuilderState, 1000));
    descInput.addEventListener('input', debounce(saveCourseBuilderState, 1000));
    categorySelect.addEventListener('change', debounce(saveCourseBuilderState, 500));
    levelSelect.addEventListener('change', debounce(saveCourseBuilderState, 500));
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

  function checkAndRestoreCourseBuilder() {
    const savedState = loadCourseBuilderState();
    if (savedState && (savedState.title || savedState.description || (savedState.chapters && savedState.chapters.length > 0))) {
      // Show a notification that there's unsaved work
      const restoreNotification = document.createElement('div');
      restoreNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 350px;
        color: #856404;
      `;

      restoreNotification.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <i class="fas fa-exclamation-triangle" style="margin-right: 8px; color: #f39c12;"></i>
          <strong>Unsaved Course Work Found</strong>
        </div>
        <p style="margin: 0 0 15px 0; font-size: 14px;">
          You have unsaved changes in the Course Builder. Would you like to restore them?
        </p>
        <div style="display: flex; gap: 10px;">
          <button id="restore-work-btn" class="btn btn-primary" style="font-size: 12px; padding: 5px 10px;">
            Restore Work
          </button>
          <button id="discard-work-btn" class="btn btn-outline" style="font-size: 12px; padding: 5px 10px;">
            Discard
          </button>
        </div>
      `;

      document.body.appendChild(restoreNotification);

      // Handle restore button
      document.getElementById('restore-work-btn').addEventListener('click', () => {
        openCourseBuilder();
        document.body.removeChild(restoreNotification);
      });

      // Handle discard button
      document.getElementById('discard-work-btn').addEventListener('click', () => {
        clearCourseBuilderState();
        document.body.removeChild(restoreNotification);
      });

      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (document.body.contains(restoreNotification)) {
          document.body.removeChild(restoreNotification);
        }
      }, 10000);
    }
  }

  function buildChaptersStateFromDOM() {
    const chapters = [];
    Array.from(chaptersContainer.children).forEach(chapterCard => {
      const chapterState = {
        title: chapterCard.querySelector('.chapter-title')?.value || '',
        description: chapterCard.querySelector('.chapter-description')?.value || '',
        lessons: []
      };

      const lessonsContainer = chapterCard.querySelector('.lessons-container');
      if (lessonsContainer) {
        Array.from(lessonsContainer.children).forEach(lessonCard => {
          const lessonState = {
            title: lessonCard.querySelector('.lesson-title')?.value || '',
            description: lessonCard.querySelector('.lesson-description')?.value || ''
          };
          chapterState.lessons.push(lessonState);
        });
      }

      chapters.push(chapterState);
    });
    return chapters;
  }

  function addChapterFromState(chapterState) {
    const chapterCount = chaptersContainer.children.length + 1;
    const chapterClone = chapterTemplate.content.cloneNode(true);

    // Set chapter number and data
    chapterClone.querySelector('.chapter-number').textContent = chapterCount;
    chapterClone.querySelector('.chapter-title').value = chapterState.title || '';
    chapterClone.querySelector('.chapter-description').value = chapterState.description || '';

    // Add delete event
    chapterClone.querySelector('.delete-chapter').addEventListener('click', (e) => {
      e.target.closest('.chapter-card').remove();
      updateChapterNumbers();
      saveCourseBuilderState(); // Auto-save after deletion
    });

    // Add lesson event
    chapterClone.querySelector('.add-lesson-btn').addEventListener('click', (e) => {
      addLessonToChapter(e.target.closest('.chapter-card'));
    });

    // Add exam to chapter
    const examClone = examTemplate.content.cloneNode(true);
    chapterClone.querySelector('.chapter-exam').appendChild(examClone);

    chaptersContainer.appendChild(chapterClone);

    // Get reference to the actual appended chapter
    const addedChapter = chaptersContainer.lastElementChild;

    // Setup exam questions using the appended chapter reference
    setupExamQuestions(addedChapter.querySelector('.exam-questions-container'));

    // Restore lessons
    if (chapterState.lessons && chapterState.lessons.length > 0) {
      chapterState.lessons.forEach(lessonState => {
        addLessonToChapterFromState(addedChapter, lessonState);
      });
    }

    // Add auto-save listeners to inputs using the appended chapter reference
    const titleInput = addedChapter.querySelector('.chapter-title');
    const descInput = addedChapter.querySelector('.chapter-description');

    if (titleInput) {
      titleInput.addEventListener('input', debounce(saveCourseBuilderState, 1000));
    } else {
      console.error('Chapter title input not found in appended chapter');
    }

    if (descInput) {
      descInput.addEventListener('input', debounce(saveCourseBuilderState, 1000));
    } else {
      console.error('Chapter description input not found in appended chapter');
    }
  }

  // Add chapter to builder
  addChapterBtn.addEventListener('click', () => {
    addChapterFromState({});
    saveCourseBuilderState(); // Auto-save after adding chapter
  });

  function addLessonToChapterFromState(chapterCard, lessonState = {}) {
    const lessonsContainer = chapterCard.querySelector('.lessons-container');
    const lessonCount = lessonsContainer.children.length + 1;
    const lessonClone = lessonTemplate.content.cloneNode(true);

    // Set lesson data
    lessonClone.querySelector('.lesson-title').value = lessonState.title || '';
    lessonClone.querySelector('.lesson-description').value = lessonState.description || '';

    // Add auto-save listeners
    const titleInput = lessonClone.querySelector('.lesson-title');
    const descInput = lessonClone.querySelector('.lesson-description');
    titleInput.addEventListener('input', debounce(saveCourseBuilderState, 1000));
    descInput.addEventListener('input', debounce(saveCourseBuilderState, 1000));

    // Continue with existing logic...
    lessonClone.querySelector('.lesson-number').textContent = lessonCount;

    // Add delete event
    lessonClone.querySelector('.delete-lesson').addEventListener('click', (e) => {
      e.target.closest('.lesson-card').remove();
      updateLessonNumbers(lessonsContainer);
      saveCourseBuilderState(); // Auto-save after deletion
    });

    // Add content button events
    const addVideoBtn = lessonClone.querySelector('.add-video-btn');
    const addPdfBtn = lessonClone.querySelector('.add-pdf-btn');
    const addQuizBtn = lessonClone.querySelector('.add-quiz-btn');

    if (addVideoBtn) {
      addVideoBtn.addEventListener('click', (e) => {
        addContentToLesson(e.target.closest('.lesson-card'), 'video');
      });
    }

    if (addPdfBtn) {
      addPdfBtn.addEventListener('click', (e) => {
        addContentToLesson(e.target.closest('.lesson-card'), 'pdf');
      });
    }

    if (addQuizBtn) {
      addQuizBtn.addEventListener('click', (e) => {
        addContentToLesson(e.target.closest('.lesson-card'), 'quiz');
      });
    }

    lessonsContainer.appendChild(lessonClone);
    updateLessonNumbers(lessonsContainer);
  }

  function addLessonToChapter(chapterCard) {
    addLessonToChapterFromState(chapterCard, {});
    saveCourseBuilderState(); // Auto-save after adding lesson
  }

  function addContentToLesson(lessonCard, type) {
    const container = lessonCard.querySelector('.content-items');
    let template;
    switch(type) {
      case 'video': template = videoTemplate; break;
      case 'pdf': template = pdfTemplate; break;
      case 'quiz': template = quizTemplate; break;
    }
    
    const contentClone = template.content.cloneNode(true);
    contentClone.querySelector('.delete-content').addEventListener('click', (e) => {
      e.target.closest('.content-item').remove();
    });

    if (type === 'quiz') {
      setupQuizQuestions(contentClone.querySelector('.questions-container'));
    }

    // Setup file upload functionality for video and PDF content
    if (type === 'video') {
      setupVideoUpload(contentClone);
    } else if (type === 'pdf') {
      setupPdfUpload(contentClone);
    }

    // Add auto-save listeners
    const inputs = contentClone.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('input', debounce(saveCourseBuilderState, 1000));
    });

    container.appendChild(contentClone);
    saveCourseBuilderState();
  }

  function setupQuizQuestions(container) {
    const addQuestionBtn = container.closest('.quiz-item').querySelector('.add-question-btn');
    if (addQuestionBtn) {
      addQuestionBtn.addEventListener('click', () => {
        const questionCount = container.children.length + 1;
        const questionClone = questionTemplate.content.cloneNode(true);

        questionClone.querySelector('.question-number').textContent = questionCount;
        questionClone.querySelector('.delete-question').addEventListener('click', (e) => {
          e.target.closest('.question-card').remove();
          updateQuestionNumbers(container);
          saveCourseBuilderState();
        });

        // Add auto-save listeners
        const inputs = questionClone.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.addEventListener('input', debounce(saveCourseBuilderState, 1000));
        });

        container.appendChild(questionClone);
        updateQuestionNumbers(container);
        saveCourseBuilderState();
      });
    }
  }

  function updateQuestionNumbers(container) {
    Array.from(container.children).forEach((question, index) => {
      const questionNumber = question.querySelector('.question-number');
      if (questionNumber) {
        questionNumber.textContent = index + 1;
      }
    });
  }

  function setupExamQuestions(container) {
    container.innerHTML = '';
    const addQuestionBtn = container.closest('.exam-card').querySelector('.add-exam-question-btn');
    addQuestionBtn.addEventListener('click', () => {
      const questionCount = container.children.length + 1;
      const questionClone = questionTemplate.content.cloneNode(true);
      
      questionClone.querySelector('.question-number').textContent = questionCount;
      questionClone.querySelector('.delete-question').addEventListener('click', (e) => {
        e.target.closest('.question-card').remove();
        updateQuestionNumbers(container);
      });
      
      container.appendChild(questionClone);
    });
  }

  function updateChapterNumbers() {
    Array.from(chaptersContainer.children).forEach((chapter, index) => {
      chapter.querySelector('.chapter-number').textContent = index + 1;
    });
  }

  function updateLessonNumbers(container) {
    Array.from(container.children).forEach((lesson, index) => {
      lesson.querySelector('.lesson-number').textContent = index + 1;
    });
  }

  function updateQuestionNumbers(container) {
    Array.from(container.children).forEach((question, index) => {
      question.querySelector('.question-number').textContent = index + 1;
    });
  }

  async function saveCourseFromBuilder() {
    const courseData = buildCourseDataFromForm();

    // Debug log
    console.log('Course data to save:', courseData);
    console.log('Course data JSON:', JSON.stringify(courseData, null, 2));

    // Validate basic course info
    if (!courseData.title || !courseData.description || !courseData.category || !courseData.level) {
      showAlert('Title, description, category and level are required', 'error');
      return;
    }

    // Validate description length (minimum 50 characters)
    if (courseData.description.length < 50) {
      showAlert('Description must be at least 50 characters long', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('agrilearn_token');
      console.log('Token available:', !!token);

      // If no token, try to get user info and create a temporary token for development
      if (!token) {
        const user = JSON.parse(localStorage.getItem('agrilearn_user') || '{}');
        if (!user.id) {
          // Set default user for development
          const defaultUser = {
            id: '507f1f77bcf86cd799439011', // Default MongoDB ObjectId
            name: 'NANSHIE ROMUALD',
            email: 'nanshie@agrilearn.com',
            role: 'teacher'
          };
          localStorage.setItem('agrilearn_user', JSON.stringify(defaultUser));
          console.log('Default user set for development');
        }
      }

      const method = currentCourseId ? 'PUT' : 'POST';
      const url = currentCourseId
        ? `http://localhost:5000/courses/${currentCourseId}`
        : 'http://localhost:5000/courses';

      console.log('Making request to:', url);
      console.log('Course data:', courseData);
      
      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(courseData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save course');
      }

      showAlert(`Course ${currentCourseId ? 'updated' : 'created'} successfully!`, 'success');
      clearCourseBuilderState(); // Clear saved state after successful save
      courseBuilderModal.style.display = 'none';
      loadCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      showAlert(error.message, 'error');
    }
  }

  function buildCourseDataFromForm() {
    const courseData = {
      title: document.getElementById('builder-course-title').value.trim(),
      description: document.getElementById('builder-course-description').value.trim(),
      category: document.getElementById('builder-course-category').value,
      level: document.getElementById('builder-course-level').value,
      chapters: []
    };

    // Get chapters data
    Array.from(chaptersContainer.children).forEach((chapterCard, chapterIndex) => {
      const chapterData = {
        title: chapterCard.querySelector('.chapter-title').value.trim(),
        description: chapterCard.querySelector('.chapter-description').value.trim(),
        order: chapterIndex + 1,
        lessons: []
      };

      // Get lessons data
      const lessonsContainer = chapterCard.querySelector('.lessons-container');
      Array.from(lessonsContainer.children).forEach((lessonCard, lessonIndex) => {
        const lessonData = {
          title: lessonCard.querySelector('.lesson-title').value.trim(),
          description: lessonCard.querySelector('.lesson-description').value.trim(),
          order: lessonIndex + 1,
          content: []
        };

        // Get content items for this lesson
        const contentItems = lessonCard.querySelector('.content-items');
        if (contentItems && contentItems.children.length > 0) {
          Array.from(contentItems.children).forEach((contentItem, contentIndex) => {
            let contentData = {
              order: contentIndex + 1,
              title: contentItem.querySelector('.content-title')?.value.trim() || '',
              description: contentItem.querySelector('.content-description')?.value.trim() || '',
              duration: parseInt(contentItem.querySelector('.content-duration')?.value) || 0,
              isFreePreview: contentItem.querySelector('.is-free-preview')?.checked || false
            };

            if (contentItem.classList.contains('video-item')) {
              contentData.type = 'video';
              contentData.url = contentItem.querySelector('.video-url')?.value.trim() || '';
            } else if (contentItem.classList.contains('pdf-item')) {
              contentData.type = 'pdf';
              contentData.url = contentItem.querySelector('.pdf-url')?.value.trim() || '';
            } else if (contentItem.classList.contains('quiz-item')) {
              contentData.type = 'quiz';
              contentData.quiz = {
                title: contentItem.querySelector('.quiz-title')?.value.trim() || '',
                description: contentItem.querySelector('.quiz-description')?.value.trim() || '',
                timeLimit: parseInt(contentItem.querySelector('.time-limit')?.value) || 30,
                passingScore: parseInt(contentItem.querySelector('.passing-score')?.value) || 70,
                questions: getQuestionsData(contentItem.querySelector('.questions-container'))
              };
            }

            lessonData.content.push(contentData);
          });
        }

        chapterData.lessons.push(lessonData);
      });

      // Get chapter exam data if exists
      const chapterExamContainer = chapterCard.querySelector('.chapter-exam');
      if (chapterExamContainer) {
        const examTitle = chapterExamContainer.querySelector('.exam-title')?.value.trim();
        const examQuestions = chapterExamContainer.querySelector('.exam-questions-container');

        if (examTitle || (examQuestions && examQuestions.children.length > 0)) {
          chapterData.chapterExam = {
            title: examTitle || `${chapterData.title} Exam`,
            description: chapterExamContainer.querySelector('.exam-description')?.value.trim() || '',
            timeLimit: parseInt(chapterExamContainer.querySelector('.time-limit')?.value) || 60,
            passingScore: parseInt(chapterExamContainer.querySelector('.passing-score')?.value) || 70,
            attempts: parseInt(chapterExamContainer.querySelector('.attempts')?.value) || 3,
            isRequired: chapterExamContainer.querySelector('.is-required')?.checked !== false,
            questions: examQuestions ? getQuestionsData(examQuestions) : []
          };
        }
      }

      courseData.chapters.push(chapterData);
    });

    // Get final exam data if exists
    const finalExamContainer = document.getElementById('final-exam-container');
    if (finalExamContainer) {
      const examTitle = finalExamContainer.querySelector('.exam-title')?.value.trim();
      const examQuestions = finalExamContainer.querySelector('.exam-questions-container');

      if (examTitle || (examQuestions && examQuestions.children.length > 0)) {
        courseData.finalExam = {
          title: examTitle || `${courseData.title} Final Exam`,
          description: finalExamContainer.querySelector('.exam-description')?.value.trim() || '',
          timeLimit: parseInt(finalExamContainer.querySelector('.time-limit')?.value) || 120,
          passingScore: parseInt(finalExamContainer.querySelector('.passing-score')?.value) || 70,
          attempts: parseInt(finalExamContainer.querySelector('.attempts')?.value) || 3,
          isRequired: finalExamContainer.querySelector('.is-required')?.checked !== false,
          questions: examQuestions ? getQuestionsData(examQuestions) : []
        };
      }
    }

    return courseData;
  }

  function getQuestionsData(questionsContainer) {
    if (!questionsContainer) return [];

    return Array.from(questionsContainer.children).map((questionCard, index) => {
      const questionText = questionCard.querySelector('.question-text')?.value.trim() || '';
      const correctAnswer = questionCard.querySelector('.correct-answer')?.value.trim() || '';
      const points = parseInt(questionCard.querySelector('.question-points')?.value) || 1;

      // Build options array with correct answer marked
      const options = [];
      const option1 = questionCard.querySelector('.option-1')?.value.trim() || '';
      const option2 = questionCard.querySelector('.option-2')?.value.trim() || '';
      const option3 = questionCard.querySelector('.option-3')?.value.trim() || '';

      if (correctAnswer) {
        options.push({ text: correctAnswer, isCorrect: true });
      }
      if (option1 && option1 !== correctAnswer) {
        options.push({ text: option1, isCorrect: false });
      }
      if (option2 && option2 !== correctAnswer) {
        options.push({ text: option2, isCorrect: false });
      }
      if (option3 && option3 !== correctAnswer) {
        options.push({ text: option3, isCorrect: false });
      }

      return {
        questionText: questionText,
        questionType: 'multiple-choice',
        options: options,
        correctAnswer: correctAnswer,
        points: points,
        explanation: questionCard.querySelector('.explanation')?.value.trim() || '',
        order: index + 1
      };
    }).filter(q => q.questionText && q.correctAnswer); // Only include valid questions
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

  function formatCategory(category) {
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  function truncateText(text, maxLength) {
    return text?.length > maxLength ? `${text.substring(0, maxLength)}...` : text || '';
  }

  function getEmptyStateMessage(filter) {
    switch(filter) {
      case 'published': return "You don't have any published courses yet";
      case 'draft': return "You don't have any draft courses";
      case 'archived': return "You don't have any archived courses";
      default: return "You haven't created any courses yet";
    }
  }

  // File Upload Functions
  function setupVideoUpload(contentElement) {
    const sourceRadios = contentElement.querySelectorAll('input[name="video-source"]');
    const urlGroup = contentElement.querySelector('.video-url-group');
    const uploadGroup = contentElement.querySelector('.video-upload-group');
    const fileInput = contentElement.querySelector('.video-file-input');
    const removeBtn = contentElement.querySelector('.remove-file');

    // Handle source type switching
    sourceRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.value === 'url') {
          urlGroup.style.display = 'block';
          uploadGroup.style.display = 'none';
        } else {
          urlGroup.style.display = 'none';
          uploadGroup.style.display = 'block';
        }
      });
    });

    // Handle file selection
    fileInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        uploadFile(file, 'video', contentElement);
      }
    });

    // Handle file removal
    if (removeBtn) {
      removeBtn.addEventListener('click', function() {
        fileInput.value = '';
        resetUploadState(contentElement);
      });
    }
  }

  function setupPdfUpload(contentElement) {
    const sourceRadios = contentElement.querySelectorAll('input[name="pdf-source"]');
    const urlGroup = contentElement.querySelector('.pdf-url-group');
    const uploadGroup = contentElement.querySelector('.pdf-upload-group');
    const fileInput = contentElement.querySelector('.pdf-file-input');
    const removeBtn = contentElement.querySelector('.remove-file');

    // Handle source type switching
    sourceRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.value === 'url') {
          urlGroup.style.display = 'block';
          uploadGroup.style.display = 'none';
        } else {
          urlGroup.style.display = 'none';
          uploadGroup.style.display = 'block';
        }
      });
    });

    // Handle file selection
    fileInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        uploadFile(file, 'pdf', contentElement);
      }
    });

    // Handle file removal
    if (removeBtn) {
      removeBtn.addEventListener('click', function() {
        fileInput.value = '';
        resetUploadState(contentElement);
      });
    }
  }

  async function uploadFile(file, uploadType, contentElement) {
    try {
      showUploadProgress(contentElement);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', uploadType);

      const token = localStorage.getItem('agrilearn_token');
      const response = await fetch('/courses/upload-content', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        showUploadSuccess(contentElement, file.name);

        // Update the appropriate URL field
        if (uploadType === 'video') {
          const urlInput = contentElement.querySelector('.video-url');
          if (urlInput) {
            urlInput.value = result.fileInfo.url;
          }
        } else if (uploadType === 'pdf') {
          const urlInput = contentElement.querySelector('.pdf-url');
          if (urlInput) {
            urlInput.value = result.fileInfo.url;
          }
        }

        showNotification('File uploaded successfully!', 'success');
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      resetUploadState(contentElement);
      showNotification('Upload failed: ' + error.message, 'error');
    }
  }

  function showUploadProgress(contentElement) {
    const placeholder = contentElement.querySelector('.upload-placeholder');
    const progress = contentElement.querySelector('.upload-progress');
    const fileInfo = contentElement.querySelector('.uploaded-file-info');

    if (placeholder) placeholder.style.display = 'none';
    if (progress) progress.style.display = 'block';
    if (fileInfo) fileInfo.style.display = 'none';
  }

  function showUploadSuccess(contentElement, fileName) {
    const placeholder = contentElement.querySelector('.upload-placeholder');
    const progress = contentElement.querySelector('.upload-progress');
    const fileInfo = contentElement.querySelector('.uploaded-file-info');
    const fileNameSpan = contentElement.querySelector('.file-name');

    if (placeholder) placeholder.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (fileInfo) fileInfo.style.display = 'flex';
    if (fileNameSpan) fileNameSpan.textContent = fileName;
  }

  function resetUploadState(contentElement) {
    const placeholder = contentElement.querySelector('.upload-placeholder');
    const progress = contentElement.querySelector('.upload-progress');
    const fileInfo = contentElement.querySelector('.uploaded-file-info');

    if (placeholder) placeholder.style.display = 'block';
    if (progress) progress.style.display = 'none';
    if (fileInfo) fileInfo.style.display = 'none';
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      z-index: 1000;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
});