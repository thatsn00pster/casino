// Authentication System
class AuthSystem {
    constructor(app) {
        this.app = app;
        this.user = null;
        this.sessionId = null;
    }

    async initialize() {
        await this.checkExistingSession();
        this.setupSessionMonitoring();
    }

    async checkExistingSession() {
        try {
            const sessionData = localStorage.getItem('moonCasinoSession');
            if (!sessionData) {
                this.app.showAuthModal();
                return;
            }

            const { userId, sessionId, timestamp } = JSON.parse(sessionData);
            
            // Check if session is expired
            if (Date.now() - timestamp > GAME_CONSTANTS.SECURITY.sessionTimeout) {
                this.logout();
                this.app.showToast('Session expired. Please login again.', 'warning');
                return;
            }

            // Verify session with server
            const sessionRef = database.ref(`sessions/${userId}/${sessionId}`);
            const snapshot = await sessionRef.once('value');
            
            if (!snapshot.exists()) {
                this.logout();
                this.app.showToast('Invalid session. Please login again.', 'error');
                return;
            }

            // Load user data
            await this.loadUserData(userId);
            this.sessionId = sessionId;
            
        } catch (error) {
            console.error('Session check error:', error);
            this.app.showAuthModal();
        }
    }

    async loadUserData(userId) {
        try {
            const userRef = database.ref(`users/${userId}`);
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                this.logout();
                this.app.showToast('User not found', 'error');
                return;
            }

            const userData = snapshot.val();
            this.user = {
                id: userId,
                username: userData.username,
                email: userData.email,
                balance: userData.balance || 500,
                createdAt: userData.createdAt,
                stats: {
                    totalWins: userData.totalWins || 0,
                    totalLosses: userData.totalLosses || 0,
                    biggestWin: userData.biggestWin || 0,
                    wageredToday: userData.wageredToday || 0,
                    wageredLifetime: userData.wageredLifetime || 0
                }
            };

            this.app.user = this.user;
            this.app.balance = this.user.balance;
            this.app.username = this.user.username;
            this.app.userId = userId;
            
            this.app.updateUI();
            this.app.hideAuthModal();
            this.app.setupRealTimeBalance();
            
        } catch (error) {
            console.error('Load user error:', error);
            this.app.showToast('Error loading user data', 'error');
        }
    }

    async signup(username, email, password) {
        try {
            // Server-side validation
            const validation = await this.validateSignup(username, email, password);
            if (!validation.valid) {
                this.app.showToast(validation.message, 'error');
                return;
            }

            // Create user with server-generated ID
            const userId = this.generateUserId();
            const sessionId = this.generateSessionId();
            
            const userData = {
                userId,
                username,
                email,
                password: this.hashPassword(password),
                balance: 500,
                createdAt: Date.now(),
                lastFreeCoins: 0,
                totalWins: 0,
                totalLosses: 0,
                biggestWin: 0,
                wageredToday: 0,
                wageredWeek: 0,
                wageredLifetime: 0,
                wonToday: 0,
                lastWagered: Date.now(),
                isActive: true,
                lastSeen: Date.now()
            };

            // Create session
            const sessionData = {
                sessionId,
                userId,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                ip: await this.getClientIP(),
                userAgent: navigator.userAgent
            };

            // Use transaction to ensure atomic operations
            const updates = {};
            updates[`users/${userId}`] = userData;
            updates[`sessions/${userId}/${sessionId}`] = sessionData;
            updates[`usernames/${username}`] = userId;
            updates[`emails/${email.replace(/\./g, '_')}`] = userId;

            await database.ref().update(updates);

            // Save session locally
            this.saveSession(userId, sessionId);
            
            // Load user data
            await this.loadUserData(userId);
            
            this.app.showToast('Welcome to Moon Casino!', 'success');
            this.app.playSound('win');
            
            // Confetti for new user
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });

        } catch (error) {
            console.error('Signup error:', error);
            this.app.showToast('Registration failed. Please try again.', 'error');
        }
    }

    async login(email, password) {
        try {
            // Find user by email
            const emailKey = email.replace(/\./g, '_');
            const emailRef = database.ref(`emails/${emailKey}`);
            const emailSnapshot = await emailRef.once('value');
            
            if (!emailSnapshot.exists()) {
                this.app.showToast('User not found', 'error');
                return;
            }

            const userId = emailSnapshot.val();
            const userRef = database.ref(`users/${userId}`);
            const userSnapshot = await userRef.once('value');
            
            if (!userSnapshot.exists()) {
                this.app.showToast('User not found', 'error');
                return;
            }

            const userData = userSnapshot.val();
            const hashedPassword = this.hashPassword(password);
            
            if (userData.password !== hashedPassword) {
                this.app.showToast('Invalid password', 'error');
                return;
            }

            // Create new session
            const sessionId = this.generateSessionId();
            const sessionData = {
                sessionId,
                userId,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                ip: await this.getClientIP(),
                userAgent: navigator.userAgent
            };

            // Update user as active
            await database.ref(`users/${userId}`).update({
                isActive: true,
                lastSeen: Date.now()
            });

            // Save session
            await database.ref(`sessions/${userId}/${sessionId}`).set(sessionData);
            
            // Save session locally
            this.saveSession(userId, sessionId);
            
            // Load user data
            await this.loadUserData(userId);
            
            this.app.showToast(`Welcome back ${userData.username}!`, 'success');
            this.app.playSound('win');

        } catch (error) {
            console.error('Login error:', error);
            this.app.showToast('Login failed. Please try again.', 'error');
        }
    }

    async logout() {
        if (this.user && this.sessionId) {
            // Remove session from server
            await database.ref(`sessions/${this.user.id}/${this.sessionId}`).remove();
            
            // Update user as inactive
            await database.ref(`users/${this.user.id}`).update({
                isActive: false,
                lastSeen: Date.now()
            });
        }

        // Clear local storage
        localStorage.removeItem('moonCasinoSession');
        
        // Reset app state
        this.user = null;
        this.sessionId = null;
        this.app.user = null;
        this.app.balance = 500;
        this.app.username = '';
        this.app.userId = '';
        
        this.app.showAuthModal();
        this.app.showToast('Logged out successfully', 'warning');
    }

    async validateSignup(username, email, password) {
        // Basic validation
        if (!username || !email || !password) {
            return { valid: false, message: 'Please fill all fields' };
        }

        if (username.length < 3 || username.length > 20) {
            return { valid: false, message: 'Username must be 3-20 characters' };
        }

        if (!this.isValidEmail(email)) {
            return { valid: false, message: 'Invalid email address' };
        }

        if (password.length < 6) {
            return { valid: false, message: 'Password must be at least 6 characters' };
        }

        // Check if username exists
        const usernameRef = database.ref(`usernames/${username}`);
        const usernameSnapshot = await usernameRef.once('value');
        if (usernameSnapshot.exists()) {
            return { valid: false, message: 'Username already taken' };
        }

        // Check if email exists
        const emailKey = email.replace(/\./g, '_');
        const emailRef = database.ref(`emails/${emailKey}`);
        const emailSnapshot = await emailRef.once('value');
        if (emailSnapshot.exists()) {
            return { valid: false, message: 'Email already registered' };
        }

        return { valid: true, message: 'Validation passed' };
    }

    // Utility methods
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
    }

    hashPassword(password) {
        // Simple hash for demo - use proper hashing in production
        return btoa(password + 'moon_casino_salt_2024');
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    saveSession(userId, sessionId) {
        const sessionData = {
            userId,
            sessionId,
            timestamp: Date.now()
        };
        localStorage.setItem('moonCasinoSession', JSON.stringify(sessionData));
    }

    async getClientIP() {
        // Simplified IP detection - in production, use proper IP detection
        return 'local_' + Math.random().toString(36).substr(2, 8);
    }

    setupSessionMonitoring() {
        // Monitor session activity
        setInterval(async () => {
            if (this.user && this.sessionId) {
                await database.ref(`sessions/${this.user.id}/${this.sessionId}`).update({
                    lastActivity: Date.now()
                });
                
                await database.ref(`users/${this.user.id}`).update({
                    lastSeen: Date.now()
                });
            }
        }, 30000); // Update every 30 seconds
    }
}

// Export for use in main app
window.AuthSystem = AuthSystem;
