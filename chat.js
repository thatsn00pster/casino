// Chat System
class ChatSystem {
    constructor(app) {
        this.app = app;
        this.messages = [];
        this.loadedAt = Date.now();
        this.onlineUsers = new Map();
    }

    initialize() {
        this.loadMessages();
        this.setupMessageListener();
        this.setupOnlineUsers();
        this.setupChatInput();
    }

    async loadMessages() {
        try {
            // Load recent messages
            const snapshot = await database.ref('chat')
                .orderByChild('timestamp')
                .limitToLast(50)
                .once('value');
            
            this.messages = [];
            snapshot.forEach(child => {
                const msg = child.val();
                this.messages.push(msg);
            });
            
            this.renderMessages();
            
        } catch (error) {
            console.error('Chat load error:', error);
        }
    }

    setupMessageListener() {
        // Listen for new messages
        database.ref('chat')
            .orderByChild('timestamp')
            .startAt(this.loadedAt)
            .on('child_added', (snapshot) => {
                const msg = snapshot.val();
                
                // Don't show own messages again
                if (msg.userId !== this.app.userId) {
                    this.addMessage(msg);
                }
            });
    }

    setupOnlineUsers() {
        // Listen for online users
        database.ref('online').on('value', (snapshot) => {
            const now = Date.now();
            const activeUsers = [];
            
            snapshot.forEach(child => {
                const user = child.val();
                // User is active if seen in last 15 seconds
                if (now - user.lastSeen < 15000 && user.isActive) {
                    activeUsers.push(user);
                }
            });
            
            this.onlineUsers = activeUsers;
            this.updateOnlineCount();
        });
    }

    setupChatInput() {
        const chatInput = document.getElementById('chatInput');
        const chatForm = document.querySelector('.chat-form');
        
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    async sendMessage() {
        if (!this.app.userId) {
            this.app.showToast('Please login to chat', 'error');
            return;
        }

        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        if (message.length > 200) {
            this.app.showToast('Message too long (max 200 characters)', 'error');
            return;
        }

        try {
            const chatMessage = {
                userId: this.app.userId,
                username: this.app.username,
                message: message,
                timestamp: Date.now(),
                type: 'chat'
            };

            await database.ref('chat').push(chatMessage);
            
            // Add to local display
            this.addMessage(chatMessage);
            
            // Clear input
            chatInput.value = '';
            this.app.sound.play('click');
            
        } catch (error) {
            console.error('Send message error:', error);
            this.app.showToast('Failed to send message', 'error');
        }
    }

    addMessage(msg) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        const messageElement = this.createMessageElement(msg);
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Add to messages array
        this.messages.push(msg);
        
        // Keep only last 100 messages
        if (this.messages.length > 100) {
            this.messages.shift();
        }
    }

    createMessageElement(msg) {
        const div = document.createElement('div');
        div.className = `chat-message ${msg.userId === this.app.userId ? 'own-message' : ''}`;
        
        // Check for special message types
        if (msg.type === 'transfer') {
            div.className += ' transfer-message';
            div.innerHTML = `
                <div class="message-header">
                    <i class="fa-solid fa-money-bill-transfer"></i>
                    <span class="username">💰 Money Transfer</span>
                </div>
                <div class="message-content">${msg.message}</div>
                <div class="message-time">${this.formatTime(msg.timestamp)}</div>
            `;
        } else if (msg.type === 'system') {
            div.className += ' system-message';
            div.innerHTML = `
                <div class="message-header">
                    <i class="fa-solid fa-broadcast-tower"></i>
                    <span class="username">System</span>
                </div>
                <div class="message-content">${msg.message}</div>
                <div class="message-time">${this.formatTime(msg.timestamp)}</div>
            `;
        } else {
            div.innerHTML = `
                <div class="message-header">
                    <span class="username">${msg.username}:</span>
                </div>
                <div class="message-content">${msg.message}</div>
                <div class="message-time">${this.formatTime(msg.timestamp)}</div>
            `;
        }
        
        return div;
    }

    renderMessages() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        this.messages.forEach(msg => {
            const messageElement = this.createMessageElement(msg);
            messagesContainer.appendChild(messageElement);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateOnlineCount() {
        const onlineCountElement = document.getElementById('onlineCount');
        if (onlineCountElement) {
            onlineCountElement.textContent = `${this.onlineUsers.length} Online`;
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        // If today, show time
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // If yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Otherwise show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    async addSystemMessage(text, type = 'info') {
        const systemMessage = {
            userId: 'system',
            username: 'System',
            message: text,
            timestamp: Date.now(),
            type: 'system'
        };

        await database.ref('chat').push(systemMessage);
        this.addMessage(systemMessage);
    }

    async addTransferMessage(from, to, amount) {
        const transferMessage = {
            userId: 'system',
            username: '💰 Money Transfer',
            message: `${from} sent ${amount.toLocaleString()} coins to ${to}!`,
            timestamp: Date.now(),
            type: 'transfer'
        };

        await database.ref('chat').push(transferMessage);
        this.addMessage(transferMessage);
    }
}
