// app.js - Main Application
class GameApp {
    constructor() {
        this.user = null;
        this.balance = 500;
        this.username = '';
        this.userId = '';
        this.activeGame = null;
        this.mainContent = document.getElementById('mainContent');
        this.balanceDisplay = document.getElementById('balanceDisplay');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOpen = false;
        this.chatSidebar = document.getElementById('chatSidebar');
        this.soundEnabled = true;
        this.bigWinThreshold = 1000;
        
        // Initialize managers (these are loaded as regular scripts)
        this.security = new SecurityManager(this);
        this.auth = new AuthManager(this);
        this.wallet = new WalletManager(this);
        this.chat = new ChatManager(this);
        this.maintenance = new MaintenanceManager(this);
        
        // Initialize games (these are loaded as regular scripts)
        this.minesGame = new MinesGame(this);
        this.blackjackGame = new BlackjackGame(this);
        this.chickenGame = new ChickenRoadGame(this);
        this.coinflipGame = new CoinflipGame(this);
        this.leaderboardGame = new LeaderboardGame(this);
        
        // Game states
        this.minesActive = false;
        this.bjInProgress = false;
        
        // Online users tracking
        this.onlineUsers = new Map();
        this.activityPingInterval = null;
        this.lastActivityTime = Date.now();
        
        // Real-time balance update listener
        this.balanceUpdateListener = null;
        
        // Initialize the app
        this.init();
    }

    async init() {
        // Initialize Firebase
        if (!initializeFirebase()) {
            this.showToast('Failed to connect to server', 'error');
            return;
        }
        
        // Initialize security system
        this.security.initialize();
        
        // Check authentication
        await this.auth.checkAuth();
        
        // Check maintenance status
        await this.maintenance.checkStatus();
        
        // Initialize chat
        this.chat.init();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set default home page
        this.loadGame('home');
        
        // Start activity tracking
        this.startActivityPing();
        
        // Listen for big wins
        this.chat.listenForBigWins();
    }

