// Wallet System
class WalletSystem {
    constructor(app) {
        this.app = app;
        this.transactions = [];
        this.lastFreeCoins = 0;
    }

    async initialize() {
        await this.loadTransactions();
        this.setupTransactionListener();
    }

    async loadTransactions() {
        if (!this.app.userId) return;
        
        try {
            const snapshot = await database.ref(`transactions/${this.app.userId}`)
                .orderByChild('timestamp')
                .limitToLast(20)
                .once('value');
            
            this.transactions = [];
            snapshot.forEach(child => {
                this.transactions.push(child.val());
            });
            
            this.transactions.reverse();
            
        } catch (error) {
            console.error('Load transactions error:', error);
        }
    }

    setupTransactionListener() {
        if (!this.app.userId) return;
        
        // Listen for new transactions
        database.ref(`transactions/${this.app.userId}`)
            .orderByChild('timestamp')
            .startAt(Date.now())
            .on('child_added', (snapshot) => {
                const transaction = snapshot.val();
                this.transactions.unshift(transaction);
                
                // Keep only last 20 transactions
                if (this.transactions.length > 20) {
                    this.transactions.pop();
                }
            });
    }

    async getBalance() {
        if (!this.app.userId) return 500;
        
        try {
            const snapshot = await database.ref(`users/${this.app.userId}/balance`).once('value');
            return snapshot.val() || 500;
        } catch (error) {
            console.error('Get balance error:', error);
            return 500;
        }
    }

    async updateBalance(amount, reason = 'game') {
        if (!this.app.userId) return;
        
        try {
            // Use transaction to prevent race conditions
            const balanceRef = database.ref(`users/${this.app.userId}/balance`);
            const snapshot = await balanceRef.once('value');
            const currentBalance = snapshot.val() || 500;
            const newBalance = currentBalance + amount;
            
            await balanceRef.set(newBalance);
            
            // Record transaction
            await this.recordTransaction(amount, reason);
            
            // Update local balance
            this.app.balance = newBalance;
            this.app.updateUI();
            
        } catch (error) {
            console.error('Update balance error:', error);
            throw error;
        }
    }

    async deductBalance(amount, reason) {
        if (amount <= 0) return;
        
        const currentBalance = await this.getBalance();
        if (amount > currentBalance) {
            throw new Error('Insufficient funds');
        }
        
        await this.updateBalance(-amount, reason);
    }

    async addBalance(amount, reason) {
        if (amount <= 0) return;
        await this.updateBalance(amount, reason);
    }

    async recordTransaction(amount, type, game = null) {
        if (!this.app.userId) return;
        
        try {
            const transaction = {
                userId: this.app.userId,
                username: this.app.username,
                amount: Math.abs(amount),
                type: amount > 0 ? 'credit' : 'debit',
                game: game,
                reason: type,
                timestamp: Date.now(),
                balanceAfter: this.app.balance
            };

            await database.ref(`transactions/${this.app.userId}`).push(transaction);
            
        } catch (error) {
            console.error('Record transaction error:', error);
        }
    }

    async recordWin(amount, game) {
        if (!this.app.userId || amount <= 0) return;
        
        try {
            // Update user stats
            const userRef = database.ref(`users/${this.app.userId}`);
            const snapshot = await userRef.once('value');
            const user = snapshot.val();
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let wonToday = user.wonToday || 0;
            
            // Reset if new day
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
            
            // Record win transaction
            await this.recordTransaction(amount, 'win', game);
            
            // Announce big win in chat
            if (amount >= this.app.bigWinThreshold) {
                await this.app.chat.addSystemMessage(
                    `🎉 ${this.app.username} just won ${amount.toLocaleString()} coins in ${game}! 🎉`,
                    'win'
                );
                
                // Special effects for huge wins
                if (amount >= 100000) {
                    confetti({
                        particleCount: 300,
                        spread: 100,
                        origin: { y: 0.6 },
                        colors: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6']
                    });
                }
            }
            
        } catch (error) {
            console.error('Record win error:', error);
        }
    }

    async recordLoss(amount, game) {
        if (!this.app.userId || amount <= 0) return;
        
        try {
            // Update user stats
            const userRef = database.ref(`users/${this.app.userId}`);
            const snapshot = await userRef.once('value');
            const user = snapshot.val();

            const updates = {
                totalLosses: (user.totalLosses || 0) + 1
            };

            await userRef.update(updates);
            
            // Record loss transaction
            await this.recordTransaction(-amount, 'loss', game);
            
        } catch (error) {
            console.error('Record loss error:', error);
        }
    }

