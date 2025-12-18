import { soundManager } from '../sounds.js';
import { CHICKEN_MULTIPLIERS } from '../firebase.js';

class ChickenRoadGame {
    constructor(app) {
        this.app = app;
        this.state = {
            isPlaying: false,
            currentStep: -1,
            difficulty: 'easy',
            bet: 10,
            currentMultiplier: 1.00,
            gameActive: false
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Game buttons will be set up when the game is rendered
    }

    render() {
        this.state.isPlaying = false;
        this.state.currentStep = -1;
        this.state.currentMultiplier = 1.00;

        this.app.mainContent.innerHTML = `
            <div class="chicken-road-main">
                <!-- Main Game Area -->
                <div class="chicken-game-area">
                    <!-- Controls Sidebar -->
                    <div class="chicken-controls-sidebar">
                        <div class="chicken-controls-header">
                            <div class="emoji">🐔</div>
                            <h2>CHICKEN ROAD</h2>
                        </div>

                        <!-- Bet Amount -->
                        <div class="chicken-control-group">
                            <div class="flex justify-between">
                                <label class="chicken-control-label">Bet Amount</label>
                                <span class="text-xs text-[#b1bad3]">Max: ${this.app.auth.getBalance().toLocaleString()}</span>
                            </div>
                            <div class="chicken-input-group">
                                <input type="number" id="chickenBetInput" value="10" min="1" max="${this.app.auth.getBalance()}" class="chicken-bet-input">
                                <div class="icon">💰</div>
                            </div>
                            <div class="chicken-quick-buttons">
                                <button class="chicken-quick-button chicken-bet-half">1/2</button>
                                <button class="chicken-quick-button chicken-bet-double">2x</button>
                            </div>
                        </div>

                        <!-- Difficulty -->
                        <div class="chicken-control-group">
                            <label class="chicken-control-label">Difficulty</label>
                            <select id="chickenDifficulty" class="chicken-select">
                                <option value="easy">Easy (Low Risk)</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                                <option value="expert">Expert (High Risk)</option>
                            </select>
                        </div>

                        <!-- Stats Display -->
                        <div class="chicken-stats-box">
                            <div class="chicken-stats-grid">
                                <div>
                                    <div class="chicken-stat-label">Current Multiplier</div>
                                    <div class="chicken-stat-value text-[#8b5cf6]" id="chickenCurrentMult">1.00x</div>
                                </div>
                                <div>
                                    <div class="chicken-stat-label">Current Payout</div>
                                    <div class="chicken-stat-value text-[#10b981]" id="chickenCurrentPayout">0</div>
                                </div>
                            </div>
                            <div class="chicken-stats-grid mt-3">
                                <div>
                                    <div class="chicken-stat-label">Next Multiplier</div>
                                    <div class="chicken-stat-value text-[#8b5cf6]" id="chickenNextMult">1.02x</div>
                                </div>
                                <div>
                                    <div class="chicken-stat-label">Steps Remaining</div>
                                    <div class="chicken-stat-value text-white" id="chickenStepsRemaining">30</div>
                                </div>
                            </div>
                        </div>

                        <!-- Balance Display -->
                        <div class="chicken-control-group mt-2">
                            <div class="flex items-center justify-between bg-gradient-to-r from-[#1e293b] to-[#0f172a] rounded-lg p-3 border border-[#2a3042]">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-wallet text-[#8b5cf6] text-sm"></i>
                                    <span class="text-[#b1bad3] font-bold text-sm">Balance</span>
                                </div>
                                <span class="text-white font-bold text-lg" id="chickenBalanceDisplay">${this.app.auth.getBalance().toLocaleString()}</span>
                            </div>
                        </div>

                        <!-- Main Action Button -->
                        <div class="chicken-main-action">
                            <button id="chickenActionBtn" class="chicken-action-button">
                                <i class="fa-solid fa-play mr-1"></i> Start Game
                            </button>
                            <div class="chicken-game-info">
                                <p>Cross the road to win! Click on lanes to hop.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Road Container -->
                    <div class="chicken-road-container">
                        <!-- Camera Container -->
                        <div class="chicken-road-camera-container">
                            <div id="chickenRoadCamera" class="chicken-road-camera">
                                <!-- World Container -->
                                <div id="chickenWorldContainer" class="chicken-world-container">
                                    <!-- Top Environment -->
                                    <div class="chicken-env-top" id="chickenEnvTop"></div>
                                    
                                    <!-- Road Area -->
                                    <div class="chicken-road-area">
                                        <!-- Road Borders -->
                                        <div class="road-border-top"></div>
                                        <div class="road-border-bottom"></div>
                                        
                                        <!-- Start Sidewalk -->
                                        <div class="chicken-sidewalk-start" id="chickenSidewalkStart">
                                            <div class="text-5xl">🐔</div>
                                            <div class="text-white font-black text-2xl text-center drop-shadow-md">START</div>
                                        </div>
                                        
                                        <!-- Lanes Container -->
                                        <div id="chickenRoadContainer" class="chicken-road-lanes"></div>
                                        
                                        <!-- End Sidewalk -->
                                        <div class="chicken-sidewalk-end" id="chickenSidewalkEnd">
                                            <div class="text-6xl drop-shadow-xl">🎯</div>
                                            <div class="text-white font-black text-3xl text-center drop-shadow-md">GOAL</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Bottom Environment -->
                                    <div class="chicken-env-bottom" id="chickenEnvBottom"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupGameEventListeners();
        this.updateUI();
        this.updateDifficulty();
        this.renderEnvironment();
        this.renderRoadLanes();
        
        // Set initial camera position
        setTimeout(() => this.updateCamera(), 100);
    }

    setupGameEventListeners() {
        const chickenBetHalf = document.querySelector('.chicken-bet-half');
        const chickenBetDouble = document.querySelector('.chicken-bet-double');
        const chickenDifficulty = document.getElementById('chickenDifficulty');
        const chickenActionBtn = document.getElementById('chickenActionBtn');
        const chickenBetInput = document.getElementById('chickenBetInput');

        if (chickenBetHalf) {
            chickenBetHalf.addEventListener('click', () => this.adjustBet(0.5));
        }

        if (chickenBetDouble) {
            chickenBetDouble.addEventListener('click', () => this.adjustBet(2));
        }

        if (chickenDifficulty) {
            chickenDifficulty.addEventListener('change', () => this.updateDifficulty());
        }

        if (chickenActionBtn) {
            chickenActionBtn.addEventListener('click', () => this.handleAction());
        }

        if (chickenBetInput) {
            chickenBetInput.addEventListener('input', () => this.updateUI());
        }
    }

    renderEnvironment() {
        // Generate environment props
        this.generateEnvironment('chickenEnvTop', 40, 'top');
        this.generateEnvironment('chickenEnvBottom', 40, 'bottom');
        this.generateSidewalkProps('chickenSidewalkStart');
        this.generateSidewalkProps('chickenSidewalkEnd');
    }

    generateEnvironment(containerId, count, align = 'bottom') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const trees = ['🌳', '🌲', '🌵', '🌴'];
        const rocks = ['🪨', '🗿'];
        const flowers = ['🌷', '🌻', '🌹', '🌼'];
        
        container.innerHTML = '';
        
        // Generate Ponds
        const pondCount = Math.floor(Math.random() * 5) + 3;
        
        for(let i=0; i<pondCount; i++) {
            const pond = document.createElement('div');
            pond.className = 'pond';
            const size = Math.random() * 60 + 40;
            pond.style.width = `${size}px`;
            pond.style.height = `${size * 0.6}px`;
            pond.style.left = `${Math.random() * 100}%`;
            if(align === 'bottom') pond.style.top = `${Math.random() * 20}px`;
            else pond.style.bottom = `${Math.random() * 20}px`;
            container.appendChild(pond);
        }

        // Generate Props
        for(let i=0; i<count; i++) {
            const el = document.createElement('div');
            const type = Math.random();
            if(type < 0.6) el.textContent = trees[Math.floor(Math.random() * trees.length)];
            else if (type < 0.8) el.textContent = rocks[Math.floor(Math.random() * rocks.length)];
            else el.textContent = flowers[Math.floor(Math.random() * flowers.length)];

            el.style.position = 'absolute';
            el.style.fontSize = (1.5 + Math.random()) + 'rem';
            el.style.filter = 'drop-shadow(2px 4px 6px rgba(0,0,0,0.4))';
            el.style.left = `${Math.random() * 100}%`;
            
            if (align === 'bottom') {
                el.style.top = `${Math.random() * 10}px`;
            } else {
                el.style.bottom = `${Math.random() * 10}px`;
                el.style.zIndex = '5';
            }
            
            container.appendChild(el);
        }
    }
    
    generateSidewalkProps(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const props = ['💡', '🧯', '🗑️', '🚲', '🚏', '🚧'];
        
        // Clear existing props (keep the start/goal text)
        const existingProps = container.querySelectorAll('div');
        existingProps.forEach(p => {
            if (!p.classList.contains('text-5xl') && !p.classList.contains('text-6xl') && !p.classList.contains('text-white')) {
                p.remove();
            }
        });
        
        for(let i=0; i<5; i++) {
            const el = document.createElement('div');
            el.textContent = props[Math.floor(Math.random() * props.length)];
            el.style.fontSize = '1.5rem';
            el.style.marginBottom = '0.5rem';
            container.appendChild(el);
        }
    }

    adjustBet(factor) {
        if (this.state.isPlaying) return;
        const betInput = document.getElementById('chickenBetInput');
        if (!betInput) return;
        
        let val = parseFloat(betInput.value) * factor;
        if (val < 1) val = 1;
        if (val > this.app.auth.getBalance()) val = this.app.auth.getBalance();
        betInput.value = Math.round(val);
        soundManager.play('click');
        this.updateUI();
    }

    updateDifficulty() {
        if (this.state.isPlaying) return;
        const difficultySelect = document.getElementById('chickenDifficulty');
        if (!difficultySelect) return;
        
        this.state.difficulty = difficultySelect.value;
        this.updateUI();
        this.renderRoadLanes();
        soundManager.play('click');
    }

    updateUI() {
        const multipliers = CHICKEN_MULTIPLIERS[this.state.difficulty];
        const nextMultiplier = multipliers[0] || 1.02;
        
        const chickenNextMult = document.getElementById('chickenNextMult');
        const chickenCurrentMult = document.getElementById('chickenCurrentMult');
        const chickenCurrentPayout = document.getElementById('chickenCurrentPayout');
        const chickenStepsRemaining = document.getElementById('chickenStepsRemaining');
        const actionBtn = document.getElementById('chickenActionBtn');
        const balanceDisplay = document.getElementById('chickenBalanceDisplay');
        const betInput = document.getElementById('chickenBetInput');
        const difficultySelect = document.getElementById('chickenDifficulty');

        if (chickenNextMult) chickenNextMult.textContent = nextMultiplier.toFixed(2) + 'x';
        if (chickenCurrentMult) chickenCurrentMult.textContent = this.state.currentMultiplier.toFixed(2) + 'x';
        
        const bet = parseFloat(betInput?.value) || 10;
        const potentialWin = (bet * this.state.currentMultiplier).toFixed(0);
        if (chickenCurrentPayout) chickenCurrentPayout.textContent = potentialWin;
        
        const stepsRemaining = 30 - (this.state.currentStep + 1);
        if (chickenStepsRemaining) chickenStepsRemaining.textContent = stepsRemaining;
        
        if (balanceDisplay) {
            balanceDisplay.textContent = this.app.auth.getBalance().toLocaleString();
        }
        
        if (actionBtn) {
            if (this.state.isPlaying) {
                if (this.state.currentStep === -1) {
                    actionBtn.innerHTML = '<i class="fa-solid fa-play mr-1"></i> Game Starting...';
                    actionBtn.disabled = true;
                    actionBtn.style.background = 'linear-gradient(135deg, #2a3042 0%, #161b26 100%)';
                    actionBtn.style.color = '#6b7280';
                    actionBtn.style.boxShadow = 'none';
                } else {
                    const currentWin = (bet * this.state.currentMultiplier).toFixed(0);
                    actionBtn.innerHTML = `<i class="fa-solid fa-money-bill-wave mr-1"></i> Cash Out ${currentWin}`;
                    actionBtn.disabled = false;
                    actionBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                    actionBtn.style.color = 'white';
                    actionBtn.style.boxShadow = '0 4px 0 #065f46';
                }
            } else {
                actionBtn.innerHTML = '<i class="fa-solid fa-play mr-1"></i> Start Game';
                actionBtn.disabled = false;
                actionBtn.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';
                actionBtn.style.boxShadow = '0 4px 0 #5b21b6';
                actionBtn.style.color = 'white';
            }
        }
        
        // Update bet input max value
        if (betInput) {
            betInput.max = this.app.auth.getBalance();
            betInput.disabled = this.state.isPlaying;
        }
        
        // Update difficulty select
        if (difficultySelect) {
            difficultySelect.disabled = this.state.isPlaying;
        }
    }

    handleAction() {
        if (!this.app.checkMaintenance()) return;
        
        if (this.state.isPlaying) {
            this.cashOut();
        } else {
            this.startGame();
        }
    }

    startGame() {
        if (!this.app.auth.isLoggedIn()) {
            this.app.showToast('Please login to play', 'error');
            return;
        }

        const betInput = document.getElementById('chickenBetInput');
        const bet = parseInt(betInput.value);

        if (isNaN(bet) || bet <= 0) {
            this.app.showToast('Invalid bet amount', 'error');
            return;
        }

        if (bet > this.app.auth.getBalance()) {
            this.app.showToast('Insufficient funds', 'error');
            return;
        }

        // Security validation
        if (!this.app.security.checkBeforeGameAction('chicken', 'start', {
            difficulty: this.state.difficulty,
            step: -1,
            multiplier: 1.00
        })) {
            return;
        }

        // Deduct bet
        const newBalance = this.app.auth.getBalance() - bet;
        this.app.auth.setBalance(newBalance);
        this.app.recordWager(bet);

        // Set game state
        this.state.isPlaying = true;
        this.state.bet = bet;
        this.state.currentStep = -1;
        this.state.currentMultiplier = 1.00;

        // Update UI
        this.updateUI();
        this.renderRoadLanes();
        this.updateCamera();

        this.app.showToast('Game started! Click lanes to cross the road.', 'success');
        soundManager.play('click');
    }

    renderRoadLanes() {
        const container = document.getElementById('chickenRoadContainer');
        if (!container) return;
        
        const multipliers = CHICKEN_MULTIPLIERS[this.state.difficulty];
        
        container.innerHTML = '';
        container.className = 'chicken-road-lanes';
        
        // Generate 30 lanes
        for (let i = 0; i < 30; i++) {
            const lane = document.createElement('div');
            lane.className = 'chicken-lane';
            lane.id = `chicken-lane-${i}`;
            
            const mult = multipliers[i];
            const isPassed = i <= this.state.currentStep;
            const isCurrent = i === this.state.currentStep;
            const isNext = i === this.state.currentStep + 1;
            const isFuture = i > this.state.currentStep + 1;
            
            // Add lane separator
            const separator = document.createElement('div');
            separator.className = 'lane-separator';
            lane.appendChild(separator);
            
            // Add lane number
            const laneNumber = document.createElement('div');
            laneNumber.className = 'absolute top-2 left-2 text-[10px] text-white/20 font-bold tracking-widest px-1 rounded';
            laneNumber.textContent = `LANE ${i + 1}`;
            lane.appendChild(laneNumber);
            
            // Add multiplier display
            const multDisplay = document.createElement('div');
            multDisplay.className = 'text-white font-bold text-xl z-20 drop-shadow-md';
            multDisplay.textContent = `${mult.toFixed(2)}x`;
            lane.appendChild(multDisplay);
            
            // Add cars to future and next lanes (if game is active)
            if ((isNext || isFuture) && this.state.isPlaying) {
                const carCount = Math.floor(Math.random() * 2) + 1; // 1-2 cars per lane
                const trafficContainer = document.createElement('div');
                trafficContainer.className = "absolute inset-0 pointer-events-none z-0 overflow-hidden";
                
                const carColors = ['car-red', 'car-blue', 'car-yellow', 'car-white', 'car-black', 'car-green'];
                
                for (let c = 0; c < carCount; c++) {
                    const colorClass = carColors[Math.floor(Math.random() * carColors.length)];
                    const car = document.createElement('div');
                    car.className = "traffic-car";
                    car.innerHTML = `
                        <div class="car-model ${colorClass}">
                            <div class="car-rear-window"></div>
                            <div class="car-roof"></div>
                            <div class="car-windshield"></div>
                        </div>
                    `;
                    
                    const minDuration = 1.2;
                    const maxDuration = 3.5;
                    const duration = minDuration + Math.random() * (maxDuration - minDuration);
                    const baseDelay = (c / carCount) * duration; 
                    const randomOffset = (Math.random() - 0.5) * 0.5;
                    const delay = Math.max(0, baseDelay + randomOffset);
                    
                    car.style.animationDuration = `${duration}s`;
                    car.style.animationDelay = `-${delay}s`;
                    
                    // Slight horizontal wiggle for realism
                    const wiggle = (Math.random() * 60) - 30; 
                    car.style.marginLeft = `${wiggle}px`;
                    
                    trafficContainer.appendChild(car);
                }
                lane.appendChild(trafficContainer);
            }
            
            // Set lane state
            if (isPassed) {
                if (isCurrent && this.state.isPlaying) {
                    // Current active lane with chicken
                    lane.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1))';
                    lane.innerHTML += `
                        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#8b5cf6]/10 to-transparent animate-pulse"></div>
                        <div class="text-6xl chicken-hop drop-shadow-2xl z-30 filter contrast-125">🐔</div>
                        <div class="mt-6 text-[#8b5cf6] font-black text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] bg-[#0b0e14]/90 px-3 py-1 rounded border border-[#8b5cf6] z-30">${mult.toFixed(2)}x</div>
                    `;
                } else {
                    // Passed lane
                    lane.style.background = 'rgba(0, 0, 0, 0.1)';
                    lane.style.opacity = '0.6';
                    lane.style.filter = 'grayscale(0.3)';
                    multDisplay.innerHTML = `✔ ${mult.toFixed(2)}x`;
                    multDisplay.style.color = '#8b5cf6';
                }
            } else if (isNext && this.state.isPlaying) {
                // Next active lane (with cars)
                lane.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))';
                lane.style.cursor = 'pointer';
                
                const potentialWin = (this.state.bet * mult).toFixed(0);
                lane.innerHTML = `
                    <div class="relative z-20 flex flex-col items-center transition-transform duration-200 group-hover:scale-110">
                        <div class="text-white/90 font-black text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] bg-black/40 rounded-lg px-3 py-1 mb-2 backdrop-blur-sm">${mult.toFixed(2)}x</div>
                        <div class="text-[#10b981] font-bold text-sm bg-black/80 px-3 py-1 rounded-full border border-[#10b981]/50 shadow-lg shadow-[#10b981]/20">Win ${potentialWin}</div>
                    </div>
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div class="absolute bottom-4 text-[10px] text-white/50 uppercase font-bold tracking-widest animate-bounce">Tap to Hop</div>
                `;
                
                lane.addEventListener('click', () => this.attemptHop(i));
            } else {
                // Future lane (locked with cars)
                lane.style.background = 'rgba(0, 0, 0, 0.2)';
                lane.style.opacity = '0.5';
                lane.style.filter = 'saturate(0.5)';
                lane.style.cursor = 'not-allowed';
            }
            
            container.appendChild(lane);
        }
        
        // Update camera after rendering lanes
        this.updateCamera();
    }
    
    updateCamera() {
        const camera = document.getElementById('chickenRoadCamera');
        if (!camera) return;
        
        const step = this.state.currentStep;
        const laneWidth = 160; // Width of each lane
        const startWidth = 120; // Width of start sidewalk
        const container = document.querySelector('.chicken-road-container');
        if (!container) return;
        
        const containerWidth = container.clientWidth;
        
        // Calculate target position to center the current lane
        let targetX = 0;
        
        if (step === -1) {
            // Start position - center the start area
            targetX = -(startWidth / 2) + (containerWidth / 2);
        } else {
            // Calculate position to center the current lane
            const lanesPassed = step + 1; // Include current lane
            const totalLaneWidthPassed = startWidth + (lanesPassed * laneWidth);
            const centerOfCurrentLane = totalLaneWidthPassed - (laneWidth / 2);
            targetX = -centerOfCurrentLane + (containerWidth / 2);
            
            // Add a little extra offset to show more of the next lane
            targetX += laneWidth * 0.3;
        }
        
        // Ensure we don't go past the end
        const worldContainer = document.getElementById('chickenWorldContainer');
        if (worldContainer) {
            const worldWidth = worldContainer.scrollWidth;
            const maxOffset = containerWidth - worldWidth;
            targetX = Math.min(0, Math.max(maxOffset, targetX));
        }
        
        camera.style.transform = `translateX(${targetX}px)`;
    }

    attemptHop(step) {
        if (!this.state.isPlaying || step !== this.state.currentStep + 1) return;

        const difficulty = this.state.difficulty;
        const multipliers = CHICKEN_MULTIPLIERS[difficulty];
        const targetMultiplier = multipliers[step];
        
        // Security validation
        if (!this.app.security.checkBeforeGameAction('chicken', 'hop', {
            difficulty: difficulty,
            step: step,
            multiplier: targetMultiplier
        })) {
            return;
        }
        
        // Calculate win probability based on difficulty
        let winProbability;
        switch(difficulty) {
            case 'easy':
                winProbability = 0.85 - (step * 0.02); // Starts at 85%, decreases 2% each step
                break;
            case 'medium':
                winProbability = 0.75 - (step * 0.03); // Starts at 75%, decreases 3% each step
                break;
            case 'hard':
                winProbability = 0.65 - (step * 0.04); // Starts at 65%, decreases 4% each step
                break;
            case 'expert':
                winProbability = 0.45 - (step * 0.05); // Starts at 45%, decreases 5% each step
                break;
            default:
                winProbability = 0.85 - (step * 0.02);
        }
        
        // Ensure probability doesn't go below minimum
        winProbability = Math.max(0.05, winProbability);
        
        // Determine if hop is successful
        const isSuccessful = Math.random() < winProbability;
        
        if (isSuccessful) {
            this.successfulHop(step, targetMultiplier);
        } else {
            this.crashGame(step);
        }
    }

    successfulHop(step, multiplier) {
        this.state.currentStep = step;
        this.state.currentMultiplier = multiplier;
        
        // Play sound
        soundManager.play('hop');
        
        // Update UI
        this.updateUI();
        this.renderRoadLanes();
        this.updateCamera();
        
        // Check if reached the end
        if (step === 29) {
            setTimeout(() => {
                this.cashOut(true);
            }, 500);
        }
    }

    crashGame(failedStep) {
        this.state.isPlaying = false;
        
        // Screen shake effect
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 500);
        
        // Show crash animation on the lane
        const lane = document.getElementById(`chicken-lane-${failedStep}`);
        if (lane) {
            // Add crash car animation
            const crashCar = document.createElement('div');
            crashCar.className = 'crash-car-anim';
            crashCar.innerHTML = `
                <div class="car-model car-red scale-150 shadow-2xl">
                    <div class="car-rear-window"></div>
                    <div class="car-roof"></div>
                    <div class="car-windshield"></div>
                </div>
            `;
            lane.appendChild(crashCar);
            
            // Show chicken getting hit
            const chickenHit = document.createElement('div');
            chickenHit.className = 'absolute text-5xl opacity-50 blur-sm grayscale rotate-90 transform translate-y-4 z-40';
            chickenHit.textContent = '🐔';
            lane.appendChild(chickenHit);
            
            // Add crash text
            const crashText = document.createElement('div');
            crashText.className = 'absolute bottom-1/4 text-red-500 font-bold text-lg bg-black/90 px-4 py-1 rounded border border-red-500 animate-bounce z-40';
            crashText.textContent = 'CRASH!';
            lane.appendChild(crashText);
        }
        
        // Record loss
        this.app.recordLoss(this.state.bet, 'Chicken Road');
        
        // Show toast notification
        this.app.showToast(`Chicken got hit! Lost ${this.state.bet} coins`, 'error');
        
        // Update UI after a delay to show animation
        setTimeout(() => {
            this.updateUI();
            this.renderRoadLanes();
        }, 1000);
        
        soundManager.play('lose');
    }

    cashOut(reachedEnd = false) {
        if (!this.state.isPlaying) return;

        const winnings = this.state.bet * this.state.currentMultiplier;
        this.state.isPlaying = false;

        // Security validation
        if (!this.app.security.checkBeforeGameAction('chicken', 'cashout', {
            difficulty: this.state.difficulty,
            step: this.state.currentStep,
            multiplier: this.state.currentMultiplier
        })) {
            return;
        }

        // Update balance and record win
        const newBalance = this.app.auth.getBalance() + winnings;
        this.app.auth.setBalance(newBalance);
        
        const profit = winnings - this.state.bet;
        if (profit > 0) {
            this.app.recordWin(profit, 'Chicken Road');
        }

        // Show notification
        this.app.showToast(`Success! Cashed out ${winnings.toFixed(0)} coins!`, 'success');
        this.updateUI();
        this.renderRoadLanes();
        
        // Play win sound and confetti for big wins
        if (profit >= 100) {
            soundManager.play('win');
            if (profit >= this.app.bigWinThreshold) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }
        
        // Special effects for huge wins
        if (profit >= 100000) {
            // Purple confetti for 100k+ wins
            confetti({
                particleCount: 300,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6']
            });
            
            // Show global alert for 200k+ wins
            if (profit >= 200000) {
                this.app.showGlobalAlert(`${this.app.auth.getUsername()} won ${winnings.toFixed(0)} coins playing Chicken Road!`, 'purple');
            }
        } else if (profit >= 10000) {
            // Gold confetti for 10k+ wins
            confetti({
                particleCount: 200,
                spread: 90,
                origin: { y: 0.6 },
                colors: ['#f59e0b', '#d97706', '#b45309']
            });
        }
    }

    // Clean up on game exit
    cleanup() {
        this.state.isPlaying = false;
        this.state.currentStep = -1;
        this.state.currentMultiplier = 1.00;
    }
}

export { ChickenRoadGame };