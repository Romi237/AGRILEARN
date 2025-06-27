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
      window.location.href = 'courses.html';
    }
  }

  function renderCourse(course) {
    // Add notice for teachers viewing courses
    if (user.role === 'teacher') {
      const courseHeader = document.querySelector('.course-header');
      const teacherNotice = document.createElement('div');
      teacherNotice.style.cssText = 'background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin-bottom: 20px; border-radius: 5px; color: #0c5460;';

      if (course.isOwner) {
        teacherNotice.innerHTML = '<i class="fas fa-crown"></i> <strong>Your Course:</strong> This is how your course appears to students.';
      } else {
        teacherNotice.innerHTML = '<i class="fas fa-eye"></i> <strong>Teacher View:</strong> You are viewing this course as a teacher. You cannot enroll but can see all content.';
      }

      courseHeader.parentNode.insertBefore(teacherNotice, courseHeader.nextSibling);
    }

    // Update course header
    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-image').src = course.image;
    document.getElementById('course-description').textContent = course.description;
    
    // Update metadata
    document.querySelector('.course-rating span').textContent = `(${course.averageRating || 0})`;
    document.querySelector('.course-students span').textContent = `${course.enrolledStudents?.length || 0} Students`;
    document.querySelector('.course-instructor span').textContent = course.teacher?.name || 'Unknown';
    
    // Update instructor info
    document.getElementById('instructor-name').textContent = course.teacher?.name || 'Unknown';
    
    // Update enroll button
    const enrolled = course.enrolledStudents?.includes(user._id);
    const enrollBtn = document.getElementById('enroll-btn');

    if (user.role === 'teacher') {
      // Teachers cannot enroll
      if (course.isOwner) {
        enrollBtn.textContent = 'Your Course';
        enrollBtn.style.backgroundColor = '#28a745';
      } else {
        enrollBtn.textContent = 'Teacher View Only';
        enrollBtn.style.backgroundColor = '#6c757d';
      }
      enrollBtn.disabled = true;
      enrollBtn.style.cursor = 'not-allowed';
    } else if (user.role === 'student') {
      // Students can enroll
      enrollBtn.textContent = enrolled ? 'Enrolled' : 'Enroll Now';
      enrollBtn.disabled = enrolled;

      if (!enrolled) {
        enrollBtn.addEventListener('click', () => enrollInCourse(course._id));
      }
    }
    
    // Render curriculum
    renderCurriculum(course.curriculum, course.progress?.[user._id] || []);
    
    // Render discussions if available
    if (course.discussions?.length) {
      renderDiscussions(course.discussions);
    }
  }

  async function enrollInCourse(id) {
    try {
      const res = await fetch(`http://localhost:5000/courses/enroll/${id}`, {
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

  function renderCurriculum(curriculum = [], userProgress = []) {
    const container = document.querySelector('#curriculum .curriculum-container');
    container.innerHTML = '';
    
    curriculum.forEach((module, modIndex) => {
      const moduleDiv = document.createElement('div');
      moduleDiv.className = 'module';
      
      const header = document.createElement('div');
      header.className = 'module-header';
      header.innerHTML = `
        <h3>${module.title}</h3>
        <span class="module-length">${module.duration}</span>
        <i class="fas fa-chevron-down"></i>
      `;
      
      const content = document.createElement('div');
      content.className = 'module-content';
      
      module.lessons.forEach((lesson, lessonIndex) => {
        const isUnlocked = lessonIndex === 0 || userProgress.includes(`${modIndex}-${lessonIndex - 1}`);
        const isCompleted = userProgress.includes(`${modIndex}-${lessonIndex}`);
        
        const lessonDiv = document.createElement('div');
        lessonDiv.className = `lesson ${isUnlocked ? 'clickable' : ''}`;
        lessonDiv.innerHTML = `
          <div class="lesson-icon">
            <i class="fas ${
              lesson.type === 'pdf' ? 'fa-file-pdf' : 
              lesson.type === 'quiz' ? 'fa-tasks' : 'fa-play-circle'
            }"></i>
          </div>
          <div class="lesson-details">
            <h4>${lesson.title}</h4>
            <span class="lesson-length">${lesson.duration}</span>
          </div>
          <div class="lesson-status">
            <i class="fas ${
              isCompleted ? 'fa-check-circle' : 
              isUnlocked ? 'fa-unlock' : 'fa-lock'
            }"></i>
          </div>
        `;
        
        if (isUnlocked) {
          lessonDiv.addEventListener('click', () => {
            if (!isCompleted) markLessonComplete(modIndex, lessonIndex);
            if (lesson.link) window.open(lesson.link, '_blank');
          });
        }
        
        content.appendChild(lessonDiv);
      });
      
      moduleDiv.appendChild(header);
      moduleDiv.appendChild(content);
      
      // Toggle module content
      header.addEventListener('click', () => {
        content.classList.toggle('open');
        const icon = header.querySelector('i.fas');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
      });
      
      container.appendChild(moduleDiv);
    });
  }

  async function markLessonComplete(modIndex, lessonIndex) {
    try {
      const key = `${modIndex}-${lessonIndex}`;
      const res = await fetch(`http://localhost:5000/courses/${courseId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:` Bearer ${token}`
        },
        body: JSON.stringify({ progressKey: key })
      });
      
      const result = await res.json();
      if (result.success) fetchCourse();
      else alert(result.message);
    } catch (err) {
      alert('Failed to update progress');
    }
  }

  function renderDiscussions(discussions) {
    const container = document.querySelector('.discussion-list');
    container.innerHTML = '<h3>Recent Discussions</h3>';
    
    discussions.forEach(d => {
      const card = document.createElement('div');
      card.className = 'discussion-card';
      card.innerHTML = `
        <div class="discussion-header">
          <div class="user-avatar">
            <img src="images/student1.jpg" alt="${d.author?.name || 'Anonymous'}">
          </div>
          <div class="discussion-meta">
            <h4>${d.title}</h4>
            <p>Posted by <span class="user-name">${d.author?.name || 'Anonymous'}</span> • ${new Date(d.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div class="discussion-content">
          <p>${d.content}</p>
        </div>
        <div class="discussion-footer">
          <a href="discussion-detail.html?id=${d._id}" class="btn btn-sm btn-outline">View Discussion</a>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // Handle discussion form submission
  const discussionForm = document.getElementById('discussion-form');
  if (discussionForm) {
    discussionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const title = document.getElementById('discussion-title').value.trim();
      const content = document.getElementById('discussion-content').value.trim();
      
      if (!title || !content) {
        alert('Please fill in all fields');
        return;
      }
      
      try {
        const res = await fetch(`http://localhost:5000/discussions/${courseId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title, content })
        });
        
        const result = await res.json();
        alert(result.message);
        if (result.success) {
          discussionForm.reset();
          fetchCourse();
        }
      } catch (err) {
        alert('Failed to post discussion');
      }
    });
  }
});