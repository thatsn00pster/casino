import { database } from './firebase.js';

class AuthManager {
    constructor(app) {
        this.app = app;
        this.user = null;
        this.userId = '';
        this.username = '';
        this.balance = 500;
        this.lastFreeCoinsClaim = 0;
        this.freeCoinsCooldown = 0;
        this.isAuthenticated = false;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const showSignupBtn = document.getElementById('showSignupBtn');
        const showLoginBtn = document.getElementById('showLoginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const logoBtn = document.getElementById('logoBtn');

        if (loginBtn) loginBtn.addEventListener('click', () => this.login());
        if (signupBtn) signupBtn.addEventListener('click', () => this.signup());
        if (showSignupBtn) showSignupBtn.addEventListener('click', () => this.showSignup());
        if (showLoginBtn) showLoginBtn.addEventListener('click', () => this.showLogin());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
        if (logoBtn) logoBtn.addEventListener('click', () => this.app.loadGame('home'));

        // Enter key for forms
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const signupUsername = document.getElementById('signupUsername');
        const signupEmail = document.getElementById('signupEmail');
        const signupPassword = document.getElementById('signupPassword');

        if (loginEmail && loginPassword) {
            loginPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.login();
            });
        }

        if (signupPassword) {
            signupPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.signup();
            });
        }
    }

    async checkAuth() {
        const savedUser = localStorage.getItem('moonCasinoUser');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                
                // Check session validity
                if (!await this.validateSession(user.userId)) {
                    this.logout();
                    this.app.showToast('Session expired. Please login again.', 'warning');
                    return;
                }
                
                // Check if user still exists
                const userSnapshot = await database.ref('users/' + user.userId).once('value');
                if (!userSnapshot.exists()) {
                    this.logout();
                    this.app.showToast('Account no longer exists', 'error');
                    return;
                }
                
                const userData = userSnapshot.val();
                this.userId = user.userId;
                this.username = userData.username;
                this.balance = parseInt(userData.balance) || 500;
                this.lastFreeCoinsClaim = userData.lastFreeCoins || 0;
                this.freeCoinsCooldown = userData.freeCoinsCooldown || 0;
                this.isAuthenticated = true;
                
                this.updateUI();
                this.hideAuthModal();
                this.app.updateOnlineStatus();
                this.app.setupRealTimeBalance();
                
            } catch (e) {
                console.error('Auth error:', e);
                this.showAuthModal();
            }
        } else {
            this.showAuthModal();
        }
    }

    async validateSession(userId) {
        try {
            const sessionRef = database.ref('sessions/' + userId);
            const snapshot = await sessionRef.once('value');
            const sessionData = snapshot.val();
            
            if (!sessionData) return false;
            
            // Check if session is expired (24 hours)
            const now = Date.now();
            if (now - sessionData.createdAt > 24 * 60 * 60 * 1000) {
                await sessionRef.remove();
                return false;
            }
            
            // Update last activity
            await sessionRef.update({ lastActivity: now });
            return true;
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }

    showAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.classList.add('active');
        }
    }

    hideAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.classList.remove('active');
        }
    }

    showSignup() {
        if (this.app.maintenanceMode) return;
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.remove('hidden');
        this.app.playSound('click');
    }

    showLogin() {
        if (this.app.maintenanceMode) return;
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        this.app.playSound('click');
    }

    async signup() {
        if (this.app.maintenanceMode) {
            this.app.showToast('Signup disabled during maintenance', 'error');
            return;
        }

        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!username || !email || !password) {
            this.app.showToast('Please fill all fields', 'error');
            return;
        }

        if (username.length < 3) {
            this.app.showToast('Username must be at least 3 characters', 'error');
            return;
        }

        if (password.length < 6) {
            this.app.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        // Check if username already exists
        const usernameSnapshot = await database.ref('users').orderByChild('username').equalTo(username).once('value');
        if (usernameSnapshot.exists()) {
            this.app.showToast('Username already taken', 'error');
            return;
        }

        // Check if email already exists
        const emailSnapshot = await database.ref('users').orderByChild('email').equalTo(email).once('value');
        if (emailSnapshot.exists()) {
            this.app.showToast('Email already registered', 'error');
            return;
        }

        // Create user
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const userData = {
            userId,
            username,
            email,
            password: btoa(password), // Basic encoding (not secure for production!)
            balance: 500,
            createdAt: Date.now(),
            lastFreeCoins: 0,
            freeCoinsCooldown: 0,
            totalWins: 0,
            totalLosses: 0,
            biggestWin: 0,
            wageredToday: 0,
            wageredWeek: 0,
            wageredLifetime: 0,
            wonToday: 0,
            lastWagered: Date.now()
        };

        await database.ref('users/' + userId).set(userData);

        // Create session
        await database.ref('sessions/' + userId).set({
            userId: userId,
            createdAt: Date.now(),
            lastActivity: Date.now()
        });

        // Save locally
        localStorage.setItem('moonCasinoUser', JSON.stringify({ userId, username }));

        this.userId = userId;
        this.username = username;
        this.balance = 500;
        this.lastFreeCoinsClaim = 0;
        this.freeCoinsCooldown = 0;
        this.isAuthenticated = true;

        this.updateUI();
        this.hideAuthModal();
        this.app.showToast('Welcome to Moon Casino! You received 500 starting coins!', 'success');
        this.app.playSound('win');
        this.app.updateOnlineStatus();
        this.app.setupRealTimeBalance();
        
        // Confetti for new user
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    async login() {
        if (this.app.maintenanceMode) {
            this.app.showToast('Login disabled during maintenance', 'error');
            return;
        }

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.app.showToast('Please fill all fields', 'error');
            return;
        }

        // Find user by email
        const snapshot = await database.ref('users').orderByChild('email').equalTo(email).once('value');

        if (!snapshot.exists()) {
            this.app.showToast('User not found', 'error');
            return;
        }

        let userFound = null;
        snapshot.forEach(child => {
            const user = child.val();
            if (atob(user.password) === password) {
                userFound = user;
            }
        });

        if (!userFound) {
            this.app.showToast('Invalid password', 'error');
            return;
        }

        // Update session
        await database.ref('sessions/' + userFound.userId).set({
            userId: userFound.userId,
            createdAt: Date.now(),
            lastActivity: Date.now()
        });

        // Save locally
        localStorage.setItem('moonCasinoUser', JSON.stringify({
            userId: userFound.userId,
            username: userFound.username
        }));

        this.userId = userFound.userId;
        this.username = userFound.username;
        this.balance = userFound.balance || 500;
        this.lastFreeCoinsClaim = userFound.lastFreeCoins || 0;
        this.freeCoinsCooldown = userFound.freeCoinsCooldown || 0;
        this.isAuthenticated = true;

        this.updateUI();
        this.hideAuthModal();
        this.app.showToast(`Welcome back ${this.username}!`, 'success');
        this.app.playSound('win');
        this.app.updateOnlineStatus();
        this.app.setupRealTimeBalance();
    }

    logout() {
        localStorage.removeItem('moonCasinoUser');
        
        // Remove from online users
        if (this.userId) {
            database.ref('online/' + this.userId).remove();
        }
        
        // Remove session
        if (this.userId) {
            database.ref('sessions/' + this.userId).remove();
        }
        
        this.userId = '';
        this.username = '';
        this.balance = 500;
        this.isAuthenticated = false;
        
        this.showAuthModal();
        this.updateUI();
        this.app.showToast('Logged out successfully', 'warning');
        
        // Clear any active games
        this.app.resetAllGames();
    }

    updateUI() {
        document.getElementById('loggedUsername').textContent = this.username || 'Guest';
        document.getElementById('userIdDisplay').textContent = this.userId || 'Not logged in';
        document.getElementById('userAvatar').textContent = this.username ? this.username.charAt(0).toUpperCase() : 'U';
        
        // Update balance display
        const balanceDisplay = document.getElementById('balanceDisplay');
        if (balanceDisplay) {
            balanceDisplay.textContent = this.balance.toLocaleString();
        }
        
        const modalBalance = document.getElementById('modalBalance');
        if (modalBalance) {
            modalBalance.textContent = this.balance.toLocaleString();
        }
    }

    // Getter methods
    getUserId() {
        return this.userId;
    }

    getUsername() {
        return this.username;
    }

    getBalance() {
        return this.balance;
    }

    setBalance(newBalance) {
        this.balance = newBalance;
        this.updateUI();
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }
}

export { AuthManager };