
// Get database from global scope
const database = window.database;
const soundManager = window.soundManager || {
    play: () => {},
    toggle: () => {}
};

class WalletManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Wallet buttons
        const walletBtn = document.getElementById('walletBtn');
        const openWalletBtn = document.getElementById('openWalletBtn');
        const mobileWalletBtn = document.getElementById('mobileWalletBtn');
        const closeDepositModalBtn = document.getElementById('closeDepositModalBtn');
        const claimCoinsBtn = document.getElementById('claimCoinsBtn');
        const sendMoneyBtn = document.getElementById('sendMoneyBtn');
        const sendAmountInput = document.getElementById('sendAmount');

        if (walletBtn) walletBtn.addEventListener('click', () => this.openDepositModal());
        if (openWalletBtn) openWalletBtn.addEventListener('click', () => this.openDepositModal());
        if (mobileWalletBtn) mobileWalletBtn.addEventListener('click', () => this.openDepositModal());
        if (closeDepositModalBtn) closeDepositModalBtn.addEventListener('click', () => this.closeDepositModal());
        if (claimCoinsBtn) claimCoinsBtn.addEventListener('click', () => this.claimFreeCoins());
        if (sendMoneyBtn) sendMoneyBtn.addEventListener('click', () => this.sendMoney());
        if (sendAmountInput) {
            sendAmountInput.addEventListener('input', () => this.updateTransferFeeDisplay());
        }
    }

    openDepositModal() {
        if (!this.app.checkMaintenance()) return;
        
        if (!this.app.auth.isLoggedIn()) {
            this.app.showToast('Please login first', 'error');
            return;
        }
        
        const depositModal = document.getElementById('depositModal');
        if (depositModal) {
            depositModal.classList.add('active');
        }
        
        this.updateFreeCoinsButton();
        this.updateTransferFeeDisplay();
        if (soundManager && soundManager.play) {
            soundManager.play('click');
        }
    }

    closeDepositModal() {
        const depositModal = document.getElementById('depositModal');
        if (depositModal) {
            depositModal.classList.remove('active');
        }
        if (soundManager && soundManager.play) {
            soundManager.play('click');
        }
    }

    updateTransferFeeDisplay() {
        const amountInput = document.getElementById('sendAmount');
        const recipientReceives = document.getElementById('recipientReceives');
        const transferFee = document.getElementById('transferFee');
        
        if (!amountInput || !recipientReceives || !transferFee) return;
        
        const amount = parseFloat(amountInput.value) || 0;
        const fee = Math.floor(amount * 0.10); // 10% fee
        const recipientGets = amount - fee;
        
        recipientReceives.textContent = `${recipientGets} coins`;
        transferFee.textContent = `${fee} coins`;
    }

    updateFreeCoinsButton() {
        const claimButton = document.getElementById('claimCoinsBtn');
        const timerElement = document.getElementById('freeCoinsTimer');
        const cooldownElement = document.getElementById('freeCoinsCooldown');

        if (claimButton && timerElement && cooldownElement) {
            const canClaim = this.app.auth.getBalance() < 100;
            const now = Date.now();
            const cooldownRemaining = this.app.auth.freeCoinsCooldown - now;
            
            if (canClaim && cooldownRemaining <= 0 && !this.app.maintenanceMode) {
                timerElement.textContent = 'Ready to Claim';
                claimButton.disabled = false;
                claimButton.textContent = 'Claim 500 Coins';
                claimButton.className = 'w-full btn-primary py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-[1.02] touch-button';
                cooldownElement.textContent = 'No cooldown';
                cooldownElement.className = 'text-xs text-gray-500';
            } else {
                if (cooldownRemaining > 0) {
                    // Show cooldown timer
                    const minutes = Math.floor(cooldownRemaining / 60000);
                    const seconds = Math.floor((cooldownRemaining % 60000) / 1000);
                    timerElement.textContent = 'Cooldown Active';
                    claimButton.disabled = true;
                    claimButton.textContent = 'Wait ' + minutes + 'm ' + seconds + 's';
                    claimButton.className = 'w-full bg-gray-700 text-gray-400 py-3 rounded-xl font-bold text-sm cursor-not-allowed touch-button';
                    cooldownElement.textContent = `${minutes}m ${seconds}s remaining`;
                    cooldownElement.className = 'text-xs text-yellow-400';
                } else if (this.app.maintenanceMode) {
                    timerElement.textContent = 'Disabled (Maintenance)';
                    claimButton.disabled = true;
                    claimButton.textContent = 'Maintenance Mode';
                    claimButton.className = 'w-full bg-gray-700 text-gray-400 py-3 rounded-xl font-bold text-sm cursor-not-allowed touch-button';
                    cooldownElement.textContent = 'Maintenance active';
                    cooldownElement.className = 'text-xs text-red-400';
                } else {
                    timerElement.textContent = 'Balance too high';
                    claimButton.disabled = true;
                    claimButton.textContent = 'Balance must be under 100';
                    claimButton.className = 'w-full bg-gray-700 text-gray-400 py-3 rounded-xl font-bold text-sm cursor-not-allowed touch-button';
                    cooldownElement.textContent = 'Balance > 100 coins';
                    cooldownElement.className = 'text-xs text-gray-500';
                }
            }
        }
    }

    async claimFreeCoins() {
        if (!this.app.checkMaintenance()) return;
        
        if (!this.app.auth.isLoggedIn()) return;

        // Check if balance is under 100
        if (this.app.auth.getBalance() >= 100) {
            this.app.showToast('You must have less than 100 coins to claim', 'error');
            return;
        }

        // Check cooldown
        const now = Date.now();
        if (this.app.auth.freeCoinsCooldown > now) {
            const remaining = this.app.auth.freeCoinsCooldown - now;
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            this.app.showToast(`Please wait ${minutes}m ${seconds}s before claiming again`, 'warning');
            return;
        }

        const newBalance = this.app.auth.getBalance() + 500;
        this.app.auth.setBalance(newBalance);
        this.app.auth.lastFreeCoinsClaim = Date.now();
        this.app.auth.freeCoinsCooldown = Date.now() + (5 * 60 * 1000); // 5 minute cooldown

        // Update in database
        await database.ref('users/' + this.app.auth.getUserId()).update({
            balance: newBalance,
            lastFreeCoins: this.app.auth.lastFreeCoinsClaim,
            freeCoinsCooldown: this.app.auth.freeCoinsCooldown
        });

        this.updateFreeCoinsButton();
        this.app.showToast('500 free coins claimed! 5-minute cooldown started.', 'success');
        if (soundManager && soundManager.play) {
            soundManager.play('win');
        }

        // Confetti effect
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    async sendMoney() {
        if (!this.app.checkMaintenance()) return;
        
        if (!this.app.auth.isLoggedIn()) return;
        
        // Check if user is in cooldown after claiming free coins
        const now = Date.now();
        if (this.app.auth.freeCoinsCooldown > now) {
            const remaining = this.app.auth.freeCoinsCooldown - now;
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            this.app.showToast(`Cannot send money for ${minutes}m ${seconds}s after claiming free coins`, 'error');
            return;
        }
        
        const recipientUsername = document.getElementById('sendToUsername').value.trim();
        const amount = parseFloat(document.getElementById('sendAmount').value);

        if (!recipientUsername || !amount) {
            this.app.showToast('Please fill all fields', 'error');
            return;
        }

        if (amount <= 0) {
            this.app.showToast('Amount must be positive', 'error');
            return;
        }

        if (amount > this.app.auth.getBalance()) {
            this.app.showToast('Insufficient funds', 'error');
            return;
        }

        if (recipientUsername === this.app.auth.getUsername()) {
            this.app.showToast('Cannot send money to yourself', 'error');
            return;
        }

        // Calculate 10% tax
        const tax = Math.floor(amount * 0.10);
        const recipientAmount = amount - tax;

        try {
            // First, find the recipient user
            const usersSnapshot = await database.ref('users').orderByChild('username').equalTo(recipientUsername).once('value');
            
            if (!usersSnapshot.exists()) {
                this.app.showToast('Recipient not found', 'error');
                return;
            }
            
            let recipientId = null;
            usersSnapshot.forEach(child => {
                recipientId = child.key;
            });
            
            if (!recipientId) {
                this.app.showToast('Recipient not found', 'error');
                return;
            }

            // Use database transaction to prevent race conditions
            const updates = {};
            
            // Deduct from sender (full amount)
            const senderNewBalance = this.app.auth.getBalance() - amount;
            updates['users/' + this.app.auth.getUserId() + '/balance'] = senderNewBalance;
            
            // Add to recipient (amount minus 10% tax)
            const recipientSnapshot = await database.ref('users/' + recipientId + '/balance').once('value');
            const recipientCurrentBalance = recipientSnapshot.val() || 0;
            updates['users/' + recipientId + '/balance'] = recipientCurrentBalance + recipientAmount;
            
            // Perform all updates at once
            await database.ref().update(updates);
            
            // Update local balance
            this.app.auth.setBalance(senderNewBalance);
            
            // Clear form
            document.getElementById('sendToUsername').value = '';
            document.getElementById('sendAmount').value = '';
            
            // Record transaction
            const transaction = {
                from: this.app.auth.getUsername(),
                fromId: this.app.auth.getUserId(),
                to: recipientUsername,
                toId: recipientId,
                amount: amount,
                recipientAmount: recipientAmount,
                tax: tax,
                timestamp: Date.now(),
                type: 'transfer'
            };

            await database.ref('transactions').push(transaction);
            
            // Show success message with tax info
            this.app.showToast(`Sent ${amount.toLocaleString()} coins to ${recipientUsername} (${recipientAmount.toLocaleString()} after 10% tax)`, 'success');
            if (soundManager && soundManager.play) {
                soundManager.play('win');
            }
            
            // Add chat message with appropriate styling
            let messageClass = 'chat-transfer-message';
            let messageColor = '';
            
            if (amount >= 100000) {
                // Purple alert for 100k+ transfers
                messageClass += ' purple';
                messageColor = 'purple';
                this.app.showGlobalAlert(`${this.app.auth.getUsername()} sent ${amount.toLocaleString()} coins to ${recipientUsername}!`, 'purple');
            } else if (amount >= 10000) {
                // Gold alert for 10k+ transfers
                messageClass += ' gold';
                messageColor = 'gold';
            }
            
            // Add chat message with tax info
            this.app.addChatMessage('💰 Money Transfer', 
                `${this.app.auth.getUsername()} sent ${amount.toLocaleString()} coins to ${recipientUsername}! (${recipientAmount.toLocaleString()} after 10% tax)`, 
                'text-[#10b981]', true);
            
            // Play confetti for large transfers
            if (amount >= 10000 && typeof confetti === 'function') {
                confetti({
                    particleCount: Math.min(amount / 100, 500),
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            
        } catch (error) {
            console.error('Money transfer error:', error);
            this.app.showToast('Transaction error occurred', 'error');
        }
    }
}

// Make class globally available
window.WalletManager = WalletManager;
