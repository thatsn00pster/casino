// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBLmhwz-ocTNaZwWchcpWl3N0hJMlsskts",
    authDomain: "nebula-48dbd.firebaseapp.com",
    databaseURL: "https://nebula-48dbd-default-rtdb.firebaseio.com",
    projectId: "nebula-48dbd",
    storageBucket: "nebula-48dbd.firebasestorage.app",
    messagingSenderId: "259199297883",
    appId: "1:259199297883:web:f84fe6b2fc2ca70015d27e",
    measurementId: "G-38CB3Y2T56"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Export database for use in other modules
window.database = database;

// Game Constants - Server-side controlled for fairness
window.GAME_CONSTANTS = {
    // Chicken Road multipliers (calculated server-side for fairness)
    CHICKEN_MULTIPLIERS: {
        easy: Array.from({length: 30}, (_, i) => 1.02 * Math.pow(1.06, i + 1)),
        medium: Array.from({length: 30}, (_, i) => 1.10 * Math.pow(1.17, i + 1)),
        hard: Array.from({length: 30}, (_, i) => 1.20 * Math.pow(1.30, i + 1)),
        expert: Array.from({length: 30}, (_, i) => {
            let val = Math.pow(30000, (i + 1) / 30);
            if (val < 1.5 && i === 0) val = 1.98;
            return val;
        })
    },
    
    // House edges for different games (server-controlled)
    HOUSE_EDGE: {
        chicken: 0.15,
        coinflip: 1.85,
        mines: 0.05,
        blackjack: 0.02 // 2% house edge
    },
    
    // Minimum and maximum bets
    BET_LIMITS: {
        min: 1,
        max: 1000000
    },
    
    // Free coins settings
    FREE_COINS: {
        amount: 500,
        threshold: 100,
        cooldown: 3600000 // 1 hour in milliseconds
    },
    
    // Security settings
    SECURITY: {
        maxTransactionsPerMinute: 10,
        sessionTimeout: 86400000, // 24 hours
        activityTimeout: 15000 // 15 seconds
    }
};