    async recordWager(amount) {
        if (!this.app.userId || amount <= 0) return;
        
        try {
            const userRef = database.ref(`users/${this.app.userId}`);
            const snapshot = await userRef.once('value');
            const user = snapshot.val();

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

            let wageredToday = user.wageredToday || 0;
            let wageredWeek = user.wageredWeek || 0;
            
            // Reset if new day
            if (user.lastWagered && user.lastWagered < today.getTime()) {
                wageredToday = 0;
            }

            // Reset week if older than 7 days
            if (user.lastWagered && user.lastWagered < weekAgo) {
                wageredWeek = 0;
            }

            const updates = {
                wageredToday: wageredToday + amount,
                wageredWeek: wageredWeek + amount,
                wageredLifetime: (user.wageredLifetime || 0) + amount,
                lastWagered: Date.now()
            };

            await userRef.update(updates);
            
        } catch (error) {
            console.error('Record wager error:', error);
        }
    }

    async sendMoney(toUsername, amount) {
        if (!this.app.userId) {
            throw new Error('Not logged in');
        }

        if (!toUsername || !amount) {
            throw new Error('Please fill all fields');
        }

        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        if (amount > this.app.balance) {
            throw new Error('Insufficient funds');
        }

        if (toUsername === this.app.username) {
            throw new Error('Cannot send money to yourself');
        }

        try {
            // Find recipient
            const usersSnapshot = await database.ref('users')
                .orderByChild('username')
                .equalTo(toUsername)
                .once('value');
            
            if (!usersSnapshot.exists()) {
                throw new Error('Recipient not found');
            }
            
            let recipientId = null;
            usersSnapshot.forEach(child => {
                recipientId = child.key;
            });
            
            if (!recipientId) {
                throw new Error('Recipient not found');
            }

            // Use transaction for atomic updates
            const updates = {};
            
            // Deduct from sender
            const senderNewBalance = this.app.balance - amount;
            updates[`users/${this.app.userId}/balance`] = senderNewBalance;
            
            // Add to recipient
            const recipientSnapshot = await database.ref(`users/${recipientId}/balance`).once('value');
            const recipientCurrentBalance = recipientSnapshot.val() || 0;
            updates[`users/${recipientId}/balance`] = recipientCurrentBalance + amount;
            
            // Perform all updates
            await database.ref().update(updates);
            
            // Update local balance
            this.app.balance = senderNewBalance;
            this.app.updateUI();
            
            // Record transactions for both users
            const senderTransaction = {
                userId: this.app.userId,
                username: this.app.username,
                amount: amount,
                type: 'transfer_sent',
                to: toUsername,
                timestamp: Date.now(),
                balanceAfter: senderNewBalance
            };

            const recipientTransaction = {
                userId: recipientId,
                username: toUsername,
                amount: amount,
                type: 'transfer_received',
                from: this.app.username,
                timestamp: Date.now(),
                balanceAfter: recipientCurrentBalance + amount
            };

            await database.ref(`transactions/${this.app.userId}`).push(senderTransaction);
            await database.ref(`transactions/${recipientId}`).push(recipientTransaction);
            
            // Add chat message
            await this.app.chat.addTransferMessage(this.app.username, toUsername, amount);
            
            return true;
            
        } catch (error) {
            console.error('Send money error:', error);
            throw error;
        }
    }

    async claimFreeCoins() {
        if (!this.app.userId) {
            throw new Error('Not logged in');
        }

        // Check if balance is under threshold
        if (this.app.balance >= GAME_CONSTANTS.FREE_COINS.threshold) {
            throw new Error(`Balance must be under ${GAME_CONSTANTS.FREE_COINS.threshold} coins`);
        }

        // Check cooldown
        const now = Date.now();
        if (this.lastFreeCoins > 0 && now - this.lastFreeCoins < GAME_CONSTANTS.FREE_COINS.cooldown) {
            const remaining = Math.ceil((GAME_CONSTANTS.FREE_COINS.cooldown - (now - this.lastFreeCoins)) / 60000);
            throw new Error(`Please wait ${remaining} minutes before claiming again`);
        }

        try {
            const amount = GAME_CONSTANTS.FREE_COINS.amount;
            await this.addBalance(amount, 'free_coins');
            
            this.lastFreeCoins = now;
            
            // Update last free coins claim
            await database.ref(`users/${this.app.userId}`).update({
                lastFreeCoins: now
            });
            
            return amount;
            
        } catch (error) {
            console.error('Claim free coins error:', error);
            throw error;
        }
    }
}