    setupEventListeners() {
        // Sidebar toggle
        const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Game navigation
        const gameButtons = document.querySelectorAll('button[data-game]');
        gameButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameName = e.currentTarget.dataset.game;
                this.loadGame(gameName);
            });
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 768 && this.sidebarOpen && 
                this.sidebar && !this.sidebar.contains(e.target) && 
                !e.target.closest('#toggleSidebarBtn')) {
                this.toggleSidebar();
            }
        });
        
        // Track user activity
        document.addEventListener('mousemove', () => this.updateUserActivity());
        document.addEventListener('click', () => this.updateUserActivity());
        document.addEventListener('keypress', () => this.updateUserActivity());
        document.addEventListener('touchstart', () => this.updateUserActivity());
        
        // Prevent zoom on iOS
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }
    
    handleResize() {
        // Ensure proper scaling on mobile
        const viewport = document.querySelector('meta[name="viewport"]');
        if (window.innerWidth <= 768) {
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            }
        } else {
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
            }
        }
    }
    
    updateUserActivity() {
        this.lastActivityTime = Date.now();
        this.chat.updateUserActivity();
    }

    startActivityPing() {
        // Clear any existing interval
        if (this.activityPingInterval) {
            clearInterval(this.activityPingInterval);
        }
        
        // Ping every 5 seconds to show user is active
        this.activityPingInterval = setInterval(() => {
            if (this.auth.isLoggedIn() && !this.maintenance.maintenanceMode) {
                // Check if user has been active in last 10 seconds
                const isActive = (Date.now() - this.lastActivityTime) < 10000;
                
                if (isActive) {
                    this.chat.updateUserActivity();
                }
            }
        }, 5000);
    }

    // Setup real-time balance updates
    setupRealTimeBalance() {
        if (this.balanceUpdateListener) {
            // Remove existing listener
            this.balanceUpdateListener();
        }
        
        if (this.auth.isLoggedIn()) {
            // Listen for balance changes in real-time
            const balanceRef = database.ref('users/' + this.auth.getUserId() + '/balance');
            this.balanceUpdateListener = balanceRef.on('value', (snapshot) => {
                const newBalance = snapshot.val();
                if (newBalance !== null && newBalance !== this.auth.getBalance()) {
                    this.auth.setBalance(parseInt(newBalance));
                }
            });
        }
    }

    // Sound functions
    playSound(soundName) {
        soundManager.play(soundName);
    }

    toggleSound() {
        soundManager.toggle();
    }

    // UI functions
    toggleSidebar() {
        if (this.maintenance.maintenanceMode) return;
        
        this.sidebarOpen = !this.sidebarOpen;
        if (window.innerWidth < 768 && this.sidebar) {
            if (this.sidebarOpen) {
                this.sidebar.classList.remove('-translate-x-full');
                this.sidebar.classList.add('mobile-open');
            } else {
                this.sidebar.classList.add('-translate-x-full');
                this.sidebar.classList.remove('mobile-open');
            }
        }
        this.playSound('click');
    }

    toggleChat() {
        this.chat.toggleChat();
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'} text-lg"></i>
                <span class="font-medium text-sm">${message}</span>
            </div>
        `;
        
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    // Global alert functions
    showGlobalAlert(message, type = 'purple') {
        if (this.maintenance.maintenanceMode) return;
        
        const alertBar = document.getElementById('globalAlertBar');
        if (!alertBar) return;
        
        alertBar.className = `global-alert-bar ${type}`;
        alertBar.innerHTML = `
            <div class="flex items-center justify-center gap-3">
                <i class="fa-solid ${type === 'purple' ? 'fa-crown' : 'fa-trophy'}"></i>
                <span>${message}</span>
                <i class="fa-solid ${type === 'purple' ? 'fa-crown' : 'fa-trophy'}"></i>
            </div>
        `;
        alertBar.classList.remove('hidden');
        
        // Hide after 5 seconds
        setTimeout(() => {
            alertBar.classList.add('hidden');
        }, 5000);
    }

    // Maintenance check
    checkMaintenance() {
        return this.maintenance.checkMaintenance();
    }

    // Game loading
    loadGame(gameName) {
        if (!this.checkMaintenance()) return;
        
        if (window.innerWidth < 768 && this.sidebarOpen) {
            this.toggleSidebar();
        }

        // Clean up current game
        this.cleanupCurrentGame();

        // Update active nav
        document.querySelectorAll('#sidebar button[data-game]').forEach(b => {
            b.classList.remove('bg-gradient-to-r', 'from-[#2a3042]', 'to-[#1e293b]', 'text-white');
        });
        
        const navBtn = document.querySelector(`button[data-game="${gameName}"]`);
        if (navBtn) {
            navBtn.classList.add('bg-gradient-to-r', 'from-[#2a3042]', 'to-[#1e293b]', 'text-white');
        }

        this.activeGame = gameName;
        if (this.mainContent) {
            this.mainContent.innerHTML = '';
            this.mainContent.scrollTop = 0;
        }

        switch (gameName) {
            case 'home':
                this.renderHome();
                break;
            case 'mines':
                this.minesGame.render();
                this.minesActive = true;
                break;
            case 'blackjack':
                this.blackjackGame.render();
                this.bjInProgress = true;
                break;
            case 'chicken':
                this.chickenGame.render();
                break;
            case 'coinflip':
                this.coinflipGame.render();
                break;
            case 'leaderboard':
                this.leaderboardGame.render();
                break;
            default:
                this.renderHome();
        }
        
        this.playSound('click');
    }

    cleanupCurrentGame() {
        switch (this.activeGame) {
            case 'mines':
                this.minesGame.cleanup();
                this.minesActive = false;
                break;
            case 'blackjack':
                this.blackjackGame.cleanup();
                this.bjInProgress = false;
                break;
            case 'chicken':
                this.chickenGame.cleanup();
                break;
            case 'coinflip':
                this.coinflipGame.cleanup();
                break;
            case 'leaderboard':
                this.leaderboardGame.cleanup();
                break;
        }
    }

    resetAllGames() {
        this.minesGame.cleanup();
        this.blackjackGame.cleanup();
        this.chickenGame.cleanup();
        this.coinflipGame.cleanup();
        this.minesActive = false;
        this.bjInProgress = false;
    }

    // Home page rendering
    renderHome() {
        this.mainContent.innerHTML = `
            <div class="max-w-6xl mx-auto space-y-4">
                <div class="rounded-2xl bg-gradient-to-r from-[#4c1d95] to-[#2e1065] p-4 md:p-6 relative overflow-hidden border border-[#8b5cf6]/30 shadow-xl">
                    <div class="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-[#8b5cf6] rounded-full mix-blend-overlay filter blur-[80px] opacity-30"></div>
                    <div class="relative z-10">
                        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-bold text-white mb-3 tracking-wider">
                            <span class="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></span> PREMIUM CASINO
                        </div>
                        <h1 class="text-xl md:text-3xl font-bold text-white mb-3 leading-tight">Welcome, <span class="text-[#a78bfa]">${this.auth.getUsername() || 'Guest'}</span>!</h1>
                        <p class="text-[#d8b4fe] text-sm md:text-base max-w-2xl mb-4">Experience the ultimate fun casino with fair games, stunning animations, and real-time multiplayer features.</p>
                        <div class="flex flex-wrap gap-3">
                            <button data-game="blackjack" class="btn-primary px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-base md:text-lg shadow-xl hover:scale-105 transition-all duration-300 touch-button">
                                <i class="fa-solid fa-diamond mr-2"></i> Play Blackjack
                            </button>
                            <button id="homeWalletBtn" class="bg-gradient-to-r from-[#1f2937] to-[#374151] hover:from-[#374151] hover:to-[#4b5563] text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-base md:text-lg border border-[#374151] transition-all duration-300 hover:scale-105 touch-button">
                                <i class="fa-solid fa-gift mr-2"></i> Free Coins
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Live Wins Panel -->
                <div class="live-wins-panel">
                    <div class="flex items-center gap-2 mb-3">
                        <div class="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                        <h3 class="text-white font-bold text-base">Live Wins</h3>
                    </div>
                    <div id="liveWinsContainer">
                        <div class="text-center text-gray-500 py-6 text-sm">Loading live wins...</div>
                    </div>
                </div>
                
                <h2 class="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-gamepad text-[#8b5cf6]"></i> Featured Games
                </h2>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    ${this.getGameCard('mines', 'Mines', 'fa-bomb', 'from-[#451a03] to-[#2a1205]', 'Reveal gems, avoid bombs', '#f59e0b')}
                    ${this.getGameCard('blackjack', 'Blackjack', 'fa-diamond', 'from-[#064e3b] to-[#022c22]', 'Classic 21 vs Dealer', '#10b981')}
                    ${this.getGameCard('chicken', 'Chicken Road', 'fa-egg', 'from-[#78350f] to-[#451a03]', 'Cross the road to win!', '#f59e0b')}
                    ${this.getGameCard('coinflip', 'Coinflip', 'fa-coins', 'from-[#78350f] to-[#451a03]', 'Heads or Tails!', '#f59e0b')}
                </div>
            </div>
        `;

        // Add event listener for home wallet button
        const homeWalletBtn = document.getElementById('homeWalletBtn');
        if (homeWalletBtn) {
            homeWalletBtn.addEventListener('click', () => this.wallet.openDepositModal());
        }

        // Add event listeners for game cards
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const game = e.currentTarget.dataset.game;
                if (game) {
                    this.loadGame(game);
                }
            });
        });
        
        // Start live wins updates
        this.chat.startLiveWinsUpdates();
    }

    getGameCard(id, name, icon, gradient, desc, color) {
        return `
            <div data-game="${id}" class="game-card cursor-pointer rounded-xl overflow-hidden group relative h-40 md:h-48">
                <div class="absolute inset-0 bg-gradient-to-br ${gradient} opacity-90 transition-all duration-500 group-hover:opacity-100"></div>
                <div class="absolute inset-0 p-4 md:p-6 flex flex-col justify-between z-10">
                    <div class="flex justify-between items-start">
                        <div class="bg-black/30 p-2 md:p-3 rounded-xl backdrop-blur-sm">
                            <i class="fa-solid ${icon} text-lg md:text-xl text-white"></i>
                        </div>
                        <i class="fa-solid fa-arrow-right text-white/50 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 text-sm"></i>
                    </div>
                    <div>
                        <h3 class="text-lg md:text-xl font-bold text-white mb-1">${name}</h3>
                        <p class="text-white/70 text-xs md:text-sm">${desc}</p>
                        <div class="mt-2">
                            <span class="inline-block px-2 py-1 rounded-full text-xs font-bold" style="background: ${color}20; color: ${color}">PLAY NOW</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Chat functions
    addChatMessage(user, msg, color = 'text-white', saveToDB = true) {
        this.chat.addChatMessage(user, msg, color, saveToDB);
    }

    addBigWinNotification(username, amount, game) {
        this.chat.addBigWinNotification(username, amount, game);
    }

    // Record functions
    async recordWager(amount) {
        if (!this.auth.isLoggedIn() || amount <= 0 || this.maintenance.maintenanceMode) return;

        const now = Date.now();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

        const userRef = database.ref('users/' + this.auth.getUserId());
        const snapshot = await userRef.once('value');
        const user = snapshot.val();

        let wageredToday = user.wageredToday || 0;
        let wageredWeek = user.wageredWeek || 0;
        
        // Reset today's wager if it's a new day
        if (user.lastWagered && user.lastWagered < today.getTime()) {
            wageredToday = 0;
        }

        const updates = {
            wageredToday: wageredToday + amount,
            wageredWeek: wageredWeek + amount,
            wageredLifetime: (user.wageredLifetime || 0) + amount,
            lastWagered: now
        };

        await userRef.update(updates);
    }

    async recordWin(amount, game) {
        if (!this.auth.isLoggedIn() || amount <= 0 || this.maintenance.maintenanceMode) return;

        // Update user stats
        const userRef = database.ref('users/' + this.auth.getUserId());
        const snapshot = await userRef.once('value');
        const user = snapshot.val();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let wonToday = user.wonToday || 0;
        
        // Reset today's win if it's a new day
        if (user.lastWin && user.lastWin < today.getTime()) {
            wonToday = 0;
        }

        const updates = {
            totalWins: (user.totalWins || 0) + 1,
            biggestWin: Math.max(user.biggestWin || 0, amount),
            wonToday: wonToday + amount,
            lastWin: Date.now()
        };

        await userRef.update(updates);

        // Record transaction
        const transaction = {
            userId: this.auth.getUserId(),
            username: this.auth.getUsername(),
            amount: amount,
            type: 'win',
            game: game,
            timestamp: Date.now()
        };

        await database.ref('transactions').push(transaction);

        // Announce big win in chat with appropriate styling
        if (amount >= this.bigWinThreshold) {
            this.addBigWinNotification(this.auth.getUsername(), amount, game);
            
            // Also save as system message
            const winMessage = `🎉 ${this.auth.getUsername()} just won ${amount.toLocaleString()} coins in ${game}! 🎉`;
            const messageColor = amount >= 100000 ? 'text-purple-400' : 'text-yellow-400';
            this.addChatMessage('System', winMessage, messageColor, true);
            
            // Special effects for huge wins
            if (amount >= 100000) {
                // Purple confetti for 100k+ wins
                confetti({
                    particleCount: 300,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6']
                });
                
                // Show global alert for 200k+ wins
                if (amount >= 200000) {
                    this.showGlobalAlert(`${this.auth.getUsername()} won ${amount.toLocaleString()} coins playing ${game}!`, 'purple');
                }
            } else if (amount >= 10000) {
                // Gold confetti for 10k+ wins
                confetti({
                    particleCount: 200,
                    spread: 90,
                    origin: { y: 0.6 },
                    colors: ['#f59e0b', '#d97706', '#b45309']
                });
            }
        }
    }

    async recordLoss(amount, game) {
        if (!this.auth.isLoggedIn() || amount <= 0 || this.maintenance.maintenanceMode) return;

        // Update user stats
        const userRef = database.ref('users/' + this.auth.getUserId());
        const snapshot = await userRef.once('value');
        const user = snapshot.val();

        const updates = {
            totalLosses: (user.totalLosses || 0) + 1
        };

        await userRef.update(updates);

        // Record transaction
        const transaction = {
            userId: this.auth.getUserId(),
            username: this.auth.getUsername(),
            amount: amount,
            type: 'loss',
            game: game,
            timestamp: Date.now()
        };

        await database.ref('transactions').push(transaction);
    }

    // Update online status (now handled by ChatManager)
    updateOnlineStatus() {
        this.chat.startOnlineUsersTracking();
    }

    // Game-specific methods (for backward compatibility)
    endMines(win, hitIdx) {
        this.minesGame.endGame(win, hitIdx);
    }

    resetBlackjackUI() {
        this.blackjackGame.resetUI();
    }

    updateChickenUI() {
        this.chickenGame.updateUI();
    }

    updateCoinflipUI() {
        this.coinflipGame.updateUI();
    }

    coinflipEndGame() {
        this.coinflipGame.endGame();
    }

    // Cleanup on logout
    cleanup() {
        // Clear intervals
        if (this.activityPingInterval) {
            clearInterval(this.activityPingInterval);
        }
        
        // Clean up games
        this.resetAllGames();
        
        // Clean up chat
        this.chat.cleanup();
        
        // Clean up maintenance
        this.maintenance.cleanup();
        
        // Remove balance listener
        if (this.balanceUpdateListener) {
            this.balanceUpdateListener();
        }
    }

    // Logout shortcut
    logout() {
        this.cleanup();
        this.auth.logout();
    }
}

// Create and initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GameApp();
});
