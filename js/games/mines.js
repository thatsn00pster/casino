import { soundManager } from '../sounds.js';

class MinesGame {
    constructor(app) {
        this.app = app;
        this.minesActive = false;
        this.minesDragging = false;
        this.minesDragStartTile = null;
        this.minesSelectedTiles = new Set();
        this.minesBet = 0;
        this.minesCount = 3;
        this.minesRevealedCount = 0;
        this.minesGrid = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Game buttons will be set up when the game is rendered
    }

    render() {
        this.minesActive = false;
        this.minesDragging = false;
        this.minesSelectedTiles.clear();

        this.app.mainContent.innerHTML = `
            <div class="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 md:gap-6 min-h-[500px] items-start game-container">
                <div class="w-full md:w-64 bg-gradient-to-b from-[#161b26] to-[#11141c] p-4 md:p-6 rounded-xl md:rounded-2xl border border-[#2a3042] shadow-xl sticky top-4 md:top-8">
                    <div class="mb-4 md:mb-6">
                        <label class="text-xs md:text-sm text-[#8b5cf6] font-bold mb-2 block tracking-wider">Bet Amount</label>
                        <div class="flex bg-gradient-to-r from-[#0b0e14] to-[#1e293b] rounded-lg md:rounded-xl border border-[#2a3042] p-1">
                            <div class="pl-3 py-2 text-[#8b5cf6] font-bold"><i class="fa-solid fa-coins text-sm"></i></div>
                            <input type="number" id="minesBetInput" value="10" min="1" max="${this.app.auth.getBalance()}" class="w-full bg-transparent text-white px-3 font-bold text-base md:text-lg outline-none">
                            <div class="flex pr-1">
                                <button class="mines-bet-2x px-3 text-xs font-bold text-[#8b5cf6] hover:text-white transition-all duration-300 touch-button">2x</button>
                                <button class="mines-bet-half px-3 text-xs font-bold text-[#8b5cf6] hover:text-white transition-all duration-300 touch-button">½</button>
                            </div>
                        </div>
                    </div>
                    <div class="mb-4 md:mb-6">
                        <label class="text-xs md:text-sm text-[#8b5cf6] font-bold mb-2 block tracking-wider">Mines Count</label>
                        <div class="grid grid-cols-5 gap-1 md:gap-2" id="minesCountButtons">
                            ${[1,3,5,10,24].map(n => `
                                <button data-mines="${n}" class="bg-gradient-to-r from-[#0b0e14] to-[#1e293b] border border-[#2a3042] text-[#b1bad3] rounded-lg md:rounded-xl py-1.5 md:py-2.5 text-xs md:text-sm font-bold hover:border-[#8b5cf6] hover:text-white transition-all duration-300 ${n===3?'border-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]':''} touch-button">${n}</button>
                            `).join('')}
                        </div>
                        <input type="hidden" id="minesCountInput" value="3">
                    </div>
                    <div class="bg-gradient-to-r from-[#0b0e14] to-[#1e293b] rounded-lg md:rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-[#2a3042] flex justify-between items-center">
                        <div>
                            <div class="text-xs text-[#6b7280] tracking-wider">Next Tile</div>
                            <div class="text-[#10b981] font-bold text-lg md:text-xl" id="minesNextMult">1.13x</div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-[#6b7280] tracking-wider">Profit</div>
                            <div class="text-white font-bold text-lg md:text-xl" id="minesProfit">0</div>
                        </div>
                    </div>
                    <button id="minesBtn" class="w-full btn-primary py-3 rounded-xl md:rounded-2xl font-bold text-sm md:text-base tracking-wider hover:scale-[1.02] transition-all duration-300 touch-button">
                        <i class="fa-solid fa-play mr-1"></i> Start Game
                    </button>
                </div>
                <div class="flex-1 w-full bg-gradient-to-b from-[#161b26] to-[#11141c] rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#2a3042] shadow-xl flex items-center justify-center relative overflow-hidden">
                    <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8b5cf6] via-[#10b981] to-[#8b5cf6] animate-shimmer"></div>
                    <div class="mines-grid-container" id="minesGrid">
                        ${Array(25).fill(0).map((_,i)=>`
                            <div id="tile-${i}" class="mine-tile-modern touch-button"></div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.setupGameEventListeners();
        this.setMinesCount(3);
    }

