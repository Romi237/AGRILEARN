// Assignment Detail Management
let currentAssignment = null;
let allSubmissions = [];
let currentSubmissionId = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadAssignmentDetails();
});

function checkAuth() {
  const user = JSON.parse(localStorage.getItem('agrilearn_user'));
  if (!user || user.role !== 'teacher') {
    window.location.href = 'login.html';
    return;
  }
}

async function loadAssignmentDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const assignmentId = urlParams.get('id');
  
  if (!assignmentId) {
    window.location.href = 'assignments.html';
    return;
  }

  try {
    const token = localStorage.getItem('agrilearn_token');
    const response = await fetch(`http://localhost:5000/assignments/${assignmentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load assignment');
    
    const data = await response.json();
    if (data.success) {
      currentAssignment = data.assignment;
      renderAssignmentDetails(currentAssignment);
      loadSubmissions(assignmentId);
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error loading assignment:', error);
    alert('Failed to load assignment details');
    window.location.href = 'assignments.html';
  }
}

function renderAssignmentDetails(assignment) {
  document.getElementById('assignment-title').textContent = assignment.title;
  document.getElementById('assignment-description').textContent = assignment.description || 'No description provided';
  document.getElementById('assignment-course').textContent = `Course: ${assignment.course?.title || 'Unknown'}`;
  document.getElementById('assignment-due-date').textContent = `Due: ${formatDate(assignment.dueDate)}`;
  document.getElementById('assignment-points').textContent = `Points: ${assignment.maxPoints || 100}`;
}

async function loadSubmissions(assignmentId) {
  try {
    const token = localStorage.getItem('agrilearn_token');
    const response = await fetch(`http://localhost:5000/assignments/${assignmentId}/submissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load submissions');
    
    const data = await response.json();
    if (data.success) {
      allSubmissions = data.submissions || [];
      renderSubmissions(allSubmissions);
      updateSubmissionStats();
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error loading submissions:', error);
    document.getElementById('submissions-container').innerHTML = `
      <tr><td colspan="5" class="text-center error-message">Failed to load submissions</td></tr>
    `;
  }
}

function renderSubmissions(submissions) {
  const container = document.getElementById('submissions-container');
  
  if (submissions.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <i class="fas fa-file-alt"></i>
            <h3>No submissions yet</h3>
            <p>Students haven't submitted their assignments yet.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = submissions.map(submission => `
    <tr>
      <td>
        <div class="student-info">
          <img src="${submission.student?.avatar || 'images/default-avatar.png'}" 
               alt="${submission.student?.name}" class="student-avatar">
          <div>
            <div class="student-name">${submission.student?.name || 'Unknown Student'}</div>
            <div class="student-email">${submission.student?.email || ''}</div>
          </div>
        </div>
      </td>
      <td>${formatDate(submission.submittedAt)}</td>
      <td>
        <span class="submission-status status-${submission.status}">
          ${submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
        </span>
      </td>
      <td>
        ${submission.grade !== undefined ? `${submission.grade}/100` : 'Not graded'}
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-primary" onclick="openGradingModal('${submission._id}')" title="Grade">
            <i class="fas fa-star"></i>
          </button>
          <button class="btn btn-sm btn-outline" onclick="downloadSubmission('${submission._id}')" title="Download">
            <i class="fas fa-download"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updateSubmissionStats() {
  const total = currentAssignment.course?.enrolledStudents?.length || 0;
  const submitted = allSubmissions.length;
  const graded = allSubmissions.filter(s => s.status === 'graded').length;
  
  document.getElementById('assignment-submissions').textContent = `Submissions: ${submitted}/${total}`;
  document.getElementById('submission-stats').textContent = 
    `${submitted} submitted, ${graded} graded, ${total - submitted} missing`;
}

function filterSubmissions(status) {
  // Update active filter button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.status === status) {
      btn.classList.add('active');
    }
  });

  // Filter submissions
  let filteredSubmissions = allSubmissions;
  if (status !== 'all') {
    if (status === 'missing') {
      // Show students who haven't submitted
      const submittedStudentIds = allSubmissions.map(s => s.student._id);
      const enrolledStudents = currentAssignment.course?.enrolledStudents || [];
      const missingStudents = enrolledStudents.filter(student => 
        !submittedStudentIds.includes(student._id)
      );
      
      const container = document.getElementById('submissions-container');
      container.innerHTML = missingStudents.map(student => `
        <tr>
          <td>
            <div class="student-info">
              <img src="${student.avatar || 'images/default-avatar.png'}" 
                   alt="${student.name}" class="student-avatar">
              <div>
                <div class="student-name">${student.name}</div>
                <div class="student-email">${student.email}</div>
              </div>
            </div>
          </td>
          <td>-</td>
          <td>
            <span class="submission-status status-pending">Missing</span>
          </td>
          <td>-</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="sendReminder('${student._id}')" title="Send Reminder">
              <i class="fas fa-bell"></i>
            </button>
          </td>
        </tr>
      `).join('');
      return;
    } else {
      filteredSubmissions = allSubmissions.filter(s => s.status === status);
    }
  }
  
  renderSubmissions(filteredSubmissions);
}

function openGradingModal(submissionId) {
  const submission = allSubmissions.find(s => s._id === submissionId);
  if (!submission) return;

  currentSubmissionId = submissionId;
  
  // Populate modal with submission data
  document.getElementById('grading-title').textContent = `Grade Submission - ${submission.student.name}`;
  document.getElementById('grading-student-info').innerHTML = `
    <div class="student-info">
      <img src="${submission.student.avatar || 'images/default-avatar.png'}" 
           alt="${submission.student.name}" class="student-avatar">
      <div>
        <div class="student-name">${submission.student.name}</div>
        <div class="student-email">${submission.student.email}</div>
        <div>Submitted: ${formatDate(submission.submittedAt)}</div>
      </div>
    </div>
  `;
  
  document.getElementById('submission-content').textContent = submission.content || 'No text content';
  document.getElementById('grade-input').value = submission.grade || '';
  document.getElementById('feedback-textarea').value = submission.feedback || '';
  
  // Show files if any
  if (submission.files && submission.files.length > 0) {
    document.getElementById('submission-files').innerHTML = `
      <h4>Attached Files:</h4>
      ${submission.files.map(file => `
        <div class="file-item">
          <i class="fas fa-file"></i>
          <a href="${file.url}" target="_blank">${file.name}</a>
        </div>
      `).join('')}
    `;
  } else {
    document.getElementById('submission-files').innerHTML = '';
  }
  
  document.getElementById('grading-modal').style.display = 'block';
}

function closeGradingModal() {
  document.getElementById('grading-modal').style.display = 'none';
  currentSubmissionId = null;
}

async function saveGrade() {
  if (!currentSubmissionId) return;

  const grade = parseInt(document.getElementById('grade-input').value);
  const feedback = document.getElementById('feedback-textarea').value.trim();

  if (isNaN(grade) || grade < 0 || grade > 100) {
    alert('Please enter a valid grade between 0 and 100');
    return;
  }

  try {
    const token = localStorage.getItem('agrilearn_token');
    const response = await fetch(`http://localhost:5000/assignments/submissions/${currentSubmissionId}/grade`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ grade, feedback })
    });

    if (!response.ok) throw new Error('Failed to save grade');
    
    const data = await response.json();
    if (data.success) {
      alert('Grade saved successfully!');
      closeGradingModal();
      loadSubmissions(currentAssignment._id); // Reload submissions
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error saving grade:', error);
    alert('Failed to save grade: ' + error.message);
  }
}

function editAssignment() {
  window.location.href = `edit-assignment.html?id=${currentAssignment._id}`;
}

function downloadSubmissions() {
  // Implementation for downloading all submissions
  alert('Download all submissions functionality coming soon!');
}

function downloadSubmission(submissionId) {
  // Implementation for downloading individual submission
  alert('Download submission functionality coming soon!');
}

function sendReminder(studentId) {
  // Implementation for sending reminder to student
  alert('Send reminder functionality coming soon!');
}

function formatDate(date) {
  if (!date) return 'No date';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function logout() {
  localStorage.removeItem('agrilearn_user');
  localStorage.removeItem('agrilearn_token');
  window.location.href = 'index.html';
}
