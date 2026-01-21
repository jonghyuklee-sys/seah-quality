// Firebase Configuration
// TODO: 아래 설정을 실제 파이어베이스 프로젝트 설정값으로 교체해주세요.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "seah-quality.firebaseapp.com",
    projectId: "seah-quality",
    storageBucket: "seah-quality.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

console.log("🔥 Firebase initialized successfully.");
