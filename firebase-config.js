// Firebase Configuration - 사용자님의 프로젝트 정보로 교체 필요
const firebaseConfig = {
    apiKey: "AIzaSyBLhpOEcjfg2f4WuxAnZyP1pB5vI1zECww",
    authDomain: "seah-quality.firebaseapp.com",
    projectId: "seah-quality",
    storageBucket: "seah-quality.firebasestorage.app",
    messagingSenderId: "62287247438",
    appId: "1:62287247438:web:c90b9408699ee1d9996b1f",
    measurementId: "G-PVP47J6MCW"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

console.log("Firebase initialized successfully.");
