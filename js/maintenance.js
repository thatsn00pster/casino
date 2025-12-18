import { database } from './firebase.js';

class MaintenanceManager {
    constructor(app) {
        this.app = app;
        this.maintenanceMode = false;
        this.maintenanceEndTime = null;
        this.maintenanceTimerInterval = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add admin functions to window for console access
        window.enableMaintenance = (minutes = 30) => this.enableMaintenance(minutes);
        window.disableMaintenance = () => this.disableMaintenance();
        window.checkMaintenance = () => console.log('Maintenance mode:', this.maintenanceMode);
    }

    async checkStatus() {
        try {
            const maintenanceRef = database.ref('maintenance');
            const snapshot = await maintenanceRef.once('value');
            
            if (snapshot.exists()) {
                const maintenanceData = snapshot.val();
                this.maintenanceMode = maintenanceData.enabled || false;
                this.maintenanceEndTime = maintenanceData.endTime || null;
                
                if (this.maintenanceMode) {
                    this.showMaintenanceModal();
                    this.startMaintenanceTimer();
                } else {
                    this.hideMaintenanceModal();
                }
            }
            
            // Listen for maintenance status changes
            maintenanceRef.on('value', (snap) => {
                if (snap.exists()) {
                    const maintenanceData = snap.val();
                    const newMaintenanceMode = maintenanceData.enabled || false;
                    
                    if (newMaintenanceMode !== this.maintenanceMode) {
                        this.maintenanceMode = newMaintenanceMode;
                        this.maintenanceEndTime = maintenanceData.endTime || null;
                        
                        if (this.maintenanceMode) {
                            this.showMaintenanceModal();
                            this.startMaintenanceTimer();
                        } else {
                            this.hideMaintenanceModal();
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Error checking maintenance status:', error);
        }
    }

    showMaintenanceModal() {
        const maintenanceModal = document.getElementById('maintenanceModal');
        if (maintenanceModal) {
            maintenanceModal.classList.add('active');
        }
        
        // Disable all game-related buttons
        this.disableAllGames();
    }

    hideMaintenanceModal() {
        const maintenanceModal = document.getElementById('maintenanceModal');
        if (maintenanceModal) {
            maintenanceModal.classList.remove('active');
        }
        
        // Re-enable games
        this.enableAllGames();
    }

    disableAllGames() {
        // Disable game buttons
        const gameButtons = document.querySelectorAll('button[data-game], .game-card, .btn-primary');
        gameButtons.forEach(button => {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        });
        
        // Disable bet inputs
        const betInputs = document.querySelectorAll('input[type="number"]');
        betInputs.forEach(input => {
            input.disabled = true;
        });
        
        // Disable chat
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.disabled = true;
            chatInput.placeholder = 'Chat disabled during maintenance';
        }
        
        // Stop any active games
        if (this.app.minesActive) {
            this.app.endMines(false, -1);
        }
        if (this.app.bjInProgress) {
            this.app.resetBlackjackUI();
        }
        if (this.app.chickenState.isPlaying) {
            this.app.chickenState.isPlaying = false;
            this.app.updateChickenUI();
        }
        if (this.app.coinflipState.isGameActive) {
            this.app.coinflipEndGame();
        }
    }

    enableAllGames() {
        // Re-enable game buttons
        const gameButtons = document.querySelectorAll('button[data-game], .game-card, .btn-primary');
        gameButtons.forEach(button => {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        });
        
        // Re-enable bet inputs
        const betInputs = document.querySelectorAll('input[type="number"]');
        betInputs.forEach(input => {
            input.disabled = false;
        });
        
        // Re-enable chat
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.disabled = false;
            chatInput.placeholder = 'Type a message...';
        }
    }

    startMaintenanceTimer() {
        if (!this.maintenanceEndTime) {
            const timerElement = document.getElementById('maintenanceTimer');
            if (timerElement) {
                timerElement.textContent = '00:30:00';
            }
            return;
        }
        
        // Clear any existing timer
        if (this.maintenanceTimerInterval) {
            clearInterval(this.maintenanceTimerInterval);
        }
        
        const updateTimer = () => {
            const now = Date.now();
            const endTime = this.maintenanceEndTime;
            
            if (now >= endTime) {
                // Maintenance should be over
                const timerElement = document.getElementById('maintenanceTimer');
                if (timerElement) {
                    timerElement.textContent = '00:00:00';
                }
                clearInterval(this.maintenanceTimerInterval);
                return;
            }
            
            const remaining = endTime - now;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            
            const timerElement = document.getElementById('maintenanceTimer');
            if (timerElement) {
                timerElement.textContent = 
                    `${hours.toString().padStart(2, '0')}:` +
                    `${minutes.toString().padStart(2, '0')}:` +
                    `${seconds.toString().padStart(2, '0')}`;
            }
        };
        
        // Update immediately and every second
        updateTimer();
        this.maintenanceTimerInterval = setInterval(updateTimer, 1000);
    }

    // ADMIN FUNCTIONS - To be called from browser console or admin panel
    async enableMaintenance(minutes = 30) {
        if (!this.app.auth.isLoggedIn()) {
            this.app.showToast('You must be logged in to enable maintenance', 'error');
            return;
        }
        
        // Only allow admin users (you can add admin check here)
        const endTime = Date.now() + (minutes * 60 * 1000);
        
        const maintenanceData = {
            enabled: true,
            endTime: endTime,
            startedBy: this.app.auth.getUsername(),
            startedAt: Date.now(),
            message: `Maintenance mode enabled for ${minutes} minutes`
        };
        
        try {
            await database.ref('maintenance').set(maintenanceData);
            this.app.showToast(`Maintenance mode enabled for ${minutes} minutes`, 'warning');
            this.maintenanceMode = true;
            this.maintenanceEndTime = endTime;
            this.showMaintenanceModal();
            this.startMaintenanceTimer();
            
            // Add maintenance message to chat
            const maintenanceMessage = `🚧 MAINTENANCE ALERT: The casino is undergoing maintenance for approximately ${minutes} minutes. All games are temporarily disabled.`;
            this.app.addChatMessage('System', maintenanceMessage, 'text-yellow-400', true);
            
        } catch (error) {
            console.error('Error enabling maintenance:', error);
            this.app.showToast('Failed to enable maintenance mode', 'error');
        }
    }

    async disableMaintenance() {
        if (!this.app.auth.isLoggedIn()) {
            this.app.showToast('You must be logged in to disable maintenance', 'error');
            return;
        }
        
        try {
            await database.ref('maintenance').remove();
            this.app.showToast('Maintenance mode disabled', 'success');
            this.maintenanceMode = false;
            this.maintenanceEndTime = null;
            this.hideMaintenanceModal();
            
            // Clear maintenance timer
            if (this.maintenanceTimerInterval) {
                clearInterval(this.maintenanceTimerInterval);
            }
            
            // Add maintenance complete message to chat
            const completionMessage = '✅ MAINTENANCE COMPLETE: All games are now available!';
            this.app.addChatMessage('System', completionMessage, 'text-green-400', true);
            
        } catch (error) {
            console.error('Error disabling maintenance:', error);
            this.app.showToast('Failed to disable maintenance mode', 'error');
        }
    }

    // Check maintenance before allowing game actions
    checkMaintenance() {
        if (this.maintenanceMode) {
            this.app.showToast('Casino is under maintenance. Please try again later.', 'error');
            return false;
        }
        return true;
    }

    // Clean up
    cleanup() {
        if (this.maintenanceTimerInterval) {
            clearInterval(this.maintenanceTimerInterval);
        }
    }
}

export { MaintenanceManager };