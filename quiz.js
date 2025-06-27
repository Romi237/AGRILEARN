// Quiz Engine for AgriLearn
class QuizEngine {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.startTime = null;
        this.endTime = null;
        this.timerInterval = null;
        this.timeRemaining = 0;
        
        this.initializeElements();
        this.bindEvents();
        this.loadQuizFromURL();
    }

    initializeElements() {
        // Header elements
        this.quizHeader = document.getElementById('quiz-header');
        this.quizTitle = document.getElementById('quiz-title');
        this.quizDescription = document.getElementById('quiz-description');
        this.totalQuestionsSpan = document.getElementById('total-questions');
        this.timeLimitSpan = document.getElementById('time-limit');
        this.passingScoreSpan = document.getElementById('passing-score');
        this.startBtn = document.getElementById('start-quiz-btn');

        // Quiz elements
        this.quizQuestions = document.getElementById('quiz-questions');
        this.quizNavigation = document.getElementById('quiz-navigation');
        this.quizTimer = document.getElementById('quiz-timer');
        this.timerDisplay = document.getElementById('timer-display');

        // Navigation elements
        this.progressText = document.getElementById('progress-text');
        this.progressFill = document.getElementById('progress-fill');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.submitBtn = document.getElementById('submit-btn');

        // Complete elements
        this.quizComplete = document.getElementById('quiz-complete');
        this.finalScore = document.getElementById('final-score');
        this.correctCount = document.getElementById('correct-count');
        this.totalCount = document.getElementById('total-count');
        this.timeTaken = document.getElementById('time-taken');
        this.passStatus = document.getElementById('pass-status');
        this.reviewBtn = document.getElementById('review-btn');
        this.retakeBtn = document.getElementById('retake-btn');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startQuiz());
        this.prevBtn.addEventListener('click', () => this.previousQuestion());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.submitBtn.addEventListener('click', () => this.submitQuiz());
        this.reviewBtn.addEventListener('click', () => this.reviewAnswers());
        this.retakeBtn.addEventListener('click', () => this.retakeQuiz());

        // Prevent page refresh during quiz
        window.addEventListener('beforeunload', (e) => {
            if (this.startTime && !this.endTime) {
                e.preventDefault();
                e.returnValue = 'You have an active quiz. Are you sure you want to leave?';
            }
        });
    }

    async loadQuizFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const quizId = urlParams.get('id');
            const quizType = urlParams.get('type'); // 'lesson', 'chapter', 'final'
            const courseId = urlParams.get('course');

            if (!quizId || !quizType || !courseId) {
                throw new Error('Missing quiz parameters');
            }

            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`/courses/${courseId}/quiz/${quizType}/${quizId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load quiz');
            }

            const data = await response.json();
            if (data.success) {
                this.currentQuiz = data.quiz;
                this.displayQuizInfo();
            } else {
                throw new Error(data.message || 'Failed to load quiz');
            }
        } catch (error) {
            console.error('Error loading quiz:', error);
            this.showError('Failed to load quiz: ' + error.message);
        }
    }

    displayQuizInfo() {
        if (!this.currentQuiz) return;

        this.quizTitle.textContent = this.currentQuiz.title;
        this.quizDescription.textContent = this.currentQuiz.description || '';
        this.totalQuestionsSpan.textContent = `${this.currentQuiz.questions.length} Questions`;
        this.timeLimitSpan.textContent = `${this.currentQuiz.timeLimit} Minutes`;
        this.passingScoreSpan.textContent = `${this.currentQuiz.passingScore}% to Pass`;
    }

    startQuiz() {
        if (!this.currentQuiz || !this.currentQuiz.questions.length) {
            this.showError('No questions available for this quiz');
            return;
        }

        this.startTime = new Date();
        this.timeRemaining = this.currentQuiz.timeLimit * 60; // Convert to seconds
        this.currentQuestionIndex = 0;
        this.userAnswers = {};

        // Hide header, show quiz
        this.quizHeader.style.display = 'none';
        this.quizQuestions.style.display = 'block';
        this.quizNavigation.style.display = 'flex';
        this.quizTimer.style.display = 'block';

        this.renderCurrentQuestion();
        this.updateNavigation();
        this.startTimer();
    }

    renderCurrentQuestion() {
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        if (!question) return;

        const questionHtml = `
            <div class="question-card">
                <div class="question-header">
                    <div class="question-number">Question ${this.currentQuestionIndex + 1}</div>
                    <div class="question-points">${question.points || 1} point${(question.points || 1) !== 1 ? 's' : ''}</div>
                </div>
                <div class="question-text">${question.questionText}</div>
                <div class="options-container">
                    ${this.renderQuestionOptions(question)}
                </div>
            </div>
        `;

        this.quizQuestions.innerHTML = questionHtml;
        this.bindOptionEvents();
    }

    renderQuestionOptions(question) {
        if (question.questionType === 'multiple-choice') {
            return question.options.map((option, index) => `
                <div class="option ${this.isOptionSelected(option.text) ? 'selected' : ''}" 
                     onclick="selectOption('${option.text}')">
                    <input type="radio" name="question-${this.currentQuestionIndex}" 
                           value="${option.text}" ${this.isOptionSelected(option.text) ? 'checked' : ''}>
                    <span class="option-text">${option.text}</span>
                </div>
            `).join('');
        } else if (question.questionType === 'true-false') {
            return `
                <div class="option ${this.isOptionSelected('true') ? 'selected' : ''}" 
                     onclick="selectOption('true')">
                    <input type="radio" name="question-${this.currentQuestionIndex}" 
                           value="true" ${this.isOptionSelected('true') ? 'checked' : ''}>
                    <span class="option-text">True</span>
                </div>
                <div class="option ${this.isOptionSelected('false') ? 'selected' : ''}" 
                     onclick="selectOption('false')">
                    <input type="radio" name="question-${this.currentQuestionIndex}" 
                           value="false" ${this.isOptionSelected('false') ? 'checked' : ''}>
                    <span class="option-text">False</span>
                </div>
            `;
        }
        return '';
    }

    bindOptionEvents() {
        // Make selectOption globally available
        window.selectOption = (value) => {
            this.userAnswers[this.currentQuestionIndex] = value;
            this.renderCurrentQuestion(); // Re-render to show selection
            this.updateNavigation();
        };
    }

    isOptionSelected(value) {
        return this.userAnswers[this.currentQuestionIndex] === value;
    }

    updateNavigation() {
        const totalQuestions = this.currentQuiz.questions.length;
        const progress = ((this.currentQuestionIndex + 1) / totalQuestions) * 100;

        this.progressText.textContent = `Question ${this.currentQuestionIndex + 1} of ${totalQuestions}`;
        this.progressFill.style.width = `${progress}%`;

        // Update button states
        this.prevBtn.disabled = this.currentQuestionIndex === 0;
        this.nextBtn.style.display = this.currentQuestionIndex === totalQuestions - 1 ? 'none' : 'inline-flex';
        this.submitBtn.style.display = this.currentQuestionIndex === totalQuestions - 1 ? 'inline-flex' : 'none';
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderCurrentQuestion();
            this.updateNavigation();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderCurrentQuestion();
            this.updateNavigation();
        }
    }

    startTimer() {
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.submitQuiz(true); // Auto-submit when time runs out
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Change color when time is running low
        if (this.timeRemaining <= 300) { // 5 minutes
            this.quizTimer.style.background = '#dc3545';
        } else if (this.timeRemaining <= 600) { // 10 minutes
            this.quizTimer.style.background = '#ffc107';
        }
    }

    async submitQuiz(autoSubmit = false) {
        if (!autoSubmit && !confirm('Are you sure you want to submit your quiz? You cannot change your answers after submission.')) {
            return;
        }

        this.endTime = new Date();
        clearInterval(this.timerInterval);

        try {
            const results = this.calculateResults();
            await this.saveQuizResults(results);
            this.displayResults(results);
        } catch (error) {
            console.error('Error submitting quiz:', error);
            this.showError('Failed to submit quiz: ' + error.message);
        }
    }

    calculateResults() {
        let correctAnswers = 0;
        let totalPoints = 0;
        let earnedPoints = 0;

        this.currentQuiz.questions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            
            if (isCorrect) {
                correctAnswers++;
                earnedPoints += question.points || 1;
            }
            totalPoints += question.points || 1;
        });

        const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const passed = percentage >= this.currentQuiz.passingScore;
        const timeTaken = Math.round((this.endTime - this.startTime) / 1000);

        return {
            correctAnswers,
            totalQuestions: this.currentQuiz.questions.length,
            earnedPoints,
            totalPoints,
            percentage,
            passed,
            timeTaken,
            answers: this.userAnswers
        };
    }

    async saveQuizResults(results) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const quizId = urlParams.get('id');
            const quizType = urlParams.get('type');
            const courseId = urlParams.get('course');

            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`/courses/${courseId}/quiz/${quizType}/${quizId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(results)
            });

            if (!response.ok) {
                throw new Error('Failed to save quiz results');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to save quiz results');
            }
        } catch (error) {
            console.error('Error saving quiz results:', error);
            // Continue to show results even if saving fails
        }
    }

    displayResults(results) {
        // Hide quiz, show results
        this.quizQuestions.style.display = 'none';
        this.quizNavigation.style.display = 'none';
        this.quizTimer.style.display = 'none';
        this.quizComplete.style.display = 'block';

        // Display results
        this.finalScore.textContent = `${results.percentage}%`;
        this.correctCount.textContent = results.correctAnswers;
        this.totalCount.textContent = results.totalQuestions;
        this.timeTaken.textContent = this.formatTime(results.timeTaken);
        this.passStatus.textContent = results.passed ? 'PASSED' : 'FAILED';
        this.passStatus.style.color = results.passed ? '#28a745' : '#dc3545';

        // Update final score color
        this.finalScore.style.color = results.passed ? '#28a745' : '#dc3545';
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    reviewAnswers() {
        // Implementation for reviewing answers
        alert('Review functionality will be implemented');
    }

    retakeQuiz() {
        if (confirm('Are you sure you want to retake this quiz? Your current results will be replaced.')) {
            location.reload();
        }
    }

    showError(message) {
        alert('Error: ' + message);
        // Could be enhanced with a proper error display
    }
}

// Initialize quiz engine when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuizEngine();
});
