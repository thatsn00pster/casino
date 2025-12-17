// Main Application Class
class GameApp {
    constructor() {
        // Core systems
        this.auth = new AuthSystem(this);
        this.chat = new ChatSystem(this);
        this.wallet = new WalletSystem(this);
        this.maintenance = new MaintenanceSystem(this);
        this.sound = new SoundSystem();
        
        // Game managers
        this.minesGame = new MinesGame(this);
        this.blackjackGame = new BlackjackGame(this);
        this.chickenGame = new ChickenRoadGame(this);
        this.coinflipGame = new CoinflipGame(this);
        
        // State
        this.user = null;
        this.balance = 500;
        this.username = '';
        this.userId = '';
        this.activeGame = null;
        this.lastActivity = Date.now();
        
        // UI Elements
        this.mainContent = document.getElementById('mainContent');
        this.balanceDisplay = document.getElementById('balanceDisplay');
        
        // Initialize
        this.init();
    }

    async init() {
        // Initialize systems
        await this.auth.initialize();
        this.chat.initialize();
        this.maintenance.initialize();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start with home page
        this.loadGame('home');
        
        // Start activity monitoring
        this.startActivityMonitoring();
    }

    setupEventListeners() {
        // Activity tracking
        const activities = ['mousemove', 'click', 'keypress', 'touchstart'];
        activities.forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            });
        });

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Prevent iOS zoom
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
    }

    async loadGame(gameName) {
        if (!this.maintenance.isAccessible()) {
            this.showToast('Casino is under maintenance', 'error');
            return;
        }

        // Close mobile sidebar
        if (window.innerWidth < 768) {
            this.toggleSidebar();
        }

        // Update navigation
        this.updateNavigation(gameName);

        // Clear content
        this.mainContent.innerHTML = '';
        this.activeGame = gameName;

        // Load specific game
        switch (gameName) {
            case 'home':
                await this.renderHome();
                break;
            case 'mines':
                await this.minesGame.render();
                break;
            case 'blackjack':
                await this.blackjackGame.render();
                break;
            case 'chicken':
                await this.chickenGame.render();
                break;
            case 'coinflip':
                await this.coinflipGame.render();
                break;
            case 'leaderboard':
                await this.renderLeaderboard();
                break;
        }

        this.sound.play('click');
    }

    async renderHome() {
        this.mainContent.innerHTML = `
            <div class="max-w-6xl mx-auto space-y-4">
                <div class="hero-banner">
                    <div class="hero-content">
                        <div class="badge">PREMIUM CASINO</div>
                        <h1>Welcome, <span>${this.username || 'Guest'}</span>!</h1>
                        <p>Experience the ultimate fun casino with fair games, stunning animations, and real-time multiplayer features.</p>
                        <div class="hero-buttons">
                            <button onclick="app.loadGame('blackjack')" class="btn-primary">
                                <i class="fa-solid fa-diamond mr-2"></i> Play Blackjack
                            </button>
                            <button onclick="app.openDepositModal()" class="btn-secondary">
                                <i class="fa-solid fa-gift mr-2"></i> Free Coins
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Live Wins Panel -->
                <div class="live-wins-panel">
                    <div class="panel-header">
                        <div class="live-dot"></div>
                        <h3>Live Wins</h3>
                    </div>
                    <div id="liveWinsContainer">
                        <div class="loading">Loading live wins...</div>
                    </div>
                </div>
                
                <h2 class="section-title">
                    <i class="fa-solid fa-gamepad"></i> Featured Games
                </h2>
                
                <div class="games-grid">
                    ${this.getGameCard('mines', 'Mines', 'fa-bomb', 'Mine clearance game')}
                    ${this.getGameCard('blackjack', 'Blackjack', 'fa-diamond', 'Classic 21 vs Dealer')}
                    ${this.getGameCard('chicken', 'Chicken Road', 'fa-egg', 'Cross the road to win!')}
                    ${this.getGameCard('coinflip', 'Coinflip', 'fa-coins', 'Heads or Tails!')}
                </div>
            </div>
        `;
        
        this.startLiveWinsUpdates();
    }

    async renderLeaderboard() {
        try {
            const snapshot = await database.ref('users')
                .orderByChild('balance')
                .limitToLast(100)
                .once('value');
            
            const users = [];
            snapshot.forEach(child => {
                const user = child.val();
                if (user.username && user.balance) {
                    users.push({
                        username: user.username,
                        balance: user.balance,
                        totalWins: user.totalWins || 0,
                        biggestWin: user.biggestWin || 0
                    });
                }
            });

            users.sort((a, b) => b.balance - a.balance);
            const topPlayers = users.slice(0, 10);

            this.mainContent.innerHTML = `
                <div class="max-w-6xl mx-auto">
                    <div class="leaderboard-header">
                        <h2>Leaderboard</h2>
                        <p>Top 10 richest players</p>
                    </div>
                    
                    <div class="leaderboard-container">
                        ${topPlayers.map((player, index) => `
                            <div class="leaderboard-item ${player.username === this.username ? 'current-user' : ''}">
                                <div class="rank">${index + 1}</div>
                                <div class="player-info">
                                    <div class="username">${player.username}</div>
                                    <div class="stats">
                                        Wins: ${player.totalWins} | Biggest Win: ${player.biggestWin}
                                    </div>
                                </div>
                                <div class="balance">${player.balance.toLocaleString()} coins</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Leaderboard error:', error);
            this.mainContent.innerHTML = '<div class="error">Error loading leaderboard</div>';
        }
    }

    // UI Methods
    updateUI() {
        if (this.balanceDisplay) {
            this.balanceDisplay.textContent = this.balance.toLocaleString();
        }
        
        document.getElementById('loggedUsername').textContent = this.username || 'Guest';
        document.getElementById('userIdDisplay').textContent = this.userId ? this.userId.substring(0, 8) + '...' : 'Not logged in';
        document.getElementById('userAvatar').textContent = this.username ? this.username.charAt(0).toUpperCase() : 'U';
    }

    updateNavigation(gameName) {
        document.querySelectorAll('.sidebar-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const navBtn = document.getElementById(`nav-${gameName}`);
        if (navBtn) {
            navBtn.classList.add('active');
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth < 768) {
            sidebar.classList.toggle('mobile-open');
        }
    }

    toggleChat() {
        if (!this.maintenance.isAccessible()) {
            this.showToast('Chat disabled during maintenance', 'warning');
            return;
        }
        document.getElementById('chatSidebar').classList.toggle('active');
        this.sound.play('click');
    }

    // Game Methods
    getGameCard(id, name, icon, desc) {
        return `
            <div onclick="app.loadGame('${id}')" class="game-card">
                <div class="game-card-content">
                    <div class="game-icon">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="game-info">
                        <h3>${name}</h3>
                        <p>${desc}</p>
                    </div>
                    <div class="play-button">
                        PLAY NOW
                    </div>
                </div>
            </div>
        `;
    }

    // Toast System
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Start live wins updates
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
            const snapshot = await database.ref('transactions')
                .orderByChild('timestamp')
                .limitToLast(10)
                .once('value');
            
            const wins = [];
            snapshot.forEach(child => {
                const tx = child.val();
                if (tx.type === 'win' && tx.amount >= 100) {
                    wins.push(tx);
                }
            });
            
            wins.reverse();
            
            const container = document.getElementById('liveWinsContainer');
            if (!container) return;
            
            if (wins.length === 0) {
                container.innerHTML = '<div class="no-wins">No recent wins yet</div>';
                return;
            }
            
            container.innerHTML = wins.map(win => `
                <div class="live-win">
                    <div class="win-header">
                        <div class="win-user">
                            <div class="user-avatar-small">${win.username ? win.username.charAt(0).toUpperCase() : 'U'}</div>
                            <div>
                                <div class="username">${win.username}</div>
                                <div class="time">${this.timeAgo(win.timestamp)}</div>
                            </div>
                        </div>
                        <div class="win-amount">
                            <div class="amount">+${win.amount.toLocaleString()}</div>
                            <div class="game">${win.game}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Live wins error:', error);
        }
    }

    timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    }

    startActivityMonitoring() {
        setInterval(() => {
            if (this.userId && Date.now() - this.lastActivity > 300000) { // 5 minutes
                // Mark as inactive
                database.ref(`users/${this.userId}`).update({
                    isActive: false,
                    lastSeen: Date.now()
                });
            }
        }, 60000); // Check every minute
    }

    handleResize() {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (window.innerWidth <= 768) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        } else {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GameApp();
});

// Admin functions for console
window.enableMaintenance = (minutes = 30) => window.app.maintenance.enable(minutes);
window.disableMaintenance = () => window.app.maintenance.disable();
window.checkMaintenance = () => window.app.maintenance.status();