    setupGameEventListeners() {
        // Bet adjustment buttons
        const bet2xBtn = document.querySelector('.mines-bet-2x');
        const betHalfBtn = document.querySelector('.mines-bet-half');
        const minesBtn = document.getElementById('minesBtn');
        const minesCountButtons = document.getElementById('minesCountButtons');

        if (bet2xBtn) {
            bet2xBtn.addEventListener('click', () => {
                const betInput = document.getElementById('minesBetInput');
                if (betInput) {
                    betInput.value = Math.min(this.app.auth.getBalance(), betInput.value * 2);
                }
            });
        }

        if (betHalfBtn) {
            betHalfBtn.addEventListener('click', () => {
                const betInput = document.getElementById('minesBetInput');
                if (betInput) {
                    betInput.value = Math.max(1, betInput.value / 2);
                }
            });
        }

        if (minesBtn) {
            minesBtn.addEventListener('click', () => this.play());
        }

        if (minesCountButtons) {
            minesCountButtons.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    const count = parseInt(btn.dataset.mines);
                    this.setMinesCount(count);
                });
            });
        }

        // Setup tile event listeners
        for (let i = 0; i < 25; i++) {
            const tile = document.getElementById(`tile-${i}`);
            if (tile) {
                tile.addEventListener('mousedown', (e) => this.startDrag(i, e));
                tile.addEventListener('mouseenter', () => this.handleDrag(i));
                tile.addEventListener('mouseup', () => this.stopDrag());
                tile.addEventListener('touchstart', (e) => this.startDrag(i, e));
                tile.addEventListener('touchmove', (e) => this.handleTouchMove(e));
                tile.addEventListener('touchend', () => this.stopDrag());
            }
        }
    }

    setMinesCount(n) {
        if (this.minesActive) return;
        document.getElementById('minesCountInput').value = n;
        document.querySelectorAll('#minesCountButtons button').forEach(b => {
            b.classList.remove('border-[#8b5cf6]', 'text-white', 'shadow-[0_0_20px_rgba(139,92,246,0.3)]');
            if (parseInt(b.dataset.mines) === n) {
                b.classList.add('border-[#8b5cf6]', 'text-white', 'shadow-[0_0_20px_rgba(139,92,246,0.3)]');
            }
        });
        this.updateMinesNextMult();
        soundManager.play('click');
    }

    updateMinesNextMult() {
        if (!this.minesActive) {
            const m = parseInt(document.getElementById('minesCountInput').value);
            const mult = this.calculateMinesMultiplier(m, 1);
            const nextMult = document.getElementById('minesNextMult');
            if (nextMult) {
                nextMult.textContent = mult.toFixed(2) + 'x';
            }
            return;
        }
        const m = this.minesCount;
        const r = this.minesRevealedCount + 1;
        const mult = this.calculateMinesMultiplier(m, r);
        const nextMult = document.getElementById('minesNextMult');
        if (nextMult) {
            nextMult.textContent = mult.toFixed(2) + 'x';
        }
    }

    calculateMinesMultiplier(mines, revealed) {
        let multiplier = 1.0;
        for (let i = 0; i < revealed; i++) multiplier *= (25 - i) / (25 - mines - i);
        return multiplier;
    }

    // Drag selection functions
    startDrag(tileId, event) {
        if (!this.minesActive || this.minesDragging) return;
        event.preventDefault();
        
        this.minesDragging = true;
        this.minesDragStartTile = tileId;
        this.minesSelectedTiles.clear();
        this.handleTileSelection(tileId);
    }

    handleDrag(tileId) {
        if (!this.minesActive || !this.minesDragging) return;
        this.handleTileSelection(tileId);
    }

    handleTouchMove(event) {
        if (!this.minesActive || !this.minesDragging) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.id && element.id.startsWith('tile-')) {
            const tileId = parseInt(element.id.split('-')[1]);
            this.handleTileSelection(tileId);
        }
    }

    handleTileSelection(tileId) {
        if (!this.minesActive || this.minesSelectedTiles.has(tileId)) return;
        
        const tile = document.getElementById(`tile-${tileId}`);
        if (!tile || tile.classList.contains('revealed')) return;
        
        // Add hover effect
        tile.classList.add('hover-effect');
        this.minesSelectedTiles.add(tileId);
        
        // Automatically click after a short delay if dragging stopped
        setTimeout(() => {
            if (!this.minesDragging && this.minesSelectedTiles.has(tileId)) {
                this.clickTile(tileId);
                this.minesSelectedTiles.delete(tileId);
            }
        }, 50);
    }

    stopDrag() {
        if (!this.minesActive) return;
        
        this.minesDragging = false;
        
        // Process all selected tiles
        this.minesSelectedTiles.forEach(tileId => {
            setTimeout(() => {
                this.clickTile(tileId);
            }, 10);
        });
        
        this.minesSelectedTiles.clear();
        this.minesDragStartTile = null;
    }

    play() {
        if (!this.app.checkMaintenance()) return;
        
        if (!this.app.auth.isLoggedIn()) {
            this.app.showToast('Please login to play', 'error');
            return;
        }

        if (this.minesActive) {
            this.cashOut();
            return;
        }

        const betInput = document.getElementById('minesBetInput');
        const bet = parseFloat(betInput.value);
        const mines = parseInt(document.getElementById('minesCountInput').value);

        if (isNaN(bet) || bet <= 0) return;
        if (bet > this.app.auth.getBalance()) {
            this.app.showToast('Insufficient funds', 'error');
            return;
        }

        // Security validation
        if (!this.app.security.checkBeforeGameAction('mines', 'start', {
            minesCount: mines,
            revealedCount: 0,
            winAmount: 0
        })) {
            return;
        }

        soundManager.play('click');
        
        // Deduct bet
        const newBalance = this.app.auth.getBalance() - bet;
        this.app.auth.setBalance(newBalance);
        this.app.recordWager(bet);

        this.minesBet = bet;
        this.minesCount = mines;
        this.minesActive = true;
        this.minesRevealedCount = 0;
        this.minesGrid = Array(25).fill('safe');

        // Place mines randomly
        let placed = 0;
        while (placed < mines) {
            const idx = Math.floor(Math.random() * 25);
            if (this.minesGrid[idx] === 'safe') {
                this.minesGrid[idx] = 'mine';
                placed++;
            }
        }

        const btn = document.getElementById('minesBtn');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-money-bill-wave mr-1"></i> Cash Out <span id="minesCashoutVal" class="ml-1 bg-white/20 px-2 py-0.5 rounded text-xs">0</span>';
            btn.className = 'w-full bg-gradient-to-r from-[#10b981] to-[#059669] text-white py-3 rounded-xl md:rounded-2xl font-bold text-sm md:text-base tracking-wider hover:scale-[1.02] transition-all duration-300 touch-button';
        }

        // Reset tiles
        document.querySelectorAll('.mine-tile-modern').forEach(el => {
            el.className = 'mine-tile-modern';
            el.innerHTML = '';
        });

        this.updateMinesNextMult();
        const profitElement = document.getElementById('minesProfit');
        if (profitElement) {
            profitElement.textContent = '0';
        }
    }

    clickTile(idx) {
        if (!this.minesActive) return;
        const tile = document.getElementById(`tile-${idx}`);
        if (!tile || tile.classList.contains('revealed')) return;

        tile.classList.add('revealed');
        tile.classList.remove('hover-effect');

        if (this.minesGrid[idx] === 'mine') {
            tile.classList.add('mine');
            tile.innerHTML = '<i class="fa-solid fa-bomb text-white text-2xl md:text-3xl animate-bounce"></i>';
            soundManager.play('mine');
            this.app.recordLoss(this.minesBet, 'Mines');
            this.endGame(false, idx);
        } else {
            tile.classList.add('gem');
            tile.innerHTML = '<i class="fa-solid fa-gem text-[#10b981] text-xl md:text-2xl animate-pulse"></i>';
            soundManager.play('gem');
            this.minesRevealedCount++;

            const currentMult = this.calculateMinesMultiplier(this.minesCount, this.minesRevealedCount);
            const currentWin = this.minesBet * currentMult;
            
            const profitElement = document.getElementById('minesProfit');
            if (profitElement) {
                profitElement.textContent = `${(currentWin - this.minesBet).toFixed(2)}`;
            }

            const cv = document.getElementById('minesCashoutVal');
            if (cv) cv.textContent = `${currentWin.toFixed(2)}`;

            this.updateMinesNextMult();

            if (this.minesRevealedCount === (25 - this.minesCount)) {
                this.cashOut();
            }
        }
    }

    endGame(win, hitIdx) {
        this.minesActive = false;
        this.minesDragging = false;
        this.minesSelectedTiles.clear();
        
        const btn = document.getElementById('minesBtn');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-play mr-1"></i> Start Game';
            btn.className = 'w-full btn-primary py-3 rounded-xl md:rounded-2xl font-bold text-sm md:text-base tracking-wider hover:scale-[1.02] transition-all duration-300 touch-button';
        }

        // Reveal all tiles
        this.minesGrid.forEach((type, idx) => {
            const tile = document.getElementById(`tile-${idx}`);
            if (tile && !tile.classList.contains('revealed')) {
                tile.classList.add('revealed');
                if (type === 'mine') {
                    tile.innerHTML = '<i class="fa-solid fa-bomb text-white text-sm md:text-lg opacity-30"></i>';
                    tile.classList.add('mine-hidden');
                } else {
                    tile.innerHTML = '<i class="fa-solid fa-gem text-white/10 text-sm md:text-lg"></i>';
                    tile.classList.add('safe-hidden');
                }
            }
        });

        if (!win) {
            this.app.showToast('Boom! You hit a mine!', 'error');
        }
    }

    cashOut() {
        const mult = this.calculateMinesMultiplier(this.minesCount, this.minesRevealedCount);
        const win = this.minesBet * mult;
        
        // Security validation
        if (!this.app.security.checkBeforeGameAction('mines', 'cashout', {
            minesCount: this.minesCount,
            revealedCount: this.minesRevealedCount,
            winAmount: win
        })) {
            return;
        }
        
        const newBalance = this.app.auth.getBalance() + win;
        this.app.auth.setBalance(newBalance);
        
        soundManager.play('win');
        this.app.showToast(`Cashed out ${win.toFixed(2)} coins! (${mult.toFixed(2)}x)`, 'success');
        this.app.recordWin(win - this.minesBet, 'Mines');
        this.endGame(true, -1);
    }

    // Clean up on game exit
    cleanup() {
        this.minesActive = false;
        this.minesDragging = false;
        this.minesSelectedTiles.clear();
    }
}

export { MinesGame };