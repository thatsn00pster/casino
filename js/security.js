
const database = window.database;

class SecurityManager {
    constructor(app) {
        this.app = app;
        this.lastRequestTime = Date.now();
        this.requestCount = 0;
        this.maxRequestsPerSecond = 10;
        this.cheatAttempts = 0;
        this.maxCheatAttempts = 5;
        this.isMonitoring = false;
        this.debugMode = false;
        
        // Store original fetch/XMLHttpRequest
        this.originalFetch = window.fetch;
        this.originalXHROpen = XMLHttpRequest.prototype.open;
        this.originalXHRSend = XMLHttpRequest.prototype.send;
    }

    initialize() {
        this.startMonitoring();
        this.injectSecurityChecks();
        this.setupEventListeners();
        
        if (this.debugMode) {
            console.log("Security system initialized");
        }
    }

    startMonitoring() {
        this.isMonitoring = true;
        
        // Monitor request rate
        setInterval(() => {
            this.requestCount = 0;
        }, 1000);
        
        // Monitor DOM changes (anti-tampering)
        this.setupDOMMonitoring();
        
        // Monitor console (basic anti-debugging)
        this.setupConsoleMonitoring();
    }

    injectSecurityChecks() {
        // Override fetch to monitor all API calls
        window.fetch = async (...args) => {
            if (!this.checkRateLimit()) {
                throw new Error("Rate limit exceeded");
            }
            
            const startTime = Date.now();
            const response = await this.originalFetch(...args);
            const endTime = Date.now();
            
            // Check for suspiciously fast responses (cached/mocked)
            if (endTime - startTime < 50) {
                this.logSuspiciousActivity("Fast response time detected");
            }
            
            return response;
        };

        // Override XMLHttpRequest
        const self = this;
        XMLHttpRequest.prototype.open = function(...args) {
            if (!self.checkRateLimit()) {
                throw new Error("Rate limit exceeded");
            }
            return self.originalXHROpen.apply(this, args);
        };

        XMLHttpRequest.prototype.send = function(...args) {
            const startTime = Date.now();
            this.addEventListener('loadend', () => {
                const endTime = Date.now();
                if (endTime - startTime < 50) {
                    self.logSuspiciousActivity("Fast XHR response detected");
                }
            });
            return self.originalXHRSend.apply(this, args);
        };
    }

    setupDOMMonitoring() {
        // Monitor for DOM changes that might indicate cheating
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    // Check for balance attribute changes that weren't made by the app
                    if (mutation.attributeName === 'data-balance' || 
                        mutation.target.id === 'balanceDisplay') {
                        this.logSuspiciousActivity("Unauthorized balance display change");
                    }
                }
                
