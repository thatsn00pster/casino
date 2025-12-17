// Coinflip Game Class
class CoinflipGame {
    constructor(app) {
        this.app = app;
        this.state = {
            isActive: false,
            bet: 0,
            currentMultiplier: 1.00,
            streak: 0,
            history: [],
            isFlipping: false,
            gameId: null,
            choice: null
        };
        
        this.HOUSE_EDGE = GAME_CONSTANTS.HOUSE_EDGE.coinflip;
    }

    async render() {
        this.resetState();
        
        this.app.mainContent.innerHTML = `
            <div class="coinflip-container">
                <div class="coinflip-game-area">
                    <!-- Coin Display -->
                    <div class="coin-container">
                        <div id="coinflipCoin" class="coin">
                            <div class="coin-side heads">
                                <i class="fa-solid fa-crown"></i>
                            </div>
                            <div class="coin-side tails">
                                <i class="fa-solid fa-flag"></i>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Game Controls -->
                    <div id="coinflipControls" class="coinflip-controls hidden">
                        <button onclick="app.coinflipGame.flip('heads')" class="choice-btn heads-btn">
                            <div class="choice-icon">H</div>
                            <span>Heads</span>
                        </button>
                        <button onclick="app.coinflipGame.flip('tails')" class="choice-btn tails-btn">
                            <div class="choice-icon">T</div>
                            <span>Tails</span>
                        </button>
                    </div>
                    
                    <!-- Waiting Message -->
                    <div id="coinflipWaiting" class="waiting-message">
                        Press Start to play
                    </div>
                    
                    <!-- Result Overlay -->
                    <div id="coinflipResult" class="result-overlay hidden">
                        <span id="coinflipResultText"></span>
                    </div>
                    
                    <!-- History -->
                    <div class="history-container">
                        <div class="history-label">Round History</div>
                        <div id="coinflipHistory" class="history-list">
                            <span class="no-history">No flips yet...</span>
                        </div>
                    </div>
                </div>
                
                <div class="coinflip-controls-panel">
                    <!-- Balance Display -->
                    <div class="panel-section">
                        <div class="section-label">Balance</div>
                        <div class="balance-display">
                            <span class="currency">$</span>
                            <span id="coinflipBalance" class="balance-amount">${this.app.balance.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <!-- Bet Controls -->
                    <div id="coinflipBetControls" class="panel-section">
                        <div class="section-label">Bet Amount</div>
                        <div class="bet-input-group">
                            <span class="input-prefix">$</span>
                            <input type="number" id="coinflipBetInput" value="10" min="1" max="${this.app.balance}">
                        </div>
                        <div class="quick-bet-buttons">
                            <button onclick="app.coinflipGame.adjustBet(0.5)">1/2</button>
                            <button onclick="app.coinflipGame.adjustBet(2)">2x</button>
                            <button onclick="app.coinflipGame.setBet(10)">Min</button>
                            <button onclick="app.coinflipGame.setBet(${this.app.balance})">Max</button>
                        </div>
                        
                        <button id="coinflipStartBtn" onclick="app.coinflipGame.startGame()" class="btn-primary">
                            Start Game
                        </button>
                    </div>
                    
                    <!-- Game Stats -->
                    <div id="coinflipGameStats" class="panel-section hidden">
                        <div class="stats-grid">
                            <div class="stat">
                                <span>Current Streak</span>
                                <span id="coinflipStreak" class="stat-value">0</span>
                            </div>
                            <div class="stat">
                                <span>Multiplier</span>
                                <span id="coinflipMultiplier" class="stat-value">1.00×</span>
                            </div>
                            <div class="stat">
                                <span>Profit on Win</span>
                                <span id="coinflipProfit" class="stat-value profit">$0.00</span>
                            </div>
                        </div>
                        
                        <div class="accumulated-section">
                            <div class="section-label">Total Accumulated</div>
                            <div id="coinflipAccumulated" class="accumulated-amount">$0.00</div>
                        </div>
                        
                        <button id="coinflipCashoutBtn" onclick="app.coinflipGame.cashOut()" class="btn-success">
                            Cash Out
                        </button>
                    </div>
                    
                    <!-- Multiplier Roadmap -->
                    <div class="panel-section roadmap-section">
                        <div class="roadmap">
                            ${[1, 2, 3, 4, 5].map(i => {
                                const multiplier = Math.pow(this.HOUSE_EDGE, i).toFixed(2);
                                return `
                                    <div class="roadmap-step">
                                        <div class="step-dot"></div>
                                        <div class="step-multiplier">${multiplier}×</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    resetState() {
        this.state = {
            isActive: false,
            bet: 0,
            currentMultiplier: 1.00,
            streak: 0,
            history: [],
            isFlipping: false,
            gameId: null,
            choice: null
        };
    }

    async startGame() {
        if (!this.app.userId) {
            this.app.showToast('Please login to play', 'error');
            return;
        }

        const betInput = document.getElementById('coinflipBetInput');
        const bet = parseFloat(betInput.value);

        if (isNaN(bet) || bet <= 0) {
            this.app.showToast('Invalid bet amount', 'error');
            return;
        }

        if (bet > this.app.balance) {
            this.app.showToast('Insufficient balance', 'error');
            return;
        }

        try {
            // Create game on server
            const gameId = 'coinflip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            await database.ref(`games/coinflip/${gameId}`).set({
                userId: this.app.userId,
                username: this.app.username,
                bet: bet,
                currentMultiplier: 1.00,
                streak: 0,
                history: [],
                status: 'active',
                createdAt: Date.now()
            });

            // Deduct bet
            await this.app.wallet.deductBalance(bet, 'coinflip_bet');
            
            this.state.isActive = true;
            this.state.bet = bet;
            this.state.gameId = gameId;

            // Update UI
            document.getElementById('coinflipBetControls').classList.add('hidden');
            document.getElementById('coinflipGameStats').classList.remove('hidden');
            document.getElementById('coinflipWaiting').classList.add('hidden');
            document.getElementById('coinflipControls').classList.remove('hidden');
            
            document.getElementById('coinflipStartBtn').textContent = 'Game Active';
            document.getElementById('coinflipStartBtn').className = 'btn-disabled';
            
            this.clearHistory();
            this.updateRoadmap();
            this.updateStats();
            
            this.app.sound.play('click');

        } catch (error) {
            console.error('Coinflip start error:', error);
            this.app.showToast('Failed to start game', 'error');
        }
    }

    async flip(choice) {
        if (!this.state.isActive || this.state.isFlipping) {
            return;
        }

        this.state.isFlipping = true;
        this.state.choice = choice;
        
        // Disable controls during flip
        document.getElementById('coinflipControls').style.pointerEvents = 'none';
        document.getElementById('coinflipControls').style.opacity = '0.5';

        // Determine result with server-side fairness
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const isWin = (choice === result);

        // Animate coin
        await this.animateCoin(result);
        
        // Handle result
        await this.handleFlipResult(isWin, result);
        
        this.state.isFlipping = false;
        
        // Re-enable controls
        document.getElementById('coinflipControls').style.pointerEvents = 'auto';
        document.getElementById('coinflipControls').style.opacity = '1';
    }

    async animateCoin(result) {
        const coin = document.getElementById('coinflipCoin');
        const spins = 5;
        const targetRotation = result === 'heads' ? 0 : 180;
        
        // Calculate rotation
        let currentRotation = this.state.history.length * 360;
        let targetRotationFull = currentRotation + (spins * 360) + targetRotation;
        
        // Animate
        coin.style.transition = 'transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        coin.style.transform = `rotateY(${targetRotationFull}deg)`;
        
        // Wait for animation
        await this.sleep(1000);
    }

    async handleFlipResult(isWin, result) {
        // Add to history
        this.addToHistory(result, isWin);
        
        // Update game on server
        await database.ref(`games/coinflip/${this.state.gameId}/history`).push({
            choice: this.state.choice,
            result: result,
            isWin: isWin,
            timestamp: Date.now()
        });

        if (isWin) {
            // Win
            this.state.streak++;
            this.state.currentMultiplier = Math.pow(this.HOUSE_EDGE, this.state.streak);
            
            await database.ref(`games/coinflip/${this.state.gameId}`).update({
                streak: this.state.streak,
                currentMultiplier: this.state.currentMultiplier
            });

            this.showResult('WIN', 'success');
            this.app.sound.play('win');
            this.updateRoadmap();
            
        } else {
            // Loss
            this.showResult('LOSS', 'error');
            this.app.sound.play('lose');
            await this.endGame(false);
        }

        this.updateStats();
    }

    async cashOut() {
        if (!this.state.isActive) return;

        const winnings = this.state.bet * this.state.currentMultiplier;
        
        // Update game status
        await database.ref(`games/coinflip/${this.state.gameId}`).update({
            status: 'cashed_out',
            winnings: winnings,
            endedAt: Date.now()
        });

        // Add winnings
        await this.app.wallet.addBalance(winnings, 'coinflip_win');
        
        const profit = winnings - this.state.bet;
        if (profit > 0) {
            await this.app.wallet.recordWin(profit, 'Coinflip');
        }

        this.showResult(`+$${winnings.toFixed(2)}`, 'warning');
        await this.endGame(true);
        this.app.sound.play('win');
        
        // Special effects for big wins
        if (profit >= 10000) {
            confetti({
                particleCount: Math.min(profit / 100, 500),
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    async endGame(won) {
        this.state.isActive = false;
        
        // Update UI
        document.getElementById('coinflipBetControls').classList.remove('hidden');
        document.getElementById('coinflipGameStats').classList.add('hidden');
        document.getElementById('coinflipWaiting').classList.remove('hidden');
        document.getElementById('coinflipControls').classList.add('hidden');
        
        document.getElementById('coinflipStartBtn').textContent = 'Start Game';
        document.getElementById('coinflipStartBtn').className = 'btn-primary';
        
        this.resetState();
    }

    // UI Methods
    addToHistory(result, isWin) {
        const historyContainer = document.getElementById('coinflipHistory');
        
        // Remove "no history" message
        const noHistory = historyContainer.querySelector('.no-history');
        if (noHistory) {
            noHistory.remove();
        }
        
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${result} ${isWin ? 'win' : 'loss'}`;
        historyItem.textContent = result === 'heads' ? 'H' : 'T';
        
        historyContainer.appendChild(historyItem);
        historyContainer.scrollLeft = historyContainer.scrollWidth;
        
        this.state.history.push({ result, isWin });
    }

    clearHistory() {
        const historyContainer = document.getElementById('coinflipHistory');
        historyContainer.innerHTML = '<span class="no-history">No flips yet...</span>';
        this.state.history = [];
    }

    updateStats() {
        document.getElementById('coinflipStreak').textContent = this.state.streak;
        document.getElementById('coinflipMultiplier').textContent = `${this.state.currentMultiplier.toFixed(2)}×`;
        
        const nextWin = this.state.bet * this.state.currentMultiplier * this.HOUSE_EDGE;
        const profit = nextWin - (this.state.bet * this.state.currentMultiplier);
        document.getElementById('coinflipProfit').textContent = `+$${profit.toFixed(2)}`;
        
        const accumulated = this.state.bet * this.state.currentMultiplier;
        document.getElementById('coinflipAccumulated').textContent = `$${accumulated.toFixed(2)}`;
        
        // Update balance display
        document.getElementById('coinflipBalance').textContent = this.app.balance.toLocaleString();
    }

    updateRoadmap() {
        const roadmap = document.querySelector('.roadmap');
        if (!roadmap) return;
        
        const steps = roadmap.querySelectorAll('.roadmap-step');
        
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            const multiplier = Math.pow(this.HOUSE_EDGE, stepNumber).toFixed(2);
            
            step.querySelector('.step-multiplier').textContent = `${multiplier}×`;
            
            if (stepNumber <= this.state.streak + 1) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    showResult(text, type) {
        const resultOverlay = document.getElementById('coinflipResult');
        const resultText = document.getElementById('coinflipResultText');
        
        resultText.textContent = text;
        resultText.className = type;
        resultOverlay.classList.remove('hidden');
        
        setTimeout(() => {
            resultOverlay.classList.add('hidden');
        }, 1000);
    }

    adjustBet(factor) {
        const betInput = document.getElementById('coinflipBetInput');
        let val = parseFloat(betInput.value) * factor;
        betInput.value = val.toFixed(2);
        this.app.sound.play('click');
    }

    setBet(amount) {
        const betInput = document.getElementById('coinflipBetInput');
        betInput.value = Math.min(amount, this.app.balance).toFixed(2);
        this.app.sound.play('click');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
