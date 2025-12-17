// Blackjack Game Class
class BlackjackGame {
    constructor(app) {
        this.app = app;
        this.state = {
            isActive: false,
            bet: 0,
            deck: [],
            playerHand: [],
            dealerHand: [],
            gameId: null,
            isPlayerTurn: true,
            isStanding: false
        };
    }

    async render() {
        this.resetState();
        
        this.app.mainContent.innerHTML = `
            <div class="blackjack-container">
                <div class="blackjack-table">
                    <!-- Dealer Section -->
                    <div class="dealer-section">
                        <div class="section-header">
                            <i class="fa-solid fa-user-tie"></i>
                            <span>Dealer</span>
                            <div class="score" id="dealerScore">0</div>
                        </div>
                        <div id="dealerHand" class="hand-container"></div>
                    </div>
                    
                    <!-- Game Status -->
                    <div class="game-status">
                        <div id="bjStatus" class="status-text">Place your bet and deal!</div>
                    </div>
                    
                    <!-- Player Section -->
                    <div class="player-section">
                        <div id="playerHand" class="hand-container"></div>
                        <div class="section-header">
                            <i class="fa-solid fa-user"></i>
                            <span>You</span>
                            <div class="score" id="playerScore">0</div>
                        </div>
                    </div>
                    
                    <!-- Game Overlay -->
                    <div id="bjOverlay" class="game-overlay">
                        <div id="bjMessage" class="result-message"></div>
                        <div id="bjPayout" class="payout-amount"></div>
                        <button onclick="app.blackjackGame.resetGame()" class="btn-primary">
                            <i class="fa-solid fa-rotate-right"></i> Play Again
                        </button>
                    </div>
                </div>
                
                <!-- Game Controls -->
                <div class="blackjack-controls">
                    <div class="bet-controls">
                        <div class="bet-input-group">
                            <span>BET</span>
                            <input type="number" id="bjBetInput" value="50" min="1" max="${this.app.balance}">
                            <div class="multiplier-buttons">
                                <button onclick="app.blackjackGame.adjustBet(0.5)">½</button>
                                <button onclick="app.blackjackGame.adjustBet(2)">2x</button>
                            </div>
                        </div>
                        
                        <div class="action-buttons">
                            <button id="btnDeal" onclick="app.blackjackGame.startGame()" class="btn-primary">
                                <i class="fa-solid fa-play"></i> DEAL CARDS
                            </button>
                            <div id="bjActions" class="hidden">
                                <button id="btnHit" onclick="app.blackjackGame.hit()" class="btn-secondary">
                                    <i class="fa-solid fa-plus"></i> HIT
                                </button>
                                <button id="btnStand" onclick="app.blackjackGame.stand()" class="btn-success">
                                    <i class="fa-solid fa-hand"></i> STAND
                                </button>
                            </div>
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
            deck: [],
            playerHand: [],
            dealerHand: [],
            gameId: null,
            isPlayerTurn: true,
            isStanding: false
        };
    }

    async startGame() {
        if (!this.app.userId) {
            this.app.showToast('Please login to play', 'error');
            return;
        }

        if (this.state.isActive) return;

        const betInput = document.getElementById('bjBetInput');
        const bet = parseInt(betInput.value);

        if (isNaN(bet) || bet <= 0) return;
        if (bet > this.app.balance) {
            this.app.showToast('Insufficient funds', 'error');
            return;
        }

        try {
            // Create game on server
            const gameId = 'bj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Generate deck on server for fairness
            const deck = await this.generateDeck();
            
            await database.ref(`games/blackjack/${gameId}`).set({
                userId: this.app.userId,
                username: this.app.username,
                bet: bet,
                deck: deck,
                playerHand: [],
                dealerHand: [],
                status: 'active',
                createdAt: Date.now(),
                turn: 'player'
            });

            // Deduct bet
            await this.app.wallet.deductBalance(bet, 'blackjack_bet');
            
            this.state.isActive = true;
            this.state.bet = bet;
            this.state.deck = deck;
            this.state.gameId = gameId;

            // Update UI
            document.getElementById('btnDeal').classList.add('hidden');
            document.getElementById('bjActions').classList.remove('hidden');
            betInput.disabled = true;

            this.app.sound.play('click');

            // Deal initial cards
            await this.dealCard('player');
            await this.sleep(400);
            await this.dealCard('dealer', true); // First dealer card face down
            await this.sleep(400);
            await this.dealCard('player');
            await this.sleep(400);
            await this.dealCard('dealer');

            // Check for blackjack
            const playerScore = this.calculateScore(this.state.playerHand);
            if (playerScore === 21) {
                await this.stand();
            }

        } catch (error) {
            console.error('Blackjack start error:', error);
            this.app.showToast('Failed to start game', 'error');
        }
    }

    async generateDeck() {
        // Generate shuffled deck on server
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        let deck = [];

        for (let suit of suits) {
            for (let value of values) {
                deck.push({
                    suit: suit,
                    value: value,
                    color: (suit === '♥' || suit === '♦') ? 'red' : 'black'
                });
            }
        }

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    async dealCard(target, faceDown = false) {
        if (this.state.deck.length === 0) return;

        const card = this.state.deck.pop();
        
        if (target === 'player') {
            this.state.playerHand.push(card);
            await database.ref(`games/blackjack/${this.state.gameId}/playerHand`).push(card);
        } else {
            this.state.dealerHand.push(card);
            await database.ref(`games/blackjack/${this.state.gameId}/dealerHand`).push(card);
        }

        // Update UI
        const handElement = document.getElementById(`${target}Hand`);
        const cardElement = this.createCardElement(card, !faceDown);
        
        if (faceDown) {
            cardElement.querySelector('.card').classList.add('face-down');
            cardElement.id = 'dealerHiddenCard';
        }
        
        cardElement.style.animation = 'card-deal 0.5s ease-out forwards';
        handElement.appendChild(cardElement);

        // Update scores
        this.updateScores(faceDown);
        
        this.app.sound.play('card');
        await this.sleep(300);
    }

    createCardElement(card, faceUp = true) {
        const container = document.createElement('div');
        container.className = 'card-container';
        
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${faceUp ? '' : 'face-down'}`;
        
        if (faceUp) {
            cardDiv.innerHTML = `
                <div class="card-corner top-left ${card.color}">${card.value}<br>${card.suit}</div>
                <div class="card-center ${card.color}">${card.suit}</div>
                <div class="card-corner bottom-right ${card.color}">${card.value}<br>${card.suit}</div>
            `;
        } else {
            cardDiv.innerHTML = '<div class="card-back"></div>';
        }
        
        container.appendChild(cardDiv);
        return container;
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;

        hand.forEach(card => {
            if (['J', 'Q', 'K'].includes(card.value)) {
                score += 10;
            } else if (card.value === 'A') {
                score += 11;
                aces++;
            } else {
                score += parseInt(card.value);
            }
        });

        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }

        return score;
    }

    updateScores(hideDealerScore = false) {
        const playerScore = this.calculateScore(this.state.playerHand);
        document.getElementById('playerScore').textContent = playerScore;

        if (hideDealerScore && this.state.dealerHand.length > 0) {
            const firstCard = this.state.dealerHand[0];
            let dealerVisibleScore = 0;
            
            if (['J', 'Q', 'K'].includes(firstCard.value)) {
                dealerVisibleScore = 10;
            } else if (firstCard.value === 'A') {
                dealerVisibleScore = 11;
            } else {
                dealerVisibleScore = parseInt(firstCard.value);
            }
            
            document.getElementById('dealerScore').textContent = dealerVisibleScore;
        } else {
            const dealerScore = this.calculateScore(this.state.dealerHand);
            document.getElementById('dealerScore').textContent = dealerScore;
        }
    }

    async hit() {
        if (!this.state.isActive || !this.state.isPlayerTurn || this.state.isStanding) return;

        await this.dealCard('player');
        
        const playerScore = this.calculateScore(this.state.playerHand);
        
        if (playerScore > 21) {
            await this.endGame('bust');
        }
    }

    async stand() {
        if (!this.state.isActive || this.state.isStanding) return;

        this.state.isStanding = true;
        this.state.isPlayerTurn = false;
        
        document.getElementById('bjActions').classList.add('hidden');

        // Reveal dealer's hidden card
        const hiddenCard = document.getElementById('dealerHiddenCard');
        if (hiddenCard) {
            await this.sleep(500);
            hiddenCard.querySelector('.card').classList.remove('face-down');
            this.updateScores(false);
            this.app.sound.play('card');
            await this.dealerPlay();
        }
    }

    async dealerPlay() {
        let dealerScore = this.calculateScore(this.state.dealerHand);
        
        while (dealerScore < 17) {
            await this.sleep(1000);
            await this.dealCard('dealer');
            dealerScore = this.calculateScore(this.state.dealerHand);
        }
        
        await this.determineWinner();
    }

    async determineWinner() {
        const playerScore = this.calculateScore(this.state.playerHand);
        const dealerScore = this.calculateScore(this.state.dealerHand);

        let result, message;
        
        if (playerScore > 21) {
            result = 'loss';
            message = 'BUSTED';
        } else if (dealerScore > 21) {
            result = 'win';
            message = 'DEALER BUSTED';
        } else if (playerScore > dealerScore) {
            result = 'win';
            message = 'YOU WIN';
        } else if (playerScore < dealerScore) {
            result = 'loss';
            message = 'DEALER WINS';
        } else {
            result = 'push';
            message = 'PUSH';
        }

        await this.endGame(result, message);
    }

    async endGame(result, message) {
        this.state.isActive = false;
        
        // Update game on server
        await database.ref(`games/blackjack/${this.state.gameId}`).update({
            status: 'completed',
            result: result,
            playerScore: this.calculateScore(this.state.playerHand),
            dealerScore: this.calculateScore(this.state.dealerHand),
            endedAt: Date.now()
        });

        // Handle payout
        let payout = 0;
        
        switch(result) {
            case 'win':
                payout = this.state.bet * 2;
                await this.app.wallet.addBalance(payout, 'blackjack_win');
                await this.app.wallet.recordWin(this.state.bet, 'Blackjack');
                this.app.sound.play('win');
                break;
                
            case 'push':
                payout = this.state.bet;
                await this.app.wallet.addBalance(payout, 'blackjack_push');
                break;
                
            case 'loss':
                await this.app.wallet.recordLoss(this.state.bet, 'Blackjack');
                this.app.sound.play('lose');
                break;
        }

        // Show result
        const overlay = document.getElementById('bjOverlay');
        const messageEl = document.getElementById('bjMessage');
        const payoutEl = document.getElementById('bjPayout');
        
        overlay.classList.remove('hidden');
        messageEl.textContent = message;
        messageEl.className = `result-message ${result}`;
        
        if (payout > 0) {
            payoutEl.textContent = `+${payout} coins`;
        }

        // Special effects for big wins
        if (result === 'win' && this.state.bet >= 10000) {
            confetti({
                particleCount: Math.min(this.state.bet / 100, 500),
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    resetGame() {
        const overlay = document.getElementById('bjOverlay');
        overlay.classList.add('hidden');
        
        document.getElementById('dealerHand').innerHTML = '';
        document.getElementById('playerHand').innerHTML = '';
        document.getElementById('dealerScore').textContent = '0';
        document.getElementById('playerScore').textContent = '0';
        document.getElementById('bjStatus').textContent = 'Place your bet and deal!';

        document.getElementById('btnDeal').classList.remove('hidden');
        document.getElementById('bjActions').classList.add('hidden');
        
        const betInput = document.getElementById('bjBetInput');
        betInput.disabled = false;

        this.resetState();
        this.app.sound.play('click');
    }

    adjustBet(factor) {
        const betInput = document.getElementById('bjBetInput');
        let val = parseFloat(betInput.value) * factor;
        val = Math.round(val);
        val = Math.max(1, Math.min(val, this.app.balance));
        betInput.value = val;
        this.app.sound.play('click');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
