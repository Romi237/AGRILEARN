document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('agrilearn_token');
  const user = JSON.parse(localStorage.getItem('agrilearn_user'));
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');

  if (!token || !user || !courseId) {
    window.location.href = 'login.html';
    return;
  }

  // Tab switching functionality
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update active tab button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show corresponding pane
      tabPanes.forEach(pane => pane.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
    });
  });

  fetchCourse();

  async function fetchCourse() {
    try {
      const res = await fetch(`http://localhost:5000/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to load course');
      }
      
      const data = await res.json();
      if (data.success) renderCourse(data.course);
      else throw new Error(data.message || 'Failed to load course');
    } catch (err) {
      console.error('Error loading course:', err);
      alert(err.message);
      window.close();
    }
  }

  function renderCourse(course) {
    // Update course header
    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-image').src = course.image;
    document.getElementById('course-description').textContent = course.description;
    
    // Update metadata
    document.querySelector('.course-rating span').textContent = `(${course.averageRating || 0})`;
    document.getElementById('student-count').textContent = `${course.enrolledStudents?.length || 0} Students`;
    document.getElementById('instructor-name').textContent = course.teacher?.name || 'Unknown';
    document.getElementById('instructor-name-detail').textContent = course.teacher?.name || 'Unknown';
    
    // Show owner badge if this is the user's course
    if (course.isOwner) {
      document.getElementById('course-owner-badge').style.display = 'inline-block';
      document.getElementById('teacher-note').style.display = 'block';
    }
    
    // Update enroll button based on user role and enrollment status
    const enrollBtn = document.getElementById('enroll-btn');
    
    if (user.role === 'teacher') {
      if (course.isOwner) {
        enrollBtn.innerHTML = '<i class="fas fa-crown"></i> Your Course (Preview Mode)';
        enrollBtn.className = 'btn btn-success';
      } else {
        enrollBtn.innerHTML = '<i class="fas fa-eye"></i> Viewing as Teacher';
        enrollBtn.className = 'btn btn-info';
      }
      enrollBtn.disabled = true;
    } else if (user.role === 'student') {
      if (course.isEnrolled) {
        enrollBtn.innerHTML = '<i class="fas fa-check"></i> Enrolled';
        enrollBtn.className = 'btn btn-success';
        enrollBtn.disabled = true;
      } else {
        enrollBtn.innerHTML = '<i class="fas fa-user-plus"></i> Enroll Now';
        enrollBtn.className = 'btn btn-primary';
        enrollBtn.disabled = false;
        enrollBtn.addEventListener('click', () => enrollInCourse(course._id));
      }
    }
    
    // Render curriculum
    renderCurriculum(course.curriculum || []);
    
    // Update stars rating
    updateStarsRating(course.averageRating || 0);
  }

  function updateStarsRating(rating) {
    const starsContainer = document.querySelector('.course-rating');
    const stars = starsContainer.querySelectorAll('i');
    
    stars.forEach((star, index) => {
      if (index < Math.floor(rating)) {
        star.className = 'fas fa-star';
      } else if (index < rating) {
        star.className = 'fas fa-star-half-alt';
      } else {
        star.className = 'far fa-star';
      }
    });
  }

  async function enrollInCourse(courseId) {
    try {
      const res = await fetch(`http://localhost:5000/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const result = await res.json();
      alert(result.message);
      if (result.success) fetchCourse();
    } catch (err) {
      alert('Failed to enroll in course');
    }
  }

  function renderCurriculum(curriculum) {
    const container = document.querySelector('#curriculum .curriculum-container');
    container.innerHTML = '';
    
    if (!curriculum || curriculum.length === 0) {
      container.innerHTML = '<p>No curriculum available for this course yet.</p>';
      return;
    }
    
    curriculum.forEach((module, moduleIndex) => {
      const moduleHTML = `
        <div class="curriculum-module">
          <div class="module-header">
            <h4><i class="fas fa-folder"></i> Module ${moduleIndex + 1}: ${module.title}</h4>
            <p>${module.description || 'No description available'}</p>
          </div>
          <div class="module-lessons">
            ${module.lessons ? module.lessons.map((lesson, lessonIndex) => `
              <div class="lesson-item">
                <div class="lesson-info">
                  <i class="fas fa-play-circle"></i>
                  <span class="lesson-title">${lesson.title}</span>
                  <span class="lesson-duration">${lesson.duration || 'N/A'}</span>
                </div>
                <div class="lesson-status">
                  ${user.role === 'student' ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-eye"></i>'}
                </div>
              </div>
            `).join('') : '<p>No lessons in this module yet.</p>'}
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', moduleHTML);
    });
  }

  // Add some basic styling for curriculum
  const style = document.createElement('style');
  style.textContent = `
    .curriculum-module {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    
    .module-header {
      background: #f8f9fa;
      padding: 15px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .module-header h4 {
      margin: 0 0 10px 0;
      color: #333;
    }
    
    .module-header p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
    
    .lesson-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 15px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .lesson-item:last-child {
      border-bottom: none;
    }
    
    .lesson-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .lesson-info i {
      color: #4CAF50;
    }
    
    .lesson-title {
      font-weight: 500;
    }
    
    .lesson-duration {
      color: #666;
      font-size: 12px;
    }
    
    .lesson-status i {
      color: #999;
    }
  `;
  document.head.appendChild(style);
});
