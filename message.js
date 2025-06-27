// Enhanced Messages functionality for AgriLearn with full CRUD operations
class MessagesManager {
    constructor() {
        this.currentUser = null;
        this.currentConversation = null;
        this.conversations = [];
        this.messages = [];
        this.users = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.isLoading = false;
        this.messagePollingInterval = null;
        this.API_BASE = 'http://localhost:5000';

        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            this.init();
        });
    }

    async init() {
        try {
            await this.checkAuth();
            await this.loadUsers();
            this.setupEventListeners();
            this.setupModalEventListeners();
            this.setupSearchFunctionality();
            await this.loadConversations();
            this.startMessagePolling();
            this.showNotification('Messages loaded successfully!', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Failed to initialize messages: ' + error.message, 'error');
        }
    }

    // Authentication and User Management
    async checkAuth() {
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

        this.currentUser = user;
    }

    async loadUsers() {
        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`${this.API_BASE}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success) {
                this.users = data.users;
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Failed to load users: ' + error.message, 'error');
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        this.setupConversationSwitching();
        this.setupMessageSending();
        this.setupMessageFilters();
        this.setupKeyboardShortcuts();
    }

    setupModalEventListeners() {
        this.setupComposeModal();
        this.setupDeleteConfirmModal();
        this.setupUserSearchModal();
    }

    setupSearchFunctionality() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.filterConversations();
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N for new message
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openComposeModal();
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    setupConversationSwitching() {
        // This will be called after conversations are loaded
        const conversationItems = document.querySelectorAll('.conversation-item');

        conversationItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Remove active class from all conversations
                conversationItems.forEach(conv => conv.classList.remove('active'));

                // Add active class to clicked conversation
                item.classList.add('active');

                // Load conversation messages
                const conversationId = item.dataset.conversation;
                this.loadConversation(conversationId);

                // Mark as read
                this.markConversationAsRead(item);
            });

            // Add context menu for conversation actions
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showConversationContextMenu(e, item);
            });
        });
    }

    // CRUD Operations - READ
    async loadConversations() {
        try {
            this.setLoading(true);
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`${this.API_BASE}/messages/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.conversations = data.conversations;
                this.renderConversations(this.conversations);

                // Load first conversation if available
                if (this.conversations.length > 0) {
                    await this.loadConversation(this.conversations[0].user._id);
                }
            } else {
                throw new Error(data.message || 'Failed to load conversations');
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showNotification('Failed to load conversations: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async loadConversation(userId) {
        try {
            this.currentConversation = userId;
            this.setLoading(true);

            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`${this.API_BASE}/messages?conversation=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.messages = data.messages;
                this.renderMessages(this.messages);

                // Update conversation header
                const conversation = this.conversations.find(c => c.user._id === userId);
                if (conversation) {
                    this.updateConversationHeader(conversation.user);
                }

                // Mark messages as read
                await this.markConversationMessagesAsRead(userId);
            } else {
                throw new Error(data.message || 'Failed to load messages');
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
            this.showNotification('Failed to load conversation: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // UI Rendering Methods
    renderConversations(conversations) {
        const container = document.querySelector('.conversations-list');
        if (!container) return;

        if (conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No conversations yet</h3>
                    <p>Start a conversation with your students or colleagues.</p>
                    <button type="button" class="btn btn-primary" onclick="messagesManager.openComposeModal()">
                        <i class="fas fa-plus"></i> Start Conversation
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = conversations.map(conv => `
            <div class="conversation-item" data-conversation="${conv.user._id}" data-user-role="${conv.user.role}">
                <div class="conversation-avatar">
                    <img src="${conv.user.avatar || 'images/default-avatar.png'}" alt="${conv.user.name}">
                    <span class="status-indicator ${conv.user.status || 'offline'}"></span>
                </div>
                <div class="conversation-content">
                    <div class="conversation-header">
                        <h4>${conv.user.name}</h4>
                        <span class="conversation-time">${this.formatMessageTime(conv.lastMessageDate)}</span>
                    </div>
                    <div class="conversation-preview">
                        <p>${conv.lastMessage || 'No messages yet'}</p>
                        <div class="conversation-meta">
                            <span class="user-role">${conv.user.role}</span>
                            ${conv.unreadCount > 0 ? `<span class="unread-count">${conv.unreadCount}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="conversation-actions">
                    <button type="button" class="btn-icon" onclick="messagesManager.deleteConversation('${conv.user._id}')" title="Delete conversation">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Re-setup conversation switching
        this.setupConversationSwitching();
        this.filterConversations();
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }

        // Disable/enable buttons during loading
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
        });
    }

    async markConversationMessagesAsRead(userId) {
        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`${this.API_BASE}/messages/mark-all-read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversation: userId })
            });

            if (response.ok) {
                // Update local conversation data
                const conversation = this.conversations.find(c => c.user._id === userId);
                if (conversation) {
                    conversation.unreadCount = 0;
                }
                this.renderConversations(this.conversations);
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    filterConversations() {
        const conversationItems = document.querySelectorAll('.conversation-item');

        conversationItems.forEach(conversation => {
            let shouldShow = true;
            const userName = conversation.querySelector('h4').textContent.toLowerCase();
            const userRole = conversation.dataset.userRole;
            const hasUnread = conversation.querySelector('.unread-count') !== null;

            // Apply search filter
            if (this.searchQuery && !userName.includes(this.searchQuery)) {
                shouldShow = false;
            }

            // Apply category filter
            switch (this.currentFilter) {
                case 'unread':
                    shouldShow = shouldShow && hasUnread;
                    break;
                case 'students':
                    shouldShow = shouldShow && userRole === 'student';
                    break;
                case 'teachers':
                    shouldShow = shouldShow && userRole === 'teacher';
                    break;
                case 'marketplace':
                    // Filter marketplace-related conversations
                    shouldShow = shouldShow && userName.includes('seller') || userName.includes('buyer');
                    break;
                case 'courses':
                    // Filter course-related conversations
                    shouldShow = shouldShow && userRole === 'student';
                    break;
                case 'all':
                default:
                    // Show all (already true)
                    break;
            }

            conversation.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    renderMessages(messages) {
        const container = document.querySelector('.chat-messages');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment"></i>
                    <h3>No messages yet</h3>
                    <p>Start the conversation by sending a message.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(message => {
            const isFromCurrentUser = message.from._id === this.currentUser.id;
            const messageType = isFromCurrentUser ? 'sent' : 'received';

            // Render attachments if any
            const attachmentsHtml = message.attachments && message.attachments.length > 0 ? `
                <div class="message-attachments">
                    ${message.attachments.map(attachment => `
                        <div class="attachment-item">
                            <i class="fas fa-${this.getFileIcon(attachment.mimeType)}"></i>
                            <a href="${attachment.url}" target="_blank" download="${attachment.originalName}">
                                ${attachment.originalName}
                            </a>
                            <span class="attachment-size">(${this.formatFileSize(attachment.size)})</span>
                        </div>
                    `).join('')}
                </div>
            ` : '';

            return `
                <div class="message ${messageType}" data-message-id="${message._id}">
                    ${!isFromCurrentUser ? `
                        <div class="message-avatar">
                            <img src="${message.from.avatar || 'images/default-avatar.png'}" alt="${message.from.name}">
                        </div>
                    ` : ''}
                    <div class="message-content">
                        ${message.content ? `<p>${this.escapeHtml(message.content)}</p>` : ''}
                        ${attachmentsHtml}
                        <div class="message-meta">
                            <span class="message-time">${this.formatMessageTime(message.createdAt)}</span>
                            ${isFromCurrentUser ? `
                                <div class="message-actions">
                                    <button type="button" class="btn-icon" onclick="messagesManager.deleteMessage('${message._id}')" title="Delete message">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            ` : ''}
                            ${message.read ? '<i class="fas fa-check-double read-indicator"></i>' : '<i class="fas fa-check sent-indicator"></i>'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

function updateConversationHeader(user) {
    const header = document.querySelector('.conversation-header');
    if (!header) return;

    header.innerHTML = `
        <div class="conversation-user">
            <img src="${user.avatar || 'images/default-avatar.png'}" alt="${user.name}">
            <div class="user-info">
                <h3>${user.name}</h3>
                <span class="user-status">${user.role || 'User'}</span>
            </div>
        </div>
    `;
}

async function sendMessage(content, recipientId, files = null) {
    try {
        const token = localStorage.getItem('agrilearn_token');

        // Create FormData for file uploads
        const formData = new FormData();
        formData.append('to', recipientId);
        formData.append('content', content);

        // Add files if any
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                formData.append('attachments', files[i]);
            }
        }

        const response = await fetch('http://localhost:5000/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type for FormData, let browser set it with boundary
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
            // Reload the conversation to show the new message
            loadConversation(recipientId);
            return true;
        } else {
            throw new Error(data.message || 'Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message: ' + error.message);
        return false;
    }
}

function formatMessageTime(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return 'Today ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } else if (diffDays === 2) {
        return 'Yesterday ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } else if (diffDays <= 7) {
        return diffDays + ' days ago';
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

function showError(message) {
    // Create or update error notification
    let errorDiv = document.querySelector('.error-notification');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        document.body.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function markConversationAsRead(conversationItem) {
    const unreadBadge = conversationItem.querySelector('.unread-count');
    if (unreadBadge) {
        unreadBadge.remove();
    }

    const statusIcon = conversationItem.querySelector('.conversation-status i');
    if (statusIcon) {
        statusIcon.className = 'fas fa-check-circle';
    }
}

function setupMessageSending() {
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('message-files');
    const attachButton = document.getElementById('attach-files-btn');

    if (messageForm) {
        messageForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const messageText = messageInput.value.trim();
            const files = fileInput ? fileInput.files : null;

            if ((messageText || (files && files.length > 0)) && currentConversation) {
                const success = await sendMessage(messageText, currentConversation, files);
                if (success) {
                    messageInput.value = '';
                    if (fileInput) {
                        fileInput.value = '';
                        updateFilePreview([]);
                    }
                }
            }
        });
    }

    // File attachment handling
    if (attachButton && fileInput) {
        attachButton.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', function() {
            updateFilePreview(Array.from(this.files));
        });
    }

    // Auto-resize textarea
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });

        // Send on Enter (but not Shift+Enter)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                messageForm.dispatchEvent(new Event('submit'));
            }
        });
    }
}

function updateFilePreview(files) {
    const previewContainer = document.getElementById('file-preview');
    if (!previewContainer) return;

    if (files.length === 0) {
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'none';
        return;
    }

    previewContainer.style.display = 'block';
    previewContainer.innerHTML = files.map((file, index) => `
        <div class="file-preview-item">
            <div class="file-info">
                <i class="fas fa-${getFileIcon(file.type)}"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" class="remove-file-btn" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'file-archive';
    return 'file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removeFile(index) {
    const fileInput = document.getElementById('message-files');
    if (!fileInput) return;

    const dt = new DataTransfer();
    const files = Array.from(fileInput.files);

    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });

    fileInput.files = dt.files;
    updateFilePreview(Array.from(fileInput.files));
}

function setupConversationSwitching() {
    // This will be called after conversations are loaded
    const conversationItems = document.querySelectorAll('.conversation-item');

    conversationItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all conversations
            conversationItems.forEach(conv => conv.classList.remove('active'));

            // Add active class to clicked conversation
            this.classList.add('active');

            // Load conversation messages
            const conversationId = this.dataset.conversation;
            loadConversation(conversationId);

            // Mark as read
            markConversationAsRead(this);
        });
    });
}

function setupComposeModal() {
    const composeBtn = document.getElementById('compose-btn');
    const composeModal = document.getElementById('compose-modal');
    const composeForm = document.getElementById('compose-form');
    const cancelBtn = document.getElementById('cancel-compose');
    
    if (composeBtn) {
        composeBtn.addEventListener('click', function() {
            composeModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            composeModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            composeForm.reset();
        });
    }
    
    if (composeForm) {
        composeForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const recipientId = formData.get('recipient');
            const content = formData.get('message-content');

            if (!recipientId || !content) {
                showError('Please fill in all required fields');
                return;
            }

            const success = await sendMessage(content, recipientId);

            if (success) {
                // Close modal and reset form
                composeModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                this.reset();

                // Reload conversations to show the new message
                loadConversations();
            }
        });
    }
}

function setupMessageFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter conversations
            const filterType = this.dataset.filter;
            filterConversations(filterType);
        });
    });
}

function filterConversations(filterType) {
    const conversationItems = document.querySelectorAll('.conversation-item');

    conversationItems.forEach(conversation => {
        let shouldShow = true;

        switch (filterType) {
            case 'unread':
                shouldShow = conversation.querySelector('.unread-count') !== null;
                break;
            case 'teachers':
                // Show conversations with teachers
                const userRole = conversation.dataset.userRole;
                shouldShow = userRole === 'teacher';
                break;
            case 'students':
                // Show conversations with students
                const studentRole = conversation.dataset.userRole;
                shouldShow = studentRole === 'student';
                break;
            case 'all':
            default:
                shouldShow = true;
                break;
        }

        conversation.style.display = shouldShow ? 'flex' : 'none';
    });
}

// Auto-refresh conversations every 30 seconds
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadConversations();
    }
}, 30000);