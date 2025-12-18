[file name]: chat.js
[file content begin]
// Get database from global scope
const database = window.database;

class ChatManager {
    constructor(app) {
        this.app = app;
        this.chatLoadedAt = Date.now();
        this.onlineUsers = new Map();
        this.liveWinsInterval = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const chatForm = document.getElementById('chatForm');
        const toggleChatBtn = document.getElementById('toggleChatBtn');

        if (chatForm) {
            chatForm.addEventListener('submit', (e) => this.sendChatMessage(e));
        }

        if (toggleChatBtn) {
            toggleChatBtn.addEventListener('click', () => this.toggleChat());
        }
    }

    init() {
        this.chatLoadedAt = Date.now();
        
        // Only listen for NEW messages from now on
        database.ref('chat').orderByChild('timestamp').startAt(this.chatLoadedAt).on('child_added', (snapshot) => {
            const msg = snapshot.val();
            if (msg.userId !== this.app.auth.getUserId()) { // Don't show own messages again
                this.addChatMessage(msg.username, msg.message, 'text-white', false);
            }
        });
        
        // Clear existing messages on init
        const messages = document.getElementById('chatMessages');
        if (messages) {
            messages.innerHTML = '';
        }

        // Start online users tracking
        this.startOnlineUsersTracking();
    }

    toggleChat() {
        if (this.app.maintenanceMode) {
            this.app.showToast('Chat disabled during maintenance', 'warning');
            return;
        }
        
        const chatSidebar = document.getElementById('chatSidebar');
        if (chatSidebar) {
            chatSidebar.classList.toggle('hidden');
        }
        this.app.playSound('click');
    }

    sendChatMessage(e) {
        e.preventDefault();
        
        if (this.app.maintenanceMode) {
            this.app.showToast('Chat disabled during maintenance', 'warning');
            return;
        }
        
        if (!this.app.auth.isLoggedIn()) {
            this.app.showToast('Please login to chat', 'error');
            return;
        }

        const input = document.getElementById('chatInput');
        if (input && input.value.trim()) {
            const msg = input.value.trim();
            this.addChatMessage(this.app.auth.getUsername(), msg, 'text-[#8b5cf6]');
            input.value = '';
            this.app.playSound('click');
        }
    }

    addChatMessage(user, msg, color = 'text-white', saveToDB = true) {
        if (this.app.maintenanceMode && saveToDB) {
            // Don't save new chat messages during maintenance
            saveToDB = false;
        }
        
        const messages = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.className = `flex gap-2 ${color} text-sm`;
        div.innerHTML = `
            <span class="font-bold min-w-[70px] truncate">${user}:</span> 
            <span class="flex-1">${msg}</span>
        `;
        
        if (messages) {
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }

        if (saveToDB && this.app.auth.isLoggedIn()) {
            database.ref('chat').push({
                username: user,
                message: msg,
                userId: this.app.auth.getUserId(),
                timestamp: Date.now()
            });
        }
    }

