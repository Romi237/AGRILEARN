document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('agrilearn_token');
  const user = JSON.parse(localStorage.getItem('agrilearn_user'));
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('id');
  const form = document.getElementById('editCourseForm');

  if (!token || !user || !courseId) {
    window.location.href = 'login.html';
    return;
  }

  // Load existing course data
  async function loadCourse() {
    try {
      const res = await fetch(`http://localhost:5000/courses/${courseId}`, {
        headers: { Authorization:` Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load course');
      
      const data = await res.json();
      if (data.success) {
        document.getElementById('titleInput').value = data.course.title;
        document.getElementById('imageInput').value = data.course.image;
        document.getElementById('descInput').value = data.course.description;
      } else {
        throw new Error(data.message || 'Failed to load course');
      }
    } catch (err) {
      console.error('Error loading course:', err);
      alert(err.message);
      window.location.href = 'my-courses.html';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
      title: document.getElementById('titleInput').value,
      image: document.getElementById('imageInput').value,
      description: document.getElementById('descInput').value
    };

    try {
      const res = await fetch(`http://localhost:5000/courses/edit/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      alert(result.message);
      if (result.success) window.location.href = 'my-courses.html';
    } catch (err) {
      console.error('Error updating course:', err);
      alert('Failed to update course');
    }
  });

  loadCourse();
});