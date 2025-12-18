// blackjack.js - Blackjack Game
class BlackjackGame {
    constructor(app) {
        this.app = app;
        this.bjInProgress = false;
        this.bjSettled = false;
        this.bjStandCalled = false;
        this.bjDeck = [];
        this.bjPlayerHand = [];
        this.bjDealerHand = [];
        this.bjBet = 0;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Game buttons will be set up when the game is rendered
    }

    render() {
        this.bjInProgress = false;
        this.bjSettled = false;
        this.bjStandCalled = false;
        this.bjDeck = [];
        this.bjPlayerHand = [];
        this.bjDealerHand = [];

        this.app.mainContent.innerHTML = `
            <div class="max-w-6xl mx-auto flex flex-col gap-4">
                <div class="text-center mb-2">
                    <h2 class="text-2xl md:text-3xl font-bold text-white mb-1">Blackjack</h2>
                    <p class="text-gray-400 text-sm">Beat the dealer without going over 21</p>
                </div>
                
                <div class="blackjack-table">
                    <!-- Dealer Section -->
                    <div class="w-full mb-4 md:mb-6">
                        <div class="flex items-center justify-center gap-2 mb-3">
                            <i class="fa-solid fa-user-tie text-lg md:text-xl text-[#a7f3d0]"></i>
                            <div class="text-[#a7f3d0] font-bold tracking-wider text-sm md:text-base">Dealer</div>
                            <div class="bg-black/40 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-white font-bold text-base md:text-lg" id="dealerScore">0</div>
                        </div>
                        <div id="dealerHand" class="hand-container"></div>
                    </div>
                    
                    <!-- Game Status -->
                    <div id="bjStatus" class="text-center my-3">
                        <div class="status-text text-white" id="bjGameStatus">Place your bet and deal!</div>
                    </div>
                    
                    <!-- Player Section -->
                    <div class="w-full mt-4 md:mt-6">
                        <div id="playerHand" class="hand-container mb-3"></div>
                        <div class="flex items-center justify-center gap-2">
                            <i class="fa-solid fa-user text-lg md:text-xl text-[#a7f3d0]"></i>
                            <div class="text-[#a7f3d0] font-bold tracking-wider text-sm md:text-base">You</div>
                            <div class="bg-black/40 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-white font-bold text-base md:text-lg" id="playerScore">0</div>
                        </div>
                    </div>
                    
                    <!-- Game Overlay -->
                    <div id="bjOverlay" class="absolute inset-0 bg-black/80 backdrop-blur-sm hidden z-20 flex-col items-center justify-center rounded-xl md:rounded-2xl">
                        <div id="bjMessage" class="text-2xl md:text-3xl font-black text-white mb-3 text-center"></div>
                        <div id="bjPayout" class="text-lg md:text-xl font-bold text-yellow-300 mb-4"></div>
                        <button id="bjPlayAgainBtn" class="px-6 py-2.5 md:px-8 md:py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-base md:text-lg rounded-xl md:rounded-2xl font-bold shadow-xl hover:scale-110 transition-all duration-300 touch-button">
                            <i class="fa-solid fa-rotate-right mr-2"></i> Play Again
                        </button>
                    </div>
                </div>
                
                <!-- Game Controls -->
                <div class="game-controls">
                    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div class="flex items-center gap-3 bg-gradient-to-r from-[#0b0e14] to-[#1e293b] px-4 py-2.5 rounded-xl border border-[#2a3042]">
                            <span class="text-gray-400 font-bold text-xs tracking-wider">BET</span>
                            <input type="number" id="bjBetInput" value="50" min="1" max="${this.app.auth.getBalance()}" class="bg-transparent text-white font-bold text-lg w-24 outline-none text-center">
                            <div class="flex gap-1">
                                <button id="bjBetHalf" class="text-xs text-[#8b5cf6] font-bold hover:text-white transition-all duration-300 hover:scale-110 touch-button">½</button>
                                <button id="bjBetDouble" class="text-xs text-[#8b5cf6] font-bold hover:text-white transition-all duration-300 hover:scale-110 touch-button">2x</button>
                            </div>
                        </div>
                        
                        <div class="flex gap-2">
                            <button id="btnDeal" class="px-6 py-2.5 md:px-8 md:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-base md:text-lg rounded-xl md:rounded-2xl shadow-xl hover:scale-105 transition-all duration-300 touch-button">
                                <i class="fa-solid fa-play mr-2"></i> DEAL CARDS
                            </button>
                            <div id="bjActions" class="hidden flex gap-2">
                                <button id="btnHit" class="px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-bold text-base md:text-lg rounded-xl md:rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 touch-button">
                                    <i class="fa-solid fa-plus mr-1"></i> HIT
                                </button>
                                <button id="btnStand" class="px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white font-black text-base md:text-lg rounded-xl md:rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 touch-button">
                                    <i class="fa-solid fa-hand mr-1"></i> STAND
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupGameEventListeners();
    }

    setupGameEventListeners() {
        const bjBetHalf = document.getElementById('bjBetHalf');
        const bjBetDouble = document.getElementById('bjBetDouble');
        const btnDeal = document.getElementById('btnDeal');
        const btnHit = document.getElementById('btnHit');
        const btnStand = document.getElementById('btnStand');
        const bjPlayAgainBtn = document.getElementById('bjPlayAgainBtn');

        if (bjBetHalf) {
            bjBetHalf.addEventListener('click', () => this.adjustBet(0.5));
        }

        if (bjBetDouble) {
            bjBetDouble.addEventListener('click', () => this.adjustBet(2));
        }

        if (btnDeal) {
            btnDeal.addEventListener('click', () => this.deal());
        }

        if (btnHit) {
            btnHit.addEventListener('click', () => this.hit());
        }

        if (btnStand) {
            btnStand.addEventListener('click', () => this.stand());
        }

        if (bjPlayAgainBtn) {
            bjPlayAgainBtn.addEventListener('click', () => this.resetUI());
        }
    }

    adjustBet(multiplier) {
        if (this.app.maintenanceMode) return;
        
        const betInput = document.getElementById('bjBetInput');
        if (!betInput) return;
        
        const currentBet = parseFloat(betInput.value) || 50;
        let newBet = currentBet * multiplier;
        
        // Round to nearest whole number
        newBet = Math.round(newBet);
        
        // Ensure within limits
        newBet = Math.max(1, Math.min(newBet, this.app.auth.getBalance()));
        
        betInput.value = newBet;
        soundManager.play('click');
    }

    deal() {
        if (!this.app.checkMaintenance()) return;
        
        if (!this.app.auth.isLoggedIn()) {
            this.app.showToast('Please login to play', 'error');
            return;
        }

        if (this.bjInProgress) return;

        const betInput = document.getElementById('bjBetInput');
        const bet = parseFloat(betInput.value);

        if (isNaN(bet) || bet <= 0) return;
        if (bet > this.app.auth.getBalance()) {
            this.app.showToast('Insufficient funds', 'error');
            return;
        }

        soundManager.play('click');
        
        // Deduct bet
        const newBalance = this.app.auth.getBalance() - bet;
        this.app.auth.setBalance(newBalance);
        this.app.recordWager(bet);
        
        this.bjBet = bet;

        // Create and shuffle deck
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        let deck = [];

        for (let s of suits) {
            for (let v of values) {
                deck.push({
                    suit: s,
                    value: v,
                    color: (s === '♥' || s === '♦') ? 'text-red-500' : 'text-black'
                });
            }
        }

        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        this.bjDeck = deck;
        this.bjPlayerHand = [];
        this.bjDealerHand = [];

        // Clear hands
        const dealerHand = document.getElementById('dealerHand');
        const playerHand = document.getElementById('playerHand');
        const dealerScore = document.getElementById('dealerScore');
        const playerScore = document.getElementById('playerScore');
        const bjGameStatus = document.getElementById('bjGameStatus');

        if (dealerHand) dealerHand.innerHTML = '';
        if (playerHand) playerHand.innerHTML = '';
        if (dealerScore) dealerScore.textContent = '0';
        if (playerScore) playerScore.textContent = '0';
        if (bjGameStatus) bjGameStatus.textContent = 'Place your bet and deal!';

        // Update UI
        const btnDeal = document.getElementById('btnDeal');
        const bjActions = document.getElementById('bjActions');
        const betInputElement = document.getElementById('bjBetInput');

        if (btnDeal) btnDeal.classList.add('hidden');
        if (bjActions) {
            bjActions.classList.remove('hidden');
            bjActions.classList.add('flex');
        }
        if (betInputElement) betInputElement.disabled = true;

        this.bjInProgress = true;
        this.bjSettled = false;
        this.bjStandCalled = false;

        // Deal initial cards with animation delays
        setTimeout(() => {
            this.dealCardToPlayer();
            soundManager.play('card');
        }, 0);

        setTimeout(() => {
            this.dealCardToDealer(true); // First dealer card face down
            soundManager.play('card');
        }, 400);

        setTimeout(() => {
            this.dealCardToPlayer();
            soundManager.play('card');
        }, 800);

        setTimeout(() => {
            this.dealCardToDealer(false); // Second dealer card face up
            soundManager.play('card');
            
            // Update scores after all cards are dealt
            setTimeout(() => {
                this.updateScores(true);
                
                // Check for blackjack
                if (this.calculateScore(this.bjPlayerHand) === 21) {
                    this.stand();
                }
            }, 300);
        }, 1200);
    }

    dealCardToPlayer(faceUp = true) {
        if (this.bjDeck.length === 0) return;
        
        const card = this.bjDeck.pop();
        this.bjPlayerHand.push(card);
        
        const handElement = document.getElementById('playerHand');
        const cardElement = this.createCardElement(card, faceUp);
        cardElement.style.animation = 'card-deal 0.5s ease-out forwards';
        
        if (handElement) {
            handElement.appendChild(cardElement);
        }
    }

    dealCardToDealer(faceDown = false) {
        if (this.bjDeck.length === 0) return;
        
        const card = this.bjDeck.pop();
        this.bjDealerHand.push(card);
        
        const handElement = document.getElementById('dealerHand');
        const cardElement = this.createCardElement(card, !faceDown);
        if (faceDown) {
            cardElement.querySelector('.game-card-item').classList.add('flipped');
            cardElement.id = 'dealerHiddenCard';
        }
        cardElement.style.animation = 'card-deal 0.5s ease-out forwards';
        
        if (handElement) {
            handElement.appendChild(cardElement);
        }
    }

    createCardElement(card, faceUp = true) {
        const container = document.createElement('div');
        container.className = 'card-container';
        
        const cardItem = document.createElement('div');
        cardItem.className = `game-card-item ${!faceUp ? 'flipped' : ''}`;
        
        const cardFace = document.createElement('div');
        cardFace.className = 'card-face';
        cardFace.innerHTML = `
            <div class="text-sm md:text-lg font-bold leading-none ${card.color}">${card.value}<br><span class="text-xs">${card.suit}</span></div>
            <div class="card-value ${card.color} text-3xl md:text-5xl">${card.suit}</div>
            <div class="text-sm md:text-lg font-bold leading-none ${card.color} rotate-180">${card.value}<br><span class="text-xs">${card.suit}</span></div>
        `;
        
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        
        cardItem.appendChild(cardFace);
        cardItem.appendChild(cardBack);
        container.appendChild(cardItem);
        
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

        // Adjust for aces if over 21
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }

        return score;
    }

    updateScores(hideDealerScore = false) {
        const playerScore = this.calculateScore(this.bjPlayerHand);
        const playerScoreElement = document.getElementById('playerScore');
        if (playerScoreElement) {
            playerScoreElement.textContent = playerScore;
        }

        const dealerScoreElement = document.getElementById('dealerScore');
        if (dealerScoreElement) {
            if (hideDealerScore && this.bjDealerHand.length > 0) {
                // Only show first card's value for dealer
                const firstCard = this.bjDealerHand[0];
                let dealerVisibleScore = 0;
                
                if (['J', 'Q', 'K'].includes(firstCard.value)) {
                    dealerVisibleScore = 10;
                } else if (firstCard.value === 'A') {
                    dealerVisibleScore = 11;
                } else {
                    dealerVisibleScore = parseInt(firstCard.value);
                }
                
                dealerScoreElement.textContent = dealerVisibleScore;
            } else {
                const dealerScore = this.calculateScore(this.bjDealerHand);
                dealerScoreElement.textContent = dealerScore;
            }
        }
    }

    hit() {
        if (!this.bjInProgress || this.bjSettled || this.bjStandCalled) return;

        soundManager.play('card');
        this.dealCardToPlayer();
        
        setTimeout(() => {
            this.updateScores(true);
            const playerScore = this.calculateScore(this.bjPlayerHand);
            
            if (playerScore > 21) {
                this.endGame('BUSTED', 'loss');
            }
        }, 300);
    }

    stand() {
        if (!this.bjInProgress || this.bjSettled || this.bjStandCalled) return;

        this.bjStandCalled = true;
        const bjActions = document.getElementById('bjActions');
        if (bjActions) {
            bjActions.classList.add('hidden');
            bjActions.classList.remove('flex');
        }

        // Reveal dealer's hidden card
        const hiddenCard = document.getElementById('dealerHiddenCard');
        if (hiddenCard) {
            setTimeout(() => {
                hiddenCard.querySelector('.game-card-item').classList.remove('flipped');
                soundManager.play('card');
                this.updateScores(false);
                this.dealerPlay();
            }, 500);
        }
    }

    dealerPlay() {
        const dealerScore = this.calculateScore(this.bjDealerHand);
        
        if (dealerScore >= 17) {
            setTimeout(() => {
                this.determineWinner();
            }, 1000);
        } else {
            // Dealer hits
            setTimeout(() => {
                this.dealCardToDealer(false);
                soundManager.play('card');
                
                setTimeout(() => {
                    this.updateScores(false);
                    this.dealerPlay();
                }, 500);
            }, 1000);
        }
    }

    determineWinner() {
        const playerScore = this.calculateScore(this.bjPlayerHand);
        const dealerScore = this.calculateScore(this.bjDealerHand);

        // Security validation
        if (!this.app.security.checkBeforeGameAction('blackjack', 'result', {
            playerScore: playerScore,
            dealerScore: dealerScore,
            result: '' // Will be set below
        })) {
            return;
        }

        if (playerScore > 21) {
            this.endGame('BUSTED', 'loss');
        } else if (dealerScore > 21) {
            this.endGame('DEALER BUSTED', 'win');
        } else if (playerScore > dealerScore) {
            this.endGame('YOU WIN', 'win');
        } else if (playerScore < dealerScore) {
            this.endGame('DEALER WINS', 'loss');
        } else {
            this.endGame('PUSH', 'push');
        }
    }

    endGame(message, result) {
        this.bjSettled = true;
        this.bjInProgress = false;

        const overlay = document.getElementById('bjOverlay');
        const messageEl = document.getElementById('bjMessage');
        const payoutEl = document.getElementById('bjPayout');

        setTimeout(() => {
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
            }
            
            if (messageEl) {
                messageEl.textContent = message;
                
                switch(result) {
                    case 'win':
                        messageEl.style.color = '#10b981';
                        break;
                    case 'loss':
                        messageEl.style.color = '#ef4444';
                        break;
                    case 'push':
                        messageEl.style.color = '#f59e0b';
                        break;
                }
            }

            let winAmount = 0;
            
            switch(result) {
                case 'win':
                    winAmount = this.bjBet * 2;
                    const newBalance = this.app.auth.getBalance() + winAmount;
                    this.app.auth.setBalance(newBalance);
                    this.app.recordWin(this.bjBet, 'Blackjack');
                    
                    if (payoutEl) {
                        payoutEl.textContent = `+${winAmount} coins`;
                        payoutEl.style.color = '#10b981';
                    }
                    soundManager.play('win');
                    
                    // Special effects for big wins
                    if (this.bjBet >= 100000) {
                        // Purple confetti for 100k+ wins
                        confetti({
                            particleCount: 300,
                            spread: 100,
                            origin: { y: 0.6 },
                            colors: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6']
                        });
                        
                        // Show global alert for 200k+ wins
                        if (this.bjBet >= 200000) {
                            this.app.showGlobalAlert(`${this.app.auth.getUsername()} won ${winAmount.toLocaleString()} coins playing Blackjack!`, 'purple');
                        }
                    } else if (this.bjBet >= 10000) {
                        // Gold confetti for 10k+ wins
                        confetti({
                            particleCount: 200,
                            spread: 90,
                            origin: { y: 0.6 },
                            colors: ['#f59e0b', '#d97706', '#b45309']
                        });
                    }
                    break;
                    
                case 'push':
                    winAmount = this.bjBet;
                    const pushBalance = this.app.auth.getBalance() + winAmount;
                    this.app.auth.setBalance(pushBalance);
                    
                    if (payoutEl) {
                        payoutEl.textContent = 'Bet returned';
                        payoutEl.style.color = '#f59e0b';
                    }
                    break;
                    
                case 'loss':
                    this.app.recordLoss(this.bjBet, 'Blackjack');
                    
                    if (payoutEl) {
                        payoutEl.textContent = `-${this.bjBet} coins`;
                        payoutEl.style.color = '#ef4444';
                    }
                    soundManager.play('lose');
                    break;
            }

            const bjGameStatus = document.getElementById('bjGameStatus');
            if (bjGameStatus) {
                bjGameStatus.textContent = message;
            }
        }, 1000);
    }

    resetUI() {
        const overlay = document.getElementById('bjOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }

        const dealerHand = document.getElementById('dealerHand');
        const playerHand = document.getElementById('playerHand');
        const dealerScore = document.getElementById('dealerScore');
        const playerScore = document.getElementById('playerScore');
        const bjGameStatus = document.getElementById('bjGameStatus');

        if (dealerHand) dealerHand.innerHTML = '';
        if (playerHand) playerHand.innerHTML = '';
        if (dealerScore) dealerScore.textContent = '0';
        if (playerScore) playerScore.textContent = '0';
        if (bjGameStatus) bjGameStatus.textContent = 'Place your bet and deal!';

        const btnDeal = document.getElementById('btnDeal');
        const bjActions = document.getElementById('bjActions');
        const betInput = document.getElementById('bjBetInput');

        if (btnDeal) btnDeal.classList.remove('hidden');
        if (bjActions) {
            bjActions.classList.add('hidden');
            bjActions.classList.remove('flex');
        }
        if (betInput) betInput.disabled = false;

        this.bjInProgress = false;
        this.bjSettled = false;
        this.bjStandCalled = false;
        soundManager.play('click');
    }

    // Clean up on game exit
    cleanup() {
        this.bjInProgress = false;
        this.bjSettled = false;
        this.bjStandCalled = false;
    }
}

window.BlackjackGame = BlackjackGame;
