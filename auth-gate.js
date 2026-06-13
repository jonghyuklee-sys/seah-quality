// ===================================================================
// [인증 관문] 세아씨엠 임직원의 @seah.co.kr 구글 계정으로 로그인해야 사이트 사용 가능
// firebase-config.js 다음, app.js 이전에 로드되어야 합니다.
// ===================================================================
(function () {
    'use strict';

    var ALLOWED_DOMAIN = 'seah.co.kr';
    // 세아씨엠 소속 판별: 구글 계정 이름에 '씨엠'이 포함되어야 함
    // (예: "이종혁/세아씨엠", "홍길동/품질경영팀(씨엠)") — 타계열사 @seah.co.kr 계정 차단
    var AFFILIATE_KEYWORD = '씨엠';
    // 계정 이름 규칙으로 판별되지 않는 세아씨엠 임직원은 여기에 이메일 추가
    var EXTRA_ALLOWED_EMAILS = ['jonghyuk.lee@seah.co.kr'];
    // 사이트 내부 기능용 계정 (VOC 담당자 로그인 시 세션이 이 계정으로 바뀜)
    // admin@seahcm.app은 비밀번호 관리자 로그인 폐지로 제외 (관리자 = 지정 구글 계정)
    var INTERNAL_ACCOUNTS = ['voc@seahcm.app'];

    function isInternalAccount(email) {
        return INTERNAL_ACCOUNTS.indexOf((email || '').toLowerCase()) !== -1;
    }
    function isCompanyEmail(email) {
        if (!email) return false;
        email = email.toLowerCase();
        return email.indexOf('@' + ALLOWED_DOMAIN, email.length - ('@' + ALLOWED_DOMAIN).length) !== -1;
    }
    // 세아씨엠 임직원 여부 (내부 계정 포함)
    function isAllowedUser(user) {
        if (!user || user.isAnonymous || !user.email) return false;
        var email = user.email.toLowerCase();
        if (isInternalAccount(email)) return true;
        if (!isCompanyEmail(email)) return false;
        if (EXTRA_ALLOWED_EMAILS.indexOf(email) !== -1) return true;
        return (user.displayName || '').indexOf(AFFILIATE_KEYWORD) !== -1;
    }
    function denyMessage(user) {
        var email = (user && user.email) || '알 수 없음';
        if (!isCompanyEmail(email)) {
            return '회사 계정(@' + ALLOWED_DOMAIN + ')만 사용할 수 있습니다. (' + email + ')';
        }
        return '세아씨엠 임직원만 이용할 수 있습니다. (계정: ' + ((user && user.displayName) || email) + ')';
    }
    // 통과한 구글 프로필을 저장해 상단 프로필 메뉴에서 사용
    // (VOC 담당자 로그인으로 세션이 내부 계정으로 바뀌어도 구글 프로필 표시 유지)
    function publishProfile(user) {
        if (isInternalAccount(user.email)) return;
        var profile = {
            name: user.displayName || '',
            email: user.email || '',
            photo: user.photoURL || ''
        };
        window.qhubProfile = profile;
        try { sessionStorage.setItem('qhubProfile', JSON.stringify(profile)); } catch (e) { }
        try { document.dispatchEvent(new CustomEvent('qhub-profile-updated')); } catch (e) { }
    }

    // --- 관문 화면 생성 (페이지 내용을 가리는 전체 화면 덮개) ---
    var gate = document.createElement('div');
    gate.id = 'auth-gate';
    gate.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:2147483647',
        'display:flex', 'align-items:center', 'justify-content:center',
        'background:#F4F5F3', 'font-family:"IBM Plex Sans KR","Noto Sans KR",sans-serif'
    ].join(';');
    gate.innerHTML =
        '<div style="background:#fff;border:1px solid #DDE0DD;border-radius:10px;box-shadow:0 8px 24px rgba(31,39,48,.10);max-width:400px;width:90%;text-align:center;overflow:hidden;">' +
        // 시그니처: 도장 단면 라인 (강판/아연/도료)
        '<div style="height:5px;background:linear-gradient(to bottom,#46505C 0 2px,#9AA4AD 2px 3.5px,#C2351F 3.5px 5px);"></div>' +
        '<div style="padding:44px 40px 40px;">' +
        '<img src="seah-logo.jpg" alt="SeAH" style="height:42px;margin-bottom:20px;" onerror="this.style.display=\'none\'">' +
        '<h2 style="margin:0 0 8px;font-size:1.25rem;color:#26303C;letter-spacing:.3px;">세아씨엠 <span style="font-family:\'IBM Plex Mono\',monospace;font-weight:600;">Q-HUB</span></h2>' +
        '<p style="margin:0 0 28px;color:#66707A;font-size:.92rem;line-height:1.55;">세아씨엠 임직원 전용 시스템입니다.<br>회사 구글 계정(@' + ALLOWED_DOMAIN + ')으로 로그인하세요.</p>' +
        '<p id="auth-gate-checking" style="margin:0;color:#98A1A8;font-size:.9rem;">로그인 상태 확인 중...</p>' +
        '<button id="auth-gate-btn" style="display:none;align-items:center;gap:10px;padding:12px 24px;border:1px solid #C9CDC9;border-radius:4px;background:#fff;cursor:pointer;font-size:.95rem;font-weight:600;color:#2A323C;font-family:inherit;">' +
        '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style="width:18px;height:18px;">구글 계정으로 로그인</button>' +
        '<p id="auth-gate-msg" style="display:none;margin:18px 0 0;color:#C2351F;font-size:.85rem;"></p>' +
        '</div></div>';

    function showGate() {
        if (!gate.parentNode) document.documentElement.appendChild(gate);
        gate.style.display = 'flex';
    }
    function hideGate() {
        gate.style.display = 'none';
    }
    function showMsg(text) {
        var el = document.getElementById('auth-gate-msg');
        if (el) { el.textContent = text; el.style.display = 'block'; }
    }

    // 로컬 미리보기(localhost) UI 점검용 우회: 저장된 프로필이 있으면 관문 생략 (운영 도메인에는 영향 없음)
    var DEV_BYPASS = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
        !!(sessionStorage.getItem('qhubProfile') || localStorage.getItem('qhubDevProfile'));
    if (DEV_BYPASS && !sessionStorage.getItem('qhubProfile')) {
        try { sessionStorage.setItem('qhubProfile', localStorage.getItem('qhubDevProfile')); } catch (e) { }
    }

    // 페이지 진입 즉시 관문 표시 (인증 확인 후 통과 시 제거)
    if (!DEV_BYPASS) showGate();

    // 로그인 유지: 한 번 로그인한 기기는 브라우저를 닫아도 세션이 유지됨
    try {
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (e) {
        console.warn('Auth persistence setting failed:', e);
    }

    // 첫 인증 상태 확인이 끝나면 "확인 중..." 문구 대신 로그인 버튼 노출
    function revealLoginButton() {
        var checking = document.getElementById('auth-gate-checking');
        var btn = document.getElementById('auth-gate-btn');
        if (checking) checking.style.display = 'none';
        if (btn) btn.style.display = 'inline-flex';
        // 파일을 직접 연 경우(file://) 로그인 자체가 불가능하므로 미리 안내
        if (location.protocol !== 'http:' && location.protocol !== 'https:') {
            showMsg('파일을 직접 열면 로그인할 수 없습니다. 배포된 웹 주소(https://seahqm.web.app)로 접속하세요.');
        }
    }

    // 구글 로그인은 http/https에서만 동작 — 파일을 직접 연 경우(file://) 사전 차단
    function isWebEnvironment() {
        return location.protocol === 'http:' || location.protocol === 'https:';
    }

    // --- 구글 로그인 처리 ---
    function doLogin() {
        if (!isWebEnvironment()) {
            showMsg('파일을 직접 열면 로그인할 수 없습니다. 배포된 웹 주소(https://seahqm.web.app)로 접속하세요.');
            return;
        }
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: 'select_account' });
        auth.signInWithPopup(provider).then(function (result) {
            if (result.user && !isAllowedUser(result.user)) {
                var msg = denyMessage(result.user);
                auth.signOut();
                showMsg(msg);
            }
        }).catch(function (err) {
            if (err && err.code === 'auth/popup-blocked') {
                // 팝업이 차단된 환경에서는 리다이렉트 방식으로 전환
                auth.signInWithRedirect(provider);
            } else if (err && err.code === 'auth/operation-not-supported-in-this-environment') {
                showMsg('이 환경에서는 로그인할 수 없습니다. 배포된 웹 주소(https://seahqm.web.app)로 접속하고, 브라우저의 쿠키·저장소 차단을 해제하세요.');
            } else if (err && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                console.error('Google sign-in error:', err);
                showMsg('로그인 오류: ' + (err.code || err.message));
            }
        });
    }

    gate.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('#auth-gate-btn') : null;
        if (btn) doLogin();
    });

    // --- 인증 상태 감시: 허용된 계정이면 통과, 아니면 관문 유지 ---
    // 로그인 정보가 기기에 저장되어 있으면(재방문) 버튼 없이 자동 통과됩니다.
    auth.onAuthStateChanged(function (user) {
        if (user && isAllowedUser(user)) {
            publishProfile(user);
            hideGate();
        } else if (user && !user.isAnonymous && user.email) {
            // 허용되지 않은 계정(타도메인 또는 타계열사) → 즉시 로그아웃
            var msg = denyMessage(user);
            auth.signOut();
            showGate();
            revealLoginButton();
            showMsg(msg);
        } else if (!DEV_BYPASS) {
            // 미로그인 또는 익명 세션(관리자 모드 종료 직후 등) → 관문 표시
            showGate();
            revealLoginButton();
        }
    });
})();
