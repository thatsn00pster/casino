// Common Game Utilities
class GameUtilities {
    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    static getRandomColor() {
        const colors = [
            '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
            '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    static createConfetti(options = {}) {
        const defaults = {
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        };
        
        confetti({ ...defaults, ...options });
    }

    static showBigWinNotification(username, amount, game) {
        // Add to chat
        if (window.app && window.app.chat) {
            const message = `🎉 ${username} just won ${amount.toLocaleString()} coins in ${game}! 🎉`;
            window.app.chat.addSystemMessage(message, 'win');
        }
        
        // Show global alert for huge wins
        if (amount >= 200000 && window.app && window.app.showGlobalAlert) {
            window.app.showGlobalAlert(
                `${username} won ${amount.toLocaleString()} coins playing ${game}!`,
                'purple'
            );
        }
        
        // Confetti for big wins
        if (amount >= 10000) {
            this.createConfetti({
                particleCount: Math.min(amount / 100, 500),
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    static validateBet(bet, balance, min = 1, max = null) {
        if (isNaN(bet) || bet <= 0) {
            return { valid: false, message: 'Invalid bet amount' };
        }
        
        if (bet < min) {
            return { valid: false, message: `Minimum bet is ${min}` };
        }
        
        if (max && bet > max) {
            return { valid: false, message: `Maximum bet is ${max}` };
        }
        
        if (bet > balance) {
            return { valid: false, message: 'Insufficient funds' };
        }
        
        return { valid: true, message: 'Bet is valid' };
    }

    static calculateMultiplier(baseMultiplier, houseEdge) {
        return baseMultiplier * (1 - houseEdge);
    }

    static generateUniqueId(prefix = '') {
        return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Export utilities
window.GameUtilities = GameUtilities;
