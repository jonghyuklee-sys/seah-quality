// Firebase Configuration (Project: seah-quality2)
const firebaseConfig = {
    apiKey: "AIzaSyAUW1DVz6ZKVNguNFNWyQMG9qk_THWeDx0",
    authDomain: "seah-quality2.firebaseapp.com",
    projectId: "seah-quality2",
    storageBucket: "seah-quality2.firebasestorage.app",
    messagingSenderId: "11833740311",
    appId: "1:11833740311:web:ef97f550b18d3d43a12052",
    measurementId: "G-XB385Y44BC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

// Firestore Persistence 활성화 (오프라인 지원 및 캐싱을 통한 로딩 속도 향상)
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Persistence failed: multiple tabs open");
        } else if (err.code == 'unimplemented') {
            console.warn("Persistence failed: browser not supported");
        }
    });

console.log("🔥 New Firebase (seah-quality2) initialized successfully.");
