// firebase-config.js
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
