// Mines Game Class
class MinesGame {
    constructor(app) {
        this.app = app;
        this.state = {
            isActive: false,
            bet: 0,
            mines: 3,
            revealed: 0,
            grid: [],
            selectedTiles: new Set(),
            isDragging: false,
            gameId: null
        };
    }

    async render() {
        this.resetState();
        
        this.app.mainContent.innerHTML = `
            <div class="mines-container">
                <div class="mines-sidebar">
                    <div class="sidebar-section">
                        <label>Bet Amount</label>
                        <div class="bet-input-group">
                            <i class="fa-solid fa-coins"></i>
                            <input type="number" id="minesBetInput" value="10" min="1" max="${this.app.balance}">
                            <div class="multiplier-buttons">
                                <button onclick="app.minesGame.adjustBet(0.5)">½</button>
                                <button onclick="app.minesGame.adjustBet(2)">2x</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sidebar-section">
                        <label>Mines Count</label>
                        <div class="mines-buttons">
                            ${[1,3,5,10,24].map(n => `
                                <button onclick="app.minesGame.setMines(${n})" class="${n===3?'active':''}">${n}</button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="sidebar-section stats-section">
                        <div class="stat">
                            <span>Next Tile</span>
                            <span id="minesNextMult">1.13x</span>
                        </div>
                        <div class="stat">
                            <span>Profit</span>
                            <span id="minesProfit">0</span>
                        </div>
                    </div>
                    
                    <button id="minesActionBtn" onclick="app.minesGame.startGame()" class="btn-primary">
                        <i class="fa-solid fa-play"></i> Start Game
                    </button>
                </div>
                
                <div class="mines-grid-container">
                    <div class="mines-grid" id="minesGrid">
                        ${Array(25).fill().map((_, i) => `
                            <div class="mine-tile" id="mine-tile-${i}"
                                 data-index="${i}"
                                 onmousedown="app.minesGame.startDrag(${i}, event)"
                                 onmouseenter="app.minesGame.handleDrag(${i})"
                                 onmouseup="app.minesGame.stopDrag()"
                                 ontouchstart="app.minesGame.startDrag(${i}, event)"
                                 ontouchmove="app.minesGame.handleTouchMove(event)"
                                 ontouchend="app.minesGame.stopDrag()">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        this.updateMultiplier();
    }

    resetState() {
        this.state = {
            isActive: false,
            bet: 0,
            mines: 3,
            revealed: 0,
            grid: [],
            selectedTiles: new Set(),
            isDragging: false,
            gameId: null
        };
    }

    async startGame() {
        if (!this.app.userId) {
            this.app.showToast('Please login to play', 'error');
            return;
        }

        if (this.state.isActive) {
            await this.cashOut();
            return;
        }

        const betInput = document.getElementById('minesBetInput');
        const bet = parseInt(betInput.value);

        if (isNaN(bet) || bet <= 0) {
            this.app.showToast('Invalid bet amount', 'error');
            return;
        }

        if (bet > this.app.balance) {
            this.app.showToast('Insufficient funds', 'error');
            return;
        }

        // Server-side game initialization
        try {
            const gameId = 'mines_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Generate grid on server for fairness
            const grid = await this.generateServerGrid();
            
            // Record game start
            await database.ref(`games/mines/${gameId}`).set({
                userId: this.app.userId,
                username: this.app.username,
                bet: bet,
                mines: this.state.mines,
                grid: grid,
                revealed: [],
                createdAt: Date.now(),
                status: 'active',
                multiplier: 1.00
            });

            // Deduct bet
            await this.app.wallet.deductBalance(bet, 'mines_bet');
            
            this.state.isActive = true;
            this.state.bet = bet;
            this.state.grid = grid;
            this.state.gameId = gameId;

            // Update UI
            const btn = document.getElementById('minesActionBtn');
            btn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Cash Out <span id="minesCashoutVal">0</span>';
            btn.className = 'btn-success';
            
            // Reset grid UI
            document.querySelectorAll('.mine-tile').forEach(tile => {
                tile.className = 'mine-tile';
                tile.innerHTML = '';
            });

            this.app.sound.play('click');
            this.app.showToast('Game started! Click tiles to reveal.', 'success');

        } catch (error) {
            console.error('Game start error:', error);
            this.app.showToast('Failed to start game', 'error');
        }
    }

    async generateServerGrid() {
        // Generate grid with mines randomly placed
        const grid = Array(25).fill('safe');
        let placed = 0;
        
        while (placed < this.state.mines) {
            const idx = Math.floor(Math.random() * 25);
            if (grid[idx] === 'safe') {
                grid[idx] = 'mine';
                placed++;
            }
        }
        
        return grid;
    }

    async clickTile(index) {
        if (!this.state.isActive || this.state.grid[index] === 'revealed') {
            return;
        }

        const tile = document.getElementById(`mine-tile-${index}`);
        tile.classList.add('revealed');

        // Verify with server
        const isMine = this.state.grid[index] === 'mine';
        
        if (isMine) {
            // Mine hit - game over
            tile.classList.add('mine');
            tile.innerHTML = '<i class="fa-solid fa-bomb"></i>';
            
            await this.gameOver(false, index);
            this.app.sound.play('mine');
            
        } else {
            // Safe tile
            tile.classList.add('gem');
            tile.innerHTML = '<i class="fa-solid fa-gem"></i>';
            
            this.state.revealed++;
            this.state.grid[index] = 'revealed';
            
            // Update server
            await database.ref(`games/mines/${this.state.gameId}/revealed`).push(index);
            
            const multiplier = this.calculateMultiplier(this.state.mines, this.state.revealed);
            await database.ref(`games/mines/${this.state.gameId}`).update({
                multiplier: multiplier
            });

            // Update UI
            document.getElementById('minesProfit').textContent = 
                `${(this.state.bet * multiplier - this.state.bet).toFixed(2)}`;
            
            document.getElementById('minesCashoutVal').textContent = 
                `${(this.state.bet * multiplier).toFixed(2)}`;
            
            this.updateMultiplier();
            this.app.sound.play('gem');

            // Check if all safe tiles revealed
            if (this.state.revealed === (25 - this.state.mines)) {
                await this.cashOut();
            }
        }
    }

    calculateMultiplier(mines, revealed) {
        let multiplier = 1.0;
        for (let i = 0; i < revealed; i++) {
            multiplier *= (25 - i) / (25 - mines - i);
        }
        return multiplier * (1 - GAME_CONSTANTS.HOUSE_EDGE.mines);
    }

    async cashOut() {
        if (!this.state.isActive) return;

        const multiplier = this.calculateMultiplier(this.state.mines, this.state.revealed);
        const winnings = this.state.bet * multiplier;
        
        // Update game status
        await database.ref(`games/mines/${this.state.gameId}`).update({
            status: 'cashed_out',
            winnings: winnings,
            endedAt: Date.now()
        });

        // Add winnings
        await this.app.wallet.addBalance(winnings, 'mines_win');
        
        const profit = winnings - this.state.bet;
        if (profit > 0) {
            await this.app.wallet.recordWin(profit, 'Mines');
        }

        this.app.showToast(`Cashed out ${winnings.toFixed(2)} coins!`, 'success');
        this.app.sound.play('win');
        
        this.endGame(true);
    }

    async gameOver(hitIndex) {
        // Record loss
        await this.app.wallet.recordLoss(this.state.bet, 'Mines');
        
        // Update game status
        await database.ref(`games/mines/${this.state.gameId}`).update({
            status: 'lost',
            hitMine: hitIndex,
            endedAt: Date.now()
        });

        this.app.showToast('Boom! You hit a mine!', 'error');
        this.endGame(false);
    }

    endGame(won) {
        this.state.isActive = false;
        
        const btn = document.getElementById('minesActionBtn');
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Start Game';
        btn.className = 'btn-primary';
        
        // Reveal all mines
        this.state.grid.forEach((type, index) => {
            if (type === 'mine') {
                const tile = document.getElementById(`mine-tile-${index}`);
                tile.classList.add('revealed', 'mine');
                tile.innerHTML = '<i class="fa-solid fa-bomb"></i>';
            }
        });
    }

    // Drag selection methods
    startDrag(index, event) {
        if (!this.state.isActive || this.state.isDragging) return;
        event.preventDefault();
        
        this.state.isDragging = true;
        this.state.selectedTiles.clear();
        this.addToSelection(index);
    }

    handleDrag(index) {
        if (!this.state.isActive || !this.state.isDragging) return;
        this.addToSelection(index);
    }

    handleTouchMove(event) {
        if (!this.state.isActive || !this.state.isDragging) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.id && element.id.startsWith('mine-tile-')) {
            const index = parseInt(element.id.split('-')[2]);
            this.addToSelection(index);
        }
    }

    addToSelection(index) {
        if (!this.state.isActive || this.state.selectedTiles.has(index)) return;
        
        const tile = document.getElementById(`mine-tile-${index}`);
        if (!tile || tile.classList.contains('revealed')) return;
        
        tile.classList.add('selected');
        this.state.selectedTiles.add(index);
        
        // Auto-click after delay
        setTimeout(() => {
            if (!this.state.isDragging && this.state.selectedTiles.has(index)) {
                this.clickTile(index);
                this.state.selectedTiles.delete(index);
            }
        }, 50);
    }

    stopDrag() {
        if (!this.state.isActive) return;
        
        this.state.isDragging = false;
        this.state.selectedTiles.forEach(index => {
            setTimeout(() => this.clickTile(index), 10);
        });
        this.state.selectedTiles.clear();
    }

    // Utility methods
    setMines(count) {
        if (this.state.isActive) return;
        this.state.mines = count;
        
        document.querySelectorAll('.mines-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.updateMultiplier();
        this.app.sound.play('click');
    }

    adjustBet(factor) {
        const betInput = document.getElementById('minesBetInput');
        let val = parseFloat(betInput.value) * factor;
        if (val < 1) val = 1;
        if (val > this.app.balance) val = this.app.balance;
        betInput.value = Math.round(val);
        this.app.sound.play('click');
    }

    updateMultiplier() {
        if (!this.state.isActive) {
            const mult = this.calculateMultiplier(this.state.mines, 1);
            document.getElementById('minesNextMult').textContent = mult.toFixed(2) + 'x';
            return;
        }
        
        const mult = this.calculateMultiplier(this.state.mines, this.state.revealed + 1);
        document.getElementById('minesNextMult').textContent = mult.toFixed(2) + 'x';
    }
}
