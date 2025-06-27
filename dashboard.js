// Dashboard script for Agrilearn platform
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Dashboard: Initializing...');

  const user = JSON.parse(localStorage.getItem('agrilearn_user'));
  const token = localStorage.getItem('agrilearn_token');
  if (!user || !token) {
    console.log('⚠️ No user or token found, redirecting to login');
    return window.location.href = 'login.html';
  }

  // Safely update user name
  const userNameEl = document.getElementById('user-name');
  if (userNameEl) {
    userNameEl.textContent = user.name;
    console.log('✅ User name updated:', user.name);
  } else {
    console.warn('⚠️ User name element not found');
  }

  // Try to fetch dashboard data, but handle failures gracefully
  console.log('🔄 Attempting to fetch dashboard data...');

  fetch('http://localhost:5000/dashboard-data', {
    headers: { Authorization: `Bearer ${token}`},
    timeout: 5000  // 5 second timeout
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      console.log('✅ Dashboard data received:', data);
      if (!data.success) return logout();
      const me = data.user;

      // Role-specific stats with safe element access
      const statContainer = document.querySelector('.stat-container');
      if (statContainer) {
        if (user.role === 'student') {
          statContainer.innerHTML = `
            <div class="stat-card"><h3>${me.enrolledCourses?.length || 0}</h3><p>Enrolled Courses</p></div>
            <div class="stat-card"><h3>${me.completedProjects?.length || 0}</h3><p>Completed Projects</p></div>
            <div class="stat-card"><h3>${me.certificates?.length || 0}</h3><p>Certificates</p></div>
            <div class="stat-card"><h3>${me.newMessages?.length || 0}</h3><p>Messages</p></div>
          `;
          renderStudentViews(me);
        } else {
          statContainer.innerHTML = `
            <div class="stat-card"><h3>${me.myCourses?.length || 0}</h3><p>Courses Created</p></div>
            <div class="stat-card"><h3>${me.totalAssignments || 0}</h3><p>Assignments Created</p></div>
            <div class="stat-card"><h3>${me.totalStudents || 0}</h3><p>Total Students</p></div>
            <div class="stat-card"><h3>${me.pendingAssignmentCount || 0}</h3><p>Pending Reviews</p></div>
          `;
          renderTeacherViews(me);
        }
        console.log('✅ Dashboard stats updated');
      } else {
        console.warn('⚠️ Stat container element not found');
      }
    })
    .catch(error => {
      console.error('❌ Dashboard data fetch error:', error);

      // Safely handle error display
      const statContainer = document.querySelector('.stat-container');
      if (statContainer) {
        statContainer.innerHTML = `
          <div class="stat-card error">
            <h3>Demo Mode</h3>
            <p>Running in demo mode. Server connection not available.</p>
          </div>
        `;
      }

      // Load demo data instead
      loadDemoData(user);
    });
});

function loadDemoData(user) {
  console.log('🎭 Loading demo data for', user.role);

  const statContainer = document.querySelector('.stat-container');
  if (statContainer) {
    if (user.role === 'student') {
      statContainer.innerHTML = `
        <div class="stat-card"><h3>3</h3><p>Enrolled Courses</p></div>
        <div class="stat-card"><h3>1</h3><p>Completed Projects</p></div>
        <div class="stat-card"><h3>0</h3><p>Certificates</p></div>
        <div class="stat-card"><h3>2</h3><p>Messages</p></div>
      `;

      const demoStudent = {
        enrolledCourses: [
          { _id: '1', title: 'Introduction to Agriculture', progress: 75, image: 'images/course-1.jpg' },
          { _id: '2', title: 'Sustainable Farming', progress: 45, image: 'images/course-2.jpg' }
        ],
        upcomingDeadlines: [
          { title: 'Farm Management Essay', dueDate: '2024-01-15', link: 'project-submission.html?id=1' }
        ]
      };
      renderStudentViews(demoStudent);
    } else {
      statContainer.innerHTML = `
        <div class="stat-card"><h3>2</h3><p>Courses Created</p></div>
        <div class="stat-card"><h3>5</h3><p>Assignments Created</p></div>
        <div class="stat-card"><h3>12</h3><p>Total Students</p></div>
        <div class="stat-card"><h3>3</h3><p>Pending Reviews</p></div>
      `;

      const demoTeacher = {
        myCourses: [
          { _id: '1', title: 'Advanced Agriculture', enrolledStudents: [1,2,3], pendingReviews: 2, isPublished: true, image: 'images/course-1.jpg' }
        ],
        pendingReviewsList: [
          { _id: '1', student: { name: 'John Doe' }, course: { title: 'Advanced Agriculture' }, title: 'Final Project', submittedAt: '2024-01-10' }
        ]
      };
      renderTeacherViews(demoTeacher);
    }
  }
}

