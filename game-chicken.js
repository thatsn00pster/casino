// Chicken Road Game Class
class ChickenRoadGame {
    constructor(app) {
        this.app = app;
        this.state = {
            isActive: false,
            bet: 0,
            difficulty: 'easy',
            currentStep: -1,
            multiplier: 1.00,
            gameId: null,
            lanes: [],
            carPositions: []
        };
        
        // Constants
        this.MULTIPLIERS = GAME_CONSTANTS.CHICKEN_MULTIPLIERS;
        this.HOUSE_EDGE = GAME_CONSTANTS.HOUSE_EDGE.chicken;
        this.TOTAL_LANES = 30;
    }

    async render() {
        this.resetState();
        
        this.app.mainContent.innerHTML = `
            <div class="chicken-road-container">
                <div class="chicken-controls-sidebar">
                    <div class="controls-header">
                        <div class="emoji">🐔</div>
                        <h2>CHICKEN ROAD</h2>
                    </div>

                    <!-- Bet Amount -->
                    <div class="control-group">
                        <div class="control-label">
                            <span>Bet Amount</span>
                            <span>Max: ${this.app.balance.toLocaleString()}</span>
                        </div>
                        <div class="input-group">
                            <input type="number" id="chickenBetInput" value="10" min="1" max="${this.app.balance}">
                            <div class="input-icon">💰</div>
                        </div>
                        <div class="quick-buttons">
                            <button onclick="app.chickenGame.adjustBet(0.5)">1/2</button>
                            <button onclick="app.chickenGame.adjustBet(2)">2x</button>
                        </div>
                    </div>

                    <!-- Difficulty -->
                    <div class="control-group">
                        <label class="control-label">Difficulty</label>
                        <select id="chickenDifficulty" onchange="app.chickenGame.setDifficulty(this.value)">
                            <option value="easy">Easy (Low Risk)</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                            <option value="expert">Expert (High Risk)</option>
                        </select>
                    </div>

                    <!-- Stats Display -->
                    <div class="stats-box">
                        <div class="stats-grid">
                            <div>
                                <div class="stat-label">Current Multiplier</div>
                                <div class="stat-value" id="chickenCurrentMult">1.00x</div>
                            </div>
                            <div>
                                <div class="stat-label">Current Payout</div>
                                <div class="stat-value" id="chickenCurrentPayout">0</div>
                            </div>
                        </div>
                        <div class="stats-grid">
                            <div>
                                <div class="stat-label">Next Multiplier</div>
                                <div class="stat-value" id="chickenNextMult">1.02x</div>
                            </div>
                            <div>
                                <div class="stat-label">Steps Remaining</div>
                                <div class="stat-value" id="chickenStepsRemaining">30</div>
                            </div>
                        </div>
                    </div>

                    <!-- Balance Display -->
                    <div class="balance-display-group">
                        <div class="balance-card">
                            <div class="balance-info">
                                <i class="fa-solid fa-wallet"></i>
                                <span>Balance</span>
                            </div>
                            <span class="balance-amount" id="chickenBalanceDisplay">${this.app.balance.toLocaleString()}</span>
                        </div>
                    </div>

                    <!-- Main Action Button -->
                    <div class="main-action">
                        <button id="chickenActionBtn" onclick="app.chickenGame.handleAction()" class="btn-primary">
                            <i class="fa-solid fa-play"></i> Start Game
                        </button>
                        <div class="game-info">
                            <p>Cross the road to win! Click on lanes to hop.</p>
                        </div>
                    </div>
                </div>

                <!-- Road Container -->
                <div class="road-game-area">
                    <div class="road-container">
                        <div id="chickenRoadCamera" class="road-camera">
                            <!-- World Container -->
                            <div id="chickenWorld" class="world-container">
                                <!-- Top Environment -->
                                <div class="environment top" id="topEnv"></div>
                                
                                <!-- Road Area -->
                                <div class="road-area">
                                    <!-- Start Sidewalk -->
                                    <div class="sidewalk start">
                                        <div class="chicken-start">🐔</div>
                                        <div class="sidewalk-label">START</div>
                                    </div>
                                    
                                    <!-- Lanes Container -->
                                    <div id="chickenLanes" class="lanes-container"></div>
                                    
                                    <!-- End Sidewalk -->
                                    <div class="sidewalk end">
                                        <div class="goal">🎯</div>
                                        <div class="sidewalk-label">GOAL</div>
                                    </div>
                                </div>
                                
                                <!-- Bottom Environment -->
                                <div class="environment bottom" id="bottomEnv"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.updateUI();
        this.renderEnvironment();
        this.renderLanes();
        this.updateCamera();
    }

    resetState() {
        this.state = {
            isActive: false,
            bet: 0,
            difficulty: 'easy',
            currentStep: -1,
            multiplier: 1.00,
            gameId: null,
            lanes: [],
            carPositions: []
        };
    }

    async startGame() {
        if (!this.app.userId) {
            this.app.showToast('Please login to play', 'error');
            return;
        }

        const betInput = document.getElementById('chickenBetInput');
        const bet = parseInt(betInput.value);

        if (isNaN(bet) || bet <= 0) {
            this.app.showToast('Invalid bet amount', 'error');
            return;
        }

        if (bet > this.app.balance) {
            this.app.showToast('Insufficient funds', 'error');
            return;
        }

        try {
            // Create game on server
            const gameId = 'chicken_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            await database.ref(`games/chicken/${gameId}`).set({
                userId: this.app.userId,
                username: this.app.username,
                bet: bet,
                difficulty: this.state.difficulty,
                currentStep: -1,
                multiplier: 1.00,
                status: 'active',
                createdAt: Date.now(),
                lanes: this.generateLanes()
            });

            // Deduct bet
            await this.app.wallet.deductBalance(bet, 'chicken_bet');
            
            this.state.isActive = true;
            this.state.bet = bet;
            this.state.gameId = gameId;

            this.updateUI();
            this.renderLanes();
            
            this.app.sound.play('click');
            this.app.showToast('Game started! Click lanes to cross the road.', 'success');

        } catch (error) {
            console.error('Chicken game start error:', error);
            this.app.showToast('Failed to start game', 'error');
        }
    }

    generateLanes() {
        const lanes = [];
        const multipliers = this.MULTIPLIERS[this.state.difficulty];
        
        for (let i = 0; i < this.TOTAL_LANES; i++) {
            // Calculate win probability based on difficulty and step
            let winProbability = this.calculateWinProbability(i);
            
            lanes.push({
                index: i,
                multiplier: multipliers[i],
                winProbability: winProbability,
                hasCar: Math.random() < 0.3, // 30% chance of car
                carSpeed: 1 + Math.random() * 2 // Random speed
            });
        }
        
        return lanes;
    }

    calculateWinProbability(step) {
        let baseProbability;
        
        switch(this.state.difficulty) {
            case 'easy':
                baseProbability = 0.85;
                break;
            case 'medium':
                baseProbability = 0.75;
                break;
            case 'hard':
                baseProbability = 0.65;
                break;
            case 'expert':
                baseProbability = 0.45;
                break;
            default:
                baseProbability = 0.85;
        }
        
        // Decrease probability with each step
        const decreaseRate = {
            easy: 0.02,
            medium: 0.03,
            hard: 0.04,
            expert: 0.05
        }[this.state.difficulty];
        
        return Math.max(0.05, baseProbability - (step * decreaseRate));
    }

    async attemptHop(laneIndex) {
        if (!this.state.isActive || laneIndex !== this.state.currentStep + 1) {
            return;
        }

        // Get lane data from server
        const gameRef = database.ref(`games/chicken/${this.state.gameId}`);
        const snapshot = await gameRef.once('value');
        const gameData = snapshot.val();
        
        const lane = gameData.lanes[laneIndex];
        const winProbability = lane.winProbability;
        
        // Determine if hop is successful
        const isSuccessful = Math.random() < winProbability;
        
        if (isSuccessful) {
            await this.successfulHop(laneIndex, lane.multiplier);
        } else {
            await this.crash(laneIndex);
        }
    }

    async successfulHop(laneIndex, multiplier) {
        this.state.currentStep = laneIndex;
        this.state.multiplier = multiplier;
        
        // Update on server
        await database.ref(`games/chicken/${this.state.gameId}`).update({
            currentStep: laneIndex,
            multiplier: multiplier
        });

        this.app.sound.play('hop');
        this.updateUI();
        this.renderLanes();
        this.updateCamera();

        // Check if reached the end
        if (laneIndex === this.TOTAL_LANES - 1) {
            setTimeout(() => this.cashOut(true), 500);
        }
    }

    async crash(laneIndex) {
        // Update game status
        await database.ref(`games/chicken/${this.state.gameId}`).update({
            status: 'crashed',
            crashedAt: laneIndex,
            endedAt: Date.now()
        });

        // Record loss
        await this.app.wallet.recordLoss(this.state.bet, 'Chicken Road');
        
        this.state.isActive = false;
        
        // Visual effects
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 500);
        
        // Show crash in lane
        const lane = document.getElementById(`lane-${laneIndex}`);
        if (lane) {
            lane.classList.add('crashed');
            lane.innerHTML += `
                <div class="crash-effect">💥</div>
                <div class="crash-text">CRASH!</div>
            `;
        }
        
        this.app.sound.play('lose');
        this.app.showToast(`Chicken got hit! Lost ${this.state.bet} coins`, 'error');
        
        setTimeout(() => {
            this.updateUI();
            this.renderLanes();
        }, 1000);
    }

    async cashOut(reachedEnd = false) {
        if (!this.state.isActive) return;

        const winnings = this.state.bet * this.state.multiplier;
        
        // Update game status
        await database.ref(`games/chicken/${this.state.gameId}`).update({
            status: 'cashed_out',
            winnings: winnings,
            endedAt: Date.now()
        });

        // Add winnings
        await this.app.wallet.addBalance(winnings, 'chicken_win');
        
        const profit = winnings - this.state.bet;
        if (profit > 0) {
            await this.app.wallet.recordWin(profit, 'Chicken Road');
        }

        this.state.isActive = false;
        
        this.app.showToast(`Success! Cashed out ${winnings.toFixed(0)} coins!`, 'success');
        this.updateUI();
        this.renderLanes();
        
        if (profit >= 100) {
            this.app.sound.play('win');
            if (profit >= this.app.bigWinThreshold) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }
    }

    updateUI() {
        const multipliers = this.MULTIPLIERS[this.state.difficulty];
        const nextMultiplier = multipliers[this.state.currentStep + 1] || multipliers[0];
        
        document.getElementById('chickenNextMult').textContent = nextMultiplier.toFixed(2) + 'x';
        document.getElementById('chickenCurrentMult').textContent = this.state.multiplier.toFixed(2) + 'x';
        
        const bet = parseInt(document.getElementById('chickenBetInput')?.value) || 10;
        const potentialWin = (bet * this.state.multiplier).toFixed(0);
        document.getElementById('chickenCurrentPayout').textContent = potentialWin;
        
        const stepsRemaining = this.TOTAL_LANES - (this.state.currentStep + 1);
        document.getElementById('chickenStepsRemaining').textContent = stepsRemaining;
        
        // Update action button
        const actionBtn = document.getElementById('chickenActionBtn');
        const balanceDisplay = document.getElementById('chickenBalanceDisplay');
        
        if (balanceDisplay) {
            balanceDisplay.textContent = this.app.balance.toLocaleString();
        }
        
        if (this.state.isActive) {
            if (this.state.currentStep === -1) {
                actionBtn.innerHTML = '<i class="fa-solid fa-play"></i> Game Starting...';
                actionBtn.disabled = true;
            } else {
                const currentWin = (bet * this.state.multiplier).toFixed(0);
                actionBtn.innerHTML = `<i class="fa-solid fa-money-bill-wave"></i> Cash Out ${currentWin}`;
                actionBtn.disabled = false;
                actionBtn.className = 'btn-success';
            }
        } else {
            actionBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Game';
            actionBtn.disabled = false;
            actionBtn.className = 'btn-primary';
        }
        
        // Update bet input max value
        const betInput = document.getElementById('chickenBetInput');
        if (betInput) {
            betInput.max = this.app.balance;
            betInput.disabled = this.state.isActive;
        }
        
        // Update difficulty select
        const difficultySelect = document.getElementById('chickenDifficulty');
        if (difficultySelect) {
            difficultySelect.disabled = this.state.isActive;
        }
    }

    renderEnvironment() {
        this.generateEnvironment('topEnv', 'top');
        this.generateEnvironment('bottomEnv', 'bottom');
    }

    generateEnvironment(containerId, position) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        // Generate decorative elements
        const elements = ['🌳', '🌲', '🌵', '🌴', '🪨', '🗿', '🌷', '🌻'];
        
        for (let i = 0; i < 20; i++) {
            const el = document.createElement('div');
            el.className = 'env-element';
            el.textContent = elements[Math.floor(Math.random() * elements.length)];
            el.style.left = `${Math.random() * 100}%`;
            el.style.fontSize = `${1 + Math.random()}rem`;
            
            if (position === 'top') {
                el.style.top = `${Math.random() * 30}%`;
            } else {
                el.style.bottom = `${Math.random() * 30}%`;
            }
            
            container.appendChild(el);
        }
    }

    renderLanes() {
        const container = document.getElementById('chickenLanes');
        if (!container) return;
        
        const multipliers = this.MULTIPLIERS[this.state.difficulty];
        
        container.innerHTML = '';
        
        for (let i = 0; i < this.TOTAL_LANES; i++) {
            const lane = document.createElement('div');
            lane.className = 'lane';
            lane.id = `lane-${i}`;
            
            const mult = multipliers[i];
            const isPassed = i <= this.state.currentStep;
            const isCurrent = i === this.state.currentStep;
            const isNext = i === this.state.currentStep + 1;
            
            // Lane content
            lane.innerHTML = `
                <div class="lane-number">${i + 1}</div>
                <div class="lane-multiplier">${mult.toFixed(2)}x</div>
            `;
            
            // Set lane state
            if (isPassed) {
                if (isCurrent && this.state.isActive) {
                    lane.classList.add('current');
                    lane.innerHTML += '<div class="chicken">🐔</div>';
                } else {
                    lane.classList.add('passed');
                }
            } else if (isNext && this.state.isActive) {
                lane.classList.add('next');
                lane.onclick = () => this.attemptHop(i);
                
                // Add cars for next lane
                if (Math.random() < 0.3) {
                    lane.innerHTML += '<div class="car">🚗</div>';
                }
            } else {
                lane.classList.add('future');
            }
            
            container.appendChild(lane);
        }
    }

    updateCamera() {
        const camera = document.getElementById('chickenRoadCamera');
        if (!camera) return;
        
        const laneWidth = 120;
        const offset = this.state.currentStep * laneWidth * -1;
        camera.style.transform = `translateX(${offset}px)`;
    }

    // UI Methods
    adjustBet(factor) {
        if (this.state.isActive) return;
        const betInput = document.getElementById('chickenBetInput');
        let val = parseFloat(betInput.value) * factor;
        if (val < 1) val = 1;
        if (val > this.app.balance) val = this.app.balance;
        betInput.value = Math.round(val);
        this.app.sound.play('click');
    }

    setDifficulty(difficulty) {
        if (this.state.isActive) return;
        this.state.difficulty = difficulty;
        this.updateUI();
        this.renderLanes();
        this.app.sound.play('click');
    }

    handleAction() {
        if (this.state.isActive) {
            this.cashOut();
        } else {
            this.startGame();
        }
    }
}
