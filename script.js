// Demo accounts
const DEMO_ACCOUNTS = {
    admin: {
        username: 'admin',
        password: 'admin123',
        role: 'admin'
    },
    student: {
        username: 'student',
        password: 'student123',
        role: 'student'
    }
};

// Initialize data from localStorage or use defaults
let appData = {
    tasks: [],
    submissions: []
};

// Load data from localStorage on page load
function loadData() {
    const savedData = localStorage.getItem('quizzerData');
    if (savedData) {
        appData = JSON.parse(savedData);
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('quizzerData', JSON.stringify(appData));
}

// Current user
let currentUser = null;

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };

    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span> ${message}`;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            toast.classList.remove('show', 'hide');
            toast.classList.add('hidden');
        }, 400);
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
    showLoginPage();
});

// Setup event listeners
function setupEventListeners() {
    // Role buttons
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Login form
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });

    // Create task form
    document.getElementById('create-task-form').addEventListener('submit', function(e) {
        e.preventDefault();
        createTask();
    });

    // Admin nav buttons
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            switchAdminView(view);
        });
    });
}

// Login function
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const selectedRole = document.querySelector('.role-btn.active').dataset.role;

    // Check demo accounts
    if (selectedRole === 'admin' && DEMO_ACCOUNTS.admin.username === username && DEMO_ACCOUNTS.admin.password === password) {
        currentUser = { username, role: 'admin' };
        showAdminDashboard();
    } else if (selectedRole === 'student' && DEMO_ACCOUNTS.student.username === username && DEMO_ACCOUNTS.student.password === password) {
        currentUser = { username, role: 'student' };
        showStudentDashboard();
    } else {
        alert('Invalid credentials. Please check your username and password.');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}

// Show login page
function showLoginPage() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('student-dashboard').classList.add('hidden');
}

// Show admin dashboard
function showAdminDashboard() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('student-dashboard').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    document.getElementById('create-task-form').reset();
    resetAnswerInputs();
    renderAdminTasks();
}

// Show student dashboard
function showStudentDashboard() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('student-dashboard').classList.remove('hidden');
    renderStudentTasks();
}

// Logout
function logout() {
    currentUser = null;
    // Clear auto-refresh interval when logging out
    if (submissionRefreshInterval) {
        clearInterval(submissionRefreshInterval);
        submissionRefreshInterval = null;
    }
    showLoginPage();
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Reset answer inputs to default state
function resetAnswerInputs() {
    const container = document.getElementById('answers-container');
    container.innerHTML = `
        <div class="answer-input-group">
            <input type="text" class="answer-input" placeholder="Answer option 1" required>
            <button type="button" class="btn-remove" onclick="removeAnswer(this)">Remove</button>
        </div>
    `;
}

// Add answer input
function addAnswerInput() {
    const container = document.getElementById('answers-container');
    const count = container.children.length + 1;
    
    const newInput = document.createElement('div');
    newInput.className = 'answer-input-group';
    newInput.innerHTML = `
        <input type="text" class="answer-input" placeholder="Answer option ${count}" required>
        <button type="button" class="btn-remove" onclick="removeAnswer(this)">Remove</button>
    `;
    
    container.appendChild(newInput);
}

// Remove answer input
function removeAnswer(button) {
    const container = document.getElementById('answers-container');
    if (container.children.length > 1) {
        button.parentElement.remove();
    } else {
        showToast('You must have at least one answer option.', 'error');
    }
}

// Create task
function createTask() {
    const taskText = document.getElementById('task-text').value;
    const taskType = document.getElementById('task-type').value;
    const imageFile = document.getElementById('task-image').files[0];
    
    if (!taskText.trim()) {
        showToast('Please enter a task text.', 'error');
        return;
    }
    
    let task = {
        id: Date.now(),
        text: taskText,
        type: taskType,
        createdBy: currentUser.username,
        createdAt: new Date().toLocaleString(),
        image: null
    };

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            task.image = e.target.result;
            finishTaskCreation(task, taskType);
        };
        reader.readAsDataURL(imageFile);
    } else {
        finishTaskCreation(task, taskType);
    }
}

function finishTaskCreation(task, taskType) {
    if (taskType === 'multiple-choice') {
        const answerInputs = document.querySelectorAll('.answer-input');
        const answers = [];

        answerInputs.forEach(input => {
            if (input.value.trim()) {
                answers.push(input.value.trim());
            }
        });

        if (answers.length < 2) {
            showToast('Please provide at least 2 answer options.', 'error');
            return;
        }

        task.answers = answers;
    }

    // Add to data
    appData.tasks.push(task);
    saveData();

    // Reset form
    document.getElementById('create-task-form').reset();
    document.getElementById('image-preview').style.display = 'none';
    resetAnswerInputs();
    updateTaskTypeUI();

    // Show success toast and switch to View Tasks tab
    showToast('Task created successfully! ✓', 'success');
    
    // Switch to View Tasks tab after a short delay to let the user see the toast
    setTimeout(() => {
        switchAdminView('view-tasks');
    }, 800);
}

function previewTaskImage() {
    const imageInput = document.getElementById('task-image');
    const previewDiv = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewDiv.style.display = 'block';
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        previewDiv.style.display = 'none';
    }
}

// Render admin tasks
function renderAdminTasks() {
    const container = document.getElementById('admin-tasks-list');
    
    if (appData.tasks.length === 0) {
        container.innerHTML = '<div class="no-submissions">📋 No tasks created yet. Create your first task to get started!</div>';
        return;
    }

    let html = '';
    appData.tasks.forEach((task, index) => {
        const typeLabel = task.type === 'multiple-choice' ? '🎯 Multiple Choice' : '📄 Text Input';
        const answersHtml = task.type === 'multiple-choice' 
            ? `<div class="answers-section" style="margin-top: 15px;">
                    <h4 style="margin-bottom: 10px;">Answer Options:</h4>
                    ${task.answers.map((answer, answerIndex) => {
                        const isCorrect = task.correctAnswer === answer;
                        return `
                        <div class="answer-option" style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${answerIndex + 1}.</strong> ${escapeHtml(answer)}
                                ${isCorrect ? '<span style="color: #4CAF50; font-weight: bold; margin-left: 10px;">✓ Correct</span>' : ''}
                            </div>
                            <button class="btn-secondary" style="padding: 4px 12px; font-size: 12px;" onclick="setCorrectAnswer(${task.id}, '${escapeHtml(answer).replace(/'/g, "\\'")}')">
                                ${isCorrect ? 'Unset' : 'Set Correct'}
                            </button>
                        </div>
                        `;
                    }).join('')}
                </div>`
            : `<div class="answers-section" style="margin-top: 15px;">
                    <p style="color: #8b5cf6; font-weight: 600; font-size: 0.9em;">✏️ Students will type their answer</p>
                    ${task.correctAnswer ? `<p style="color: #4CAF50; font-weight: 600; margin-top: 10px;">✓ Correct Answer: ${escapeHtml(task.correctAnswer)}</p>` : ''}
                    <input type="text" id="correct-answer-${task.id}" placeholder="Enter correct answer..." style="width: 100%; padding: 10px; margin-top: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <button class="btn-secondary" style="margin-top: 10px; width: 100%; padding: 10px;" onclick="setTextCorrectAnswer(${task.id})">Set Correct Answer</button>
                </div>`;

        html += `
        <div class="task-card">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 12px 0;">Task #${index + 1}</h3>
                    <div class="task-text"><strong>📝 Question:</strong> ${escapeHtml(task.text)}</div>
                    ${task.image ? `<img src="${task.image}" style="max-width: 100%; max-height: 300px; margin-top: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">` : ''}
                </div>
                <span style="background: #8b5cf6; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; margin-left: 15px;">
                    ${typeLabel}
                </span>
            </div>
            ${answersHtml}
            <div style="font-size: 0.85em; color: #999; margin-top: 15px; display: flex; gap: 15px;">
                <span>👤 Created by: ${escapeHtml(task.createdBy)}</span>
                <span>📅 ${task.createdAt}</span>
            </div>
            <div class="admin-actions">
                <button class="btn-delete" onclick="deleteTask(${task.id})">Delete Task</button>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}