    addBigWinNotification(username, amount, game) {
        if (this.app.maintenanceMode) return;
        
        const messages = document.getElementById('chatMessages');
        const div = document.createElement('div');
        
        // Determine notification style based on amount
        let notificationClass = 'big-win-notification';
        if (amount >= 100000) {
            notificationClass += ' purple';
        }
        
        div.className = notificationClass;
        div.innerHTML = `
            <div class="flex items-center justify-center gap-2 mb-2">
                <i class="fa-solid fa-trophy ${amount >= 100000 ? 'text-purple-400' : 'text-yellow-400'} text-sm"></i>
                <div class="username">${username}</div>
                <i class="fa-solid fa-trophy ${amount >= 100000 ? 'text-purple-400' : 'text-yellow-400'} text-sm"></i>
            </div>
            <div class="amount">${amount.toLocaleString()} coins</div>
            <div class="text-gray-300 text-xs mt-1">won in ${game}!</div>
        `;
        
        if (messages) {
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
        
        // Show global alert for 200k+ wins
        if (amount >= 200000) {
            this.app.showGlobalAlert(`${username} won ${amount.toLocaleString()} coins playing ${game}!`, 'purple');
        }
    }

    addTransferMessage(from, to, amount, recipientAmount) {
        if (this.app.maintenanceMode) return;
        
        const messages = document.getElementById('chatMessages');
        const div = document.createElement('div');
        
        let messageClass = 'chat-transfer-message';
        if (amount >= 100000) {
            messageClass += ' purple';
        } else if (amount >= 10000) {
            messageClass += ' gold';
        }
        
        div.className = messageClass;
        div.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-money-bill-transfer text-[#10b981]"></i>
                <div>
                    <div class="font-bold text-white">${from} → ${to}</div>
                    <div class="text-sm text-gray-300">
                        Sent ${amount.toLocaleString()} coins (${recipientAmount.toLocaleString()} after 10% tax)
                    </div>
                </div>
            </div>
        `;
        
        if (messages) {
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
    }

    startOnlineUsersTracking() {
        if (!this.app.auth.isLoggedIn() || this.app.maintenanceMode) return;

        // Set user as online with active status
        database.ref('online/' + this.app.auth.getUserId()).set({
            username: this.app.auth.getUsername(),
            lastSeen: Date.now(),
            isActive: true
        });

        // Listen for online users with proper tracking
        database.ref('online').on('value', (snapshot) => {
            const now = Date.now();
            const activeUsers = [];
            
            snapshot.forEach(child => {
                const user = child.val();
                // Check if user was active in last 15 seconds
                if (now - user.lastSeen < 15000 && user.isActive) {
                    activeUsers.push(user);
                } else {
                    // Remove inactive users
                    database.ref('online/' + child.key).remove();
                }
            });
            
            this.onlineUsers = activeUsers;
            
            // Update display
            const onlineCount = document.getElementById('onlineCount');
            if (onlineCount) {
                onlineCount.textContent = activeUsers.length + ' Online';
            }
        });
    }

    updateUserActivity() {
        if (!this.app.auth.isLoggedIn() || this.app.maintenanceMode) return;

        database.ref('online/' + this.app.auth.getUserId()).update({
            lastSeen: Date.now(),
            isActive: true
        });
    }

    // Live wins panel functions
    startLiveWinsUpdates() {
        // Clear existing interval
        if (this.liveWinsInterval) {
            clearInterval(this.liveWinsInterval);
        }
        
        // Load initial wins
        this.loadLiveWins();
        
        // Update every 10 seconds
        this.liveWinsInterval = setInterval(() => {
            this.loadLiveWins();
        }, 10000);
    }

    async loadLiveWins() {
        try {
            // Get recent wins from transactions
            const snapshot = await database.ref('transactions')
                .orderByChild('timestamp')
                .limitToLast(10)
                .once('value');
            
            const wins = [];
            snapshot.forEach(child => {
                const tx = child.val();
                if (tx.type === 'win' && tx.amount >= 100) { // Show wins over 100 coins
                    wins.push(tx);
                }
            });
            
            // Reverse to show newest first
            wins.reverse();
            
            const container = document.getElementById('liveWinsContainer');
            if (!container) return;
            
            if (wins.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 py-6 text-sm">No recent wins yet</div>';
                return;
            }
            
            container.innerHTML = wins.map(win => `
                <div class="live-win-item">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs">
                                ${win.username ? win.username.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <div class="text-white font-bold text-sm">${win.username}</div>
                                <div class="text-gray-400 text-xs">${this.timeAgo(win.timestamp)}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-[#10b981] font-bold text-base">+${win.amount.toLocaleString()}</div>
                            <div class="text-gray-400 text-xs">${win.game}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading live wins:', error);
        }
    }

    timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    }

    // Listen for big wins from other users
    listenForBigWins() {
        database.ref('transactions').orderByChild('timestamp').startAt(Date.now()).on('child_added', (snapshot) => {
            const transaction = snapshot.val();
            
            // Check if it's a big win from another user
            if (transaction.type === 'win' && 
                transaction.amount >= this.app.bigWinThreshold && 
                transaction.userId !== this.app.auth.getUserId()) {
                
                // Add to chat with slight delay
                setTimeout(() => {
                    this.addBigWinNotification(transaction.username, transaction.amount, transaction.game);
                    
                    // Show global alert for 200k+ wins from other users
                    if (transaction.amount >= 200000) {
                        this.app.showGlobalAlert(`${transaction.username} won ${transaction.amount.toLocaleString()} coins playing ${transaction.game}!`, 'purple');
                    }
                }, 1000);
            }
        });
    }

    // Clean up on logout
    cleanup() {
        if (this.liveWinsInterval) {
            clearInterval(this.liveWinsInterval);
            this.liveWinsInterval = null;
        }
        
        // Remove from online users
        if (this.app.auth.isLoggedIn()) {
            database.ref('online/' + this.app.auth.getUserId()).remove();
        }
        
        // Remove chat listeners
        database.ref('chat').off();
        database.ref('transactions').off();
        database.ref('online').off();
    }
}

// Make class globally available
window.ChatManager = ChatManager;
[file content end]
