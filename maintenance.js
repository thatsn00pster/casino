// Maintenance System
class MaintenanceSystem {
    constructor(app) {
        this.app = app;
        this.isActive = false;
        this.endTime = null;
        this.timerInterval = null;
    }

    async initialize() {
        await this.checkStatus();
        this.setupListener();
    }

    async checkStatus() {
        try {
            const snapshot = await database.ref('maintenance').once('value');
            
            if (snapshot.exists()) {
                const maintenanceData = snapshot.val();
                this.isActive = maintenanceData.enabled || false;
                this.endTime = maintenanceData.endTime || null;
                
                if (this.isActive) {
                    this.showMaintenanceModal();
                    this.startTimer();
                } else {
                    this.hideMaintenanceModal();
                }
            }
            
        } catch (error) {
            console.error('Maintenance check error:', error);
        }
    }

    setupListener() {
        // Listen for maintenance status changes
        database.ref('maintenance').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const maintenanceData = snapshot.val();
                const newIsActive = maintenanceData.enabled || false;
                
                if (newIsActive !== this.isActive) {
                    this.isActive = newIsActive;
                    this.endTime = maintenanceData.endTime || null;
                    
                    if (this.isActive) {
                        this.showMaintenanceModal();
                        this.startTimer();
                    } else {
                        this.hideMaintenanceModal();
                    }
                }
            }
        });
    }

    showMaintenanceModal() {
        const modal = document.getElementById('maintenanceModal');
        if (modal) {
            modal.classList.add('active');
        }
        
        // Disable all game interactions
        this.disableGames();
        
        // Add system message to chat
        if (this.app.chat && this.app.chat.addSystemMessage) {
            this.app.chat.addSystemMessage(
                '🚧 MAINTENANCE ALERT: The casino is undergoing maintenance. All games are temporarily disabled.',
                'warning'
            );
        }
    }

    hideMaintenanceModal() {
        const modal = document.getElementById('maintenanceModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Re-enable games
        this.enableGames();
        
        // Add system message to chat
        if (this.app.chat && this.app.chat.addSystemMessage) {
            this.app.chat.addSystemMessage(
                '✅ MAINTENANCE COMPLETE: All games are now available!',
                'success'
            );
        }
    }

    disableGames() {
        // Disable game buttons
        const gameButtons = document.querySelectorAll('.sidebar-button, .game-card, .btn-primary');
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
        this.stopActiveGames();
    }

    enableGames() {
        // Re-enable game buttons
        const gameButtons = document.querySelectorAll('.sidebar-button, .game-card, .btn-primary');
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

    stopActiveGames() {
        // Stop all active games
        if (window.app) {
            if (window.app.minesGame && window.app.minesGame.state.isActive) {
                window.app.minesGame.endGame(false);
            }
            
            if (window.app.blackjackGame && window.app.blackjackGame.state.isActive) {
                window.app.blackjackGame.resetGame();
            }
            
            if (window.app.chickenGame && window.app.chickenGame.state.isActive) {
                window.app.chickenGame.state.isActive = false;
                window.app.chickenGame.updateUI();
            }
            
            if (window.app.coinflipGame && window.app.coinflipGame.state.isActive) {
                window.app.coinflipGame.endGame(false);
            }
        }
    }

    startTimer() {
        if (!this.endTime) {
            document.getElementById('maintenanceTimer').textContent = '00:30:00';
            return;
        }
        
        // Clear existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        const updateTimer = () => {
            const now = Date.now();
            const endTime = this.endTime;
            
            if (now >= endTime) {
                // Maintenance should be over
                document.getElementById('maintenanceTimer').textContent = '00:00:00';
                clearInterval(this.timerInterval);
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
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    isAccessible() {
        if (this.isActive) {
            if (window.app && window.app.showToast) {
                window.app.showToast('Casino is under maintenance. Please try again later.', 'error');
            }
            return false;
        }
        return true;
    }

    // Admin functions
    async enable(minutes = 30) {
        if (!window.app || !window.app.userId) {
            console.error('You must be logged in to enable maintenance');
            return;
        }
        
        const endTime = Date.now() + (minutes * 60 * 1000);
        
        const maintenanceData = {
            enabled: true,
            endTime: endTime,
            startedBy: window.app.username,
            startedAt: Date.now(),
            message: `Maintenance mode enabled for ${minutes} minutes`
        };
        
        try {
            await database.ref('maintenance').set(maintenanceData);
            
            if (window.app.showToast) {
                window.app.showToast(`Maintenance mode enabled for ${minutes} minutes`, 'warning');
            }
            
        } catch (error) {
            console.error('Enable maintenance error:', error);
            if (window.app.showToast) {
                window.app.showToast('Failed to enable maintenance mode', 'error');
            }
        }
    }

    async disable() {
        if (!window.app || !window.app.userId) {
            console.error('You must be logged in to disable maintenance');
            return;
        }
        
        try {
            await database.ref('maintenance').remove();
            
            if (window.app.showToast) {
                window.app.showToast('Maintenance mode disabled', 'success');
            }
            
        } catch (error) {
            console.error('Disable maintenance error:', error);
            if (window.app.showToast) {
                window.app.showToast('Failed to disable maintenance mode', 'error');
            }
        }
    }

    status() {
        return {
            isActive: this.isActive,
            endTime: this.endTime,
            remaining: this.endTime ? Math.max(0, this.endTime - Date.now()) : 0
        };
    }
}