                // Check for script injection
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'SCRIPT' && 
                            !node.src.includes('firebase') && 
                            !node.src.includes('cdn')) {
                            this.logSuspiciousActivity("Potential script injection detected");
                            node.remove();
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['data-balance', 'id']
        });
    }

    setupConsoleMonitoring() {
        // Basic anti-debugging
        const consoleMethods = ['log', 'warn', 'error', 'info', 'debug'];
        const originalMethods = {};
        
        consoleMethods.forEach(method => {
            originalMethods[method] = console[method];
            console[method] = function(...args) {
                // Check for attempts to log sensitive data
                const argsString = args.join(' ');
                if (argsString.includes('balance') || 
                    argsString.includes('cheat') || 
                    argsString.includes('hack') ||
                    argsString.includes('override') ||
                    argsString.includes('inject')) {
                    this.logSuspiciousActivity(`Suspicious console.${method}: ${argsString}`);
                }
                return originalMethods[method].apply(console, args);
            };
        });

        // Prevent opening dev tools (basic)
        document.addEventListener('keydown', (e) => {
            // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'u')) {
                e.preventDefault();
                this.logSuspiciousActivity("Dev tools access attempt");
                return false;
            }
        });

        // Detect dev tools being opened
        const element = new Image();
        Object.defineProperty(element, 'id', {
            get: () => {
                this.logSuspiciousActivity("Dev tools detection");
                return '';
            }
        });
        
        // Prevent right-click and inspect
        document.addEventListener('contextmenu', (e) => {
            if (this.debugMode) return;
            e.preventDefault();
            this.logSuspiciousActivity("Right-click attempt");
            return false;
        });

        // Prevent text selection (can interfere with games)
        document.addEventListener('selectstart', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            e.preventDefault();
            return false;
        });
    }

    setupEventListeners() {
        // Monitor for rapid clicking (auto-clickers)
        let lastClickTime = 0;
        let clickCount = 0;
        
        document.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - lastClickTime < 50) { // Less than 50ms between clicks
                clickCount++;
                if (clickCount > 10) {
                    this.logSuspiciousActivity("Possible auto-clicker detected");
                    clickCount = 0;
                }
            } else {
                clickCount = 0;
            }
            lastClickTime = now;
        });

        // Monitor keyboard macros
        let keySequence = [];
        document.addEventListener('keydown', (e) => {
            keySequence.push(e.key);
            if (keySequence.length > 10) {
                keySequence.shift();
            }
            
            // Check for common cheat codes/macros
            const sequenceStr = keySequence.join('');
            if (sequenceStr.includes('iddqd') || // Doom god mode
                sequenceStr.includes('idkfa') || // Doom all weapons
                sequenceStr.includes('rosebud') || // Sims money cheat
                sequenceStr.includes('motherlode')) { // Sims money cheat
                this.logSuspiciousActivity("Cheat code sequence detected");
                keySequence = [];
            }
        });
    }

    checkRateLimit() {
        const now = Date.now();
        if (now - this.lastRequestTime < 100) {
            this.requestCount++;
            if (this.requestCount > this.maxRequestsPerSecond) {
                this.logSuspiciousActivity("Rate limit exceeded");
                return false;
            }
        } else {
            this.requestCount = 1;
            this.lastRequestTime = now;
        }
        return true;
    }

    validateGameResult(game, result, expectedRange) {
        // Validate that game results are within expected ranges
        if (result < expectedRange.min || result > expectedRange.max) {
            this.logSuspiciousActivity(`Suspicious game result in ${game}: ${result}`);
            return false;
        }
        return true;
    }

    validateBalanceChange(oldBalance, newBalance, expectedChange, operation) {
        const actualChange = newBalance - oldBalance;
        const tolerance = 0.01; // 1% tolerance for rounding errors
        
        if (Math.abs(actualChange - expectedChange) > tolerance) {
            this.logSuspiciousActivity(`Invalid balance change in ${operation}: expected ${expectedChange}, got ${actualChange}`);
            return false;
        }
        return true;
    }

    logSuspiciousActivity(message) {
        this.cheatAttempts++;
        
        if (this.debugMode) {
            console.warn(`[SECURITY] ${message} (Attempt ${this.cheatAttempts}/${this.maxCheatAttempts})`);
        }
        
        // Log to server if available
        if (this.app.userId && database) {
            try {
                database.ref('security_logs/' + Date.now()).set({
                    userId: this.app.userId,
                    username: this.app.username,
                    message: message,
                    timestamp: Date.now(),
                    attempts: this.cheatAttempts
                });
            } catch (e) {
                console.error("Failed to log security event:", e);
            }
        }
        
        // Take action if too many attempts
        if (this.cheatAttempts >= this.maxCheatAttempts) {
            this.takeAction();
        }
    }

    takeAction() {
        // Progressive actions based on severity
        const actions = [
            () => this.app.showToast("Security violation detected. Please play fair.", "warning"),
            () => this.app.showToast("Multiple violations detected. Your actions are being logged.", "error"),
            () => {
                this.app.showToast("Serious violations detected. Game suspended temporarily.", "error");
                // Disable games for 5 minutes
                setTimeout(() => {
                    this.cheatAttempts = 0;
                }, 5 * 60 * 1000);
            },
            () => {
                this.app.showToast("Account suspended due to cheating.", "error");
                this.app.logout();
            }
        ];
        
        const actionIndex = Math.min(this.cheatAttempts - 1, actions.length - 1);
        if (actions[actionIndex]) {
            actions[actionIndex]();
        }
    }

    // Game-specific validation methods
    validateMinesGame(minesCount, revealedCount, winAmount) {
        const maxMines = 24;
        const maxTiles = 25;
        
        if (minesCount < 1 || minesCount > maxMines) {
            this.logSuspiciousActivity(`Invalid mines count: ${minesCount}`);
            return false;
        }
        
        if (revealedCount < 0 || revealedCount > (maxTiles - minesCount)) {
            this.logSuspiciousActivity(`Invalid revealed count: ${revealedCount}`);
            return false;
        }
        
        // Validate win amount using proper formula
        const expectedMaxWin = this.calculateMinesMultiplier(minesCount, maxTiles - minesCount);
        if (winAmount > expectedMaxWin * 1.1) { // 10% tolerance
            this.logSuspiciousActivity(`Suspicious mines win amount: ${winAmount}`);
            return false;
        }
        
        return true;
    }

    calculateMinesMultiplier(mines, revealed) {
        let multiplier = 1.0;
        for (let i = 0; i < revealed; i++) multiplier *= (25 - i) / (25 - mines - i);
        return multiplier;
    }

    validateChickenGame(difficulty, step, multiplier) {
        const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
        const maxSteps = 30;
        
        if (!validDifficulties.includes(difficulty)) {
            this.logSuspiciousActivity(`Invalid chicken difficulty: ${difficulty}`);
            return false;
        }
        
        if (step < 0 || step > maxSteps) {
            this.logSuspiciousActivity(`Invalid chicken step: ${step}`);
            return false;
        }
        
        // Validate multiplier range
        const expectedMultipliers = CHICKEN_MULTIPLIERS[difficulty];
        if (step >= 0 && step < expectedMultipliers.length) {
            const expected = expectedMultipliers[step];
            const tolerance = 0.01; // 1% tolerance
            if (Math.abs(multiplier - expected) > tolerance) {
                this.logSuspiciousActivity(`Suspicious chicken multiplier: ${multiplier}, expected: ${expected}`);
                return false;
            }
        }
        
        return true;
    }

    validateCoinflipResult(choice, result, streak) {
        // Coinflip should be 50/50
        const validChoices = ['heads', 'tails'];
        const validResults = ['heads', 'tails'];
        
        if (!validChoices.includes(choice)) {
            this.logSuspiciousActivity(`Invalid coinflip choice: ${choice}`);
            return false;
        }
        
        if (!validResults.includes(result)) {
            this.logSuspiciousActivity(`Invalid coinflip result: ${result}`);
            return false;
        }
        
        // Check for unrealistic streaks
        const maxRealisticStreak = 15; // 1 in 32,768 chance
        if (streak > maxRealisticStreak) {
            this.logSuspiciousActivity(`Unrealistic coinflip streak: ${streak}`);
            return false;
        }
        
        return true;
    }

    validateBlackjackResult(playerScore, dealerScore, result) {
        const validResults = ['win', 'loss', 'push'];
        
        if (!validResults.includes(result)) {
            this.logSuspiciousActivity(`Invalid blackjack result: ${result}`);
            return false;
        }
        
        // Validate scores
        if (playerScore < 0 || playerScore > 21) {
            this.logSuspiciousActivity(`Invalid player score: ${playerScore}`);
            return false;
        }
        
        if (dealerScore < 0 || dealerScore > 21) {
            this.logSuspiciousActivity(`Invalid dealer score: ${dealerScore}`);
            return false;
        }
        
        // Validate result matches scores
        let expectedResult;
        if (playerScore > 21) {
            expectedResult = 'loss';
        } else if (dealerScore > 21) {
            expectedResult = 'win';
        } else if (playerScore > dealerScore) {
            expectedResult = 'win';
        } else if (playerScore < dealerScore) {
            expectedResult = 'loss';
        } else {
            expectedResult = 'push';
        }
        
        if (result !== expectedResult) {
            this.logSuspiciousActivity(`Blackjack result mismatch: ${result} vs expected ${expectedResult}`);
            return false;
        }
        
        return true;
    }

    // Method to be called by app
    checkBeforeGameAction(game, action, data) {
        if (!this.isMonitoring) return true;
        
        // Check rate limit
        if (!this.checkRateLimit()) {
            return false;
        }
        
        // Game-specific checks
        switch(game) {
            case 'mines':
                return this.validateMinesGame(
                    data.minesCount, 
                    data.revealedCount, 
                    data.winAmount
                );
            case 'chicken':
                return this.validateChickenGame(
                    data.difficulty,
                    data.step,
                    data.multiplier
                );
            case 'coinflip':
                return this.validateCoinflipResult(
                    data.choice,
                    data.result,
                    data.streak
                );
            case 'blackjack':
                return this.validateBlackjackResult(
                    data.playerScore,
                    data.dealerScore,
                    data.result
                );
            default:
                return true;
        }
    }
}

// Make class globally available
window.SecurityManager = SecurityManager;