// Render student tasks
function renderStudentTasks() {
    const container = document.getElementById('student-tasks-list');
    
    // Check if student has already submitted for ALL current tasks
    const currentTaskIds = new Set(appData.tasks.map(t => t.id));
    const studentSubmissions = appData.submissions.filter(sub => sub.studentName === currentUser.username);
    const submittedTaskIds = new Set(studentSubmissions.map(sub => sub.taskId));
    
    // Block submission only if student has submitted all current tasks
    const hasSubmittedAll = appData.tasks.length > 0 && 
                            appData.tasks.every(task => submittedTaskIds.has(task.id));
    
    if (hasSubmittedAll && appData.tasks.length > 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 80px; margin-bottom: 20px;">✓</div>
                <h2 style="font-size: 28px; margin: 0 0 15px 0; color: #4CAF50;">You Have Already Submitted!</h2>
                <p style="font-size: 16px; color: #666; margin: 0;">Your answers have been recorded and submitted to the teacher.</p>
                <p style="font-size: 14px; color: #999; margin-top: 20px;">You cannot submit again.</p>
            </div>
        `;
        return;
    }
    
    if (appData.tasks.length === 0) {
        container.innerHTML = '<p class="empty-state">No tasks available yet</p>';
        return;
    }

    let html = '<form id="all-tasks-form">';
    
    appData.tasks.forEach((task, index) => {
        let answerHtml = '';
        
        if (task.type === 'multiple-choice') {
            answerHtml = `
                <div class="answers-section" style="margin-top: 15px;">
                    <h4>Select your answer:</h4>
                    ${task.answers.map((answer, answerIndex) => `
                        <div class="answer-choice">
                            <input type="radio" id="task-${task.id}-answer-${answerIndex}" name="task-${task.id}-answer" value="${escapeHtml(answer)}" required>
                            <label for="task-${task.id}-answer-${answerIndex}" style="margin: 0; cursor: pointer;">${escapeHtml(answer)}</label>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            answerHtml = `
                <div class="answers-section" style="margin-top: 15px;">
                    <h4>Type your answer:</h4>
                    <input type="text" id="task-${task.id}-text-answer" name="task-${task.id}-answer" placeholder="Type your answer here..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" required>
                </div>
            `;
        }

        html += `
        <div class="task-card">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 12px 0;">Task #${index + 1}</h3>
                    <div class="task-text"><strong>📝 Question:</strong> ${escapeHtml(task.text)}</div>
                    ${task.image ? `<img src="${task.image}" style="max-width: 100%; max-height: 300px; margin-top: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">` : ''}
                </div>
                <span style="background: #8b5cf6; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; margin-left: 15px;">
                    ${task.type === 'multiple-choice' ? '🎯 Multiple Choice' : '📄 Text Input'}
                </span>
            </div>
            ${answerHtml}
        </div>
        `;
    });

    html += `
        <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: center;">
            <button type="submit" class="btn-primary" style="padding: 12px 30px; font-size: 16px; font-weight: 600;">✓ Submit All Answers</button>
        </div>
    </form>`;

    container.innerHTML = html;

    // Add form submission handler
    const form = document.getElementById('all-tasks-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            submitAllAnswers();
        });
    }
}

// Submit all answers at once
function submitAllAnswers() {
    console.log('submitAllAnswers called');
    const submissions = [];
    let allAnswered = true;

    appData.tasks.forEach(task => {
        let answer = '';
        
        if (task.type === 'multiple-choice') {
            const selectedRadio = document.querySelector(`input[name="task-${task.id}-answer"]:checked`);
            if (!selectedRadio) {
                console.log('Task ' + task.id + ' not answered (multiple choice)');
                allAnswered = false;
                return;
            }
            answer = selectedRadio.value;
        } else {
            const textInput = document.getElementById(`task-${task.id}-text-answer`);
            if (!textInput) {
                console.log('Text input not found for task ' + task.id);
                allAnswered = false;
                return;
            }
            answer = textInput.value.trim();
            if (!answer) {
                console.log('Task ' + task.id + ' not answered (text input)');
                allAnswered = false;
                return;
            }
        }

        const submission = {
            id: Date.now() + Math.random(),
            studentName: currentUser.username,
            taskId: task.id,
            taskText: task.text,
            taskType: task.type,
            answer: answer,
            submittedAt: new Date().toLocaleString()
        };
        
        console.log('Adding submission for task ' + task.id);
        submissions.push(submission);
    });

    console.log('All answered: ' + allAnswered + ', Submissions count: ' + submissions.length);

    if (!allAnswered) {
        showToast('Please answer all questions before submitting.', 'error');
        return;
    }

    // Add all submissions to data
    appData.submissions.push(...submissions);
    saveData();

    console.log('Showing success screen with ' + submissions.length + ' submissions');
    // Show success screen with all submissions
    showBulkSubmissionSuccess(submissions);
}

// Delete task
function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        appData.tasks = appData.tasks.filter(task => task.id !== taskId);
        saveData();
        renderAdminTasks();
        showToast('Task deleted successfully!', 'success');
    }
}

// Set correct answer for multiple choice task
function setCorrectAnswer(taskId, answer) {
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (task.correctAnswer === answer) {
        // Unset if clicking the same answer
        task.correctAnswer = null;
        showToast('Correct answer removed', 'info');
    } else {
        task.correctAnswer = answer;
        showToast('Correct answer set: ' + answer, 'success');
    }
    
    saveData();
    renderAdminTasks();
}

// Set correct answer for text input task
function setTextCorrectAnswer(taskId) {
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const input = document.getElementById(`correct-answer-${taskId}`);
    const answer = input.value.trim();
    
    if (!answer) {
        showToast('Please enter an answer', 'error');
        return;
    }
    
    task.correctAnswer = answer;
    saveData();
    renderAdminTasks();
    showToast('Correct answer set', 'success');
}

// Allow student to retake the quiz
function allowStudentRetake(studentName) {
    if (confirm(`Are you sure you want to allow ${studentName} to retake the quiz? Their previous submissions will be deleted.`)) {
        // Remove all submissions for this student
        appData.submissions = appData.submissions.filter(sub => sub.studentName !== studentName);
        saveData();
        renderAdminSubmissions();
        showToast(`${studentName} can now retake the quiz!`, 'success');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-refresh interval ID
let submissionRefreshInterval = null;

// Switch admin view
function switchAdminView(view) {
    // Clear any existing refresh interval
    if (submissionRefreshInterval) {
        clearInterval(submissionRefreshInterval);
        submissionRefreshInterval = null;
    }

    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    document.querySelectorAll('.admin-view').forEach(v => {
        v.classList.add('hidden');
    });
    document.getElementById(`view-${view}`).classList.remove('hidden');

    if (view === 'view-tasks') {
        renderAdminTasks();
    } else if (view === 'view-submissions') {
        renderAdminSubmissions();
        // Auto-refresh submissions every 2 seconds
        submissionRefreshInterval = setInterval(() => {
            renderAdminSubmissions();
        }, 2000);
    }
}

// Refresh submissions manually
function refreshSubmissions() {
    renderAdminSubmissions();
}

// Update task type UI
function updateTaskTypeUI() {
    const taskType = document.getElementById('task-type').value;
    const multipleChoiceSection = document.getElementById('multiple-choice-section');
    const textInputSection = document.getElementById('text-input-section');
    const addAnswerBtn = document.getElementById('add-answer-btn');
    const answerInputs = document.querySelectorAll('.answer-input');

    if (taskType === 'multiple-choice') {
        multipleChoiceSection.classList.remove('hidden');
        textInputSection.classList.add('hidden');
        addAnswerBtn.style.display = 'block';
        // Make answer inputs required for multiple choice
        answerInputs.forEach(input => {
            input.setAttribute('required', 'required');
        });
    } else {
        multipleChoiceSection.classList.add('hidden');
        textInputSection.classList.remove('hidden');
        addAnswerBtn.style.display = 'none';
        // Remove required from answer inputs for text input
        answerInputs.forEach(input => {
            input.removeAttribute('required');
        });
    }
}

// Start task submission
function startTaskSubmission(taskId) {
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task) return;

    const submissionContent = document.getElementById('submission-content');
    let html = `<div class="task-submission">
        <h3>Task #${appData.tasks.indexOf(task) + 1}</h3>
        <div class="task-question">${escapeHtml(task.text)}</div>`;

    if (task.type === 'multiple-choice') {
        html += `<form id="submission-form">`;
        task.answers.forEach((answer, index) => {
            html += `
                <div class="answer-choice">
                    <input type="radio" id="answer-${index}" name="answer" value="${escapeHtml(answer)}" required>
                    <label for="answer-${index}">${escapeHtml(answer)}</label>
                </div>
            `;
        });
        html += `
                <button type="submit" class="btn-submit-answer">Submit Answer</button>
            </form>
        </div>`;
    } else if (task.type === 'text-input') {
        html += `
            <form id="submission-form">
                <div class="text-input-answer">
                    <input type="text" id="text-answer" placeholder="Type your answer here..." required>
                </div>
                <button type="submit" class="btn-submit-answer">Submit Answer</button>
            </form>
        </div>`;
    }

    submissionContent.innerHTML = html;

    document.getElementById('student-tasks-view').classList.add('hidden');
    document.getElementById('student-submission-view').classList.remove('hidden');

    document.getElementById('submission-form').addEventListener('submit', function(e) {
        e.preventDefault();
        submitTaskAnswer(task);
    });
}

// Submit task answer (kept for backward compatibility with old submission view)
function submitTaskAnswer(task) {
    let answer;
    
    if (task.type === 'multiple-choice') {
        answer = document.querySelector('input[name="answer"]:checked').value;
    } else {
        answer = document.getElementById('text-answer').value.trim();
    }

    const submission = {
        id: Date.now(),
        studentName: currentUser.username,
        taskId: task.id,
        taskText: task.text,
        taskType: task.type,
        answer: answer,
        submittedAt: new Date().toLocaleString()
    };

    appData.submissions.push(submission);
    saveData();

    // Show success screen with submission details
    showSubmissionSuccess(submission);
}

// Show submission success screen
function showSubmissionSuccess(submission) {
    const detailsHtml = `
        <p style="font-size: 18px; margin: 20px 0;">Student <strong>${escapeHtml(submission.studentName)}</strong> submitted the work!</p>
        <div style="background: rgba(255,255,255,0.2); padding: 16px; border-radius: 8px; text-align: left; max-width: 500px; margin: 20px auto;">
            <p style="margin: 10px 0;"><strong>Question:</strong></p>
            <p style="margin: 0 0 15px 0; font-size: 15px;">${escapeHtml(submission.taskText)}</p>
            
            <p style="margin: 15px 0 10px 0;"><strong>Your Answer:</strong></p>
            <p style="margin: 0; font-size: 15px; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px;">${escapeHtml(submission.answer)}</p>
            
            <p style="margin: 15px 0 0 0; font-size: 13px; opacity: 0.9;">✓ Submitted at ${submission.submittedAt}</p>
        </div>
    `;
    
    document.getElementById('success-details').innerHTML = detailsHtml;
    document.getElementById('student-submission-view').classList.add('hidden');
    document.getElementById('student-tasks-view').classList.add('hidden');
    document.getElementById('student-success-view').classList.remove('hidden');
}

// Show bulk submission success screen
function showBulkSubmissionSuccess(submissions) {
    console.log('showBulkSubmissionSuccess called with ' + submissions.length + ' submissions');
    
    let submissionsHtml = submissions.map((sub, index) => `
        <div style="background: white; color: #333; padding: 16px; border-radius: 8px; margin-bottom: 15px; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: start; gap: 12px;">
                <span style="font-size: 20px;">✓</span>
                <div style="flex: 1;">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #333;">Question ${index + 1}</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px; color: #555;">${escapeHtml(sub.taskText)}</p>
                    <p style="margin: 0; font-size: 14px; background: #f5f5f5; padding: 10px; border-left: 3px solid #8b5cf6; border-radius: 4px;">
                        <strong>Your Answer:</strong> ${escapeHtml(sub.answer)}
                    </p>
                </div>
            </div>
        </div>
    `).join('');

    const detailsHtml = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 60px; margin-bottom: 15px; animation: scaleIn 0.6s ease-out;">✓</div>
            <h2 style="font-size: 28px; margin: 0 0 10px 0;">All Answers Submitted!</h2>
            <p style="font-size: 16px; margin: 0; opacity: 0.95;">Your submission has been recorded and saved.</p>
        </div>

        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
            <p style="font-size: 15px; margin: 0; opacity: 0.95;">
                <strong>${escapeHtml(submissions[0].studentName)}</strong> submitted <strong>${submissions.length}</strong> answer${submissions.length > 1 ? 's' : ''} on <strong>${submissions[0].submittedAt}</strong>
            </p>
        </div>

        <div style="max-width: 650px; margin: 0 auto; text-align: left;">
            <h3 style="color: white; font-size: 16px; margin-bottom: 15px;">Your Submitted Answers:</h3>
            ${submissionsHtml}
        </div>
    `;
    
    console.log('Setting success details HTML');
    document.getElementById('success-details').innerHTML = detailsHtml;
    console.log('Hiding student-submission-view');
    document.getElementById('student-submission-view').classList.add('hidden');
    console.log('Hiding student-tasks-view');
    document.getElementById('student-tasks-view').classList.add('hidden');
    console.log('Showing student-success-view');
    const successView = document.getElementById('student-success-view');
    console.log('Success view element:', successView);
    successView.classList.remove('hidden');
    console.log('Success view shown');
}

// Back to tasks list
function backToTasksList() {
    document.getElementById('student-submission-view').classList.add('hidden');
    document.getElementById('student-tasks-view').classList.remove('hidden');
    document.getElementById('student-success-view').classList.add('hidden');
    renderStudentTasks();
}

// Render admin submissions
function calculateStudentScore(studentName) {
    // Get all submissions for this student
    const studentSubmissions = appData.submissions.filter(sub => sub.studentName === studentName);
    
    let correctCount = 0;
    let totalCount = 0;
    
    // Group submissions by task (get latest for each task)
    const taskSubmissions = {};
    studentSubmissions.forEach(sub => {
        if (!taskSubmissions[sub.taskId]) {
            taskSubmissions[sub.taskId] = sub;
        }
    });
    
    // Calculate score
    Object.keys(taskSubmissions).forEach(taskId => {
        const sub = taskSubmissions[taskId];
        const task = appData.tasks.find(t => t.id == taskId);
        
        // Only count if task exists and has a correct answer set
        if (task && task.correctAnswer) {
            totalCount++;
            
            // Check if answer is correct
            if (task.type === 'multiple-choice') {
                if (sub.answer === task.correctAnswer) {
                    correctCount++;
                }
            } else {
                if (sub.answer.toLowerCase() === task.correctAnswer.toLowerCase()) {
                    correctCount++;
                }
            }
        }
    });
    
    return { correct: correctCount, total: totalCount };
}

function renderAdminSubmissions() {
    const container = document.getElementById('admin-submissions-list');
    
    if (appData.submissions.length === 0) {
        container.innerHTML = '<div class="no-submissions">📭 No submissions yet. Students will submit their answers here.</div>';
        return;
    }

    // Group submissions by student
    const submissionsByStudent = {};
    appData.submissions.forEach(submission => {
        if (!submissionsByStudent[submission.studentName]) {
            submissionsByStudent[submission.studentName] = [];
        }
        submissionsByStudent[submission.studentName].push(submission);
    });

    let html = '';
    Object.keys(submissionsByStudent).forEach(studentName => {
        const studentSubmissions = submissionsByStudent[studentName];
        const latestSubmission = studentSubmissions[studentSubmissions.length - 1];
        const score = calculateStudentScore(studentName);
        
        // Determine score color based on percentage
        let scoreColor = '#8b5cf6';
        let scoreBackground = '#f3e8ff';
        if (score.total > 0) {
            const percentage = (score.correct / score.total) * 100;
            if (percentage === 100) {
                scoreColor = '#4CAF50';
                scoreBackground = '#e8f5e9';
            } else if (percentage >= 70) {
                scoreColor = '#ff9800';
                scoreBackground = '#fff3e0';
            } else if (percentage < 50) {
                scoreColor = '#f44336';
                scoreBackground = '#ffebee';
            }
        }

        html += `<div class="student-submission-group">
            <div class="student-submission-header">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                    <span style="font-size: 20px;">👤</span>
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">${escapeHtml(studentName)}</h3>
                        <p style="margin: 0; font-size: 12px; color: #999;">Submitted ${studentSubmissions.length} answer${studentSubmissions.length > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: ${scoreBackground}; border: 2px solid ${scoreColor}; padding: 8px 14px; border-radius: 8px; text-align: center; min-width: 100px;">
                        <p style="margin: 0; font-size: 12px; color: #666;">Score</p>
                        <p style="margin: 4px 0 0 0; font-size: 22px; font-weight: 700; color: ${scoreColor};">${score.correct}/${score.total}</p>
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #999;">📅 ${latestSubmission.submittedAt}</p>
                    <button class="btn-secondary" style="padding: 6px 14px; font-size: 12px;" onclick="allowStudentRetake('${studentName}')">🔄 Allow Retake</button>
                </div>
            </div>`;

        // Group this student's submissions by task
        const taskSubmissions = {};
        studentSubmissions.forEach(sub => {
            if (!taskSubmissions[sub.taskId]) {
                taskSubmissions[sub.taskId] = sub;
            }
        });

        Object.keys(taskSubmissions).forEach(taskId => {
            const sub = taskSubmissions[taskId];
            const task = appData.tasks.find(t => t.id == taskId);
            
            // Skip if task was deleted
            if (!task) return;
            
            // Check if answer is correct
            let isCorrect = false;
            let resultDisplay = '';
            
            if (task.correctAnswer) {
                // For both multiple choice and text input, compare answers (case-insensitive for text input)
                if (task.type === 'multiple-choice') {
                    isCorrect = sub.answer === task.correctAnswer;
                } else {
                    isCorrect = sub.answer.toLowerCase() === task.correctAnswer.toLowerCase();
                }
                
                const resultColor = isCorrect ? '#4CAF50' : '#f44336';
                const resultIcon = isCorrect ? '✓' : '✗';
                const resultText = isCorrect ? 'CORRECT' : 'WRONG';
                
                resultDisplay = `<div style="display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 10px; background: ${resultColor}20; border-left: 4px solid ${resultColor}; border-radius: 4px;">
                    <span style="font-size: 20px; color: ${resultColor};">${resultIcon}</span>
                    <strong style="color: ${resultColor};">${resultText}</strong>
                    ${!isCorrect ? `<span style="color: #666; font-size: 13px;">(Correct: ${escapeHtml(task.correctAnswer)})</span>` : ''}
                </div>`;
            }
            
            html += `<div class="submission-item">
                <div style="display: flex; align-items: start; gap: 10px;">
                    <span style="font-size: 16px; margin-top: 2px;">✓</span>
                    <div style="flex: 1;">
                        <p style="margin: 0 0 6px 0; font-weight: 600; color: #333;">
                            ${escapeHtml(task.text)}
                        </p>
                        <p style="margin: 0; font-size: 13px; color: #999;">
                            ${sub.taskType === 'multiple-choice' ? '🎯 Multiple Choice' : '📄 Text Input'}
                        </p>
                        <div style="background: #f5f5f5; border-left: 3px solid #8b5cf6; padding: 10px; margin-top: 8px; border-radius: 4px;">
                            <strong style="color: #333;">Student's Answer:</strong>
                            <p style="margin: 4px 0 0 0; color: #555;">${escapeHtml(sub.answer)}</p>
                        </div>
                        ${resultDisplay}
                    </div>
                </div>
            </div>`;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
}
