// coinflip.js - Coinflip Game
class CoinflipGame {
    constructor(app) {
        this.app = app;
        this.state = {
            isGameActive: false,
            isFlipping: false,
            currentBet: 0,
            accumulatedValue: 0,
            streak: 0,
            history: [],
            coinRotation: 0,
            HOUSE_EDGE: 1.85 // Lowered from 1.95 to 1.85
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Game buttons will be set up when the game is rendered
    }

    render() {
        this.state.isGameActive = false;
        this.state.isFlipping = false;
        this.state.currentBet = 0;
        this.state.accumulatedValue = 0;
        this.state.streak = 0;
        this.state.history = [];
        this.state.coinRotation = 0;

        this.app.mainContent.innerHTML = `
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-6">
                    <h2 class="text-2xl md:text-3xl font-bold text-white mb-2">Coinflip</h2>
                    <p class="text-gray-400 text-sm">Heads or Tails - Flip to win!</p>
                </div>
                
                <div class="flex flex-col lg:flex-row gap-6">
                    <!-- Left/Center: Game Board -->
                    <div class="flex-1 flex flex-col relative bg-[#0f1923] rounded-2xl border border-[#2a3042] shadow-xl overflow-hidden min-h-[500px]">
                        
                        <!-- Main Game Area -->
                        <div class="flex-1 flex flex-col items-center justify-center relative w-full p-4">
                            
                            <!-- Result Overlay -->
                            <div id="coinflip-result-overlay" class="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 transition-opacity duration-300">
                                <span id="coinflip-result-text" class="text-6xl font-black uppercase tracking-widest drop-shadow-[0_4px_4px rgba(0,0,0,0.5)] text-white">WIN</span>
                            </div>

                            <!-- The Coin -->
                            <div class="coin-container mb-8">
                                <div id="coinflip-coin" class="coin">
                                    <div class="coin-side coin-side-heads">
                                        <i class="fa-solid fa-crown coin-icon"></i>
                                    </div>
                                    <div class="coin-side coin-side-tails">
                                        <i class="fa-solid fa-flag coin-icon"></i>
                                    </div>
                                </div>
                            </div>

                            <!-- In-Game Controls (Heads/Tails Buttons) -->
                            <div id="coinflip-game-controls" class="flex gap-6 transition-all duration-300 opacity-0 pointer-events-none transform translate-y-4 mb-8">
                                <button id="coinflip-btn-head-select" class="coinflip-side-btn group relative w-32 h-32 rounded-full bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-4 border-[#334155] hover:border-[#f59e0b] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] flex flex-col items-center justify-center gap-2 transition-all">
                                    <div class="w-12 h-12 rounded-full bg-[#f59e0b] shadow-inner flex items-center justify-center text-yellow-900 font-bold text-xl">H</div>
                                    <span class="font-bold text-gray-300 group-hover:text-[#f59e0b] uppercase tracking-wide">Heads</span>
                                </button>
                                
                                <button id="coinflip-btn-tail-select" class="coinflip-side-btn group relative w-32 h-32 rounded-full bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-4 border-[#334155] hover:border-gray-400 hover:shadow-[0_0_20px_rgba(156,163,175,0.4)] flex flex-col items-center justify-center gap-2 transition-all">
                                    <div class="w-12 h-12 rounded-full bg-gray-300 shadow-inner flex items-center justify-center text-gray-800 font-bold text-xl">T</div>
                                    <span class="font-bold text-gray-300 group-hover:text-white uppercase tracking-wide">Tails</span>
                                </button>
                            </div>
                            
                            <div id="coinflip-waiting-message" class="text-gray-500 font-medium animate-pulse">
                                Press Start to play
                            </div>

                        </div>

                        <!-- History & Multiplier Roadmap (Bottom) -->
                        <div class="w-full bg-[#0f1923] border-t border-[#2a3042] p-4">
                            <div class="max-w-4xl mx-auto">
                                <div class="flex items-center gap-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <span>Round History</span>
                                    <div class="h-px bg-[#2a3042] flex-1"></div>
                                </div>
                                
                                <!-- History Icons -->
                                <div id="coinflip-history-row" class="flex gap-3 mb-4 h-10 items-center overflow-x-auto scrollbar-hide">
                                    <span class="text-gray-600 text-sm italic">No flips yet...</span>
                                </div>

                                <!-- Multiplier Roadmap -->
                                <div class="relative pt-4">
                                    <div class="absolute top-0 left-0 w-full h-px bg-[#2a3042]"></div>
                                    <div id="coinflip-multiplier-roadmap" class="flex justify-between text-xs font-mono text-gray-400">
                                        <div class="text-center relative">
                                            <div class="coinflip-roadmap-dot absolute -top-5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-600"></div>
                                            <span>1.85×</span>
                                        </div>
                                        <div class="text-center relative">
                                            <div class="coinflip-roadmap-dot absolute -top-5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#2a3042]"></div>
                                            <span>3.42×</span>
                                        </div>
                                        <div class="text-center relative">
                                            <div class="coinflip-roadmap-dot absolute -top-5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#2a3042]"></div>
                                            <span>6.33×</span>
                                        </div>
                                        <div class="text-center relative">
                                            <div class="coinflip-roadmap-dot absolute -top-5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#2a3042]"></div>
                                            <span>11.71×</span>
                                        </div>
                                        <div class="text-center relative">
                                            <div class="coinflip-roadmap-dot absolute -top-5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#2a3042]"></div>
                                            <span>21.67×</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Control Panel -->
                    <div class="w-full lg:w-[350px] bg-[#1a242d] flex flex-col rounded-2xl border border-[#2a3042] shadow-2xl relative z-30">
                        
                        <!-- Balance Header -->
                        <div class="p-6 bg-[#212b36] border-b border-[#2a3042] rounded-t-2xl">
                            <div class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Balance</div>
                            <div class="flex items-center gap-1">
                                <span class="text-[#10b981] font-bold text-lg">$</span>
                                <span id="coinflip-balance-display" class="text-2xl font-mono font-bold text-white">${this.app.auth.getBalance().toLocaleString()}</span>
                            </div>
                        </div>

                        <!-- Controls Content -->
                        <div class="p-6 flex-1 flex flex-col gap-6">
                            
                            <!-- Bet Input Section -->
                            <div id="coinflip-bet-controls" class="space-y-4">
                                <div class="space-y-1">
                                    <label class="text-xs text-gray-400 font-bold uppercase tracking-wide">Bet Amount</label>
                                    <div class="flex bg-[#0f1923] border border-[#2a3042] rounded overflow-hidden focus-within:border-[#10b981] focus-within:ring-1 focus-within:ring-[#10b981]">
                                        <span class="px-4 py-3 text-gray-400 font-bold select-none border-r border-[#2a3042] bg-[#151e26]">$</span>
                                        <input type="number" id="coinflip-bet-input" value="10" min="0.01" step="0.01" class="w-full bg-transparent text-white font-mono p-3 outline-none">
                                    </div>
                                    
                                    <!-- Quick Bet Buttons -->
                                    <div class="grid grid-cols-4 gap-2 mt-2">
                                        <button class="coinflip-bet-half bg-[#2a3042] hover:bg-[#374151] text-gray-300 text-xs font-bold py-2 rounded transition-all duration-300 touch-button">1/2</button>
                                        <button class="coinflip-bet-double bg-[#2a3042] hover:bg-[#374151] text-gray-300 text-xs font-bold py-2 rounded transition-all duration-300 touch-button">2x</button>
                                        <button class="coinflip-bet-min bg-[#2a3042] hover:bg-[#374151] text-gray-300 text-xs font-bold py-2 rounded transition-all duration-300 touch-button">Min</button>
                                        <button class="coinflip-bet-max bg-[#2a3042] hover:bg-[#374151] text-gray-300 text-xs font-bold py-2 rounded transition-all duration-300 touch-button">Max</button>
                                    </div>
                                </div>

                                <button id="coinflip-btn-start" class="btn-primary w-full py-4 rounded-xl font-bold text-xl tracking-wide mt-4 touch-button">
                                    Start Game
                                </button>
                            </div>

                            <!-- Active Game Stats -->
                            <div id="coinflip-active-game-stats" class="hidden flex-col gap-4">
                                <div class="bg-[#0f1923] p-4 rounded border border-[#2a3042] space-y-3">
                                    <div class="flex justify-between items-center">
                                        <span class="text-gray-400 text-xs uppercase font-bold">Current Streak</span>
                                        <span id="coinflip-streak-display" class="font-mono text-white font-bold">0</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-gray-400 text-xs uppercase font-bold">Multiplier</span>
                                        <span id="coinflip-multiplier-display" class="font-mono text-[#f59e0b] font-bold">1.00×</span>
                                    </div>
                                    <div class="w-full h-px bg-[#2a3042] my-2"></div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-gray-400 text-xs uppercase font-bold">Profit on Win</span>
                                        <span id="coinflip-profit-display" class="font-mono text-[#10b981] font-bold">$0.00</span>
                                    </div>
                                </div>

                                <div class="text-center space-y-2 mt-4">
                                    <div class="text-xs text-gray-500 font-bold uppercase">Total Accumulated</div>
                                    <div id="coinflip-accumulated-display" class="text-3xl font-mono font-bold text-white">$0.00</div>
                                </div>

                                <button id="coinflip-btn-cashout" class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xl py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-all duration-300 uppercase tracking-wide mt-auto touch-button">
                                    Cash Out
                                </button>
                            </div>

                            <!-- Footer Info -->
                            <div class="mt-auto text-center pt-6">
                                <p class="text-[10px] text-gray-600 font-medium uppercase tracking-widest">
                                    Moon Casino
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupGameEventListeners();
    }

    setupGameEventListeners() {
        // Bet adjustment buttons
        const betHalfBtn = document.querySelector('.coinflip-bet-half');
        const betDoubleBtn = document.querySelector('.coinflip-bet-double');
        const betMinBtn = document.querySelector('.coinflip-bet-min');
        const betMaxBtn = document.querySelector('.coinflip-bet-max');
        const startBtn = document.getElementById('coinflip-btn-start');
        const headSelectBtn = document.getElementById('coinflip-btn-head-select');
        const tailSelectBtn = document.getElementById('coinflip-btn-tail-select');
        const cashoutBtn = document.getElementById('coinflip-btn-cashout');

        if (betHalfBtn) {
            betHalfBtn.addEventListener('click', () => this.adjustBet(0.5));
        }

        if (betDoubleBtn) {
            betDoubleBtn.addEventListener('click', () => this.adjustBet(2));
        }

        if (betMinBtn) {
            betMinBtn.addEventListener('click', () => this.setBet(10));
        }

        if (betMaxBtn) {
            betMaxBtn.addEventListener('click', () => this.setBet(this.app.auth.getBalance()));
        }

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        if (headSelectBtn) {
            headSelectBtn.addEventListener('click', () => this.flip('heads'));
        }

        if (tailSelectBtn) {
            tailSelectBtn.addEventListener('click', () => this.flip('tails'));
        }

        if (cashoutBtn) {
            cashoutBtn.addEventListener('click', () => this.cashOut());
        }
    }

    updateUI() {
        const balanceDisplay = document.getElementById('coinflip-balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = this.app.auth.getBalance().toLocaleString();
        }
        
        if (this.state.isGameActive) {
            const streakDisplay = document.getElementById('coinflip-streak-display');
            const multiplierDisplay = document.getElementById('coinflip-multiplier-display');
            const profitDisplay = document.getElementById('coinflip-profit-display');
            const accumulatedDisplay = document.getElementById('coinflip-accumulated-display');
            
            if (streakDisplay) streakDisplay.textContent = this.state.streak;
            
            const currentMult = (this.state.accumulatedValue / this.state.currentBet) || 1;
            if (multiplierDisplay) multiplierDisplay.textContent = `${currentMult.toFixed(2)}×`;
            
            const nextVal = this.state.accumulatedValue * this.state.HOUSE_EDGE;
            const profit = nextVal - this.state.accumulatedValue;
            if (profitDisplay) profitDisplay.textContent = `+$${profit.toFixed(2)}`;
            if (accumulatedDisplay) accumulatedDisplay.textContent = `$${this.state.accumulatedValue.toFixed(2)}`;
        }
    }

    adjustBet(multiplier) {
        const betInput = document.getElementById('coinflip-bet-input');
        if (!betInput) return;
        
        let val = parseFloat(betInput.value) || 0;
        val = val * multiplier;
        betInput.value = val.toFixed(2);
        soundManager.play('click');
    }

    setBet(amount) {
        const betInput = document.getElementById('coinflip-bet-input');
        if (betInput) {
            betInput.value = Math.min(amount, this.app.auth.getBalance()).toFixed(2);
            soundManager.play('click');
        }
    }

    startGame() {
        if (!this.app.checkMaintenance()) return;
        
        if (!this.app.auth.isLoggedIn()) {
            this.app.showToast('Please login to play', 'error');
            return;
        }

        const betInput = document.getElementById('coinflip-bet-input');
        const betAmount = parseFloat(betInput.value);

        if (isNaN(betAmount) || betAmount <= 0) {
            this.app.showToast("Please enter a valid bet amount.", "error");
            return;
        }
        if (betAmount > this.app.auth.getBalance()) {
            this.app.showToast("Insufficient balance.", "error");
            return;
        }

        // Security validation
        if (!this.app.security.checkBeforeGameAction('coinflip', 'start', {
            choice: '',
            result: '',
            streak: 0
        })) {
            return;
        }

        // Deduct initial bet
        const newBalance = this.app.auth.getBalance() - betAmount;
        this.app.auth.setBalance(newBalance);
        this.app.recordWager(betAmount);

        // Set Game State
        this.state.isGameActive = true;
        this.state.currentBet = betAmount;
        this.state.accumulatedValue = betAmount;
        this.state.streak = 0;
        this.state.history = [];

        // UI Updates
        const betControls = document.getElementById('coinflip-bet-controls');
        const activeGameStats = document.getElementById('coinflip-active-game-stats');
        const gameControls = document.getElementById('coinflip-game-controls');
        const waitingMessage = document.getElementById('coinflip-waiting-message');
        const btnStart = document.getElementById('coinflip-btn-start');

        if (betControls) betControls.classList.add('hidden');
        if (activeGameStats) {
            activeGameStats.classList.remove('hidden');
            activeGameStats.classList.add('flex');
        }
        
        if (waitingMessage) waitingMessage.classList.add('hidden');
        if (gameControls) {
            gameControls.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
            gameControls.classList.add('opacity-100', 'pointer-events-auto');
        }
        
        if (btnStart) {
            btnStart.textContent = 'Game Active';
            btnStart.classList.remove('btn-primary');
            btnStart.classList.add('bg-[#2a3042]', 'text-gray-400', 'cursor-not-allowed');
        }

        this.clearHistoryUI();
        this.updateRoadmap();
        this.updateUI();
        soundManager.play('click');
    }

    flip(choice) {
        if (!this.state.isGameActive || this.state.isFlipping) return;

        this.state.isFlipping = true;
        
        const gameControls = document.getElementById('coinflip-game-controls');
        if (gameControls) {
            gameControls.style.pointerEvents = 'none';
            gameControls.style.opacity = '0.5';
        }

        // Determine actual coin result (heads or tails)
        const random = Math.random();
        const result = random < 0.5 ? 'heads' : 'tails'; // 50/50 for heads/tails
        
        // Security validation
        if (!this.app.security.checkBeforeGameAction('coinflip', 'flip', {
            choice: choice,
            result: result,
            streak: this.state.streak
        })) {
            this.state.isFlipping = false;
            if (gameControls) {
                gameControls.style.pointerEvents = 'auto';
                gameControls.style.opacity = '1';
            }
            return;
        }

        // Animate Coin
        const coinElement = document.getElementById('coinflip-coin');
        const spins = 5;
        const degreesPerSpin = 360;
        const targetOffset = result === 'heads' ? 0 : 180;
        
        let nextRotation = this.state.coinRotation + (spins * degreesPerSpin);
        const remainder = nextRotation % 360;
        const adjustment = targetOffset - remainder;
        nextRotation += adjustment;

        if (nextRotation <= this.state.coinRotation) nextRotation += 360;

        this.state.coinRotation = nextRotation;
        if (coinElement) {
            coinElement.style.transform = `rotateY(${this.state.coinRotation}deg)`;
        }

        // Wait for animation
        setTimeout(() => {
            this.handleResult(result, choice === result);
        }, 1000);
    }

    handleResult(resultSide, isWin) {
        this.state.isFlipping = false;
        const gameControls = document.getElementById('coinflip-game-controls');
        if (gameControls) {
            gameControls.style.pointerEvents = 'auto';
            gameControls.style.opacity = '1';
        }

        // Add to history
        this.addToHistory(resultSide);

        if (isWin) {
            // Win logic
            this.state.streak++;
            this.state.accumulatedValue = this.state.accumulatedValue * this.state.HOUSE_EDGE;
            
            this.showResultOverlay("WIN", "text-[#10b981]");
            this.updateRoadmap();
            soundManager.play('win');
        } else {
            // Loss logic
            this.state.accumulatedValue = 0;
            this.showResultOverlay("LOSS", "text-[#ef4444]");
            soundManager.play('lose');
            
            // End Game automatically on loss
            setTimeout(() => this.endGame(), 1000);
        }

        this.updateUI();
    }

    cashOut() {
        if (!this.state.isGameActive) return;

        const winnings = this.state.accumulatedValue;
        
        // Security validation
        if (!this.app.security.checkBeforeGameAction('coinflip', 'cashout', {
            choice: '',
            result: '',
            streak: this.state.streak
        })) {
            return;
        }

        const newBalance = this.app.auth.getBalance() + winnings;
        this.app.auth.setBalance(newBalance);
        
        const profit = winnings - this.state.currentBet;
        if (profit > 0) {
            this.app.recordWin(profit, 'Coinflip');
            if (profit >= this.app.bigWinThreshold) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }
        
        this.showResultOverlay(`+$${winnings.toFixed(2)}`, "text-[#f59e0b]");
        this.endGame();
        soundManager.play('win');
        
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
                this.app.showGlobalAlert(`${this.app.auth.getUsername()} won ${winnings.toFixed(2)} coins playing Coinflip!`, 'purple');
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

    endGame() {
        this.state.isGameActive = false;
        this.state.streak = 0;
        this.state.currentBet = 0;
        this.state.accumulatedValue = 0;

        // Reset UI
        const betControls = document.getElementById('coinflip-bet-controls');
        const activeGameStats = document.getElementById('coinflip-active-game-stats');
        const gameControls = document.getElementById('coinflip-game-controls');
        const waitingMessage = document.getElementById('coinflip-waiting-message');
        const btnStart = document.getElementById('coinflip-btn-start');

        if (betControls) betControls.classList.remove('hidden');
        if (activeGameStats) {
            activeGameStats.classList.add('hidden');
            activeGameStats.classList.remove('flex');
        }

        if (gameControls) {
            gameControls.classList.add('hidden', 'opacity-0', 'pointer-events-none');
            gameControls.classList.remove('opacity-100', 'pointer-events-auto');
        }
        if (waitingMessage) waitingMessage.classList.remove('hidden');
        
        if (btnStart) {
            btnStart.textContent = 'Start Game';
            btnStart.classList.add('btn-primary');
            btnStart.classList.remove('bg-[#2a3042]', 'text-gray-400', 'cursor-not-allowed');
        }
    }

    showResultOverlay(text, colorClass) {
        const resultOverlay = document.getElementById('coinflip-result-overlay');
        const resultText = document.getElementById('coinflip-result-text');
        
        if (!resultOverlay || !resultText) return;
        
        resultText.textContent = text;
        resultText.className = `text-6xl font-black uppercase tracking-widest drop-shadow-[0_4px_4px rgba(0,0,0,0.5)] ${colorClass}`;
        
        resultOverlay.classList.remove('opacity-0');
        resultOverlay.style.transform = 'translate(-50%, -50%) scale(1.2)';
        
        setTimeout(() => {
            resultOverlay.classList.add('opacity-0');
            resultOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 800);
    }

    addToHistory(side) {
        const historyRow = document.getElementById('coinflip-history-row');
        if (!historyRow) return;
        
        this.state.history.push(side);
        
        if (this.state.history.length === 0) {
            historyRow.innerHTML = '';
        }
        
        const item = document.createElement('div');
        item.className = 'coinflip-history-item flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2';
        
        if (side === 'heads') {
            item.classList.add('bg-[#f59e0b]', 'border-[#d97706]', 'text-yellow-900');
            item.textContent = 'H';
        } else {
            item.classList.add('bg-gray-400', 'border-gray-300', 'text-gray-900');
            item.textContent = 'T';
        }
        
        historyRow.appendChild(item);
        historyRow.scrollLeft = historyRow.scrollWidth;
    }

    clearHistoryUI() {
        const historyRow = document.getElementById('coinflip-history-row');
        if (historyRow) {
            historyRow.innerHTML = '<span class="text-gray-600 text-sm italic">No flips yet...</span>';
        }
    }

    updateRoadmap() {
        const roadmap = document.getElementById('coinflip-multiplier-roadmap');
        if (!roadmap) return;
        
        const startStreak = this.state.streak;
        let html = '';
        
        for (let i = 1; i <= 5; i++) {
            const stepIndex = startStreak + i;
            const multiplier = Math.pow(this.state.HOUSE_EDGE, stepIndex);
            
            html += `
                <div class="text-center relative flex flex-col items-center">
                    <div class="coinflip-roadmap-dot w-2 h-2 rounded-full mb-2 ${i === 1 ? 'active' : 'bg-[#2a3042]'}"></div>
                    <span class="${i === 1 ? 'text-white font-bold' : 'text-gray-500'}">${multiplier.toFixed(2)}×</span>
                </div>
            `;
        }
        
        roadmap.innerHTML = html;
    }

    // Clean up on game exit
    cleanup() {
        this.state.isGameActive = false;
        this.state.isFlipping = false;
        this.state.currentBet = 0;
        this.state.accumulatedValue = 0;
        this.state.streak = 0;
        this.state.history = [];
    }
}

window.CoinflipGame = CoinflipGame;