function renderStudentViews(me) {
  console.log('🎓 Rendering student views');

  // Courses
  const coursesEl = document.querySelector('.courses-list');
  if (coursesEl && me.enrolledCourses) {
    coursesEl.innerHTML = me.enrolledCourses.map(c => `
      <div class="course-card">
        <img src="${c.image || 'images/default-course.jpg'}" alt="${c.title}" onerror="this.src='images/default-course.jpg'">
        <h4>${c.title}</h4>
        <p>${c.progress || 0}% completed</p>
        <a href="course-detail.html?id=${c._id}" class="btn btn-primary">Continue</a>
      </div>
    `).join('') || '<p>No courses yet.</p>';
  } else if (coursesEl) {
    coursesEl.innerHTML = '<p>No courses yet.</p>';
  }

  // Deadlines
  const deadlinesEl = document.querySelector('.deadlines-list');
  if (deadlinesEl && me.upcomingDeadlines) {
    deadlinesEl.innerHTML = me.upcomingDeadlines.map(d => `
      <div class="deadline">
        <h5>${d.title}</h5><span>${d.dueDate}</span>
        <a href="${d.link}" class="btn btn-outline">Submit</a>
      </div>
    `).join('') || '<p>No upcoming deadlines.</p>';
  } else if (deadlinesEl) {
    deadlinesEl.innerHTML = '<p>No upcoming deadlines.</p>';
  }
}

function renderTeacherViews(me) {
  console.log('👨‍🏫 Rendering teacher views');

  const coursesEl = document.querySelector('.courses-list');
  if (coursesEl) {
    if (me.myCourses && me.myCourses.length > 0) {
      coursesEl.innerHTML = me.myCourses.map(c => `
        <div class="teacher-card">
          <img src="${c.image || 'images/default-course.jpg'}" alt="${c.title}" onerror="this.src='images/default-course.jpg'">
          <h4>${c.title}</h4>
          <p class="course-stats">
            <span><i class="fas fa-users"></i> ${c.enrolledStudents?.length || 0} Students</span>
            <span><i class="fas fa-tasks"></i> ${c.pendingReviews || 0} Pending Reviews</span>
          </p>
          <p class="course-status">
            <span class="status-badge ${c.isPublished ? 'status-published' : 'status-draft'}">
              ${c.isPublished ? 'Published' : 'Draft'}
            </span>
          </p>
          <div class="course-actions">
            <a href="course-detail.html?id=${c._id}" class="btn btn-outline">View Course</a>
            <a href="course-students.html?id=${c._id}" class="btn btn-primary">Manage Students</a>
          </div>
        </div>
      `).join('');
    } else {
      coursesEl.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-book"></i>
          <h3>No courses created yet</h3>
          <p>Start by creating your first course to share your knowledge with students.</p>
          <a href="create-course.html" class="btn btn-primary">Create Course</a>
        </div>
      `;
    }
  } else {
    console.warn('⚠️ Courses list element not found');
  }

  // Pending reviews (both projects and assignments)
  const reviewsEl = document.querySelector('.reviews-list');
  if (reviewsEl) {
    let allPendingReviews = [];

    // Add project reviews
    if (me.pendingReviewsList && me.pendingReviewsList.length > 0) {
      allPendingReviews = allPendingReviews.concat(me.pendingReviewsList.map(r => ({
        ...r,
        type: 'project',
        reviewUrl: `review-submission.html?id=${r._id}`,
        detailUrl: `project-detail.html?id=${r._id}`
      })));
    }

    // Add assignment reviews
    if (me.pendingAssignmentReviews && me.pendingAssignmentReviews.length > 0) {
      me.pendingAssignmentReviews.forEach(assignment => {
        assignment.submissions.forEach(submission => {
          if (submission.status === 'submitted') {
            allPendingReviews.push({
              _id: submission._id,
              student: submission.student,
              course: assignment.course,
              title: assignment.title,
              submittedAt: submission.submittedAt,
              type: 'assignment',
              assignmentId: assignment._id,
              reviewUrl: `assignments.html?review=${assignment._id}&student=${submission.student._id}`,
              detailUrl: `assignment-detail.html?id=${assignment._id}`
            });
          }
        });
      });
    }

    if (allPendingReviews.length > 0) {
      // Sort by submission date (newest first)
      allPendingReviews.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      reviewsEl.innerHTML = allPendingReviews.map(r => `
        <div class="review-card">
          <div class="review-header">
            <h5>${r.student?.name || 'Unknown Student'}</h5>
            <span class="review-date">${formatDate(r.submittedAt)}</span>
          </div>
          <p class="review-course">${r.course?.title || 'Unknown Course'}</p>
          <p class="review-project">
            <i class="fas fa-${r.type === 'assignment' ? 'tasks' : 'project-diagram'}"></i>
            ${r.title || (r.type === 'assignment' ? 'Assignment Submission' : 'Project Submission')}
          </p>
          <div class="review-actions">
            <a href="${r.reviewUrl}" class="btn btn-primary">Review</a>
            <a href="${r.detailUrl}" class="btn btn-outline">View Details</a>
          </div>
        </div>
      `).join('');
    } else {
      reviewsEl.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard-check"></i>
          <h3>No pending reviews</h3>
          <p>All submissions have been reviewed.</p>
        </div>
      `;
    }
  } else {
    console.warn('⚠️ Reviews list element not found');
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function logout() {
  localStorage.removeItem('agrilearn_user');
  localStorage.removeItem('agrilearn_token');
  window.location.href = 'index.html';
}