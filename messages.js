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
            this.setupEventListeners();
            this.setupModalEventListeners();
            this.setupSearchFunctionality();

            // Try to load real data, fallback to demo data
            try {
                await this.loadUsers();
                await this.loadConversations();
            } catch (error) {
                console.warn('Failed to load real data, using demo mode:', error);
                this.setupDemoMode();
            }

            this.startMessagePolling();
            this.showNotification('Messages loaded successfully!', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Failed to initialize messages: ' + error.message, 'error');
            // Still setup demo mode as fallback
            this.setupDemoMode();
        }
    }

    setupDemoMode() {
        console.log('Setting up demo mode for messages');

        // Setup existing conversation items in HTML
        const existingItems = document.querySelectorAll('.conversation-item');
        existingItems.forEach((item, index) => {
            if (!item.dataset.conversation) {
                item.dataset.conversation = `demo-${index + 1}`;
            }
        });

        // Setup conversation switching for demo items
        this.setupConversationSwitching();

        // Setup demo message sending
        this.setupDemoMessageSending();

        this.showNotification('Demo mode active - messages will not be saved', 'info');
    }

    setupDemoMessageSending() {
        const messageForm = document.getElementById('message-form');
        const messageInput = document.getElementById('message-input');
        const chatMessages = document.querySelector('#chat-messages');

        if (messageForm && messageInput && chatMessages) {
            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const messageText = messageInput.value.trim();
                if (!messageText) return;

                // Add message to chat
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message sent';
                messageDiv.innerHTML = `
                    <div class="message-content">
                        <p>${this.escapeHtml(messageText)}</p>
                        <div class="message-meta">
                            <span class="message-time">${new Date().toLocaleTimeString()}</span>
                            <i class="fas fa-check sent-indicator"></i>
                        </div>
                    </div>
                `;

                chatMessages.appendChild(messageDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;

                // Clear input
                messageInput.value = '';
                messageInput.style.height = 'auto';

                this.showNotification('Message sent (demo mode)', 'success');
            });
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
            const response = await fetch(`${this.API_BASE}/messages/users`, {
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
        this.setupChatActions();
    }

    setupModalEventListeners() {
        this.setupComposeModal();
        this.setupDeleteConfirmModal();
        this.setupUserSearchModal();

        // Ensure compose button works
        setTimeout(() => {
            const composeBtn = document.getElementById('compose-btn');
            if (composeBtn && !composeBtn.hasAttribute('data-listener-added')) {
                composeBtn.addEventListener('click', () => {
                    this.openComposeModal();
                });
                composeBtn.setAttribute('data-listener-added', 'true');
            }
        }, 100);
    }

    setupSearchFunctionality() {
        const searchInput = document.querySelector('.search-input');
        const searchBtn = document.querySelector('.search-btn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.filterConversations();
            });

            // Enter key to search
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }
    }

    performSearch() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            this.searchQuery = searchInput.value.toLowerCase();
            this.filterConversations();

            if (this.searchQuery) {
                this.showNotification(`Searching for: "${this.searchQuery}"`, 'info');
            }
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

    setupChatActions() {
        // Call button
        const callBtns = document.querySelectorAll('[title="Call"]');
        callBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.initiateCall('audio');
            });
        });

        // Video call button
        const videoBtns = document.querySelectorAll('[title="Video Call"]');
        videoBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.initiateCall('video');
            });
        });

        // More options button
        const moreBtns = document.querySelectorAll('[title="More Options"]');
        moreBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showChatOptionsMenu(e);
            });
        });
    }

    initiateCall(type) {
        if (!this.currentConversation) {
            this.showNotification('Please select a conversation first', 'error');
            return;
        }

        const conversation = this.conversations.find(c => c.user._id === this.currentConversation);
        const userName = conversation ? conversation.user.name : 'Unknown User';

        this.showNotification(`${type === 'video' ? 'Video' : 'Audio'} call feature coming soon! Would call ${userName}`, 'info');
    }

    showChatOptionsMenu(event) {
        const menu = document.createElement('div');
        menu.className = 'chat-options-menu';
        menu.innerHTML = `
            <div class="menu-item" onclick="messagesManager.clearChatHistory()">
                <i class="fas fa-trash"></i> Clear Chat History
            </div>
            <div class="menu-item" onclick="messagesManager.blockUser()">
                <i class="fas fa-ban"></i> Block User
            </div>
            <div class="menu-item" onclick="messagesManager.reportUser()">
                <i class="fas fa-flag"></i> Report User
            </div>
            <div class="menu-item" onclick="messagesManager.exportChat()">
                <i class="fas fa-download"></i> Export Chat
            </div>
        `;

        // Style the menu
        menu.style.position = 'fixed';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.style.zIndex = '10000';
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        menu.style.minWidth = '180px';

        document.body.appendChild(menu);

        // Remove menu when clicking elsewhere
        const removeMenu = () => {
            if (menu.parentNode) {
                menu.remove();
            }
            document.removeEventListener('click', removeMenu);
        };

        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 100);
    }

    clearChatHistory() {
        if (!this.currentConversation) return;

        if (confirm('Are you sure you want to clear this chat history? This action cannot be undone.')) {
            this.deleteConversation(this.currentConversation);
        }
    }

    blockUser() {
        if (!this.currentConversation) return;

        const conversation = this.conversations.find(c => c.user._id === this.currentConversation);
        const userName = conversation ? conversation.user.name : 'this user';

        if (confirm(`Are you sure you want to block ${userName}? They will no longer be able to send you messages.`)) {
            this.showNotification(`Block feature coming soon! Would block ${userName}`, 'info');
        }
    }

    reportUser() {
        if (!this.currentConversation) return;

        const conversation = this.conversations.find(c => c.user._id === this.currentConversation);
        const userName = conversation ? conversation.user.name : 'this user';

        this.showNotification(`Report feature coming soon! Would report ${userName}`, 'info');
    }

    exportChat() {
        if (!this.currentConversation || this.messages.length === 0) {
            this.showNotification('No messages to export', 'error');
            return;
        }

        const conversation = this.conversations.find(c => c.user._id === this.currentConversation);
        const userName = conversation ? conversation.user.name : 'Unknown User';

        let chatText = `Chat with ${userName}\n`;
        chatText += `Exported on ${new Date().toLocaleString()}\n\n`;

        this.messages.forEach(message => {
            const sender = message.from._id === this.currentUser.id ? 'You' : message.from.name;
            const time = new Date(message.createdAt).toLocaleString();
            chatText += `[${time}] ${sender}: ${message.content}\n`;
        });

        // Create and download file
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Chat exported successfully!', 'success');
    }

    setupConversationSwitching() {
        // This will be called after conversations are loaded
        const conversationItems = document.querySelectorAll('.conversation-item');

        conversationItems.forEach(item => {
            // Remove existing listeners to prevent duplicates
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);

            newItem.addEventListener('click', async (e) => {
                e.preventDefault();

                // Remove active class from all conversations
                document.querySelectorAll('.conversation-item').forEach(conv => conv.classList.remove('active'));

                // Add active class to clicked conversation
                newItem.classList.add('active');

                // Load conversation messages
                const conversationId = newItem.dataset.conversation;
                if (conversationId) {
                    try {
                        await this.loadConversation(conversationId);
                        // Mark as read
                        this.markConversationAsRead(newItem);
                    } catch (error) {
                        console.error('Error loading conversation:', error);
                        this.showNotification('Failed to load conversation', 'error');
                    }
                } else {
                    this.showNotification('Invalid conversation selected', 'error');
                }
            });

            // Add context menu for conversation actions
            newItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showConversationContextMenu(e, newItem);
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
        let visibleCount = 0;

        conversationItems.forEach(conversation => {
            let shouldShow = true;
            const nameElement = conversation.querySelector('h4') || conversation.querySelector('.conversation-name');
            const userName = nameElement ? nameElement.textContent.toLowerCase() : '';
            const userRole = conversation.dataset.userRole || 'unknown';
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
                    shouldShow = shouldShow && (userName.includes('seller') || userName.includes('buyer') || userName.includes('farm') || userName.includes('market'));
                    break;
                case 'courses':
                    // Filter course-related conversations
                    shouldShow = shouldShow && (userRole === 'student' || userName.includes('course') || userName.includes('class'));
                    break;
                case 'all':
                default:
                    // Show all (already true)
                    break;
            }

            conversation.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) visibleCount++;
        });

        // Show empty state if no conversations match
        this.updateEmptyState(visibleCount === 0);
    }

    updateEmptyState(isEmpty) {
        const conversationsList = document.querySelector('.conversations-list');
        if (!conversationsList) return;

        let emptyState = conversationsList.querySelector('.filter-empty-state');

        if (isEmpty) {
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'filter-empty-state empty-state';
                emptyState.innerHTML = `
                    <i class="fas fa-search"></i>
                    <h3>No conversations found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                `;
                conversationsList.appendChild(emptyState);
            }
            emptyState.style.display = 'block';
        } else if (emptyState) {
            emptyState.style.display = 'none';
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

    renderMessages(messages) {
        const container = document.querySelector('#chat-messages');
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

    updateConversationHeader(user) {
        const header = document.querySelector('.chat-user-details');
        if (!header) {
            // Try alternative selector
            const altHeader = document.querySelector('.chat-header .chat-user-details');
            if (altHeader) {
                altHeader.innerHTML = `
                    <h4>${user.name}</h4>
                    <span class="user-status">${user.role || 'User'} • ${user.status || 'Offline'}</span>
                `;
            }
            return;
        }

        header.innerHTML = `
            <h4>${user.name}</h4>
            <span class="user-status">${user.role || 'User'} • ${user.status || 'Offline'}</span>
        `;

        // Update avatar
        const avatar = document.querySelector('.chat-avatar img');
        if (avatar) {
            avatar.src = user.avatar || 'images/default-avatar.png';
            avatar.alt = user.name;
        }
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }

        // Disable/enable buttons during loading
        const buttons = document.querySelectorAll('button:not(.btn-icon)');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
        });
    }

    markConversationAsRead(conversationItem) {
        const unreadBadge = conversationItem.querySelector('.unread-count');
        if (unreadBadge) {
            unreadBadge.remove();
        }

        const statusIcon = conversationItem.querySelector('.conversation-status i');
        if (statusIcon) {
            statusIcon.className = 'fas fa-check-circle';
        }
    }
}

    // CRUD Operations - CREATE
    async sendMessage(content, recipientId, files = null) {
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

            const response = await fetch(`${this.API_BASE}/messages`, {
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
                await this.loadConversation(recipientId);
                await this.loadConversations(); // Refresh conversation list
                this.showNotification('Message sent successfully!', 'success');
                return true;
            } else {
                throw new Error(data.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Failed to send message: ' + error.message, 'error');
            return false;
        }
    }

    // CRUD Operations - UPDATE
    async markMessageAsRead(messageId) {
        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`${this.API_BASE}/messages/${messageId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Update local message data
                const message = this.messages.find(m => m._id === messageId);
                if (message) {
                    message.read = true;
                    this.renderMessages(this.messages);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error marking message as read:', error);
            return false;
        }
    }

    // CRUD Operations - DELETE
    async deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`${this.API_BASE}/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Remove message from local array
                this.messages = this.messages.filter(m => m._id !== messageId);
                this.renderMessages(this.messages);
                this.showNotification('Message deleted successfully!', 'success');

                // Refresh conversations to update last message
                await this.loadConversations();
            } else {
                throw new Error(data.message || 'Failed to delete message');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            this.showNotification('Failed to delete message: ' + error.message, 'error');
        }
    }

    async deleteConversation(userId) {
        if (!confirm('Are you sure you want to delete this entire conversation?')) {
            return;
        }

        try {
            const token = localStorage.getItem('agrilearn_token');
            const response = await fetch(`${this.API_BASE}/messages/conversation/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Remove conversation from local array
                this.conversations = this.conversations.filter(c => c.user._id !== userId);
                this.renderConversations(this.conversations);

                // Clear current conversation if it was deleted
                if (this.currentConversation === userId) {
                    this.currentConversation = null;
                    this.messages = [];
                    this.renderMessages([]);
                }

                this.showNotification('Conversation deleted successfully!', 'success');
            } else {
                throw new Error(data.message || 'Failed to delete conversation');
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            this.showNotification('Failed to delete conversation: ' + error.message, 'error');
        }
    }

    // Message Sending Setup
    setupMessageSending() {
        const messageForm = document.getElementById('message-form');
        const messageInput = document.getElementById('message-input');
        const fileInput = document.getElementById('message-files');
        const attachButton = document.getElementById('attach-files-btn');

        if (messageForm) {
            messageForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const messageText = messageInput ? messageInput.value.trim() : '';
                const files = fileInput ? fileInput.files : null;

                if (!this.currentConversation) {
                    this.showNotification('Please select a conversation first', 'error');
                    return;
                }

                if (!messageText && (!files || files.length === 0)) {
                    this.showNotification('Please enter a message or attach a file', 'error');
                    return;
                }

                try {
                    const success = await this.sendMessage(messageText, this.currentConversation, files);
                    if (success) {
                        if (messageInput) messageInput.value = '';
                        if (fileInput) {
                            fileInput.value = '';
                            this.updateFilePreview([]);
                        }
                        // Reset textarea height
                        if (messageInput) {
                            messageInput.style.height = 'auto';
                        }
                    }
                } catch (error) {
                    console.error('Error sending message:', error);
                    this.showNotification('Failed to send message', 'error');
                }
            });
        }

        // File attachment handling
        if (attachButton && fileInput) {
            attachButton.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });

            fileInput.addEventListener('change', () => {
                this.updateFilePreview(Array.from(fileInput.files));
            });
        }

        // Auto-resize textarea
        if (messageInput) {
            messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px'; // Max height 120px
            });

            // Send on Enter (but not Shift+Enter)
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (messageForm) {
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        messageForm.dispatchEvent(submitEvent);
                    }
                }
            });
        }

        // Send button click handler
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (messageForm) {
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    messageForm.dispatchEvent(submitEvent);
                }
            });
        }
    }
}

    // Modal Management
    setupComposeModal() {
        const composeBtn = document.getElementById('compose-btn');
        const composeModal = document.getElementById('compose-modal');
        const composeForm = document.getElementById('compose-form');
        const cancelBtn = document.getElementById('cancel-compose');
        const closeBtn = composeModal?.querySelector('.modal-close');

        if (composeBtn) {
            composeBtn.addEventListener('click', () => {
                this.openComposeModal();
            });
        }

        [cancelBtn, closeBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.closeComposeModal();
                });
            }
        });

        // Click outside to close
        if (composeModal) {
            composeModal.addEventListener('click', (e) => {
                if (e.target === composeModal) {
                    this.closeComposeModal();
                }
            });
        }

        if (composeForm) {
            composeForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(composeForm);
                const recipientEmail = formData.get('recipient');
                const content = formData.get('message-content');

                if (!recipientEmail || !content) {
                    this.showNotification('Please fill in all required fields', 'error');
                    return;
                }

                // Find recipient by email
                const recipient = this.users.find(u => u.email === recipientEmail);
                if (!recipient) {
                    this.showNotification('Recipient not found', 'error');
                    return;
                }

                const success = await this.sendMessage(content, recipient._id);

                if (success) {
                    this.closeComposeModal();
                    composeForm.reset();
                    await this.loadConversations();
                }
            });
        }
    }

    openComposeModal() {
        const modal = document.getElementById('compose-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Setup recipient autocomplete
            this.setupRecipientAutocomplete();

            // Focus on recipient input
            setTimeout(() => {
                const recipientInput = document.getElementById('recipient');
                if (recipientInput) recipientInput.focus();
            }, 100);
        }
    }

    closeComposeModal() {
        const modal = document.getElementById('compose-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';

            // Reset form
            const form = document.getElementById('compose-form');
            if (form) form.reset();
        }
    }

    setupRecipientAutocomplete() {
        const recipientInput = document.getElementById('recipient');
        if (!recipientInput) return;

        // Create datalist for autocomplete
        let datalist = document.getElementById('recipients-list');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'recipients-list';
            recipientInput.parentNode.appendChild(datalist);
        }

        recipientInput.setAttribute('list', 'recipients-list');

        // Populate with users
        datalist.innerHTML = this.users.map(user =>
            `<option value="${user.email}">${user.name} (${user.role})</option>`
        ).join('');
    }

    setupDeleteConfirmModal() {
        // This would be implemented for delete confirmations
        // For now, using browser confirm() dialog
    }

    setupUserSearchModal() {
        // This would be implemented for advanced user search
        // For now, using simple autocomplete
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }

    // Message Filters
    setupMessageFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));

                // Add active class to clicked button
                button.classList.add('active');

                // Filter conversations
                this.currentFilter = button.dataset.filter;
                this.filterConversations();
            });
        });
    }

    // File Handling
    updateFilePreview(files) {
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
                    <i class="fas fa-${this.getFileIcon(file.type)}"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${this.formatFileSize(file.size)})</span>
                </div>
                <button type="button" class="remove-file-btn" onclick="messagesManager.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    removeFile(index) {
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
        this.updateFilePreview(Array.from(fileInput.files));
    }
}

    // Utility Methods
    formatMessageTime(dateString) {
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.includes('pdf')) return 'file-pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return 'file-archive';
        if (mimeType.includes('video')) return 'video';
        if (mimeType.includes('audio')) return 'music';
        return 'file';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="notification-close">&times;</button>
        `;

        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    padding: 1rem;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease-out;
                }
                .notification-success { border-left: 4px solid #4caf50; }
                .notification-error { border-left: 4px solid #f44336; }
                .notification-info { border-left: 4px solid #2196f3; }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .notification-close {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: #666;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        // Add to page
        document.body.appendChild(notification);

        // Close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    showConversationContextMenu(event, conversationItem) {
        // Create context menu for conversation actions
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" onclick="messagesManager.deleteConversation('${conversationItem.dataset.conversation}')">
                <i class="fas fa-trash"></i> Delete Conversation
            </div>
            <div class="context-menu-item" onclick="messagesManager.markConversationAsRead(document.querySelector('[data-conversation=\\"${conversationItem.dataset.conversation}\\"]'))">
                <i class="fas fa-check"></i> Mark as Read
            </div>
        `;

        // Position and show context menu
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = event.clientX + 'px';
        contextMenu.style.top = event.clientY + 'px';
        contextMenu.style.zIndex = '10000';
        contextMenu.style.background = 'white';
        contextMenu.style.border = '1px solid #ccc';
        contextMenu.style.borderRadius = '4px';
        contextMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

        document.body.appendChild(contextMenu);

        // Remove context menu when clicking elsewhere
        const removeContextMenu = () => {
            if (contextMenu.parentNode) {
                contextMenu.remove();
            }
            document.removeEventListener('click', removeContextMenu);
        };

        setTimeout(() => {
            document.addEventListener('click', removeContextMenu);
        }, 100);
    }

    // Real-time Updates
    startMessagePolling() {
        // Poll for new messages every 30 seconds
        this.messagePollingInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && !this.isLoading) {
                this.loadConversations();
                if (this.currentConversation) {
                    this.loadConversation(this.currentConversation);
                }
            }
        }, 30000);
    }

    stopMessagePolling() {
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
            this.messagePollingInterval = null;
        }
    }

    // Cleanup
    destroy() {
        this.stopMessagePolling();
        this.closeAllModals();
    }
}

// Global functions for HTML onclick handlers
window.logout = function() {
    localStorage.removeItem('agrilearn_user');
    localStorage.removeItem('agrilearn_token');
    messagesManager.showNotification('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
};

// Create global instance
const messagesManager = new MessagesManager();

// Make messagesManager globally available for HTML onclick handlers
window.messagesManager = messagesManager;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    messagesManager.destroy();
});
