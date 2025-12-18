// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDJ5tpQ5pVY2A8L55Eg5SxB_L02dIHWcWA",
    authDomain: "cool-club-31ec4.firebaseapp.com",
    databaseURL: "https://cool-club-31ec4-default-rtdb.firebaseio.com",
    projectId: "cool-club-31ec4",
    storageBucket: "cool-club-31ec4.firebasestorage.app",
    messagingSenderId: "218577130374",
    appId: "1:218577130374:web:e345bf0d4ee0a68d029207",
    measurementId: "G-BFSY9J2PQW"
};

// Initialize Firebase
let database;

function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        console.log("Firebase initialized successfully");
        return true;
    } catch (error) {
        console.error("Firebase initialization error:", error);
        return false;
    }
}

// Chicken Road Game Configuration - UPDATED WITH LOWER WIN CHANCES
const CHICKEN_MULTIPLIERS = {
    easy: [],
    medium: [],
    hard: [],
    expert: []
};

// Populate multipliers for Chicken Road
for(let i=0; i<30; i++) CHICKEN_MULTIPLIERS.easy.push(1.02 * Math.pow(1.06, i+1));
for(let i=0; i<30; i++) CHICKEN_MULTIPLIERS.medium.push(1.10 * Math.pow(1.17, i+1));
for(let i=0; i<30; i++) CHICKEN_MULTIPLIERS.hard.push(1.20 * Math.pow(1.30, i+1));
for(let i=0; i<30; i++) {
    let val = Math.pow(30000, (i+1)/30);
    if (val < 1.5 && i===0) val = 1.98;
    CHICKEN_MULTIPLIERS.expert.push(val);
}

// INCREASED HOUSE EDGE FOR LOWER WIN CHANCES
const CHICKEN_HOUSE_EDGE = 0.15; // Increased from 0.02 to 0.15 (15% house edge)

export { initializeFirebase, database, CHICKEN_MULTIPLIERS, CHICKEN_HOUSE_EDGE };