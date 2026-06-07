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

// ===================================================================
// [Firebase App Check / reCAPTCHA]
// reCAPTCHA 보안 적용 시, 모든 Firebase 요청(Storage/Firestore/Functions)에
// App Check 토큰이 자동 첨부됩니다. 이 설정이 없으면 storage/unauthorized 오류가 발생합니다.
//
// ▼▼▼ 아래 따옴표 안에, 콘솔에서 발급받은 reCAPTCHA "사이트 키"를 붙여넣으세요. ▼▼▼
//   확인 위치: Firebase 콘솔 > 빌드 > App Check > '앱' 탭 > 웹 앱의 reCAPTCHA 공급업체
//   (또는 https://www.google.com/recaptcha/admin 의 해당 사이트 '사이트 키')
const RECAPTCHA_SITE_KEY = "6Lf9zAYtAAAAAO23ZJDR1renckouMmtXgop1Rwll";
// ▲▲▲ 사이트 키는 공개되어도 되는 값입니다(비밀 키 아님). ▲▲▲

try {
    if (firebase.appCheck && RECAPTCHA_SITE_KEY && !RECAPTCHA_SITE_KEY.startsWith("여기에")) {
        // reCAPTCHA v3 (기본). Enterprise를 쓰는 경우 아래 두 줄을 교체하세요:
        //   firebase.appCheck().activate(
        //       new firebase.appCheck.ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), true);
        firebase.appCheck().activate(RECAPTCHA_SITE_KEY, /* isTokenAutoRefreshEnabled */ true);
        console.log("App Check activated (reCAPTCHA).");
    } else {
        console.warn("App Check 미설정: RECAPTCHA_SITE_KEY 값을 입력해야 저장이 정상 동작합니다.");
    }
} catch (e) {
    console.error("App Check 활성화 실패:", e);
}
// ===================================================================

const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Firestore Persistence 활성화 (오프라인 지원 및 캐싱을 통한 로딩 속도 향상)
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Persistence failed: multiple tabs open");
        } else if (err.code == 'unimplemented') {
            console.warn("Persistence failed: browser not supported");
        }
    });

console.log("Firebase (seah-quality2) initialized with security.");
