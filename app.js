// 세아씨엠 품질조회 및 고객불만관리(VOC) 통합 엔진
let localFiles = [];
let localComplaints = [];
let localDefects = [];
let localNotifyEmails = []; 

// --- [알림 메일 담당자 관리 및 발송 엔진] ---
async function loadNotificationEmails() {
    if (typeof db === 'undefined') return;
    try {
        const snap = await db.collection("notification_settings").get();
        localNotifyEmails = [];
        snap.forEach(doc => localNotifyEmails.push({ id: doc.id, ...doc.data() }));
        if (typeof renderNotificationEmails === 'function') renderNotificationEmails();
    } catch (e) {
        console.error("알림 메일 로드 실패:", e);
    }
}

function renderNotificationEmails() {
    const notifyEmailList = document.getElementById('notify-email-list');
    if (!notifyEmailList) return;
    if (localNotifyEmails.length === 0) {
        notifyEmailList.innerHTML = '<div style="color: #94a3b8; font-size: 13px; width: 100%; text-align: center;">등록된 이메일이 없습니다.</div>';
        return;
    }

    notifyEmailList.innerHTML = '';
    localNotifyEmails.forEach(item => {
        const tag = document.createElement('div');
        tag.className = 'notify-email-tag';
        tag.innerHTML = `
            <span>${item.email}</span>
            <span class="remove-btn" onclick="deleteNotificationEmail('${item.id}')">
                <i class="fas fa-times"></i>
            </span>
        `;
        notifyEmailList.appendChild(tag);
    });
}

window.deleteNotificationEmail = async (id) => {
    if (!confirm('해당 이메일을 알림 명단에서 삭제하시겠습니까?')) return;
    try {
        await db.collection("notification_settings").doc(id).delete();
        loadNotificationEmails();
    } catch (e) {
        alert('삭제 실패: ' + e.message);
    }
};

async function sendVocNotification(vocData) {
    if (localNotifyEmails.length === 0) await loadNotificationEmails();
    if (localNotifyEmails.length === 0) return;

    const emailListStr = localNotifyEmails.map(item => item.email).join(', ');
    const templateParams = {
        to_emails: emailListStr,
        category: vocData.category,
        customer: vocData.customer,
        title: vocData.title,
        manager: (vocData.team ? `[${vocData.team}]` : '') + vocData.manager,
        receipt_date: vocData.receiptDate,
        spec: vocData.spec,
        line: vocData.line,
        link: window.location.href
    };
    try {
        await emailjs.send('service_hxi7rk6', 'template_pb45hu3', templateParams);
        console.log("✅ VOC 알림 메일 발송 성공");
    } catch (error) {
        console.error("⚠️ VOC 메일 발송 실패:", error);
    }
}

async function sendFeasibilityNotification(data) {
    if (localNotifyEmails.length === 0) await loadNotificationEmails();
    if (localNotifyEmails.length === 0) return;

    const emailListStr = localNotifyEmails.map(item => item.email).join(', ');
    const templateParams = {
        to_emails: emailListStr,
        category: "생산 가능성 검토 요청",
        customer: data.customer || '-',
        title: `${data.material || ''} / ${data.color || ''} (${data.thickness || ''}x${data.width || ''})`.trim(),
        manager: `${data.requesterTeam || ''} ${data.requesterName || ''}`.trim(),
        receipt_date: data.requestDate || '-',
        spec: `${data.standard || ''} / ${data.coating || ''} / ${data.paintSpec || ''}`.trim(),
        line: data.replyLine || '-',
        link: window.location.href
    };
    try {
        await emailjs.send('service_hxi7rk6', 'template_44ro4gq', templateParams);
        console.log("✅ 생산 가능성 검토 알림 메일 발송 성공");
    } catch (error) {
        console.error("⚠️ 생산 가능성 검토 메일 발송 실패:", error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // --- [1. 전역 상태 및 엘리먼트 참조] ---
    const steelTypeSelect = document.getElementById('steel-type');
    const standardTypeSelect = document.getElementById('standard-type');
    const specificStandardSelect = document.getElementById('specific-standard');
    const gradeTypeSelect = document.getElementById('grade-type');
    const coatingWeightSelect = document.getElementById('coating-weight');
    const thicknessInput = document.getElementById('spec-thickness');
    const widthInput = document.getElementById('spec-width');
    const searchBtn = document.getElementById('search-btn');
    const resultsCard = document.getElementById('results-card');
    const currentPageLabel = document.getElementById('current-page');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    window.isAdmin = sessionStorage.getItem('seahAdminMode') === 'true';
    let isAdmin = window.isAdmin;
    let resultsCardWasVisible = false;

    // VOC 페이지네이션 및 필터 상태
    let vocCurrentPage = 1;
    let vocItemsPerPage = 10;
    let vocMonthFilter = 'all';

    // PDF 뷰어 상태 관리
    let currentPdfDoc = null;
    let currentPageNum = 1;
    let totalPageCount = 0;
    let currentPdfUrl = "";
    let currentZoom = 1.3; // 기본 줌 레벨

    // --- [2. 관리자 모드 로직] ---
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminPasswordInput = document.getElementById('admin-password');
    const confirmAdminLoginBtn = document.getElementById('confirm-admin-login');
    const cancelAdminLoginBtn = document.getElementById('cancel-admin-login');
    const loginStatusMsg = document.getElementById('admin-login-status');
    const displayUserName = document.getElementById('display-user-name');
    const displayUserRole = document.getElementById('display-user-role');
    const userAvatar = document.getElementById('user-avatar');



    function updateAdminUI() {
        if (isAdmin) {
            document.body.classList.add('admin-mode');
            if (adminLoginBtn) {
                adminLoginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> 로그아웃';
                adminLoginBtn.classList.replace('btn-secondary', 'btn-danger');
            }
            if (displayUserName) displayUserName.textContent = '품질관리자';
            if (displayUserRole) displayUserRole.textContent = 'Admin Mode';
            if (userAvatar) {
                userAvatar.textContent = 'QM';
                userAvatar.style.background = '#1e3a8a';
                userAvatar.style.color = '#fff';
            }
        } else {
            document.body.classList.remove('admin-mode');
            if (adminLoginBtn) {
                adminLoginBtn.innerHTML = '<i class="fas fa-lock"></i> 관리자 로그인';
                adminLoginBtn.classList.replace('btn-danger', 'btn-secondary');
            }
            if (displayUserName) displayUserName.textContent = '방문객';
            if (displayUserRole) displayUserRole.textContent = 'Guest';
            if (userAvatar) {
                userAvatar.textContent = 'G';
                userAvatar.style.background = '#e2e8f0';
                userAvatar.style.color = '#64748b';
            }
        }
        window.isAdmin = isAdmin; // Sync with global
        if (typeof renderCertification === 'function') {
            renderCertification();
        }
    }
    updateAdminUI();

    if (adminLoginBtn) {
        adminLoginBtn.onclick = () => {
            if (isAdmin) {
                if (confirm('관리자 모드를 종료하시겠습니까?')) {
                    isAdmin = false;
                    isVocAuthenticated = false; // VOC 인증도 해제
                    sessionStorage.removeItem('seahVocAuth');
                    document.body.classList.remove('voc-auth-mode');
                    sessionStorage.removeItem('seahAdminMode');
                    updateAdminUI();
                    showSection('search-view');
                }
            } else {
                adminModal.style.display = 'flex';
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
                if (loginStatusMsg) loginStatusMsg.style.display = 'none';
            }
        };
    }

    // --- [2.0 통합 인증 관리] --- (임시 단순화 조치)
    const SEAH_AUTH_CONFIG = {
        ADMIN: '0000',
        VOC: '2017'
    };

    if (confirmAdminLoginBtn) {
        confirmAdminLoginBtn.onclick = () => {
            const inputVal = adminPasswordInput ? adminPasswordInput.value.trim() : '';
            if (inputVal === SEAH_AUTH_CONFIG.ADMIN) {
                isAdmin = true;
                sessionStorage.setItem('seahAdminMode', 'true');
                updateAdminUI();
                adminModal.style.display = 'none';
                alert('관리자 모드로 전환되었습니다.');
            } else {
                if (loginStatusMsg) loginStatusMsg.style.display = 'block';
                if (adminPasswordInput) {
                    adminPasswordInput.value = '';
                    adminPasswordInput.focus();
                }
            }
        };
    }
    if (cancelAdminLoginBtn) cancelAdminLoginBtn.onclick = () => adminModal.style.display = 'none';

    adminPasswordInput.onkeydown = (e) => {
        if (e.key === 'Enter') confirmAdminLoginBtn.click();
    };

    // --- [VOC 접근 보안 로직] ---
    let isVocAuthenticated = sessionStorage.getItem('seahVocAuth') === 'true'; // VOC 인증 상태 (sessionStorage로 새로고침 시 유지)
    const vocPasswordModal = document.getElementById('voc-password-modal');
    const vocPasswordInput = document.getElementById('voc-password');
    const confirmVocLoginBtn = document.getElementById('confirm-voc-login');
    const cancelVocLoginBtn = document.getElementById('cancel-voc-login');
    const vocLoginStatusMsg = document.getElementById('voc-login-status');

    // 페이지 로드 시 VOC 인증 상태 복원
    if (isVocAuthenticated) {
        document.body.classList.add('voc-auth-mode');
    }

    if (confirmVocLoginBtn) {
        confirmVocLoginBtn.onclick = () => {
            const inputVal = vocPasswordInput ? vocPasswordInput.value.trim() : '';
            if (inputVal === SEAH_AUTH_CONFIG.VOC) {
                isVocAuthenticated = true;
                sessionStorage.setItem('seahVocAuth', 'true');
                document.body.classList.add('voc-auth-mode');
                vocPasswordModal.style.display = 'none';
                showSection('voc-log-view');
                renderVocTable();
                if (vocPasswordInput) vocPasswordInput.value = '';
                if (vocLoginStatusMsg) vocLoginStatusMsg.style.display = 'none';
            } else {
                if (vocLoginStatusMsg) vocLoginStatusMsg.style.display = 'block';
                if (vocPasswordInput) {
                    vocPasswordInput.value = '';
                    vocPasswordInput.focus();
                }
            }
        };
    }

    if (cancelVocLoginBtn) {
        cancelVocLoginBtn.onclick = () => {
            vocPasswordModal.style.display = 'none';
            // 취소 시 UI 흐름에 따라 처리 (현재 화면 유지)
        };
    }

    if (vocPasswordInput) {
        vocPasswordInput.onkeydown = (e) => {
            if (e.key === 'Enter') confirmVocLoginBtn.click();
        };
    }

    // --- [3. 통합 내비게이션 시스템] ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pageSections = document.querySelectorAll('.page-section');

    function showSection(targetId) {
        // [VOC 보안 체크] - 관리자 모드면 패스
        if (targetId === 'voc-log-view' && !isVocAuthenticated && !isAdmin) {
            // 사이드바가 열려있다면 닫아줌 (모바일 대응)
            sidebar.classList.remove('open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('open');

            // 모달 표시
            if (vocPasswordModal) {
                vocPasswordModal.style.display = 'flex';
                vocPasswordInput.value = '';
                vocPasswordInput.focus();
                if (vocLoginStatusMsg) vocLoginStatusMsg.style.display = 'none';
            }
            return; // 섹션 전환 중단
        }

        // [1] 모든 섹션 숨기기
        document.querySelectorAll('.page-section').forEach(s => {
            s.style.display = 'none';
        });

        const target = document.getElementById(targetId);
        if (target) {
            target.style.display = 'block';
        }

        // [2] 사이드바 상태 및 브레드크럼 업데이트
        navLinks.forEach(l => {
            l.classList.remove('active');
            const href = l.getAttribute('href');
            if (href === `#${targetId}`) {
                l.classList.add('active');

                if (currentPageLabel) {
                    const textContent = l.innerText || l.textContent;
                    const cleanText = textContent.replace(/[^\w\s가-힣]/g, '').trim();
                    currentPageLabel.textContent = cleanText;
                }
            }
        });

        if (resultsCard) {
            resultsCard.style.display = 'none';
        }

        // [3] 섹션별 전용 로직
        if (targetId === 'process-spec-view') {
            setTimeout(() => {
                const activeTab = document.querySelector('#process-spec-tabs .process-tab-btn.active');
                if (activeTab) activeTab.click();
            }, 200);
        }
        if (targetId === 'line-spec-view') {
            setTimeout(() => {
                const tabs = document.querySelector('#line-spec-tabs');
                if (tabs) {
                    const activeTab = tabs.querySelector('.tab-btn.active') || tabs.querySelector('.tab-btn');
                    if (activeTab) activeTab.click();
                }
            }, 300);
        }
        if (targetId === 'certification-view') {
            try {
                renderCertification();
            } catch (err) {
                console.error("renderCertification failed:", err);
            }
        }
        if (targetId === 'warranty-guide-view') {
            setTimeout(() => {
                const activeTab = document.querySelector('#warranty-tab-header .warranty-tab-btn.active');
                if (activeTab) activeTab.click();
            }, 100);
        }

        // [4] 스크롤 및 모바일 메뉴 정리
        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('open');

        window.scrollTo(0, 0);
        setTimeout(() => window.scrollTo(0, 0), 10);
        setTimeout(() => window.scrollTo(0, 0), 100);

        document.body.classList.remove('viewer-open');
        document.body.style.overflow = '';
    }

    // --- [PDF 페이지 렌더링 전용 함수] ---
    async function renderPdfPage(num) {
        const body = document.getElementById('viewer-body');
        const canvasContainer = document.getElementById('viewer-canvas-container');
        const watermark = document.getElementById('viewer-watermark');
        const shield = document.getElementById('viewer-shield');

        // Correct IDs for pagination
        const pageNumSpan = document.getElementById('current-page-num');
        const totalPagesSpan = document.getElementById('total-pages');
        const zoomDisplay = document.getElementById('zoom-level-display');

        if (!currentPdfDoc || !canvasContainer) return;

        try {
            canvasContainer.innerHTML = '<div style="color:white; text-align:center; padding:50px; font-size:14px;">페이지를 구성 중입니다...</div>';

            const page = await currentPdfDoc.getPage(num);
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            // 줌 레벨 적용
            const viewport = page.getViewport({ scale: currentZoom });

            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas';
            canvas.style.display = 'block';
            canvas.style.margin = '20px auto';
            const context = canvas.getContext('2d');

            // 시각적 너비 계산 (줌 레벨에 따라 유동적으로 조절)
            const referenceZoom = isMobile ? 1.3 : 1.6;
            const visualWidth = (isMobile ? 100 : 85) * (currentZoom / referenceZoom);
            canvas.style.width = visualWidth + '%';

            // 모바일에서 캔버스 크기 상한선 체크 (메모리 부족 방지)
            if (isMobile && viewport.width > 3000) {
                const scaleDown = 3000 / viewport.width;
                const scaledViewport = page.getViewport({ scale: currentZoom * scaleDown });
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;
                await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
            } else {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport: viewport }).promise;
            }

            canvas.style.maxWidth = 'none';
            canvas.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';

            canvasContainer.innerHTML = ''; // Clear loading message
            canvasContainer.appendChild(canvas); // Append the rendered canvas

            // 표시 정보 업데이트
            if (pageNumSpan) pageNumSpan.textContent = num;
            if (totalPagesSpan) totalPagesSpan.textContent = totalPageCount;
            if (zoomDisplay) zoomDisplay.textContent = `${Math.round(currentZoom * 77)}%`;
            currentPageNum = num;

            // 스크롤 상단 이동
            body.scrollTop = 0;

            // 보안 레이어 동기화
            const syncSecurityLayers = () => {
                const contentHeight = Math.max(body.scrollHeight, body.offsetHeight, canvasContainer.scrollHeight);
                const watermark = document.getElementById('viewer-watermark');
                const shield = document.getElementById('viewer-shield');
                if (watermark) watermark.style.height = contentHeight + 'px';
                if (shield) {
                    shield.style.height = contentHeight + 'px';
                    shield.style.display = 'block';
                }
            };
            setTimeout(syncSecurityLayers, 300);
        } catch (e) {
            console.error("페이지 렌더링 실패:", e);
        }
    }

    // 페이징 버튼 이벤트 바인딩
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');

    if (prevPageBtn) {
        prevPageBtn.onclick = () => {
            if (currentPageNum <= 1) return;
            renderPdfPage(currentPageNum - 1);
        };
    }
    if (nextPageBtn) {
        nextPageBtn.onclick = () => {
            if (currentPageNum >= totalPageCount) return;
            renderPdfPage(currentPageNum + 1);
        };
    }

    // 확대/축소 로직
    if (zoomInBtn) {
        zoomInBtn.onclick = () => {
            if (currentZoom >= 3.0) return; // 최대 3배
            currentZoom += 0.2;
            renderPdfPage(currentPageNum);
        };
    }
    if (zoomOutBtn) {
        zoomOutBtn.onclick = () => {
            if (currentZoom <= 0.7) return; // 최소 0.7배
            currentZoom -= 0.2;
            renderPdfPage(currentPageNum);
        };
    }

    window.openSecureViewer = async (url) => {
        const modal = document.getElementById('doc-viewer-modal');
        const body = document.getElementById('viewer-body');
        const iframe = document.getElementById('viewer-iframe');
        const img = document.getElementById('viewer-img');
        const imgContainer = document.getElementById('viewer-img-container');
        const paginationBar = document.getElementById('viewer-pagination');
        const canvasContainer = document.getElementById('viewer-canvas-container');

        if (!modal || !body || !iframe || !img) return;

        // 초기화
        iframe.style.display = 'none';
        iframe.src = '';
        if (imgContainer) imgContainer.style.display = 'none';
        img.src = '';
        if (paginationBar) paginationBar.style.display = 'none';

        if (canvasContainer) {
            canvasContainer.innerHTML = '';
            canvasContainer.style.display = 'block';
        }

        body.scrollTop = 0;
        modal.style.display = 'flex';
        // Hide global watermark via CSS
        document.body.classList.add('viewer-open');
        document.body.style.overflow = 'hidden';

        const isPdf = url.toLowerCase().includes('.pdf') || (url.includes('firebasestorage') && !url.toLowerCase().includes('.jpg') && !url.toLowerCase().includes('.jpeg') && !url.toLowerCase().includes('.png') && !url.toLowerCase().includes('.gif') && !url.toLowerCase().includes('.webp'));

        if (isPdf) {
            const cleanUrl = url.split('#')[0];
            try {
                if (canvasContainer) canvasContainer.innerHTML = '<div style="color:white; text-align:center; padding:50px;">문서를 불러오는 중입니다...</div>';

                const loadingTask = pdfjsLib.getDocument(cleanUrl);
                currentPdfDoc = await loadingTask.promise;
                totalPageCount = currentPdfDoc.numPages;
                currentPageNum = 1;

                if (paginationBar) paginationBar.style.display = 'flex';

                await renderPdfPage(1);
            } catch (e) {
                console.error("PDF 로딩 실패:", e);
                let errorMsg = "문서를 불러오는 데 실패했습니다.";
                if (e.message.includes("fetch")) {
                    errorMsg = "서버 보안 정책(CORS)으로 인해 파일을 불러올 수 없습니다. Firebase 설정을 확인해주세요.";
                }
                if (canvasContainer) {
                    canvasContainer.innerHTML = `<div style="color:#f87171; text-align:center; padding:50px; font-size:14px; line-height:1.6;">
                        <div style="font-size:30px; margin-bottom:15px;">⚠️</div>
                        ${errorMsg}<br><br>
                        <span style="color:#94a3b8; font-size:12px;">Error: ${e.message}</span>
                    </div>`;
                }
                if (paginationBar) paginationBar.style.display = 'none';
            }
        } else {
            img.src = url;
            if (imgContainer) imgContainer.style.display = 'flex';
        }
    };

    // --- [11. 보안 특화: 단축키 차단 시스템] ---
    window.addEventListener('keydown', function (e) {
        const viewerVisible = document.getElementById('doc-viewer-modal').style.display === 'flex';

        // 뷰어가 열려있을 때만 강력 차단
        if (viewerVisible) {
            // Ctrl+S (저장), Ctrl+P (인쇄), Ctrl+Shift+I/C/J (개발자도구)
            if (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) {
                e.preventDefault();
                alert('보안: 이 문서는 저장하거나 인쇄할 수 없습니다.');
                return false;
            }
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) {
                e.preventDefault();
                return false;
            }
            // F12 차단
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
        }
    }, true);

    navLinks.forEach(link => {
        link.onclick = (e) => {
            if (link.id === 'prod-feasibility-btn') {
                e.preventDefault();
                showSection('prod-feasibility-view');
                loadFeasibilityRequests();
                return;
            }
            e.preventDefault();
            const menu = link.getAttribute('data-menu');
            let targetId = '';

            // 메뉴별 섹션 ID 매핑
            const menuMap = {
                'process-spec': 'process-spec-view',
                'line-spec': 'line-spec-view',
                'voc-management': 'complaint-view',
                'voc-log': 'voc-log-view',
                'defect-gallery': 'defect-view'
            };

            if (menu && menuMap[menu]) {
                targetId = menuMap[menu];
            } else {
                // 기존 href 방식 Fallback
                const href = link.getAttribute('href');
                if (href && href.startsWith('#') && href.length > 1) {
                    targetId = href.substring(1);
                }
            }

            if (targetId) showSection(targetId);
        };
    });

    if (mobileMenuBtn) {
        mobileMenuBtn.onclick = () => {
            sidebar.classList.toggle('open');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('open');
        };
    }

    // --- [4. 규격서 라이브러리 엔진] ---
    const registeredFileList = document.getElementById('registered-file-list');
    const specFileInput = document.getElementById('spec-file');

    async function extractTextFromPDF(dataUrl) {
        try {
            const pdf = await pdfjsLib.getDocument(dataUrl).promise;
            let text = "";
            for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ');
            }
            return text;
        } catch (e) { return ""; }
    }

    function analyzeSpec(fileName, text) {
        const pool = (fileName + " " + text).toUpperCase();
        const specs = [
            { reg: /3506|D3506/, name: "KS D 3506", ref: "KS" },
            { reg: /3770|D3770/, name: "KS D 3770", ref: "KS" },
            { reg: /6701|D6701/, name: "KS D 6701", ref: "KS" },
            { reg: /3030|D3030/, name: "KS D 3030", ref: "KS" },
            { reg: /3520|D3520/, name: "KS D 3520", ref: "KS" },
            { reg: /3862|D3862/, name: "KS D 3862", ref: "KS" },
            { reg: /6711|D6711/, name: "KS D 6711", ref: "KS" },
            { reg: /3034|D3034/, name: "KS D 3034", ref: "KS" },
            { reg: /3512|D3512/, name: "KS D 3512", ref: "KS" },
            { reg: /3501|D3501/, name: "KS D 3501", ref: "KS" },
            { reg: /3302|G3302/, name: "JIS G 3302", ref: "JIS" },
            { reg: /3321|G3321/, name: "JIS G 3321", ref: "JIS" },
            { reg: /4000|H4000/, name: "JIS H 4000", ref: "JIS" },
            { reg: /3323|G3323/, name: "JIS G 3323", ref: "JIS" },
            { reg: /3312|G3312/, name: "JIS G 3312", ref: "JIS" },
            { reg: /3322|G3322/, name: "JIS G 3322", ref: "JIS" },
            { reg: /4001|H4001/, name: "JIS H 4001", ref: "JIS" },
            { reg: /3141|G3141/, name: "JIS G 3141", ref: "JIS" },
            { reg: /3131|G3131/, name: "JIS G 3131", ref: "JIS" }
        ];
        let found = { name: "기타", ref: "기타" };
        for (const s of specs) { if (s.reg.test(pool)) { found = { name: s.name, ref: s.ref }; break; } }
        const gradeRegex = /(SGCC|SGCD[1-3]|SGCD|SGC[0-9]{3}|DX5[1-4]D\+?[A-Z]{0,2}|S[0-9]{3}GD\+?[A-Z]{0,2}|CS\s?Type\s?[A-C]|FS\s?Type\s?[A-B]|SS\s?Grade\s?[0-9]{2,3}|SGLCC|SGLCD|SGLC[0-9]{3}|SDCC|SDCD[1-3]|SDC[0-9]{3}|CGCC|CGCD[1-3]|CGCD|CGCH|CGC[0-9]{3}|CGLCC|CGLCD|CGLC[0-9]{3}|CDCC|CDC[0-9]{3}|SMMCC|SMMCD|SMM[0-9]{3}|CMMCC|CMM[0-9]{3}|3003-H[0-9]{2}|3105-H[0-9]{2}|3003|3105|1100|5052|AW-[0-9]{4}|A[0-9]{4}P|SPCC|SPCD|SPCE|SPCF|SPCG|SCP[1-6]|DC0[1-7]|SPHC|SPHD|SPHE)/i;
        const gradeMatch = (fileName + " " + text).match(gradeRegex);
        return { spec: found, grade: gradeMatch ? gradeMatch[0].toUpperCase() : "" };
    }

    async function handleFileUpload(file) {
        try {
            const text = file.type === "application/pdf" ? await extractTextFromPDF(URL.createObjectURL(file)) : "";
            const analysis = analyzeSpec(file.name, text);
            const ref = storage.ref(`specs/${Date.now()}_${file.name}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            await db.collection("specs").add({
                name: file.name, content: url, fullText: text,
                detectedSpec: analysis.spec.name, detectedRef: analysis.spec.ref,
                detectedGrade: analysis.grade, uploadedAt: new Date().toISOString()
            });
            loadLocalFiles();
        } catch (e) { alert("업로드 실패: " + e.message); }
    }

    if (specFileInput) {
        specFileInput.onchange = (e) => {
            Array.from(e.target.files).forEach(handleFileUpload);
            specFileInput.value = '';
        };
    }

    const customFileUploadBtn = document.getElementById('custom-file-upload-btn');
    if (customFileUploadBtn && specFileInput) {
        customFileUploadBtn.onclick = () => specFileInput.click();
    }

    const dropZone = document.getElementById('drop-zone');
    if (dropZone && specFileInput) {
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; };
        dropZone.ondragleave = () => { dropZone.style.borderColor = 'var(--border)'; };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border)';
            if (e.dataTransfer.files.length > 0) {
                Array.from(e.dataTransfer.files).forEach(handleFileUpload);
            }
        };
        dropZone.onclick = () => specFileInput.click();
    }

    function loadLocalFiles() {
        if (!db) return;

        // orderBy를 제거하여 필드가 없는 문서도 일단 모두 가져온 뒤 JS에서 정렬 (데이터 누락 방지)
        db.collection("specs").get().then(snap => {
            localFiles = [];
            snap.forEach(doc => {
                const data = doc.data();
                localFiles.push({ id: doc.id, ...data });
            });

            // 업로드 시간 순으로 정렬 (필드 없을 경우 대비)
            localFiles.sort((a, b) => {
                const dateA = a.uploadedAt || a.createdAt || '';
                const dateB = b.uploadedAt || b.createdAt || '';
                return dateB.localeCompare(dateA);
            });

            renderFileList();
            updateSearchOptions();
            console.log("✅ 라이브러리 로드 완료:", localFiles.length, "건");
        }).catch(err => {
            console.error("Error loading specs:", err);
            alert("라이브러리 로드 중 오류가 발생했습니다: " + err.message);
            if (registeredFileList) {
                registeredFileList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">라이브러리 로드 실패: ${err.message}</div>`;
            }
        });
    }

    function renderFileList() {
        if (!registeredFileList) return;
        registeredFileList.innerHTML = localFiles.length === 0 ? '<div style="text-align:center; padding:20px; color:#94a3b8;">등록된 파일이 없습니다.</div>' : '';
        localFiles.forEach(f => {
            const div = document.createElement('div');
            div.className = 'file-list-item-new';
            const viewUrl = f.content + (f.content.includes('.pdf') ? '#toolbar=0' : '');
            div.innerHTML = `
                <div class="file-info-header" style="cursor:pointer;" onclick="window.openSecureViewer('${viewUrl}')">
                    <div class="file-icon">📄</div>
                    <div class="file-meta">
                        <span class="file-name-link">${f.name}</span>
                        <div class="status-tags">
                            <span class="status-badge badge-blue">${f.detectedSpec}</span>
                            <span class="status-badge badge-orange">${f.detectedGrade || '-'}</span>
                        </div>
                    </div>
                </div>
                <button class="btn-icon delete-file admin-only" onclick="event.stopPropagation(); deleteFile('${f.id}')">✕</button>`;
            registeredFileList.appendChild(div);
        });
    }

    // --- [4.1 규격서 전체 삭제 기능] ---
    const clearAllFilesBtn = document.getElementById('clear-all-files-btn');
    if (clearAllFilesBtn) {
        clearAllFilesBtn.onclick = async () => {
            if (!isAdmin) {
                alert('관리자 권한이 필요합니다.');
                return;
            }
            if (!confirm('라이브러리의 모든 등록된 규격 파일과 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

            try {
                const snap = await db.collection("specs").get();
                if (snap.empty) {
                    alert('삭제할 데이터가 없습니다.');
                    return;
                }

                clearAllFilesBtn.textContent = '삭제 중...';
                clearAllFilesBtn.disabled = true;

                // 1. Storage 파일 삭제 (개별 파일 순회 삭제)
                const storageDeletePromises = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.content) {
                        try {
                            const fileRef = storage.refFromURL(data.content);
                            storageDeletePromises.push(fileRef.delete().catch(e => console.warn("Storage delete failed:", e)));
                        } catch (e) { }
                    }
                });

                // 2. Firestore 문서 삭제
                const batchPromises = [];
                let batch = db.batch();
                let count = 0;
                snap.forEach(doc => {
                    batch.delete(doc.ref);
                    count++;
                    if (count === 500) {
                        batchPromises.push(batch.commit());
                        batch = db.batch();
                        count = 0;
                    }
                });
                if (count > 0) batchPromises.push(batch.commit());

                await Promise.all([...batchPromises, ...storageDeletePromises]);
                alert('모든 규격 라이브러리가 초기화되었습니다.');
                loadLocalFiles();
            } catch (err) {
                alert('삭제 중 오류 발생: ' + err.message);
            } finally {
                clearAllFilesBtn.textContent = '전체 삭제';
                clearAllFilesBtn.disabled = false;
            }
        };
    }

    window.deleteFile = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            const doc = await db.collection("specs").doc(id).get();
            const data = doc.data();
            if (data && data.content) {
                try {
                    const fileRef = storage.refFromURL(data.content);
                    await fileRef.delete();
                } catch (e) { console.warn("Storage file already deleted or error:", e); }
            }
            await db.collection("specs").doc(id).delete();
            loadLocalFiles();
        } catch (e) {
            alert("삭제 실패: " + e.message);
        }
    };

    // --- [5. 조회 엔진] ---
    function updateSearchOptions() {
        if (!standardTypeSelect || !specificStandardSelect) return;
        const region = standardTypeSelect.value;
        if (!region) {
            specificStandardSelect.innerHTML = '<option value="">국가 규격을 먼저 선택하세요</option>';
            specificStandardSelect.disabled = true;
            return;
        }

        // 1. 시스템(steelData)에 정의된 모든 해당 국가 규격 추출
        const systemSpecs = [];
        for (const [sType, sObj] of Object.entries(steelData)) {
            if (sObj[region] && sObj[region].standard) {
                systemSpecs.push(sObj[region].standard);
            }
        }

        // 중복 제거 및 정렬
        const allSpecs = [...new Set(systemSpecs)].sort();

        // 2. 드롭다운 생성 (라이브러리 등록 여부 표시)
        let html = '<option value="">상세 규격 선택</option>';
        allSpecs.forEach(spec => {
            // 해당 규격의 Title 찾기
            let title = '';
            for (const sObj of Object.values(steelData)) {
                if (sObj[region] && sObj[region].standard === spec) {
                    title = sObj[region].title || '';
                    break;
                }
            }

            const hasFile = localFiles.some(f => f.detectedSpec === spec);
            const icon = hasFile ? ' 📄' : '';
            const displayName = title ? `${spec} - ${title}` : spec;
            html += `<option value="${spec}">${displayName}${icon}</option>`;
        });

        specificStandardSelect.innerHTML = html;
        specificStandardSelect.disabled = false;
    }

    if (standardTypeSelect) standardTypeSelect.onchange = updateSearchOptions;
    if (specificStandardSelect) {
        specificStandardSelect.onchange = () => {
            const spec = specificStandardSelect.value;

            // 제품군 자동 선택 및 고정 (Standard 기반)
            let detectedSteelType = '';
            for (const [sType, sObj] of Object.entries(steelData)) {
                if (sObj[standardTypeSelect.value] && sObj[standardTypeSelect.value].standard === spec) {
                    detectedSteelType = sType;
                    break;
                }
            }

            const productLabels = {
                'PO': 'PO (산세강판)', 'GI': 'GI (용융아연도금)', 'GL': 'GL (갈바륨)',
                'AL': 'AL (알루미늄판)', 'ZM': 'ZM (삼원계 도금)',
                'PPGI': 'PPGI (컬러아연)', 'PPGL': 'PPGL (컬러갈바륨)',
                'PPAL': 'PPAL (컬러알루미늄)', 'PPZM': 'PPZM (컬러삼원계)'
            };

            if (steelTypeSelect) {
                steelTypeSelect.innerHTML = Object.keys(productLabels).map(s =>
                    `<option value="${s}" ${s === detectedSteelType ? 'selected' : ''}>${productLabels[s]}</option>`
                ).join('');

                if (detectedSteelType) {
                    steelTypeSelect.value = detectedSteelType;
                    steelTypeSelect.disabled = true; // 제품군 고정
                } else {
                    steelTypeSelect.disabled = false;
                }
            }
        };
    }

    if (searchBtn) {
        searchBtn.onclick = () => {
            const region = standardTypeSelect.value;
            const spec = specificStandardSelect.value;
            const steel = steelTypeSelect.value;

            if (!region || !spec || !steel) return alert('모든 항목을 선택해주세요.');

            const file = localFiles.find(f => f.detectedSpec === spec);
            if (file) {
                window.openSecureViewer(file.content);
            } else {
                alert('해당 규격으로 등록된 원본 문서가 없습니다. 라이브러리에 문서를 먼저 등록해주세요.');
            }
        };
    }

    // --- [6. 불량 유형 도감] ---
    const defectGrid = document.getElementById('defect-grid');
    const defaultDefects = [
        { title: '흑청/백청/적청', photo: null, reason: '습한 환경 또는 장기 보관으로 인한 소재 부식 발생', internal: '1. 제품 보관 환경 및 기간 확인\n2. 제품 포장 상태 점검\n3. 운송 중 수분 접촉 가능성 확인', external: '1. 고객사 보관 환경 조사' },
        { title: '형상불량 (WAVE)', photo: null, reason: 'Roll Crown 부적절 또는 Edge 빌드업', internal: '1. 텐션레벨러 및 롤 교정 상태 점검\n2. 연신율 설정 확인', external: '1. 고객사 가공 설비 정렬 확인' },
        { title: '스트레쳐 스트레인', photo: null, reason: '항복점 연신 현상에 의한 표면 줄무늬', internal: '1. YP, TS 기계적 특성 확인\n2. 스킨 패스 압연율 점검', external: '1. 프레스 성형 조건 확인' },
        { title: '미도금', photo: null, reason: '전처리 불량, 도금액 조성 불균형 등', internal: '1. 전처리 온도/농도 분석\n2. 도금액 조성 점검', external: '샘플 확보 필요' },
        { title: '도막 박리', photo: null, reason: '전처리 불량, 도장 경화 불량 등', internal: '1. 건조로 온도 프로파일 확인\n2. 하지층 부착력 테스트', external: '가공 시 충격 여부 확인' },
        { title: '필름 불량', photo: null, reason: '보호필름 점착력 편차 등', internal: '로트별 점착력 확인', external: '필름 유지 기간 확인' },
        { title: '색차', photo: null, reason: '도료 배치 간 편차, 도포량 불균일 등', internal: '색차계 교정 상태 확인', external: '조명 환경 확인' },
        { title: '블로킹', photo: null, reason: '코일 내 도장면 응집 현상', internal: '경화 강도 및 권취 장력 확인', external: '보관 창고 온습도 확인' },
        { title: '덴트', photo: null, reason: '외부 충격에 의한 함몰', internal: '라인 롤러 손상 확인', external: '운송 중 고정 상태 확인' }
    ];

    async function loadLocalDefects() {
        if (!defectGrid) return;
        console.log("🔍 불량 데이터 로드 및 중복 정리 중...");
        try {
            const snap = await db.collection("defects").get();
            let allDefects = [];
            snap.forEach(doc => {
                let data = doc.data();
                // 기존 '미도금 (Uncoated)' 명칭 변경 처리 (Migration)
                if (data.title === '미도금 (Uncoated)') {
                    data.title = '미도금';
                    if (isAdmin) {
                        db.collection("defects").doc(doc.id).update({ title: '미도금' });
                    }
                }
                allDefects.push({ id: doc.id, ...data });
            });

            // 데이터가 하나도 없는 경우 초기 데이터(defaultDefects)를 Firestore에 등록
            if (allDefects.length === 0) {
                console.log("Empty encyclopedia found. Initializing with default data...");
                const batch = db.batch();
                defaultDefects.forEach(def => {
                    const newDocRef = db.collection("defects").doc();
                    batch.set(newDocRef, {
                        ...def,
                        createdAt: new Date().toISOString()
                    });
                });
                await batch.commit();
                // 다시 로드
                const newSnap = await db.collection("defects").get();
                allDefects = [];
                newSnap.forEach(doc => allDefects.push({ id: doc.id, ...doc.data() }));
            }

            // 중복 제거 로직 (사진이 있는 것을 우선순위로)
            const titleGroups = {};
            allDefects.forEach(d => {
                if (!titleGroups[d.title]) titleGroups[d.title] = [];
                titleGroups[d.title].push(d);
            });

            const finalDefects = [];
            const idsToDelete = [];

            for (const title in titleGroups) {
                const group = titleGroups[title];
                if (group.length > 1) {
                    group.sort((a, b) => {
                        if (a.photo && !b.photo) return -1;
                        if (!a.photo && b.photo) return 1;
                        return 0;
                    });
                    finalDefects.push(group[0]);
                    for (let i = 1; i < group.length; i++) {
                        idsToDelete.push(group[i].id);
                    }
                } else {
                    finalDefects.push(group[0]);
                }
            }

            if (idsToDelete.length > 0 && isAdmin) {
                console.log(`🧹 중복 데이터 ${idsToDelete.length}건 삭제 중...`);
                const deletePromises = idsToDelete.map(id => db.collection("defects").doc(id).delete());
                await Promise.all(deletePromises);
            }

            localDefects = finalDefects;
            renderDefectGrid();
        } catch (e) {
            console.error("Error loading defects:", e);
            // 사용자에게 직접적인 alert보다는 로그로 남기고 init의 메인 에러 핸들러가 처리하도록 함
            throw e; 
        }

        // VOC 불량 유형 선택박스 동기화
        const defectTypeSelects = [
            document.getElementById('voc-defect-type'),
            document.getElementById('modal-edit-defect-type')
        ];

        defectTypeSelects.forEach(select => {
            if (!select) return;
            const currentVal = select.value;
            let html = '<option value="">유형 선택</option>';

            // 도감에 등록된 타이틀로 옵션 생성
            const standardDefects = ['도장박리', '색차', '스크래치', '오염', '광택불량', '가공크랙', '형상불량'];
            const titles = [...new Set([...standardDefects, ...localDefects.map(d => d.title)])].sort();

            titles.forEach(title => {
                html += `<option value="${title}">${title}</option>`;
            });

            // 기타 옵션 추가 (도감에 없더라도 선택 가능하도록)
            if (!titles.includes('기타')) {
                html += '<option value="기타">기타 (Others)</option>';
            }

            select.innerHTML = html;
            select.value = currentVal; // 기존 선택값 유지 시도
        });
    }

    function renderDefectGrid() {
        if (!defectGrid) return;
        defectGrid.innerHTML = localDefects.length === 0 ? '<p style="text-align:center; color:#94a3b8; padding:40px;">등록된 데이터가 없습니다.</p>' : '';

        localDefects.forEach(defect => {
            const card = document.createElement('div');
            card.className = 'standard-card';
            card.style.cssText = 'padding:0; overflow:hidden; display:flex; flex-direction:column; border-radius:12px; border:1px solid #e2e8f0; background:#fff;';

            const photoHtml = defect.photo
                ? `<div style="width:100%; aspect-ratio:1.2; background:#f1f5f9; overflow:hidden; border-bottom:1px solid #f1f5f9;">
                     <img src="${defect.photo}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.open(this.src)">
                   </div>`
                : `<div style="width:100%; aspect-ratio:1.2; background:linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; border-bottom:1px solid #f1f5f9;">
                     <span style="font-size:32px; margin-bottom:8px;">📷</span>
                     <span style="font-size:12px;">사진 없음</span>
                   </div>`;

            card.innerHTML = `
                ${photoHtml}
                <div style="padding:16px; flex-grow:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h3 style="margin:0; font-size:16px; font-weight:700; color:#1e293b;">${defect.title}</h3>
                        <div class="admin-only admin-flex" style="flex-shrink:0;">
                            <button style="background:#e0f2fe; color:#f97316; width:28px; height:28px; border:none; border-radius:6px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'" onclick="editDefect('${defect.id}')">✏️</button>
                            <button style="background:#fee2e2; color:#6366f1; width:28px; height:28px; border:none; border-radius:6px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'" onclick="deleteDefect('${defect.id}')">🗑️</button>
                        </div>
                    </div>
                    <div style="font-size:13px; line-height:1.6; color:#475569;">
                        <div style="margin-bottom:12px;">
                            <div style="font-weight:700; color:#1e3a8a; margin-bottom:4px; font-size:12px; display:flex; align-items:center; gap:6px;">🔍 예상 원인</div>
                            <div style="padding-left:2px;">${defect.reason || '-'}</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <div style="font-weight:700; color:#1e3a8a; margin-bottom:4px; font-size:12px; display:flex; align-items:center; gap:6px;">🏭 내부 검토 항목 (생산)</div>
                            <div style="padding-left:2px; white-space:pre-wrap;">${defect.internal || '-'}</div>
                        </div>
                        <div>
                            <div style="font-weight:700; color:#1e3a8a; margin-bottom:4px; font-size:12px; display:flex; align-items:center; gap:6px;">💼 외부 검토 항목 (영업)</div>
                            <div style="padding-left:2px; white-space:pre-wrap;">${defect.external || '-'}</div>
                        </div>
                    </div>
                </div>
            `;
            defectGrid.appendChild(card);
        });
    }

    const addDefectBtn = document.getElementById('add-defect-btn');
    const defectModal = document.getElementById('defect-modal');
    if (addDefectBtn) {
        addDefectBtn.onclick = () => {
            document.getElementById('defect-id').value = '';
            document.getElementById('defect-form').reset();
            document.getElementById('defect-modal-title').textContent = '📷 신규 불량 등록';
            defectModal.style.display = 'flex';
        };
    }

    window.editDefect = (id) => {
        if (!isAdmin) {
            alert("관리자 권한이 필요합니다.");
            return;
        }
        const d = localDefects.find(x => x.id === id);
        if (!d) return;
        document.getElementById('defect-id').value = id;
        document.getElementById('defect-title').value = d.title;
        document.getElementById('defect-reason').value = d.reason;
        document.getElementById('defect-internal').value = d.internal;
        document.getElementById('defect-external').value = d.external;
        document.getElementById('defect-modal-title').textContent = '📷 불량 정보 수정';

        const form = document.getElementById('defect-form');
        if (form) {
            form.querySelectorAll('input, textarea, select').forEach(i => i.disabled = !isAdmin);
            const saveBtn = form.querySelector('button[type="submit"]');
            if (saveBtn) saveBtn.style.display = isAdmin ? 'block' : 'none';
        }

        defectModal.style.display = 'flex';
    };

    window.deleteDefect = (id) => {
        if (!isAdmin) {
            alert("관리자 권한이 필요합니다.");
            return;
        }
        if (confirm('이 불량 유형을 삭제하시겠습니까?')) {
            db.collection("defects").doc(id).delete()
                .then(loadLocalDefects)
                .catch(err => alert("삭제 실패: " + err.message));
        }
    };

    // --- [6.1 불량 유형 저장 로직 추가] ---
    const defectForm = document.getElementById('defect-form');
    if (defectForm) {
        defectForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('defect-id').value;
            const photoFile = document.getElementById('defect-photo').files[0];
            let photoUrl = null;

            // 로딩 표시
            const submitBtn = defectForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '저장 중...';
            submitBtn.disabled = true;

            try {
                if (photoFile) {
                    const ref = storage.ref(`defects/${Date.now()}_${photoFile.name}`);
                    await ref.put(photoFile);
                    photoUrl = await ref.getDownloadURL();
                }

                const defectData = {
                    title: document.getElementById('defect-title').value,
                    reason: document.getElementById('defect-reason').value,
                    internal: document.getElementById('defect-internal').value,
                    external: document.getElementById('defect-external').value,
                    updatedAt: new Date().toISOString()
                };

                if (photoUrl) defectData.photo = photoUrl;

                if (id) {
                    await db.collection("defects").doc(id).update(defectData);
                } else {
                    defectData.createdAt = new Date().toISOString();
                    await db.collection("defects").add(defectData);
                }

                alert('저장되었습니다.');
                defectModal.style.display = 'none';
                loadLocalDefects();
            } catch (err) {
                alert('저장 오류: ' + err.message);
                console.error(err);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        };
    }

    // --- [7. VOC 관리 & 대시보드] ---
    const vocListBody = document.getElementById('voc-list-body');
    const vocForm = document.getElementById('voc-form');
    const vocPaginationEl = document.getElementById('voc-pagination');
    const vocMonthFilterEl = document.getElementById('voc-month-filter');
    let lineChart, catChart, monthlyChart, marketChart, teamChart, costChart, defectTypeChart;
    let globalGridData = {};
    let isGlobalGridEditMode = false;
    let isPaintingGrid = false;
    let currentPaintStatus = 0;


    if (vocMonthFilterEl) {
        vocMonthFilterEl.onchange = (e) => {
            vocMonthFilter = e.target.value;
            vocCurrentPage = 1;
            renderVocTable();
        };
    }

    const dashPeriodFilter = document.getElementById('dash-period-filter');
    if (dashPeriodFilter) {
        dashPeriodFilter.onchange = () => updateDashboard();
    }

    function loadLocalComplaints() {
        if (!db) {
            console.error("Firebase DB not initialized.");
            return;
        }
        db.collection("complaints").orderBy("createdAt", "desc").get().then(snap => {
            localComplaints = [];
            snap.forEach(doc => localComplaints.push({ id: doc.id, ...doc.data() }));

            updateVocMonthFilterOptions();
            updateDashFilterOptions();
            renderVocTable();
            updateDashboard();
        }).catch(err => {
            console.error("Error loading complaints:", err);
            if (vocListBody) {
                vocListBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--danger);">데이터를 불러오지 못했습니다: ${err.message}</td></tr>`;
            }
        });
    }

    function updateVocMonthFilterOptions() {
        if (!vocMonthFilterEl) return;
        const months = [...new Set(localComplaints.map(v => v.receiptDate ? v.receiptDate.substring(0, 7) : ""))].filter(m => m).sort().reverse();
        let html = '<option value="all">전체 내역</option>';
        months.forEach(m => {
            html += `<option value="${m}">${m.split('-')[0]}년 ${m.split('-')[1]}월</option>`;
        });
        vocMonthFilterEl.innerHTML = html;
        vocMonthFilterEl.value = vocMonthFilter;
    }

    function updateDashFilterOptions() {
        const dashPeriodFilter = document.getElementById('dash-period-filter');
        if (!dashPeriodFilter) return;

        const receiptDates = localComplaints.map(v => v.receiptDate).filter(d => d);
        const years = [...new Set(receiptDates.map(d => d.substring(0, 4)))].sort().reverse();
        const months = [...new Set(receiptDates.map(d => d.substring(0, 7)))].sort().reverse();

        let html = '<option value="all">전체 (Overall)</option>';
        years.forEach(y => {
            html += `<option value="year-${y}">${y}년 전체 (Yearly)</option>`;
        });
        months.forEach(m => {
            const [y, mm] = m.split('-');
            html += `<option value="month-${m}">${y}년 ${mm}월 (Monthly)</option>`;
        });

        const currentVal = dashPeriodFilter.value;
        dashPeriodFilter.innerHTML = html;
        if (Array.from(dashPeriodFilter.options).some(o => o.value === currentVal)) {
            dashPeriodFilter.value = currentVal;
        } else {
            dashPeriodFilter.value = 'all';
        }
    }

    function renderVocTable() {
        if (!vocListBody) return;

        // 1. Filter
        let filtered = localComplaints;
        if (vocMonthFilter !== 'all') {
            filtered = localComplaints.filter(v => v.receiptDate && v.receiptDate.startsWith(vocMonthFilter));
        }

        // 2. Pagination Calculation
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / vocItemsPerPage);

        // 현재 페이지가 전체 페이지보다 크면 조정
        if (vocCurrentPage > totalPages && totalPages > 0) vocCurrentPage = totalPages;

        const startIdx = (vocCurrentPage - 1) * vocItemsPerPage;
        const pagedItems = filtered.slice(startIdx, startIdx + vocItemsPerPage);

        vocListBody.innerHTML = filtered.length === 0 ? '<tr><td colspan="10" style="text-align:center; padding:60px; color:#94a3b8; font-size:14px;">현재 등록된 고객불만 내역이 없습니다.</td></tr>' : '';

        pagedItems.forEach((v, idx) => {
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.2s;';
            tr.onmouseover = () => tr.style.background = '#f8fafc';
            tr.onmouseout = () => tr.style.background = 'transparent';
            tr.onclick = () => openVocModal(v.id);

            const rowColor = v.category === '클레임' ? '#ef4444' : '#f59e0b';
            const managerDisplay = (v.team ? `<div class="voc-manager-team" style="color:#64748b; font-size:11px; margin-bottom:1px; line-height:1.2;">[${v.team}]</div>` : '') + `<div class="voc-manager-name" style="font-weight:600; color:#334155; line-height:1.2;">${v.manager}</div>`;

            tr.innerHTML = `
                <td style="padding:10px 8px; text-align:center;">
                    <span style="background:${rowColor}10; color:${rowColor}; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; border:1px solid ${rowColor}20;">${v.category}</span>
                </td>
                <td style="padding:10px 8px; text-align:center; font-size:13px; color:#64748b; white-space:nowrap;">${v.receiptDate}</td>
                <td style="padding:10px 8px; font-weight:700; color:#1e293b; text-align:center;">${v.customer}</td>
                <td style="padding:10px 8px; text-align:center; color:#475569; vertical-align:middle;">${managerDisplay}</td>
                <td style="padding:10px 8px; text-align:center;"><span style="font-weight:700; color:#1e3a8a; background:#eff6ff; padding:2px 8px; border-radius:4px; font-size:12px;">${v.line}</span></td>
                <td style="padding:10px 8px; text-align:center; color:#334155; font-weight:500; white-space:nowrap;">${v.color || '-'}</td>
                <td class="voc-title-cell" style="padding:10px 8px; color:#334155; font-weight:500; text-align:center; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</td>
                <td style="padding:10px 14px; text-align:center;"><span class="voc-status ${v.status === '완료' ? 'status-done' : 'status-pending'}" style="font-size:11px;">${v.status}</span></td>
                <td style="padding:10px 14px; text-align:center;">
                    <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                        <button title="국문 리포트(PPT)" style="border:1px solid #cbd5e1; background:#fff; color:#1e293b; width:28px; height:28px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'" onclick="event.stopPropagation(); exportVocPPT(event, 'kor', '${v.id}')">
                            <span style="font-size:10px; font-weight:700;">KR</span>
                        </button>
                        <button title="영문 리포트(PPT)" style="border:1px solid #cbd5e1; background:#fff; color:#1e293b; width:28px; height:28px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'" onclick="event.stopPropagation(); exportVocPPT(event, 'eng', '${v.id}')">
                            <span style="font-size:10px; font-weight:700;">EN</span>
                        </button>
                    </div>
                </td>
                <td style="padding:10px 14px; text-align:center;">
                    <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                        <button class="voc-admin-only" style="border:none; background:#e0f2fe; color:#0284c7; width:28px; height:28px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'" onclick="event.stopPropagation(); openVocModal('${v.id}')">
                            <i class="fas fa-edit" style="font-size:12px;"></i>
                        </button>
                        <button class="voc-super-admin-only" style="border:none; background:#fee2e2; color:#ef4444; width:28px; height:28px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'" onclick="event.stopPropagation(); deleteVoc('${v.id}')">
                            <i class="fas fa-trash-alt" style="font-size:12px;"></i>
                        </button>
                    </div>
                </td>`;
            vocListBody.appendChild(tr);
        });

        renderVocPagination(totalPages);
    }

    function renderVocPagination(totalPages) {
        if (!vocPaginationEl) return;
        vocPaginationEl.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = vocCurrentPage === 1;
        prevBtn.onclick = () => { if (vocCurrentPage > 1) { vocCurrentPage--; renderVocTable(); } };
        vocPaginationEl.appendChild(prevBtn);

        // Page Numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${vocCurrentPage === i ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => { vocCurrentPage = i; renderVocTable(); };
            vocPaginationEl.appendChild(pageBtn);
        }

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = vocCurrentPage === totalPages;
        nextBtn.onclick = () => { if (vocCurrentPage < totalPages) { vocCurrentPage++; renderVocTable(); } };
        vocPaginationEl.appendChild(nextBtn);
    }

    const vocModal = document.getElementById('voc-modal');
    let currentVocId = null;

    window.openVocModal = (id) => {
        const v = localComplaints.find(x => x.id === id);
        if (!v || !vocModal) return;
        currentVocId = id;

        // 필드 데이터 매핑 (접수 및 처리 정보 전체)
        const fields = {
            'modal-edit-category': v.category,
            'modal-edit-market': v.market,
            // Normalize dates for input type="date"
            'modal-edit-receiptDate': (v.receiptDate || '').replace(/\./g, '-'),
            'modal-edit-customer': v.customer,
            'modal-edit-team': v.team || '',
            'modal-edit-manager': v.manager,
            'modal-edit-spec': v.spec,
            'modal-edit-color': v.color,
            'modal-edit-batch': v.batch,
            'modal-edit-line': v.line,
            'modal-edit-prodDate': (v.prodDate || '').replace(/\./g, '-'),
            'modal-edit-delivery-qty': v.deliveryQty,
            'modal-edit-complaint-qty': v.complaintQty,
            'modal-edit-defect-type': v.defectType || '',
            'modal-edit-title': v.title,
            'modal-edit-description': v.description || '',

            'modal-reply-manager': v.replyManager || '',
            'modal-reply-cost': v.cost ? (parseInt(v.cost.toString().replace(/[^0-9]/g, '')) || 0).toLocaleString() : '',
            'modal-reply-cause': v.replyCause || '',
            'modal-reply-countermeasure': v.replyCountermeasure || '',
            'modal-reply-evaluation': v.replyEvaluation || '',
            'modal-reply-status': v.status || '접수'
        };

        for (const [fid, val] of Object.entries(fields)) {
            const el = document.getElementById(fid);
            if (el) el.value = val || '';
        }

        // 사진 및 어노테이션 처리
        const photoContainer = document.getElementById('modal-edit-photo-container');
        const mediaGallery = document.getElementById('modal-voc-media-gallery');
        const imgPreview = document.getElementById('modal-edit-photo-preview');
        const videoPreview = document.getElementById('modal-edit-video-preview');
        const mediaList = v.media || (v.photo ? [{ url: v.photo, type: 'image' }] : []);

        if (photoContainer && mediaGallery) {
            photoContainer.style.display = (isAdmin || isVocAuthenticated || mediaList.length > 0) ? 'block' : 'none';
            mediaGallery.innerHTML = '';

            if (mediaList.length > 0) {
                mediaList.forEach((m, idx) => {
                    const thumb = document.createElement('div');
                    thumb.className = 'media-preview-item';
                    thumb.style.cursor = 'pointer';
                    thumb.style.position = 'relative';
                    thumb.style.border = idx === 0 ? '2px solid var(--primary)' : '1px solid #e2e8f0';

                    if (m.type === 'video') {
                        thumb.innerHTML = `<video src="${m.url}" style="width:100%; height:100%; object-fit:cover;"></video><span style="position:absolute; bottom:2px; right:2px; font-size:10px; color:white; background:rgba(0,0,0,0.5); padding:0 2px;">▶</span>`;
                    } else {
                        thumb.innerHTML = `<img src="${m.url}" style="width:100%; height:100%; object-fit:cover;">`;
                    }

                    // 삭제 버튼 (관리자만 표시)
                    if (isAdmin) {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.innerHTML = '✕';
                        deleteBtn.title = '이 미디어 삭제';
                        deleteBtn.style.cssText = 'position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; border:none; background:#ef4444; color:white; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10; box-shadow:0 2px 6px rgba(0,0,0,0.3); transition:transform 0.15s, background 0.15s; line-height:1; padding:0;';
                        deleteBtn.onmouseover = () => { deleteBtn.style.background = '#dc2626'; deleteBtn.style.transform = 'scale(1.15)'; };
                        deleteBtn.onmouseout = () => { deleteBtn.style.background = '#ef4444'; deleteBtn.style.transform = 'scale(1)'; };
                        deleteBtn.onclick = async (e) => {
                            e.stopPropagation();
                            if (!confirm('이 미디어를 삭제하시겠습니까?')) return;
                            deleteBtn.innerHTML = '⏳';
                            deleteBtn.disabled = true;
                            try {
                                // 1. Storage에서 파일 삭제
                                try {
                                    const fileRef = storage.refFromURL(m.url);
                                    await fileRef.delete();
                                } catch (storageErr) {
                                    console.warn('Storage 파일 삭제 실패 (이미 삭제되었을 수 있음):', storageErr);
                                }
                                // 2. Firestore에서 media 배열 업데이트
                                const currentDoc = await db.collection("complaints").doc(currentVocId).get();
                                const currentData = currentDoc.data();
                                const updatedMedia = (currentData.media || []).filter(item => item.url !== m.url);
                                const updatedPhoto = updatedMedia.find(item => item.type === 'image')?.url || (updatedMedia.length > 0 ? updatedMedia[0].url : null);
                                await db.collection("complaints").doc(currentVocId).update({
                                    media: updatedMedia,
                                    photo: updatedPhoto
                                });
                                // 3. 로컬 데이터 갱신 후 모달 다시 열기
                                const localIdx = localComplaints.findIndex(x => x.id === currentVocId);
                                if (localIdx !== -1) {
                                    localComplaints[localIdx].media = updatedMedia;
                                    localComplaints[localIdx].photo = updatedPhoto;
                                }
                                openVocModal(currentVocId);
                            } catch (err) {
                                alert('미디어 삭제 실패: ' + err.message);
                                deleteBtn.innerHTML = '✕';
                                deleteBtn.disabled = false;
                            }
                        };
                        thumb.appendChild(deleteBtn);
                    }

                    thumb.onclick = () => {
                        // 모든 썸네일 테두리 초기화
                        mediaGallery.querySelectorAll('.media-preview-item').forEach(t => t.style.border = '1px solid #e2e8f0');
                        thumb.style.border = '2px solid var(--primary)';

                        // 메인 프리뷰 전환
                        if (m.type === 'video') {
                            imgPreview.style.display = 'none';
                            videoPreview.src = m.url;
                            videoPreview.style.display = 'block';
                        } else {
                            videoPreview.style.display = 'none';
                            videoPreview.src = '';
                            imgPreview.src = m.url;
                            imgPreview.style.display = 'block';
                        }
                    };
                    mediaGallery.appendChild(thumb);
                });

                // 첫 번째 항목 자동 선택
                mediaGallery.children[0].click();
            } else {
                imgPreview.style.display = 'none';
                videoPreview.style.display = 'none';

            }
        }

        updateRecommendedActions();
        vocModal.style.display = 'flex';
        vocModal.querySelectorAll('input, select, textarea').forEach(i => i.disabled = !(isAdmin || isVocAuthenticated));
        const saveBtn = document.getElementById('modal-voc-save-btn');
        if (saveBtn) saveBtn.style.display = (isAdmin || isVocAuthenticated) ? 'block' : 'none';
    };

    // --- [미디어 프리뷰 및 업로드 로직] ---
    const vocPhotoInput = document.getElementById('voc-photo');
    const vocPreviewContainer = document.getElementById('voc-media-preview-container');
    let vocSelectedFiles = [];

    if (vocPhotoInput) {
        vocPhotoInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            vocSelectedFiles = files;
            renderPreview(files, vocPreviewContainer);
        };
    }

    function renderPreview(files, container) {
        if (!container) return;
        container.innerHTML = '';
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const item = document.createElement('div');
                item.className = 'media-preview-item';

                if (file.type.startsWith('image/')) {
                    item.innerHTML = `<img src="${event.target.result}">`;
                } else {
                    item.innerHTML = `<video src="${event.target.result}"></video><span style="position:absolute; bottom:2px; right:2px; font-size:10px; color:white; background:rgba(0,0,0,0.5); padding:0 2px;">▶</span>`;
                }

                container.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    async function uploadMultipleMedia(files) {
        const results = [];
        for (const file of files) {
            const ref = storage.ref(`complaints/${Date.now()}_${file.name}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            results.push({
                url,
                type: file.type.startsWith('video') ? 'video' : 'image',
                name: file.name
            });
        }
        return results;
    }

    // --- VOC 신규 등록 및 수정 로직 복구 ---
    if (vocForm) {
        vocForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.querySelector('button[form="voc-form"]') || vocForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...';
                submitBtn.disabled = true;
            }

            try {
                const mediaItems = await uploadMultipleMedia(vocSelectedFiles);
                const primaryPhoto = mediaItems.find(m => m.type === 'image')?.url || (mediaItems.length > 0 ? mediaItems[0].url : null);

                const vocData = {
                    category: document.getElementById('voc-category').value,
                    market: document.getElementById('voc-market').value,
                    receiptDate: document.getElementById('voc-receipt-date').value,
                    customer: document.getElementById('voc-customer').value,
                    team: document.getElementById('voc-team').value,
                    manager: document.getElementById('voc-manager').value,
                    spec: document.getElementById('voc-spec').value,
                    color: document.getElementById('voc-color').value,
                    batch: document.getElementById('voc-batch').value,
                    line: document.getElementById('voc-line').value,
                    prodDate: document.getElementById('voc-prod-date').value,
                    defectType: document.getElementById('voc-defect-type').value,
                    deliveryQty: document.getElementById('voc-delivery-qty').value,
                    complaintQty: document.getElementById('voc-complaint-qty').value,
                    title: document.getElementById('voc-title').value,
                    description: document.getElementById('voc-desc').value,
                    photo: primaryPhoto, // 호환성을 위해 첫 번째 사진 유지
                    media: mediaItems,   // 전체 미디어 배열 저장
                    status: '접수',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection("complaints").add(vocData);
                alert('VOC가 성공적으로 접수되었습니다.');
                vocForm.reset();
                if (vocPreviewContainer) vocPreviewContainer.innerHTML = '';
                vocSelectedFiles = [];
                loadLocalComplaints();

                if (localNotifyEmails.length > 0) {
                    await sendVocNotification(vocData);
                }
            } catch (err) {
                alert('오류 발생: ' + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        };
    }

    const modalSaveBtn = document.getElementById('modal-voc-save-btn');
    if (modalSaveBtn) {
        modalSaveBtn.onclick = async () => {
            if (!currentVocId) return;
            const originalText = modalSaveBtn.textContent;
            modalSaveBtn.textContent = '저장 중...';
            modalSaveBtn.disabled = true;

            try {
                const photoInput = document.getElementById('modal-edit-photo-input');
                let newMediaItems = [];

                if (photoInput && photoInput.files && photoInput.files.length > 0) {
                    newMediaItems = await uploadMultipleMedia(Array.from(photoInput.files));
                }

                const currentVoc = localComplaints.find(v => v.id === currentVocId);
                let finalMedia = (currentVoc.media || []);
                if (currentVoc.photo && finalMedia.length === 0) {
                    finalMedia.push({ url: currentVoc.photo, type: 'image' });
                }
                finalMedia = [...finalMedia, ...newMediaItems];

                const updatedData = {
                    category: document.getElementById('modal-edit-category').value,
                    market: document.getElementById('modal-edit-market').value,
                    receiptDate: document.getElementById('modal-edit-receiptDate').value,
                    customer: document.getElementById('modal-edit-customer').value,
                    team: document.getElementById('modal-edit-team').value,
                    manager: document.getElementById('modal-edit-manager').value,
                    spec: document.getElementById('modal-edit-spec').value,
                    color: document.getElementById('modal-edit-color').value,
                    batch: document.getElementById('modal-edit-batch').value,
                    line: document.getElementById('modal-edit-line').value,
                    prodDate: document.getElementById('modal-edit-prodDate').value,
                    deliveryQty: document.getElementById('modal-edit-delivery-qty').value,
                    complaintQty: document.getElementById('modal-edit-complaint-qty').value,
                    defectType: document.getElementById('modal-edit-defect-type').value,
                    title: document.getElementById('modal-edit-title').value,
                    description: document.getElementById('modal-edit-description').value,

                    replyManager: document.getElementById('modal-reply-manager').value,
                    cost: document.getElementById('modal-reply-cost').value.toString().replace(/[^0-9]/g, ''),
                    replyCause: document.getElementById('modal-reply-cause').value,
                    replyCountermeasure: document.getElementById('modal-reply-countermeasure').value,
                    replyEvaluation: document.getElementById('modal-reply-evaluation').value,
                    status: document.getElementById('modal-reply-status').value,

                    media: finalMedia,
                    photo: finalMedia.find(m => m.type === 'image')?.url || (finalMedia.length > 0 ? finalMedia[0].url : null)
                };

                await db.collection("complaints").doc(currentVocId).update(updatedData);
                alert('변경 사항이 저장되었습니다.');
                vocModal.style.display = 'none';
                loadLocalComplaints();
            } catch (err) {
                alert('저장 실패: ' + err.message);
            } finally {
                modalSaveBtn.textContent = originalText;
                modalSaveBtn.disabled = false;
            }
        };
    }

    // 예상 손실 비용 입력 시 자동 콤마 포맷팅
    const costInput = document.getElementById('modal-reply-cost');
    if (costInput) {
        costInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value) {
                e.target.value = parseInt(value).toLocaleString();
            } else {
                e.target.value = '';
            }
        });
    }

    window.deleteVoc = async (id) => {
        if (!isAdmin) {
            alert("삭제 권한이 없습니다. (관리자 전용)");
            return;
        }
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            const doc = await db.collection("complaints").doc(id).get();
            const data = doc.data();
            if (data && data.photo) {
                try {
                    const fileRef = storage.refFromURL(data.photo);
                    await fileRef.delete();
                } catch (e) { console.warn("VOC photo already deleted or error:", e); }
            }
            // 전체 미디어 삭제 로직 추가 (필요시)
            if (data && data.media && data.media.length > 0) {
                for (const m of data.media) {
                    try {
                        const mRef = storage.refFromURL(m.url);
                        await mRef.delete();
                    } catch (e) { console.warn("Media delete error:", e); }
                }
            }
            await db.collection("complaints").doc(id).delete();
            loadLocalComplaints();
        } catch (err) {
            alert("삭제 실패: " + err.message);
        }
    };

    // 대시보드 필터 옵션 업데이트 함수
    function updateDashFilterOptions() {
        const filterSelect = document.getElementById('dash-period-filter');
        if (!filterSelect) return;

        const years = new Set();
        const months = new Set();

        localComplaints.forEach(v => {
            if (v.receiptDate) {
                const year = v.receiptDate.substring(0, 4);
                const month = v.receiptDate.substring(0, 7);
                years.add(year);
                months.add(month);
            }
        });

        // Clear existing options except 'all'
        filterSelect.innerHTML = '<option value="all">전체</option>';

        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        // Add "올해" and "이번 달" if applicable
        if (years.has(currentYear)) {
            const currentYearOption = document.createElement('option');
            currentYearOption.value = `year-${currentYear}`;
            currentYearOption.textContent = `${currentYear}년`;
            filterSelect.appendChild(currentYearOption);
        }
        if (months.has(currentMonth)) {
            const currentMonthOption = document.createElement('option');
            currentMonthOption.value = `month-${currentMonth}`;
            currentMonthOption.textContent = `${currentMonth}월`;
            filterSelect.appendChild(currentMonthOption);
        }

        // Add options for each unique year
        Array.from(years).sort((a, b) => b.localeCompare(a)).forEach(year => {
            if (year !== currentYear) { // Avoid duplication if "올해" is already added
                const option = document.createElement('option');
                option.value = `year-${year}`;
                option.textContent = `${year}년`;
                filterSelect.appendChild(option);
            }
        });

        // Add options for each unique month
        Array.from(months).sort((a, b) => b.localeCompare(a)).forEach(month => {
            if (month !== currentMonth) { // Avoid duplication if "이번 달" is already added
                const option = document.createElement('option');
                option.value = `month-${month}`;
                option.textContent = `${month}월`;
                filterSelect.appendChild(option);
            }
        });
    }

    function updateDashboard() {
        if (!document.getElementById('dash-total-count')) return;

        // [Filter Logic] 선택된 기간에 따라 데이터 필터링
        const periodValue = document.getElementById('dash-period-filter')?.value || 'all';
        let filteredData = localComplaints;

        if (periodValue.startsWith('year-')) {
            const y = periodValue.replace('year-', '');
            filteredData = localComplaints.filter(v => v.receiptDate && v.receiptDate.startsWith(y));
        } else if (periodValue.startsWith('month-')) {
            const m = periodValue.replace('month-', '');
            filteredData = localComplaints.filter(v => v.receiptDate && v.receiptDate.startsWith(m));
        }

        // 정렬: 접수일자 기준 내림차순 (대시보드 표시용)
        const displayData = [...filteredData].sort((a, b) => {
            const da = a.receiptDate || '';
            const db = b.receiptDate || '';
            return db.localeCompare(da);
        });

        const total = displayData.length;
        const pending = displayData.filter(v => v.status !== '완료').length;
        const completeRate = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;

        document.getElementById('dash-total-count').textContent = total + " EA";
        document.getElementById('dash-pending-count').textContent = pending + " EA";
        document.getElementById('dash-completion-rate').textContent = completeRate + "%";

        // 비용 합계 계산
        const totalCost = displayData.reduce((acc, v) => {
            const val = v.cost ? v.cost.toString().replace(/[^0-9]/g, '') : 0;
            return acc + (parseInt(val) || 0);
        }, 0);
        document.getElementById('dash-total-cost').textContent = totalCost.toLocaleString() + " 원";

        if (typeof Chart === 'undefined') return;
        if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

        // [1] 라인별 발생 현황 (Bar)
        const lineMap = { 'CPL': 0, 'CRM': 0, 'CGL': 0, '1CCL': 0, '2CCL': 0, '3CCL': 0, 'SSCL': 0 };
        displayData.forEach(v => { if (lineMap.hasOwnProperty(v.line)) lineMap[v.line]++; });

        const lineCtx = document.getElementById('lineChart');
        if (lineCtx) {
            if (lineChart) lineChart.destroy();
            lineChart = new Chart(lineCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(lineMap),
                    datasets: [{
                        label: '발생 건수',
                        data: Object.values(lineMap),
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: '#2563eb',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, datalabels: { color: '#475569', anchor: 'end', align: 'top', formatter: Math.round } },
                    scales: { y: { beginAtZero: true, grace: '15%', grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
                }
            });
        }

        // [2] 클레임/컴플레인 비중 (Doughnut)
        const catMap = { '클레임': 0, '컴플레인': 0 };
        displayData.forEach(v => { if (catMap.hasOwnProperty(v.category)) catMap[v.category]++; });

        const catCtx = document.getElementById('categoryChart');
        if (catCtx) {
            if (catChart) catChart.destroy();
            catChart = new Chart(catCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(catMap),
                    datasets: [{
                        data: Object.values(catMap),
                        backgroundColor: ['#ef4444', '#f59e0b'],
                        borderWidth: 2, borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '65%',
                    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } }, datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (v) => v > 0 ? v + '건' : '' } }
                }
            });
        }

        // [3] 월별 VOC 발생 추이 (Line)
        const monthlyMap = {};
        displayData.forEach(v => {
            if (v.receiptDate) {
                const mStr = v.receiptDate.substring(0, 7);
                monthlyMap[mStr] = (monthlyMap[mStr] || 0) + 1;
            }
        });
        const sortedMonths = Object.keys(monthlyMap).sort().slice(-6); // 최근 6개월

        const monthlyCtx = document.getElementById('monthlyTrendChart');
        if (monthlyCtx) {
            if (monthlyChart) monthlyChart.destroy();
            monthlyChart = new Chart(monthlyCtx, {
                type: 'line',
                data: {
                    labels: sortedMonths,
                    datasets: [{
                        label: 'VOC 발생건수',
                        data: sortedMonths.map(m => monthlyMap[m]),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#8b5cf6'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, datalabels: { align: 'top', color: '#8b5cf6', font: { weight: 'bold' } } },
                    scales: { y: { beginAtZero: true, grace: '15%', grid: { color: '#f1f5f9' } } }
                }
            });
        }

        // [4] 내수 vs 수출 비중 (Pie)
        const marketMap = { '내수': 0, '수출': 0 };
        displayData.forEach(v => { if (marketMap.hasOwnProperty(v.market)) marketMap[v.market]++; });

        const marketCtx = document.getElementById('marketShareChart');
        if (marketCtx) {
            if (marketChart) marketChart.destroy();
            marketChart = new Chart(marketCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(marketMap),
                    datasets: [{
                        data: Object.values(marketMap),
                        backgroundColor: ['#3b82f6', '#10b981'],
                        borderWidth: 2, borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } }, datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (v) => v > 0 ? v + '건' : '' } }
                }
            });
        }

        // [5] 담당 팀별 VOC 현황 (Horizontal Bar)
        const teamMap = { '영업1팀': 0, '영업2팀': 0, '수출팀': 0 };
        displayData.forEach(v => { if (v.team && teamMap.hasOwnProperty(v.team)) teamMap[v.team]++; });

        const teamCtx = document.getElementById('teamShareChart');
        if (teamCtx) {
            if (teamChart) teamChart.destroy();
            teamChart = new Chart(teamCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(teamMap),
                    datasets: [{
                        label: '팀별 건수',
                        data: Object.values(teamMap),
                        backgroundColor: 'rgba(20, 184, 166, 0.7)',
                        borderColor: '#14b8a6',
                        borderWidth: 1, borderRadius: 5
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'right', color: '#14b8a6', font: { weight: 'bold' } } },
                    scales: { x: { beginAtZero: true, grace: '15%', grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
                }
            });
        }

        // [6] 라인별 예상 손실 비용 (Bar)
        const lineCostMap = { 'CPL': 0, 'CRM': 0, 'CGL': 0, '1CCL': 0, '2CCL': 0, '3CCL': 0, 'SSCL': 0 };
        const lineCountMap = { 'CPL': 0, 'CRM': 0, 'CGL': 0, '1CCL': 0, '2CCL': 0, '3CCL': 0, 'SSCL': 0 };
        displayData.forEach(v => {
            if (v.line && lineCostMap.hasOwnProperty(v.line)) {
                const val = v.cost ? v.cost.toString().replace(/[^0-9]/g, '') : '0';
                lineCostMap[v.line] += (parseInt(val) || 0);
                lineCountMap[v.line]++;
            }
        });

        // 비용 합계가 0이면 발생 건수 기반으로 차트 표시
        const hasCostData = Object.values(lineCostMap).some(v => v > 0);
        const lineCostChartData = hasCostData ? Object.values(lineCostMap) : Object.values(lineCountMap);
        const lineCostChartLabel = hasCostData ? '손실 비용(원)' : '발생 건수';
        const lineCostUnit = hasCostData ? ' 원' : ' 건';

        const costCtx = document.getElementById('lineCostChart');
        if (costCtx) {
            if (costChart) costChart.destroy();
            costChart = new Chart(costCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(lineCostMap),
                    datasets: [{
                        label: lineCostChartLabel,
                        data: lineCostChartData,
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: '#ef4444',
                        borderWidth: 1, borderRadius: 5
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        datalabels: {
                            anchor: 'end', align: 'top', color: '#ef4444', font: { weight: 'bold', size: 10 },
                            formatter: (v) => v > 0 ? (hasCostData ? v.toLocaleString() + ' 원' : v + ' 건') : ''
                        }
                    },
                    layout: { padding: { top: 30 } },
                    scales: { y: { beginAtZero: true, grace: '30%', grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
                }
            });
        }

        // [7] 불량 유형별 비용 분석 (Idea #2)
        // [7] 불량 유형별 비용 분석 (Idea #2)
        // VOC 폼에서 사용하는 기본 불량 유형들을 먼저 포함
        const defectMap = {
            '도장박리': 0, '색차': 0, '스크래치': 0, '오염': 0,
            '광택불량': 0, '가공크랙': 0, '형상불량': 0, '기타': 0
        };
        // 도감에 등록된 추가 유형도 포함
        localDefects.forEach(d => { if (d.title && !defectMap.hasOwnProperty(d.title)) defectMap[d.title] = 0; });

        displayData.forEach(v => {
            let dType = v.defectType || '기타';
            // [Fix] 정규화: '도장박리 (Peeling)' -> '도장박리' 형태로 변환하여 매핑 성공률 제고
            if (dType.includes('(')) {
                dType = dType.split('(')[0].trim();
            }

            const costVal = v.cost ? v.cost.toString().replace(/[^0-9]/g, '') : 0;
            const parsedCost = parseInt(costVal) || 0;

            if (defectMap.hasOwnProperty(dType)) {
                defectMap[dType] += parsedCost;
            } else {
                // 도감에 없는 유형은 기타로 합산
                defectMap['기타'] += parsedCost;
            }
        });

        // 비용이 0보다 큰 항목만 필터링 후 비용 순으로 정렬
        let filteredDefectLabels = Object.keys(defectMap).filter(k => defectMap[k] > 0).sort((a, b) => defectMap[b] - defectMap[a]);
        let filteredDefectValues = filteredDefectLabels.map(k => defectMap[k]);
        let defectChartIsCostBased = true;

        // 비용이 모두 0원이면, 발생 건수로 대체하여 차트 표시
        if (filteredDefectLabels.length === 0 && total > 0) {
            defectChartIsCostBased = false;
            const defectCountMap = {};
            displayData.forEach(v => {
                let dType = v.defectType || '기타';
                if (dType.includes('(')) dType = dType.split('(')[0].trim();
                defectCountMap[dType] = (defectCountMap[dType] || 0) + 1;
            });
            filteredDefectLabels = Object.keys(defectCountMap).sort((a, b) => defectCountMap[b] - defectCountMap[a]);
            filteredDefectValues = filteredDefectLabels.map(k => defectCountMap[k]);
        }

        const defectCtx = document.getElementById('defectTypeChart');
        if (defectCtx) {
            if (defectTypeChart) defectTypeChart.destroy();
            defectTypeChart = new Chart(defectCtx, {
                type: 'bar',
                data: {
                    labels: filteredDefectLabels,
                    datasets: [{
                        label: defectChartIsCostBased ? '손실 금액' : '발생 건수',
                        data: filteredDefectValues,
                        backgroundColor: 'rgba(245, 158, 11, 0.7)',
                        borderColor: '#f59e0b',
                        borderWidth: 1, borderRadius: 5
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'right', color: '#f59e0b', font: { weight: 'bold' }, formatter: (v) => v > 0 ? (defectChartIsCostBased ? v.toLocaleString() + ' 원' : v + ' 건') : '' } },
                    layout: { padding: { right: 80 } },
                    scales: { x: { beginAtZero: true, grace: '35%', grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
                }
            });
        }

        // Recent Top 5 List (필터링된 데이터 중 최근 5건)
        const recentList = document.getElementById('dash-recent-list');
        if (recentList) {
            recentList.innerHTML = displayData.slice(0, 5).map(v => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px; font-size:13px; font-weight:600; text-align:center;">${v.customer}</td>
                    <td style="padding:8px; font-size:13px; color:#475569; text-align:center;">${v.title}</td>
                    <td style="padding:8px; text-align:center;"><span class="voc-status ${v.status === '완료' ? 'status-done' : 'status-pending'}" style="padding:2px 8px; font-size:10px;">${v.status}</span></td>
                    <td style="padding:8px; font-size:12px; color:#94a3b8; text-align:center;">${v.receiptDate}</td>
                </tr>
            `).join('');
            if (displayData.length === 0) recentList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8; font-size:12px;">현황 없음</td></tr>';
        }

        // --- Dashboard Interpretation Logic ---
        const updateInterpretation = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = text;
        };

        // 1. Line Chart Analysis (공정별 부적합 발생 빈도 해석)
        let lineAnalysis = "";
        if (total > 0) {
            const lines = Object.keys(lineMap).filter(l => lineMap[l] > 0).sort((a, b) => lineMap[b] - lineMap[a]);
            const topLines = lines.slice(0, 2).map(l => `<strong>${l}</strong>(${lineMap[l]}건)`).join(', ');
            lineAnalysis = `공정별 부적합 발생 빈도 분석 결과, <strong>${topLines}</strong> 라인에서 상대적으로 높은 발생률이 탐지되었습니다.`;
            updateInterpretation('lineChart-desc', lineAnalysis);
        } else {
            updateInterpretation('lineChart-desc', '안정적 공정 유지 상태: 분석 가능한 데이터가 존재하지 않습니다.');
        }

        // 2. Category Analysis (품질 리스크 비중 해석)
        let catAnalysis = "";
        if (total > 0) {
            const claimCount = catMap['클레임'] || 0;
            const claimRatio = Math.round((claimCount / total) * 100);
            catAnalysis = `클레임 발생 건수는 <strong>${claimCount}건</strong>(점유율 ${claimRatio}%)이며, 현재 <strong>${claimRatio > 50 ? '중대 클레임 위주' : '일반 컴플레인 위주'}</strong>의 품질 현황을 나타내고 있습니다.`;
            updateInterpretation('categoryChart-desc', catAnalysis);
        }

        // 3. Monthly Trend Analysis (품질 추세 해석)
        let trendAnalysis = "";
        if (sortedMonths.length >= 1) {
            const avgCount = (total / sortedMonths.length).toFixed(1);
            trendAnalysis = `구간 내 월평균 발생률은 <strong>${avgCount}건</strong>입니다. `;
            if (sortedMonths.length >= 2) {
                const latest = monthlyMap[sortedMonths[sortedMonths.length - 1]];
                const silver = monthlyMap[sortedMonths[sortedMonths.length - 2]];
                const diff = latest - silver;
                trendAnalysis += `최근 1개월간 전월 대비 <strong>${diff > 0 ? diff + '건 상승' : diff < 0 ? Math.abs(diff) + '건 하락' : '변동 없음'}</strong> 추세를 보이고 있습니다.`;
            }
            updateInterpretation('monthlyTrendChart-desc', trendAnalysis);
        }

        // 4. Market Analysis (시장별 비중 해석)
        let marketAnalysis = "";
        if (total > 0) {
            const domestic = marketMap['내수'] || 0;
            const exportC = marketMap['수출'] || 0;
            marketAnalysis = `내수(<strong>${domestic}건</strong>)와 수출(<strong>${exportC}건</strong>) 클레임 접수 현황이 집계되었으며, <strong>${domestic >= exportC ? '국내 고객사' : '해외 수출품'}</strong>에서 상대적으로 많은 품질 이슈가 발생하고 있습니다.`;
            updateInterpretation('marketShareChart-desc', marketAnalysis);
        }

        // 5. Team Analysis (조직별 대응 현황 해석)
        if (total > 0) {
            const teams = Object.keys(teamMap).filter(t => teamMap[t] > 0).sort((a, b) => teamMap[b] - teamMap[a]);
            if (teams.length > 0) {
                updateInterpretation('teamShareChart-desc', `<strong>${teams[0]}</strong>에 가장 많은 VOC가 접수되었으며, 해당 조직을 중심으로 원인 분석 및 신속한 고객 대응이 필요한 상황입니다.`);
            }
        }

        // 6. Cost Analysis (손실 비용 비중 해석)
        let costAnalysis = "";
        if (totalCost > 0) {
            const costLines = Object.keys(lineCostMap).filter(l => lineCostMap[l] > 0).sort((a, b) => lineCostMap[b] - lineCostMap[a]);
            const topCostLine = costLines[0];
            const costRatio = Math.round((lineCostMap[topCostLine] / totalCost) * 100);
            costAnalysis = `실패 비용 분석 결과, <strong>${topCostLine}</strong> 라인이 전체 손실액의 <strong>${costRatio}%</strong>를 차지하여 집중 관리가 필요합니다.`;
        } else if (total > 0) {
            const countLines = Object.keys(lineCountMap).filter(l => lineCountMap[l] > 0).sort((a, b) => lineCountMap[b] - lineCountMap[a]);
            if (countLines.length > 0) {
                costAnalysis = `예상 손실 비용이 아직 입력되지 않아 <strong>발생 건수</strong> 기준으로 표시합니다. <strong>${countLines[0]}</strong> 라인에서 가장 많은 VOC가 발생했습니다. VOC 상세 정보에서 비용을 입력하면 비용 기반 분석이 제공됩니다.`;
            }
        } else {
            costAnalysis = "현재 집계된 VOC 데이터가 없습니다.";
        }
        updateInterpretation('lineCostChart-desc', costAnalysis);

        // 7. Defect Type Analysis (불량 유형 해석)
        let defectAnalysis = "";
        if (filteredDefectLabels.length > 0 && defectChartIsCostBased) {
            const topDefects = filteredDefectLabels.slice(0, 2).join(', ');
            defectAnalysis = `주요 결함 항목은 <strong>${topDefects}</strong>이며, 해당 유형에 대한 공정 점검 및 기술 표준 준수가 강화되어야 합니다.`;
        } else if (filteredDefectLabels.length > 0) {
            const topDefects = filteredDefectLabels.slice(0, 2).join(', ');
            defectAnalysis = `비용 미입력 상태로 <strong>발생 건수</strong> 기준 분석입니다. 주요 불량 유형은 <strong>${topDefects}</strong>이며, VOC 상세에서 비용을 입력하면 비용 기반 분석이 제공됩니다.`;
        } else {
            defectAnalysis = "분석 가능한 불량 유형 데이터가 없습니다.";
        }
        updateInterpretation('defectTypeChart-desc', defectAnalysis);

        // AI Integrated Insight (Disabled)

    }

    // --- [8. 수지별 품질 기준] ---
    const resinQualityData = {
        'RMP': [
            { item: '색차', condition: 'ΔE', criteria: '<span class="highlight-blue">M/C 대비 ΔE 1.20 이내</span><br><span class="note-text">(메탈릭 ΔE 1.50 이내)</span>' },
            { item: '색차', condition: '동일 LOT 색차', criteria: '<span class="highlight-blue">동일 LOT 제품 대비 ΔE 0.30 이내</span><span class="note-text">※ 같은 날 생산된 동일 컬러 기준 (Roll 교체 무관)</span>' },
            { item: '색차', condition: '타 LOT간 색차', criteria: '<span class="highlight-blue">요청 LOT 제품 대비 ΔE 0.50 이내</span><span class="note-text">※ 수요가 요청 시 대응, M/C 대비 기준은 별도 적용</span>' },
            { item: '도막', condition: '두께 측정\n(DJH / Meter)', criteria: '<span class="highlight-blue">지정 도막 ± 3μm</span><br><span class="note-text">(Matt/Wrinkle 제품은 별도 M/C 뒷면 범위 준수)</span>' },
            { item: '광택', condition: '60°\n(고정 광택계)', criteria: '<span class="criteria-item">71% 이상 : <span class="highlight-blue">±10</span></span><span class="criteria-item">51% ~ 70% : <span class="highlight-blue">±7</span></span><span class="criteria-item">50% 이하 : <span class="highlight-blue">±5</span></span>' },
            { item: '연필경도', condition: '연필 (미쓰비시)', criteria: '<span class="highlight-blue">H 이상</span><br><span class="note-text">(※ 광택도에 따라 기준 조정될 수 있음)</span>' },
            { item: 'M.E.K', condition: '상하 왕복 1회\n(100 ~ 150mm)', criteria: '<span class="criteria-item"><span class="highlight-blue">50회 이상</span> (일반)</span><span class="criteria-item"><span class="highlight-blue">20회 이상</span> (메탈릭)</span><span class="note-text">※ 프라이머 노출 시 종료</span>' },
            { item: 'C.C.E', condition: '10 X 10 X 6 mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 2T\n(≤ 0.4 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 3T\n(≥ 0.6 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내충격성', condition: '500g X 500mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내약품성', condition: '내산성 (5% HCl)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '내알칼리성\n(5% NaOH)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '판정 지표', criteria: '<span class="criteria-item"><span class="highlight-blue">Rust, Crack, 변색 : 이상 없을 것</span></span>' },
            { item: '내염수성\n(5% NaCl)', condition: 'Blister / Rust\n/ Scribe', criteria: '<span class="highlight-blue">500 Hr 경과 후</span><br><span class="criteria-item">각 항목 4점 이상</span><span class="criteria-item">Scribe 편측 2mm 이내 침투</span>' }
        ],
        'HPP': [
            { item: '색차', condition: 'ΔE', criteria: '<span class="highlight-blue">M/C 대비 ΔE 1.20 이내</span><br><span class="note-text">(메탈릭 ΔE 1.50 이내)</span>' },
            { item: '색차', condition: '동일 LOT 색차', criteria: '<span class="highlight-blue">동일 LOT 제품 대비 ΔE 0.30 이내</span><span class="note-text">※ 같은 날 생산된 동일 컬러 기준 (Roll 교체 무관)</span>' },
            { item: '색차', condition: '타 LOT간 색차', criteria: '<span class="highlight-blue">요청 LOT 제품 대비 ΔE 0.50 이내</span><span class="note-text">※ 수요가 요청 시 대응, M/C 대비 기준은 별도 적용</span>' },
            { item: '도막', condition: '두께 측정\n(DJH / Meter)', criteria: '<span class="highlight-blue">지정 도막 ± 3μm</span><br><span class="note-text">(Matt/Wrinkle 제품은 별도 M/C 뒷면 범위 준수)</span>' },
            { item: '광택', condition: '60°\n(고정 광택계)', criteria: '<span class="criteria-item">71% 이상 : <span class="highlight-blue">±10</span></span><span class="criteria-item">51% ~ 70% : <span class="highlight-blue">±7</span></span><span class="criteria-item">50% 이하 : <span class="highlight-blue">±5</span></span>' },
            { item: '연필경도', condition: '연필 (미쓰비시)', criteria: '<span class="highlight-blue">HB 이상</span><br><span class="note-text">(※ 광택도에 따라 기준 조정될 수 있음)</span>' },
            { item: 'M.E.K', condition: '상하 왕복 1회\n(100 ~ 150mm)', criteria: '<span class="criteria-item"><span class="highlight-blue">50회 이상</span> (일반)</span><span class="criteria-item"><span class="highlight-blue">20회 이상</span> (메탈릭)</span><span class="note-text">※ 프라이머 노출 시 종료</span>' },
            { item: 'C.C.E', condition: '10 X 10 X 6 mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 0T\n(≤ 0.4 mm)', criteria: '<span class="highlight-blue">도막 균열 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 1T\n(≥ 0.6 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내충격성', condition: '500g X 500mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내약품성', condition: '내산성 (5% HCl)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 보증 불가할 수 있음)</span>' },
            { item: '내약품성', condition: '내알칼리성\n(5% NaOH)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 보증 불가할 수 있음)</span>' },
            { item: '내약품성', condition: '판정 지표', criteria: '<span class="criteria-item"><span class="highlight-blue">Rust, Crack, 변색 : 이상 없을 것</span></span>' },
            { item: '내염수성\n(5% NaCl)', condition: 'Blister / Rust\n/ Scribe', criteria: '<span class="highlight-blue">240 Hr 경과 후</span><br><span class="criteria-item">각 항목 4점 이상</span><span class="criteria-item">Scribe 편측 2mm 이내 침투</span>' }
        ],
        'HDP': [
            { item: '색차', condition: 'ΔE', criteria: '<span class="highlight-blue">M/C 대비 ΔE 1.20 이내</span><br><span class="note-text">(메탈릭 ΔE 1.50 이내)</span>' },
            { item: '색차', condition: '동일 LOT 색차', criteria: '<span class="highlight-blue">동일 LOT 제품 대비 ΔE 0.30 이내</span><span class="note-text">※ 같은 날 생산된 동일 컬러 기준 (Roll 교체 무관)</span>' },
            { item: '색차', condition: '타 LOT간 색차', criteria: '<span class="highlight-blue">요청 LOT 제품 대비 ΔE 0.50 이내</span><span class="note-text">※ 수요가 요청 시 대응, M/C 대비 기준은 별도 적용</span>' },
            { item: '도막', condition: '두께 측정\n(DJH / Meter)', criteria: '<span class="highlight-blue">지정 도막 ± 3μm</span><br><span class="note-text">(Matt/Wrinkle 제품은 별도 M/C 뒷면 범위 준수)</span>' },
            { item: '광택', condition: '60°\n(고정 광택계)', criteria: '<span class="criteria-item">71% 이상 : <span class="highlight-blue">±10</span></span><span class="criteria-item">51% ~ 70% : <span class="highlight-blue">±7</span></span><span class="criteria-item">50% 이하 : <span class="highlight-blue">±5</span></span>' },
            { item: '연필경도', condition: '연필 (미쓰비시)', criteria: '<span class="highlight-blue">H 이상</span><br><span class="note-text">(※ 광택도에 따라 기준 조정될 수 있음)</span>' },
            { item: 'M.E.K', condition: '상하 왕복 1회\n(100 ~ 150mm)', criteria: '<span class="criteria-item"><span class="highlight-blue">50회 이상</span> (일반)</span><span class="criteria-item"><span class="highlight-blue">20회 이상</span> (메탈릭)</span><span class="note-text">※ 프라이머 노출 시 종료</span>' },
            { item: 'C.C.E', condition: '10 X 10 X 6 mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 2T\n(≤ 0.4 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 3T\n(≥ 0.6 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내충격성', condition: '500g X 500mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내약품성', condition: '내산성 (5% HCl)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '내알칼리성\n(5% NaOH)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '판정 지표', criteria: '<span class="criteria-item"><span class="highlight-blue">Rust, Crack, 변색 : 이상 없을 것</span></span>' },
            { item: '내염수성\n(5% NaCl)', condition: 'Blister / Rust\n/ Scribe', criteria: '<span class="highlight-blue">500 Hr 경과 후</span><br><span class="criteria-item">각 항목 4점 이상</span><span class="criteria-item">Scribe 편측 2mm 이내 침투</span>' }
        ],
        'SMP': [
            { item: '색차', condition: 'ΔE', criteria: '<span class="highlight-blue">M/C 대비 ΔE 1.20 이내</span><br><span class="note-text">(메탈릭 ΔE 1.50 이내)</span>' },
            { item: '색차', condition: '동일 LOT 색차', criteria: '<span class="highlight-blue">동일 LOT 제품 대비 ΔE 0.30 이내</span><span class="note-text">※ 같은 날 생산된 동일 컬러 기준 (Roll 교체 무관)</span>' },
            { item: '색차', condition: '타 LOT간 색차', criteria: '<span class="highlight-blue">요청 LOT 제품 대비 ΔE 0.50 이내</span><span class="note-text">※ 수요가 요청 시 대응, M/C 대비 기준은 별도 적용</span>' },
            { item: '도막', condition: '두께 측정\n(DJH / Meter)', criteria: '<span class="highlight-blue">지정 도막 ± 3μm</span><br><span class="note-text">(Matt/Wrinkle 제품은 별도 M/C 뒷면 범위 준수)</span>' },
            { item: '광택', condition: '60°\n(고정 광택계)', criteria: '<span class="criteria-item">71% 이상 : <span class="highlight-blue">±10</span></span><span class="criteria-item">51% ~ 70% : <span class="highlight-blue">±7</span></span><span class="criteria-item">50% 이하 : <span class="highlight-blue">±5</span></span>' },
            { item: '연필경도', condition: '연필 (미쓰비시)', criteria: '<span class="highlight-blue">H 이상</span><br><span class="note-text">(※ 광택도에 따라 기준 조정될 수 있음)</span>' },
            { item: 'M.E.K', condition: '상하 왕복 1회\n(100 ~ 150mm)', criteria: '<span class="criteria-item"><span class="highlight-blue">50회 이상</span> (일반)</span><span class="criteria-item"><span class="highlight-blue">20회 이상</span> (메탈릭)</span><span class="note-text">※ 프라이머 노출 시 종료</span>' },
            { item: 'C.C.E', condition: '10 X 10 X 6 mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 2T\n(≤ 0.4 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 3T\n(≥ 0.6 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내충격성', condition: '500g X 500mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내약품성', condition: '내산성 (5% HCl)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '내알칼리성\n(5% NaOH)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '판정 지표', criteria: '<span class="criteria-item"><span class="highlight-blue">Rust, Crack, 변색 : 이상 없을 것</span></span>' },
            { item: '내염수성\n(5% NaCl)', condition: 'Blister / Rust\n/ Scribe', criteria: '<span class="highlight-blue">500 Hr 경과 후</span><br><span class="criteria-item">각 항목 4점 이상</span><span class="criteria-item">Scribe 편측 2mm 이내 침투</span>' }
        ],
        'ADP': [
            { item: '색차', condition: 'ΔE', criteria: '<span class="highlight-blue">M/C 대비 ΔE 1.20 이내</span><br><span class="note-text">(메탈릭 ΔE 1.50 이내)</span>' },
            { item: '색차', condition: '동일 LOT 색차', criteria: '<span class="highlight-blue">동일 LOT 제품 대비 ΔE 0.30 이내</span><span class="note-text">※ 같은 날 생산된 동일 컬러 기준 (Roll 교체 무관)</span>' },
            { item: '색차', condition: '타 LOT간 색차', criteria: '<span class="highlight-blue">요청 LOT 제품 대비 ΔE 0.50 이내</span><span class="note-text">※ 수요가 요청 시 대응, M/C 대비 기준은 별도 적용</span>' },
            { item: '도막', condition: '두께 측정\n(DJH / Meter)', criteria: '<span class="highlight-blue">지정 도막 ± 3μm</span><br><span class="note-text">(Matt/Wrinkle 제품은 별도 M/C 뒷면 범위 준수)</span>' },
            { item: '광택', condition: '60°\n(고정 광택계)', criteria: '<span class="criteria-item">71% 이상 : <span class="highlight-blue">±10</span></span><span class="criteria-item">51% ~ 70% : <span class="highlight-blue">±7</span></span><span class="criteria-item">50% 이하 : <span class="highlight-blue">±5</span></span>' },
            { item: '연필경도', condition: '연필 (미쓰비시)', criteria: '<span class="highlight-blue">H 이상</span><br><span class="note-text">(※ 광택도에 따라 기준 조정될 수 있음)</span>' },
            { item: 'M.E.K', condition: '상하 왕복 1회\n(100 ~ 150mm)', criteria: '<span class="criteria-item"><span class="highlight-blue">50회 이상</span> (일반)</span><span class="criteria-item"><span class="highlight-blue">20회 이상</span> (메탈릭)</span><span class="note-text">※ 프라이머 노출 시 종료</span>' },
            { item: 'C.C.E', condition: '10 X 10 X 6 mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 2T\n(≤ 0.4 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 3T\n(≥ 0.6 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내충격성', condition: '500g X 500mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내약품성', condition: '내산성 (5% HCl)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '내알칼리성\n(5% NaOH)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '판정 지표', criteria: '<span class="criteria-item"><span class="highlight-blue">Rust, Crack, 변색 : 이상 없을 것</span></span>' },
            { item: '내염수성\n(5% NaCl)', condition: 'Blister / Rust\n/ Scribe', criteria: '<span class="highlight-blue">500 Hr 경과 후</span><br><span class="criteria-item">각 항목 4점 이상</span><span class="criteria-item">Scribe 편측 2mm 이내 침투</span>' }
        ],
        'HBU': [
            { item: '색차', condition: 'ΔE', criteria: '<span class="highlight-blue">M/C 대비 ΔE 1.20 이내</span><br><span class="note-text">(메탈릭 ΔE 1.50 이내)</span>' },
            { item: '색차', condition: '동일 LOT 색차', criteria: '<span class="highlight-blue">동일 LOT 제품 대비 ΔE 0.30 이내</span><span class="note-text">※ 같은 날 생산된 동일 컬러 기준 (Roll 교체 무관)</span>' },
            { item: '색차', condition: '타 LOT간 색차', criteria: '<span class="highlight-blue">요청 LOT 제품 대비 ΔE 0.50 이내</span><span class="note-text">※ 수요가 요청 시 대응, M/C 대비 기준은 별도 적용</span>' },
            { item: '도막', condition: '두께 측정\n(DJH / Meter)', criteria: '<span class="highlight-blue">지정 도막 ± 3μm</span><br><span class="note-text">(Matt/Wrinkle 제품은 별도 M/C 뒷면 범위 준수)</span>' },
            { item: '광택', condition: '60°\n(고정 광택계)', criteria: '<span class="criteria-item">71% 이상 : <span class="highlight-blue">±10</span></span><span class="criteria-item">51% ~ 70% : <span class="highlight-blue">±7</span></span><span class="criteria-item">50% 이하 : <span class="highlight-blue">±5</span></span>' },
            { item: '연필경도', condition: '연필 (미쓰비시)', criteria: '<span class="highlight-blue">H 이상</span><br><span class="note-text">(※ 광택도에 따라 기준 조정될 수 있음)</span>' },
            { item: 'M.E.K', condition: '상하 왕복 1회\n(100 ~ 150mm)', criteria: '<span class="criteria-item"><span class="highlight-blue">80회 이상</span> (일반)</span><span class="criteria-item"><span class="highlight-blue">20회 이상</span> (메탈릭)</span><span class="note-text">※ 프라이머 노출 시 종료</span>' },
            { item: 'C.C.E', condition: '10 X 10 X 6 mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 2T\n(≤ 0.4 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 3T\n(≥ 0.6 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내충격성', condition: '500g X 500mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내약품성', condition: '내산성 (10% HCl)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '내알칼리성\n(25% NaOH)', criteria: '<span class="criteria-item"><span class="highlight-blue">1 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '판정 지표', criteria: '<span class="criteria-item"><span class="highlight-blue">Rust, Crack, 변색 : 이상 없을 것</span></span>' },
            { item: '내염수성\n(5% NaCl)', condition: 'Blister / Rust\n/ Scribe', criteria: '<span class="highlight-blue">500 Hr 경과 후</span><br><span class="criteria-item">각 항목 4점 이상</span><span class="criteria-item">Scribe 편측 2mm 이내 침투</span>' }
        ],
        'SQP40': [
            { item: '색차', condition: 'ΔE', criteria: '<span class="highlight-blue">M/C 대비 ΔE 1.20 이내</span><br><span class="note-text">(메탈릭 ΔE 1.50 이내)</span>' },
            { item: '색차', condition: '동일 LOT 색차', criteria: '<span class="highlight-blue">동일 LOT 제품 대비 ΔE 0.30 이내</span><span class="note-text">※ 같은 날 생산된 동일 컬러 기준 (Roll 교체 무관)</span>' },
            { item: '색차', condition: '타 LOT간 색차', criteria: '<span class="highlight-blue">요청 LOT 제품 대비 ΔE 0.50 이내</span><span class="note-text">※ 수요가 요청 시 대응, M/C 대비 기준은 별도 적용</span>' },
            { item: '도막', condition: '두께 측정\n(DJH / Meter)', criteria: '<span class="highlight-blue">지정 도막 ± 3μm</span><br><span class="note-text">(Matt/Wrinkle 제품은 별도 M/C 뒷면 범위 준수)</span>' },
            { item: '광택', condition: '60°\n(고정 광택계)', criteria: '<span class="criteria-item">71% 이상 : <span class="highlight-blue">±10</span></span><span class="criteria-item">51% ~ 70% : <span class="highlight-blue">±7</span></span><span class="criteria-item">50% 이하 : <span class="highlight-blue">±5</span></span>' },
            { item: '연필경도', condition: '연필 (미쓰비시)', criteria: '<span class="highlight-blue">H 이상</span><br><span class="note-text">(※ 광택도에 따라 기준 조정될 수 있음)</span>' },
            { item: 'M.E.K', condition: '상하 왕복 1회\n(100 ~ 150mm)', criteria: '<span class="criteria-item"><span class="highlight-blue">50회 이상</span> (일반)</span><span class="criteria-item"><span class="highlight-blue">20회 이상</span> (메탈릭)</span><span class="note-text">※ 프라이머 노출 시 종료</span>' },
            { item: 'C.C.E', condition: '10 X 10 X 6 mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 2T\n(≤ 0.4 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 3T\n(≥ 0.6 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내충격성', condition: '500g X 500mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내약품성', condition: '내산성 (5% HCl)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '내알칼리성\n(5% NaOH)', criteria: '<span class="criteria-item"><span class="highlight-blue">24 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 협의 필요)</span>' },
            { item: '내약품성', condition: '판정 지표', criteria: '<span class="criteria-item"><span class="highlight-blue">Rust, Crack, 변색 : 이상 없을 것</span></span>' },
            { item: '내염수성\n(5% NaCl)', condition: 'Blister / Rust\n/ Scribe', criteria: '<span class="highlight-blue">500 Hr 경과 후</span><br><span class="criteria-item">각 항목 4점 이상</span><span class="criteria-item">Scribe 편측 2mm 이내 침투</span>' }
        ],
        'PVDF': [
            { item: '색차', condition: 'ΔE', criteria: '<span class="highlight-blue">M/C 대비 ΔE 1.20 이내</span><br><span class="note-text">(메탈릭 ΔE 1.50 이내)</span>' },
            { item: '색차', condition: '동일 LOT 색차', criteria: '<span class="highlight-blue">동일 LOT 제품 대비 ΔE 0.30 이내</span><span class="note-text">※ 같은 날 생산된 동일 컬러 기준 (Roll 교체 무관)</span>' },
            { item: '색차', condition: '타 LOT간 색차', criteria: '<span class="highlight-blue">요청 LOT 제품 대비 ΔE 0.50 이내</span><span class="note-text">※ 수요가 요청 시 대응, M/C 대비 기준은 별도 적용</span>' },
            { item: '도막', condition: '두께 측정\n(DJH / Meter)', criteria: '<span class="highlight-blue">지정 도막 ± 3μm</span><br><span class="note-text">(Matt/Wrinkle 제품은 별도 M/C 뒷면 범위 준수)</span>' },
            { item: '광택', condition: '60°\n(고정 광택계)', criteria: '<span class="criteria-item">71% 이상 : <span class="highlight-blue">±10</span></span><span class="criteria-item">51% ~ 70% : <span class="highlight-blue">±7</span></span><span class="criteria-item">50% 이하 : <span class="highlight-blue">±5</span></span>' },
            { item: '연필경도', condition: '연필 (미쓰비시)', criteria: '<span class="highlight-blue">F 이상</span><br><span class="note-text">(※ 광택도에 따라 기준 조정될 수 있음)</span>' },
            { item: 'M.E.K', condition: '상하 왕복 1회\n(100 ~ 150mm)', criteria: '<span class="criteria-item"><span class="highlight-blue">100회 이상</span> (일반)</span><span class="criteria-item"><span class="highlight-blue">50회 이상</span> (메탈릭)</span><span class="note-text">※ 프라이머 노출 시 종료</span>' },
            { item: 'C.C.E', condition: '10 X 10 X 6 mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '굽힘 시험', condition: '180° / 0T\n(≤ 0.4 mm)', criteria: '<span class="highlight-blue">도막 균열 없을 것</span><br><span class="note-text">※ 단, AL 복합판넬의 경우 0T NO CRACK 임</span>' },
            { item: '굽힘 시험', condition: '180° / 1T\n(≥ 0.6 mm)', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내충격성', condition: '500g X 500mm', criteria: '<span class="highlight-blue">도막 박리 없을 것</span>' },
            { item: '내약품성', condition: '내산성 (5% HCl)', criteria: '<span class="highlight-blue">48 Hr 이상</span> 견딜 것<br><span class="note-text">(메탈릭/유기안료 함량 높은 경우 보증 불가할 수 있음)</span>' },
            { item: '내약품성', condition: '내알칼리성\n(5% NaOH)', criteria: '<span class="criteria-item"><span class="highlight-blue">48 Hr 이상</span> 견딜 것</span><span class="note-text">(메탈릭/유기안료 함량 높은 경우 보증 불가할 수 있음)</span>' },
            { item: '내약품성', condition: '판정 지표', criteria: '<span class="criteria-item"><span class="highlight-blue">Rust, Crack, 변색 : 이상 없을 것</span></span>' },
            { item: '내염수성\n(5% NaCl)', condition: 'Blister / Rust\n/ Scribe', criteria: '<span class="highlight-blue">1,000 Hr 경과 후</span><br><span class="criteria-item">각 항목 4점 이상</span><span class="criteria-item">Scribe 편측 2mm 이내 침투</span>' }
        ],
    };

    // --- [9. 강종 상세 정보 탭 시스템] ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const infoPanels = document.querySelectorAll('.info-panel');

    tabBtns.forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.getAttribute('data-tab');
            if (!tabId) return;

            // 버튼 상태 변경
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 패널 표시 제어
            infoPanels.forEach(p => {
                p.classList.remove('active');
                if (p.id === `panel-${tabId}`) p.classList.add('active');
            });

            // 상단으로 스크롤 방지 또는 부드러운 이동 (필요시)
        };
    });

    const resinBtns = document.querySelectorAll('.resin-btn');
    const resinCard = document.getElementById('resin-data-card');
    const resinTbody = document.getElementById('resin-quality-tbody');
    const resinTitle = document.getElementById('selected-resin-title');

    resinBtns.forEach(btn => {
        btn.onclick = () => {
            const resin = btn.getAttribute('data-resin');
            if (!resinQualityData[resin]) return alert('상세 데이터 준비 중입니다.');

            resinBtns.forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
            btn.classList.replace('btn-secondary', 'btn-primary');
            resinTitle.textContent = `${resin} 품질 기준`;
            resinCard.style.display = 'block';

            // 동적 테이블 생성 (Rowspan 처리)
            const data = resinQualityData[resin];
            let html = '';

            data.forEach((row, idx) => {
                // 그룹 클래스 결정 (모바일에서 같은 검사항목을 시각적으로 연결)
                const isFirstOfItem = (idx === 0 || data[idx - 1].item !== row.item);
                const isLastOfItem = (idx === data.length - 1 || data[idx + 1].item !== row.item);

                let groupClass = '';
                if (isFirstOfItem && isLastOfItem) {
                    groupClass = 'group-single';
                } else if (isFirstOfItem) {
                    groupClass = 'group-start';
                } else if (isLastOfItem) {
                    groupClass = 'group-end';
                } else {
                    groupClass = 'group-middle';
                }

                html += `<tr class="${groupClass}" data-item="${row.item}" style="border-bottom:1px solid #f1f5f9;">`;

                // 검사항목 (Rowspan 로직)
                if (isFirstOfItem) {
                    let rs = 1;
                    for (let i = idx + 1; i < data.length; i++) {
                        if (data[i].item === row.item) rs++;
                        else break;
                    }
                    html += `
                        <td rowspan="${rs}" class="resin-table-item" data-label="검사항목">
                            ${row.item.replace(/\n/g, '<br>')}
                        </td>`;
                }

                // 조건
                html += `
                    <td class="resin-table-condition" data-label="조건">
                        ${row.condition.replace(/\n/g, '<br>')}
                    </td>`;

                // 합부 기준
                html += `
                    <td class="resin-table-criteria" data-label="합부 기준">
                        <div style="padding: 2px 0;">
                            ${row.criteria}
                        </div>
                    </td>`;

                html += '</tr>';
            });

            resinTbody.innerHTML = html;
            resinCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
    });

    // --- [초기화 및 데이터 동기화 관리] ---
    async function init(isManual = false) {
        const overlay = document.getElementById('loading-overlay');
        const statusBar = document.getElementById('data-status-bar');

        if (isManual && overlay) {
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
        }

        try {
            // [병렬 실행] 세 가지 주요 데이터를 동시에 로드하여 전체 시간 단축
            console.time("⏱️ Initial Data Load");
            await Promise.all([
                loadLocalFiles(),
                loadLocalComplaints(),
                loadLocalDefects(),
                loadNotificationEmails()
            ]);
            console.timeEnd("⏱️ Initial Data Load");

            // 로딩 오버레이 제거 (짧은 지연으로 여유 부여)
            setTimeout(() => {
                if (overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.style.display = 'none';
                        document.body.classList.remove('loading-active');
                    }, 500);
                }

                // 동기화 성공 배너 표시
                if (statusBar) {
                    statusBar.classList.add('show');
                    setTimeout(() => statusBar.classList.remove('show'), 3000);
                }
            }, 300);

        } catch (err) {
            console.error("데이터 초기화 중 오류 발생:", err);
            if (overlay) {
                const text = overlay.querySelector('.loading-text');
                const subtext = overlay.querySelector('.loading-subtext');
                if (text) text.textContent = "데이터 로드 실패";
                if (subtext) subtext.innerHTML = `오류: ${err.message}<br><button onclick="location.reload()" style="margin-top:15px; padding:8px 16px; border-radius:6px; cursor:pointer;">새로고침</button>`;
            }
        }
    }
    window.init = init; // 외부(HTML)에서 호출 가능하도록 전역 등록

    // --- [보안: 다운로드 및 무단 복제 방지] ---
    // 데이터 초기화 전에 보안 리스너를 먼저 등록하여, 초기화 중 발생하는 alert 등으로 인해 보안이 뚫리는 것을 방지
    
    // 1. 우클릭 방지 (Aggressive)
    document.addEventListener('contextmenu', (e) => {
        const isViewerOpen = document.body.classList.contains('viewer-open');
        // 뷰어가 열려있으면 무조건 차단, 그 외에는 비관리자만 차단
        if (isViewerOpen || !isAdmin) {
            e.preventDefault();
            alert('보안 정책에 따라 해당 화면에서는 우클릭이 제한됩니다.');
            return false;
        }
    }, true); // 캡처링 단계에서 우선 가로채기

    // 2. 텍스트 선택 방지 (뷰어 오픈 시)
    document.addEventListener('selectstart', (e) => {
        if (document.body.classList.contains('viewer-open')) {
            e.preventDefault();
        }
    });


    // 2. 주요 단축키 및 화면 캡처 방지 (블러 연동)
    document.addEventListener('keydown', (e) => {
        if (isAdmin) return;
        
        const isViewerOpen = document.body.classList.contains('viewer-open');

        // Ctrl+S, Ctrl+P, Ctrl+U, PrintScreen, F12 (맥 사용자를 위해 Meta 키도 일부 고려)
        if ((e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'u')) || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') || 
            (e.key === 'F12') || (e.key === 'PrintScreen') || (e.key === 'Snapshot')) {
            
            if (isViewerOpen) {
                activateBlackout();
            }
            
            e.preventDefault();
            if (e.key !== 'p' && e.key !== 'P') {
                alert('보안 정책에 따라 해당 기능을 사용할 수 없습니다.');
            }
            return false;
        }
    });

    // 3. 이미지 드래그 방지
    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG') e.preventDefault();
    });

    // 4. 인쇄 시도 감지 (최종 경고 및 블러)
    window.onbeforeprint = () => {
        if (!isAdmin) {
            activateBlackout();
            alert('보안 정책에 따라 문서를 인쇄하거나 PDF로 저장할 수 없으며, 모든 내용은 대외비로 취급됩니다.');
            return false;
        }
    };
    
    // 화면 포커스 나갈 때 (캡처 도구, 다른 탭 이동 등) 블랙아웃
    const handleSecurityBlur = () => {
        if (document.body.classList.contains('viewer-open')) {
            activateBlackout();
        }
    };

    window.addEventListener('blur', handleSecurityBlur);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            handleSecurityBlur();
        }
    });
    
    // 화면 포커스 돌아올 때 블랙아웃 해제
    const handleSecurityFocus = () => {
        deactivateBlackout();
    };

    window.addEventListener('focus', handleSecurityFocus);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            handleSecurityFocus();
        }
    });


    // 문서 로드 즉시 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function activateBlackout() {
        // 뷰어가 열려있는 상태라면 관리자 모드 여부와 상관없이 보안을 위해 블랙아웃 실행
        if (isAdmin && !document.body.classList.contains('viewer-open')) return;
        const blackout = document.getElementById('document-blackout-layer');
        if (blackout) blackout.style.display = 'flex';
        document.body.classList.add('blackout-active');
    }

    function deactivateBlackout() {
        const blackout = document.getElementById('document-blackout-layer');
        if (blackout) blackout.style.display = 'none';
        document.body.classList.remove('blackout-active');
    }

    // --- [10. 신규 고도화 기능 (Idea 1, 2, 4, 5)] ---

    // Idea #1: 지식 베이스 - 추천 조치
    window.updateRecommendedActions = () => {
        const type = document.getElementById('modal-edit-defect-type')?.value;
        const box = document.getElementById('recommended-actions-box');
        const content = document.getElementById('recommended-actions-content');
        if (!box || !content) return;

        const bestPractices = {
            '도장박리': '• 전처리 공정 농도 및 온도 전수 조사<br>• 도료 부착성(Cross-Cut) 테스트 주기 단축<br>• 소재 표면의 오일 및 이물질 제거 공정 강화',
            '색차': '• 도료 조색(Matching) 데이터 재검증<br>• Line Speed별 소부 온도(PMT) 편차 관리 강화<br>• 표준 시편과 실제 생산품의 광택도 비교 필수',
            '스크래치': '• 설비 Roll 표면 마모 상태 점검 및 교체<br>• 판간 이물질 유입 방지 패드 점검<br>• 권취 시 장력(Tension) 오버 슈팅 제어',
            '오염': '• 작업장 내 청정도 관리(Ducting 시스템 점검)<br>• 도료 필터링 메쉬(Mesh) 사이즈 정밀화<br>• 도포실(Coating Room) 양압 유지 상태 확인',
            '가공크랙': '• 소재 유연성 대비 가공 R값 적정성 검토<br>• 인장 강도 및 신율(Elongation) 성적서 재검토<br>• 가공 유(Oil) 도포량 증대',
        };

        if (type && bestPractices[type]) {
            content.innerHTML = bestPractices[type];
            box.style.display = 'block';
        } else {
            box.style.display = 'none';
        }
    };



    // Idea #5: 대시보드 리포트 PDF 출력
    window.exportDashboardReport = async (e) => {
        const { jsPDF } = window.jspdf;
        const dashboard = document.getElementById('dashboard-view');
        const periodFilter = document.getElementById('dash-period-filter');
        const dashBtn = e.target;

        // 현재 선택된 필터 텍스트 (예: "2025년", "2025년 12월", "전체")
        const selectedPeriodText = periodFilter ? periodFilter.options[periodFilter.selectedIndex].text : '전체';

        const dashOrigText = dashBtn.textContent;
        dashBtn.textContent = '리포트 생성 중...';
        dashBtn.disabled = true;

        try {
            const canvas = await html2canvas(dashboard, {
                scale: 2,
                useCORS: true,
                logging: false,
                ignoreElements: (el) => el.tagName === 'BUTTON' || el.id === 'dash-period-filter'
            });

            const imgData = canvas.toDataURL('image/png');
            const imgProps = {
                width: canvas.width,
                height: canvas.height
            };
            const pdfWidth = 210; // mm
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`세아씨엠_품질_분석_리포트(${selectedPeriodText})_${new Date().toLocaleDateString()}.pdf`);
        } catch (err) {
            console.error(err);
            alert('리포트 생성 실패: ' + err.message);
        } finally {
            dashBtn.textContent = dashOrigText;
            dashBtn.disabled = false;
        }
    };

    // Idea: VOC 개별 항목 PPT 리포트 다운로드 (전용 양식 - 단일 슬라이드)
    window.exportVocPPT = async (e, lang, targetId) => {
        const PptxGen = window.PptxGenJS;
        if (!PptxGen) {
            alert('PPT 생성 라이브러리를 로드하지 못했습니다. 페이지를 새로고침(F5) 해주세요.');
            return;
        }

        // 테이블에서 호출 시 targetId 사용, 모달에서 호출 시 currentVocId 사용
        const vocId = targetId || currentVocId;
        if (!vocId) return;

        const voc = localComplaints.find(v => v.id === vocId);
        if (!voc) return;

        const pptBtn = e.target;
        const pptOrigText = pptBtn.textContent;
        pptBtn.textContent = lang === 'kor' ? 'PPT 생성 중...' : 'Translating...';
        pptBtn.disabled = true;

        try {
            const pptx = new PptxGen();
            // A4 가로 규격 정의 (11.69 x 8.27 인치)
            pptx.defineLayout({ name: 'A4', width: 11.69, height: 8.27 });
            pptx.layout = 'A4';
            const isEng = lang === 'eng';
            const fontName = 'Malgun Gothic';

            const translate = async (text) => {
                if (!isEng || !text || text === '-' || text === '0') return text;
                try {
                    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`);
                    const data = await res.json();
                    return data.responseData.translatedText;
                } catch (err) { return text; }
            };

            const t = {
                title: await translate(voc.title || '품질 부적합 조치 결과 보고서'),
                customer: await translate(voc.customer || '-'),
                description: await translate(voc.description || '-'),
                cause: await translate(voc.replyCause || '-'),
                countermeasure: await translate(voc.replyCountermeasure || '-'),
                evaluation: await translate(voc.replyEvaluation || '-'),
                defectType: await translate(voc.defectType || '기타'),
                manager: await translate(voc.manager || '-'),
                status: await translate(voc.status || '-'),
                market: await translate(voc.market || '-'),
                category: await translate(voc.category || '-')
            };

            let slide = pptx.addSlide();

            // Header: Title (Company name removed as requested)
            slide.addText(t.title, { x: 0.3, y: 0.3, w: 11.0, fontSize: 22, bold: true, fontFace: fontName, color: '333333' });

            // 1. Basic Information Table (Widened for A4)
            const infoRows = [
                [
                    { text: (isEng ? 'Client' : '고객사'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, t.customer,
                    { text: (isEng ? 'Market' : '내수/수출'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, t.market,
                    { text: (isEng ? 'Date' : '접수일'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, voc.receiptDate || '-'
                ],
                [
                    { text: (isEng ? 'Spec' : '제품규격'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, voc.spec || '-',
                    { text: (isEng ? 'Color' : '색상'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, voc.color || '-',
                    { text: (isEng ? 'Line' : '생산라인'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, voc.line || '-'
                ],
                [
                    { text: (isEng ? 'Batch No' : '배치번호'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, voc.batch || '-',
                    { text: (isEng ? 'Prod. Date' : '생산일자'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, voc.prodDate || '-',
                    { text: (isEng ? 'Defect Type' : '불량유형'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, t.defectType
                ]
            ];
            // Table position y:0.9, height approx 1.2 (0.4 per row) -> Ends at 2.1
            slide.addTable(infoRows, { x: 0.3, y: 0.9, w: 11.0, colW: [1.2, 2.4, 1.2, 2.4, 1.3, 2.5], fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' }, valign: 'middle', rowH: 0.35 });

            // 2. Complaint Details & Photo
            // Shifted down to y=2.2
            slide.addText('■ ' + (isEng ? 'Symptom & Photo' : '불만 상세 현상 및 사진'), { x: 0.3, y: 2.2, fontSize: 12, bold: true, fontFace: fontName, color: '1e3a8a' });
            slide.addText(t.description, { x: 0.3, y: 2.6, w: 6.5, h: 1.8, fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' }, valign: 'top', margin: 5, fill: 'FCFCFC' });

            if (voc.photo) {
                // Use path for URLs
                slide.addImage({ path: voc.photo, x: 7.0, y: 2.6, w: 4.3, h: 1.8, sizing: { type: 'contain' } });
            } else {
                slide.addText(isEng ? 'No Photo' : '사진 없음', { x: 7.0, y: 2.6, w: 4.3, h: 1.8, align: 'center', fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' } });
            }

            // 3. Cause Analysis
            slide.addText('■ ' + (isEng ? 'Root Cause Analysis' : '예상 원인 및 근본 원인 분석'), { x: 0.3, y: 4.6, fontSize: 12, bold: true, fontFace: fontName, color: '1e3a8a' });
            slide.addText(t.cause, { x: 0.3, y: 5.0, w: 11.0, h: 1.0, fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' }, valign: 'top', margin: 5, fill: 'FCFCFC' });

            // 4. Countermeasures
            slide.addText('■ ' + (isEng ? 'Improvement & Prevention' : '개선 및 재발 방지 대책'), { x: 0.3, y: 6.2, fontSize: 12, bold: true, fontFace: fontName, color: '1e3a8a' });
            slide.addText(`${isEng ? '[Improvement & Prevention]' : '[개선 및 재발방지]'}\n${t.countermeasure}`, { x: 0.3, y: 6.6, w: 11.0, h: 1.2, fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' }, valign: 'top', margin: 5, fill: 'FCFCFC' });

            // Footer
            slide.addText('(1)', { x: 10.5, y: 7.9, w: 0.8, align: 'right', fontSize: 9, fontFace: fontName, color: '666666' });

            pptx.writeFile({ fileName: `SeAH_Report_${voc.customer}_${lang.toUpperCase()}` });
        } catch (err) {
            console.error(err);
            alert('PPT 생성 실패: ' + err.message);
        } finally {
            pptBtn.textContent = pptOrigText;
            pptBtn.disabled = false;
        }
    };

    // 엑셀(CSV) 다운로드 기능
    window.exportVocToExcel = () => {
        if (localComplaints.length === 0) return alert('다운로드할 데이터가 없습니다.');

        const monthFilter = document.getElementById('voc-month-filter')?.value || 'all';
        let filtered = localComplaints;
        if (monthFilter !== 'all') {
            filtered = localComplaints.filter(v => v.receiptDate && v.receiptDate.startsWith(monthFilter));
        }

        if (filtered.length === 0) return alert('선택된 기간에 데이터가 없습니다.');

        // CSV BOM for Excel (UTF-8)
        let csvContent = "\uFEFF";
        // Header
        csvContent += "구분,접수일,고객사,담당자,라인,제품규격,색상,배치번호,생산일자,납품수량,불만수량,불량유형,불만명,상태,예상손실비용,원인분석,조치내용\n";

        filtered.forEach(row => {
            const escapeCsv = (txt) => {
                if (!txt) return "";
                return '"' + String(txt).replace(/"/g, '""').replace(/\n/g, ' ') + '"';
            };

            const line = [
                row.category, row.receiptDate, row.customer, row.manager,
                row.line, row.spec, row.color, row.batch,
                row.prodDate, row.deliveryQty, row.complaintQty, row.defectType,
                row.title, row.status, row.cost,
                row.replyCause || '', row.replyCountermeasure || ''
            ].map(escapeCsv).join(",");
            csvContent += line + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `VOC_처리대장_${monthFilter}_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Idea: VOC 처리 대장 전체 PPT 일괄 출력 (콤팩트 단일 슬라이드 반복)
    window.exportVocBatchPPT = async (e, lang) => {
        const PptxGen = window.PptxGenJS;
        if (!PptxGen) {
            alert('PPT 생성 라이브러리를 로드하지 못했습니다. 페이지를 새로고침(F5) 해주세요.');
            return;
        }

        if (localComplaints.length === 0) {
            alert('출력할 데이터가 없습니다.');
            return;
        }

        const monthFilter = document.getElementById('voc-month-filter')?.value || 'all';
        let filtered = localComplaints;
        if (monthFilter !== 'all') {
            filtered = localComplaints.filter(v => v.receiptDate && v.receiptDate.startsWith(monthFilter));
        }

        if (filtered.length === 0) {
            alert('선택된 기간에 출력할 데이터가 없습니다.');
            return;
        }

        const batchBtn = e.target;
        const batchOrigText = batchBtn.textContent;
        batchBtn.disabled = true;

        try {
            const pptx = new PptxGen();
            const isEng = lang === 'eng';
            const fontName = 'Malgun Gothic';

            const translate = async (text) => {
                if (!isEng || !text || text === '-' || text === '0') return text;
                try {
                    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`);
                    const data = await res.json();
                    return data.responseData.translatedText;
                } catch (err) { return text; }
            };

            for (let i = 0; i < filtered.length; i++) {
                const voc = filtered[i];
                batchBtn.textContent = `${isEng ? 'Translating' : '번역 및 생성 중'} (${i + 1}/${filtered.length})...`;

                const t = {
                    title: await translate(voc.title || '품질 부적합 조치 결과 보고서'),
                    customer: await translate(voc.customer || '-'),
                    content: await translate(voc.description || '-'), // Fixed: content -> description
                    cause: await translate(voc.replyCause || '-'), // Fixed: cause -> replyCause
                    action: await translate(voc.replyCountermeasure || '-'), // Fixed: countermeasures -> replyCountermeasure
                    evaluation: await translate(voc.replyEvaluation || '-'), // Fixed: evaluation -> replyEvaluation
                    defectType: await translate(voc.defectType || '기타'),
                    manager: await translate(voc.manager || '-'),
                    status: await translate(voc.status || '-'),
                    market: await translate(voc.market || '-'),
                };

                let slide = pptx.addSlide();

                // Header (Single Slide Compact Mode)
                slide.addText(t.title, { x: 0.3, y: 0.2, w: 6, fontSize: 18, bold: true, fontFace: fontName });
                slide.addText('SeAH 세아씨엠', { x: 7, y: 0.2, w: 2.7, align: 'right', fontSize: 16, bold: true, color: '1e3a8a', fontFace: fontName });
                slide.addShape(pptx.ShapeType.line, { x: 0.3, y: 0.6, w: 9.4, line: { color: '333333', width: 1.0 } });
                slide.addShape(pptx.ShapeType.line, { x: 8, y: 0.63, w: 1.7, line: { color: 'f15a22', width: 2.0 } });

                // Information Table (Expanded to 2 rows)
                const infoRows = [
                    [
                        { text: (isEng ? 'Client' : '고객사'), options: { fill: 'F0F0F0', bold: true } }, t.customer,
                        { text: (isEng ? 'Date' : '접수일'), options: { fill: 'F0F0F0', bold: true } }, voc.receiptDate,
                        { text: (isEng ? 'Line' : '라인'), options: { fill: 'F0F0F0', bold: true } }, voc.line
                    ],
                    [
                        { text: (isEng ? 'Spec' : '규격'), options: { fill: 'F0F0F0', bold: true } }, voc.spec || '-',
                        { text: (isEng ? 'Batch' : '배치No'), options: { fill: 'F0F0F0', bold: true } }, voc.batch || '-',
                        { text: (isEng ? 'Defect' : '불량유형'), options: { fill: 'F0F0F0', bold: true } }, t.defectType
                    ]
                ];
                // Adjusted positions and rowH
                slide.addTable(infoRows, { x: 0.3, y: 0.8, w: 9.4, colW: [1, 2.1, 1, 2.1, 1, 2.1], fontSize: 9, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' }, rowH: 0.35 });

                // Sections (Shifted down slightly)
                slide.addText('■ ' + (isEng ? 'Details' : '불만 상세 현상'), { x: 0.3, y: 1.8, fontSize: 10, bold: true, fontFace: fontName });
                slide.addText(t.content, { x: 0.3, y: 2.1, w: 6.2, h: 1.8, fontSize: 9, fontFace: fontName, border: { pt: 0.5, color: 'DDDDDD' }, valign: 'top', margin: 5 });

                if (voc.photo) {
                    // Use path for URLs
                    slide.addImage({ path: voc.photo, x: 6.7, y: 2.1, w: 3.0, h: 1.8, sizing: { type: 'contain' } });
                }

                slide.addText('■ ' + (isEng ? 'Analysis' : '사고 원인 분석'), { x: 0.3, y: 4.1, fontSize: 10, bold: true, fontFace: fontName });
                slide.addText(t.cause, { x: 0.3, y: 4.4, w: 9.4, h: 1.2, fontSize: 9, fontFace: fontName, border: { pt: 0.5, color: 'DDDDDD' }, valign: 'top', margin: 5 });

                slide.addText('■ ' + (isEng ? 'Action/Result' : '조치 내용 및 결과'), { x: 0.3, y: 5.8, fontSize: 10, bold: true, fontFace: fontName });
                slide.addText(`${t.action}\n\n[평가] ${t.evaluation}`, { x: 0.3, y: 6.1, w: 9.4, h: 1.4, fontSize: 9, fontFace: fontName, border: { pt: 0.5, color: 'DDDDDD' }, valign: 'top', margin: 5 });

                // Footer
                slide.addText(`(${i + 1})`, { x: 9.2, y: 7.6, fontSize: 8, fontFace: fontName, color: '999999' });
            }

            pptx.writeFile({ fileName: `SeAH_VOC_Full_Ledger_${monthFilter}_${lang.toUpperCase()}` });
        } catch (err) {
            console.error(err);
            alert('PPT 생성 실패: ' + err.message);
        } finally {
            batchBtn.textContent = batchOrigText;
            batchBtn.disabled = false;
        }
    };


    // --- [CGL GI 그래프 구현 - 막대 그래프] ---
    const cglGiCharts = {};

    // 강종별 데이터 (원본 이미지 기반)
    const cglGiData = {
        cq: {
            // Updated: 0.25 -> 1219, 0.27 -> 1270 based on user request
            data: [
                [0.25, 1219, 1300], [0.27, 1270, 1330], [0.30, 1320, 1340], [0.35, 1320, 1340],
                [0.40, 1320, 1340], [0.50, 1320, 1340], [0.60, 1320, 1340], [0.70, 1320, 1340],
                [0.80, 1320, 1340], [0.90, 1320, 1340], [1.00, 1320, 1340], [1.20, 1300, 1320],
                [1.40, 1270, 1300], [1.60, 1270, 1300], [1.80, 1250, null], [2.00, 1250, null], [2.10, 1250, null]
            ]
        },
        dq: {
            data: [
                [0.25, 1250, null], [0.30, 1290, 1310], [0.35, 1320, null], [0.40, 1320, null],
                [0.50, 1320, null], [0.60, 1320, null], [0.70, 1320, null], [0.80, 1320, null],
                [0.90, 1320, 1340], [1.00, 1310, 1330], [1.20, 1290, 1310], [1.40, 1290, 1310],
                [1.60, 1290, 1310], [1.80, 1270, 1290], [2.00, 1270, 1290]
            ]
        },
        ddq: {
            data: [
                [0.35, 1290, 1310], [0.40, 1320, 1340], [0.50, 1320, 1340], [0.60, 1320, 1340],
                [0.70, 1310, 1330], [0.80, 1290, null], [0.90, 1290, null], [1.00, 1270, null],
                [1.20, 1270, null], [1.50, 1270, null]
            ]
        },
        struct: {
            data: [
                [0.35, 1300, 1320], [0.40, 1300, 1320], [0.50, 1300, 1320], [0.60, 1300, 1320],
                [0.70, 1300, 1320], [0.80, 1300, 1320], [0.90, 1300, 1320], [1.00, 1300, 1320],
                [1.20, 1270, 1290], [1.40, 1270, 1290], [1.60, 1250, 1270], [1.80, 1250, 1270],
                [2.00, 1250, 1270], [2.10, 1250, 1270]
            ]
        },
        gre: {
            data: [
                [0.30, 1270, null], [0.35, 1270, null], [0.40, 1310, null], [0.50, 1310, null],
                [0.60, 1290, null], [0.70, 1270, null], [0.80, 1270, null], [1.00, 1270, null],
                [1.05, 1250, null], [1.10, 1240, null], [1.15, 1240, null], [1.20, 1200, null],
                [1.25, 1170, null], [1.30, 1140, null]
            ]
        }
    };

    function initAllCglGiCharts() {
        const chartTypes = ['cq', 'dq', 'ddq', 'struct', 'gre'];
        chartTypes.forEach(type => {
            const canvas = document.getElementById(`chart-gi-${type}`);
            if (canvas) {
                createBarChart(canvas, type);
            }
        });
    }

    function createBarChart(canvas, type) {
        const chartData = cglGiData[type];
        if (!chartData) return;

        const ctx = canvas.getContext('2d');
        const rawData = chartData.data;
        let labels, prodData, negData;

        const giLabels = {
            cq: ['0.20', '0.25', '0.27', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60', '1.80', '2.00', '2.20'],
            dq: ['0.20', '0.25', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60', '1.80', '2.00', '2.20'],
            ddq: ['0.20', '0.25', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.20', '1.50', '1.60', '1.80', '2.00', '2.20'],
            struct: ['0.20', '0.25', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60', '1.80', '2.00', '2.20'],
            gre: ['0.20', '0.25', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70', '0.80', '1.00', '1.05', '1.10', '1.15', '1.20', '1.25', '1.30', '1.35']
        };

        if (giLabels[type]) {
            labels = giLabels[type];
            prodData = labels.map(l => {
                const found = rawData.find(d => parseFloat(d[0]).toFixed(2) === parseFloat(l).toFixed(2));
                return found ? [600, found[1]] : null;
            });
            negData = labels.map(l => {
                const found = rawData.find(d => parseFloat(d[0]).toFixed(2) === parseFloat(l).toFixed(2));
                return (found && found[2]) ? [found[1], found[2]] : null;
            });
        } else {
            const startVal = rawData[0][0];
            const endVal = rawData[rawData.length - 1][0];
            const paddedLabels = [(startVal - 0.1).toFixed(2), ...rawData.map(d => d[0].toFixed(2)), (endVal + 0.1).toFixed(2)];
            labels = paddedLabels.map(l => parseFloat(l).toString());
            prodData = labels.map(l => {
                const found = rawData.find(d => d[0].toFixed(2) === parseFloat(l).toFixed(2));
                return found ? [600, found[1]] : null;
            });
            negData = labels.map(l => {
                const found = rawData.find(d => d[0].toFixed(2) === parseFloat(l).toFixed(2));
                return (found && found[2]) ? [found[1], found[2]] : null;
            });
        }
        const hasNeg = negData.some(v => v !== null);

        const datasets = [];

        if (hasNeg) {
            datasets.push({
                label: '협의 영역',
                data: negData,
                backgroundColor: getHatchPattern(ctx),
                borderColor: '#94a3b8',
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 1.0,
                grouped: false,
                order: 1
            });
        }

        datasets.push({
            label: '생산 가능 폭',
            data: prodData,
            backgroundColor: '#ea580c', // Orange as requested
            borderColor: '#9a3412',
            borderWidth: 1,
            borderSkipped: 'bottom',
            barPercentage: 1.0,
            categoryPercentage: 1.0,
            grouped: false,
            order: 2
        });

        if (cglGiCharts[type]) {
            cglGiCharts[type].destroy();
        }

        cglGiCharts[type] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'x',
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        offset: -2,
                        clip: false,
                        color: (ctx) => ctx.dataset.label === '협의 영역' ? '#475569' : '#9a3412',
                        font: { weight: 'bold', size: 10 },
                        display: function (context) {
                            const val = context.dataset.data[context.dataIndex];
                            if (!val || val[1] === 0) return false;
                            const idx = context.dataIndex;
                            const prevVal = context.dataset.data[idx - 1];
                            if (idx > 0 && prevVal && prevVal[1] === val[1]) return false;
                            return true;
                        },
                        formatter: function (value, context) {
                            return value[1];
                            return value[1];
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const val = ctx.raw;
                                if (!val) return '';
                                return `${ctx.dataset.label}: ${val[0]} ~ ${val[1]} mm`;
                            },
                            title: ctx => `두께: ${ctx[0].label} mm`
                        }
                    }
                },
                layout: { padding: { top: 25, right: 10, left: 10 } },
                scales: {
                    x: {
                        title: { display: true, text: '두께 (mm)', font: { weight: 'bold', size: 11 } },
                        grid: { display: false },
                        ticks: { font: { size: 9 }, autoSkip: false }
                    },
                    y: {
                        min: 600,
                        max: 1400,
                        title: { display: true, text: '폭 (mm)', font: { weight: 'bold', size: 11 } },
                        grid: { color: '#e5e7eb' },
                        ticks: {
                            font: { size: 9 },
                            callback: function (value) {
                                // Important values from image
                                const keyValues = [600, 700, 800, 830, 880, 914, 1040, 1140, 1170, 1219, 1250, 1270, 1290, 1300, 1320, 1330, 1340, 1350];
                                if (keyValues.includes(value)) return value;
                                return '';
                            }
                        },
                        afterBuildTicks: (axis) => {
                            const keyValues = [600, 700, 800, 830, 880, 914, 1040, 1140, 1170, 1219, 1250, 1270, 1290, 1300, 1320, 1330, 1340, 1350];
                            axis.ticks = keyValues.map(v => ({ value: v }));
                        }
                    }
                }
            }
        });
    }

    // CGL GI 탭 클릭 시 통합 리스너에서 처리됨
    window.cglGiChartsInitialized = false;

    // --- [CGL GL 그래프 구현 - 막대 그래프] ---
    const cglGlCharts = {};

    // CGL GL 데이터 (추정치)
    const cglGlData = {
        cq: {
            data: [
                [0.25, null, [1140, 1219]], [0.27, 1140, [1140, 1219]], [0.30, 1250, [1250, 1270]],
                [0.35, 1300, null], [0.40, 1320, null], [0.50, 1320, null], [0.60, 1300, null],
                [0.70, 1290, [1290, 1310]], [0.80, 1290, null], [0.90, 1270, [1270, 1290]],
                [1.00, 1270, [1270, 1290]], [1.20, 1250, null]
            ],
            postAttach: { t: [0.35, 1.20] }
        },
        dq: {
            data: [
                [0.35, 1280, null], [0.40, 1300, 1320], [0.50, 1300, 1320], [0.60, 1300, 1320],
                [0.70, 1300, 1320], [0.80, 1300, 1320], [0.90, 1260, 1280], [1.00, 1250, 1270],
                [1.20, 1250, 1270]
            ],
            postAttach: { t: [0.40, 0.80], w: 1260 }
        },
        ddq: {
            data: [
                [0.35, 1270, 1290], [0.40, 1270, 1290], [0.50, 1270, 1290], [0.55, 1270, 1290],
                [0.60, 1270, 1290], [0.80, 1270, null], [0.90, 1270, null], [1.00, 1250, 1270],
                [1.20, 1219, 1250]
            ],
            postAttach: { t: [0.40, 0.55], w: 1260 }
        },
        struct: {
            data: [
                [0.35, 1280, null], [0.40, 1300, null], [0.50, 1300, null], [0.60, 1300, null],
                [0.70, 1300, null], [0.80, 1280, 1300], [0.90, 1280, 1300], [1.00, 1280, 1300],
                [1.20, 1250, null]
            ],
            postAttach: { t: [0.35, 0.90], w: 1280 }
        },
        gre: {
            data: [
                [0.35, 1260, 1280], [0.40, 1260, 1280], [0.50, 1260, 1280], [0.55, 1260, 1280],
                [0.60, 1260, 1280], [0.80, 1260, 1280], [1.00, 1260, 1280], [1.05, 1230, null],
                [1.10, 1219, null], [1.15, 1219, null], [1.20, 1170, null]
            ],
            postAttach: { t: [0.35, 0.55], w: 1240 }
        }
    };

    function initAllCglGlCharts() {
        const chartTypes = ['cq', 'dq', 'ddq', 'struct', 'gre'];
        chartTypes.forEach(type => {
            const canvas = document.getElementById(`chart-gl-${type}`);
            if (canvas) {
                createGlBarChart(canvas, type);
            }
        });
    }

    function createGlBarChart(canvas, type) {
        const chartData = cglGlData[type];
        if (!chartData) return;

        const ctx = canvas.getContext('2d');
        const rawData = chartData.data;
        let labels, prodData, negData;

        const glLabels = {
            cq: ['0.25', '0.27', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60'],
            dq: ['0.20', '0.25', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60'],
            ddq: ['0.20', '0.25', '0.30', '0.35', '0.40', '0.50', '0.55', '0.60', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60'],
            struct: ['0.20', '0.25', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60'],
            gre: ['0.25', '0.30', '0.35', '0.40', '0.50', '0.55', '0.60', '0.80', '1.00', '1.05', '1.10', '1.15', '1.20', '1.50']
        };

        if (glLabels[type]) {
            labels = glLabels[type];
            prodData = labels.map(l => {
                const found = rawData.find(d => parseFloat(d[0]).toFixed(2) === parseFloat(l).toFixed(2));
                if (!found) return null;
                // If found[1] is an array, it's [start, end]. Else [600, found[1]]
                if (Array.isArray(found[1])) return found[1];
                return (found[1] !== null && found[1] > 600) ? [600, found[1]] : null;
            });
            negData = labels.map(l => {
                const found = rawData.find(d => parseFloat(d[0]).toFixed(2) === parseFloat(l).toFixed(2));
                if (!found) return null;
                // If found[2] is an array, it's [start, end]. Else [found[1], found[2]]
                if (Array.isArray(found[2])) return found[2];
                return (found[2] !== null) ? [found[1], found[2]] : null;
            });
        }

        const hasNeg = negData.some(v => v !== null);
        const datasets = [];

        if (hasNeg) {
            datasets.push({
                label: '협의 영역',
                data: negData,
                backgroundColor: getHatchPattern(ctx),
                borderColor: '#94a3b8',
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 1.0,
                grouped: false,
                order: 1
            });
        }

        datasets.push({
            label: '생산 가능 폭',
            data: prodData,
            backgroundColor: '#ea580c',
            borderColor: '#9a3412',
            borderWidth: 1,
            borderSkipped: 'bottom',
            barPercentage: 1.0,
            categoryPercentage: 1.0,
            grouped: false,
            order: 2
        });

        if (cglGlCharts[type]) {
            cglGlCharts[type].destroy();
        }

        cglGlCharts[type] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'x',
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        offset: -2,
                        clip: false,
                        color: (ctx) => ctx.dataset.label === '협의 영역' ? '#475569' : '#9a3412',
                        font: { weight: 'bold', size: 10 },
                        display: function (context) {
                            const val = context.dataset.data[context.dataIndex];
                            if (!val || val[1] === 0) return false;
                            const idx = context.dataIndex;
                            const prevVal = context.dataset.data[idx - 1];
                            if (idx > 0 && prevVal && prevVal[1] === val[1]) return false;
                            return true;
                        },
                        formatter: function (value, context) {
                            return value[1];
                            return value[1];
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const val = ctx.raw;
                                if (!val) return '';
                                return `${ctx.dataset.label}: ${val[0]} ~ ${val[1]} mm`;
                            },
                            title: ctx => `두께: ${ctx[0].label} mm`
                        }
                    }
                },
                layout: { padding: { top: 25, right: 10, left: 10 } },
                scales: {
                    x: {
                        title: { display: true, text: '두께 (mm)', font: { weight: 'bold', size: 11 } },
                        grid: { display: false },
                        ticks: { font: { size: 9 }, autoSkip: false }
                    },
                    y: {
                        min: 600,
                        max: 1400,
                        title: { display: true, text: '폭 (mm)', font: { weight: 'bold', size: 11 } },
                        grid: { color: '#e5e7eb' },
                        ticks: {
                            font: { size: 9 },
                            callback: function (value) {
                                const keyValues = [600, 700, 800, 830, 880, 914, 1040, 1140, 1170, 1219, 1230, 1250, 1270, 1290, 1300, 1310, 1320, 1330, 1340, 1350];
                                if (keyValues.includes(value)) return value;
                                return '';
                            }
                        },
                        afterBuildTicks: (axis) => {
                            const keyValues = [600, 700, 800, 830, 880, 914, 1040, 1140, 1170, 1219, 1230, 1250, 1270, 1290, 1300, 1310, 1320, 1330, 1340, 1350];
                            axis.ticks = keyValues.map(v => ({ value: v }));
                        }
                    }
                }
            },
            plugins: [{
                id: 'postAttachBox',
                afterDraw: (chart) => {
                    const post = chartData.postAttach;
                    if (!post) return;
                    const { ctx, scales: { x, y } } = chart;

                    ctx.save();
                    ctx.setLineDash([5, 5]);
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();

                    if (type === 'cq') {
                        // Drawing stepped dashed line for CQ as per image
                        const steps = [
                            { t: '0.35', w: 1250 },
                            { t: '0.40', w: 1270 },
                            { t: '0.50', w: 1270 },
                            { t: '0.60', w: 1290 },
                            { t: '0.70', w: 1290 },
                            { t: '0.80', w: 1290 },
                            { t: '0.90', w: 1270 },
                            { t: '1.00', w: 1270 },
                            { t: '1.20', w: 1250 }
                        ];

                        const firstX = x.getPixelForValue(steps[0].t) - (x.width / (labels.length || 1) / 2);
                        const lastX = x.getPixelForValue(steps[steps.length - 1].t) + (x.width / (labels.length || 1) / 2);
                        const bottomY = y.getPixelForValue(600);

                        ctx.moveTo(firstX, bottomY);
                        steps.forEach((s, idx) => {
                            const currXStart = x.getPixelForValue(s.t) - (x.width / (labels.length || 1) / 2);
                            const currXEnd = x.getPixelForValue(s.t) + (x.width / (labels.length || 1) / 2);
                            const currY = y.getPixelForValue(s.w);

                            if (idx === 0) {
                                ctx.lineTo(currXStart, currY);
                            }
                            ctx.lineTo(currXEnd, currY);

                            if (idx < steps.length - 1) {
                                const nextY = y.getPixelForValue(steps[idx + 1].w);
                                ctx.lineTo(currXEnd, nextY);
                            }
                        });
                        ctx.lineTo(lastX, bottomY);
                        ctx.lineTo(firstX, bottomY);
                    } else {
                        // Default single box
                        const xStart = x.getPixelForValue(post.t[0].toString()) - (x.width / (labels.length || 1) / 2);
                        const xEnd = x.getPixelForValue(post.t[1].toString()) + (x.width / (labels.length || 1) / 2);
                        const yTop = y.getPixelForValue(post.w);
                        const yBottom = y.getPixelForValue(600);
                        ctx.rect(xStart, yTop, xEnd - xStart, yBottom - yTop);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            }]
        });
    }

    // --- [통합 그리드 규격 데이터 시스템] ---
    // 기본 템플릿 값
    const defaultGridSpecs = {
        cpl: { widths: [1350, 1340, 1320, 1300, 1250, 1219, 1140, 1040, 914, 880, 830, 800, 700, 600], thicknesses: ['1.60', '1.80', '2.00', '2.30', '2.50', '2.80', '3.00', '3.20', '3.50', '4.00', '4.20'] },
        crm: { widths: [1350, 1340, 1320, 1300, 1250, 1219, 1140, 1040, 914, 880, 830, 800, 700, 600], thicknesses: ['0.23', '0.30', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60'] },
        cgl: { widths: [1350, 1340, 1330, 1320, 1300, 1290, 1270, 1250, 1219, 1140, 1040, 914, 800, 700, 600], thicknesses: ['0.25', '0.27', '0.30', '0.40', '0.50', '0.60', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60', '1.80', '2.00', '2.30'] },
        ccl: { widths: [1350, 1340, 1320, 1300, 1250, 1219, 1140, 1040, 914, 880, 830, 800, 700, 600], thicknesses: ['0.30', '0.35', '0.40', '0.45', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.10', '1.20', '1.30', '1.40', '1.60'] },
        '2ccl': { widths: [1710, 1650, 1600, 1550, 1500, 1450, 1350, 1300, 1250, 1200, 1100, 1000, 800, 600], thicknesses: ['0.25', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.20', '1.40', '1.60', '1.80', '2.00'] }
    };

    // 각 그리드별 독립적인 규격 저장소 (그리드ID: {widths: [], thicknesses: []})
    let gridConfig = {};

    async function loadGridData() {
        if (!db) return;
        try {
            const doc = await db.collection("settings").doc("lineGridSpecs").get();
            if (doc.exists) {
                const firebaseData = doc.data();
                globalGridData = firebaseData.data || {};
                // 서버에 저장된 규격 수치가 있으면 덮어쓰기
                if (firebaseData.config) {
                    gridConfig = firebaseData.config;
                    // 2CCL 그리드들은 새 템플릿 적용을 위해 기존 설정 초기화
                    Object.keys(gridConfig).forEach(key => {
                        if (key.includes('2ccl')) {
                            delete gridConfig[key];
                        }
                    });
                }
            }
            setTimeout(() => {
                const activeTab = document.querySelector('#line-spec-tabs .tab-btn.active');
                if (activeTab) activeTab.click();
            }, 100);
        } catch (e) { console.error("Grid data load failed:", e); }
    }

    window.renderLineGrid = function (gridId) {
        const container = document.getElementById(gridId);
        if (!container) return;

        // 해당 gridId의 규격이 없으면 기본 템플릿에서 복사
        if (!gridConfig[gridId]) {
            let templateKey = 'ccl';
            if (gridId.includes('cpl')) templateKey = 'cpl';
            else if (gridId.includes('crm')) templateKey = 'crm';
            else if (gridId.includes('cgl')) templateKey = 'cgl';
            else if (gridId.includes('2ccl')) templateKey = '2ccl';

            gridConfig[gridId] = {
                widths: [...defaultGridSpecs[templateKey].widths],
                thicknesses: [...defaultGridSpecs[templateKey].thicknesses]
            };
        }

        const widths = gridConfig[gridId].widths;
        const thicknesses = gridConfig[gridId].thicknesses;

        let html = `<table class="grid-table" style="border-collapse: collapse; font-size: 10px; text-align: center; user-select: none; border: 1px solid #cbd5e1;">`;
        html += `<tbody>`;

        // Body
        widths.forEach((w, wIdx) => {
            const displayW = isGlobalGridEditMode ?
                `<input type="text" value="${w}" style="width: 40px; font-size: 10px; text-align: center; border: 1px solid #cbd5e1; background: #fff; padding: 2px;" onchange="updateGridValue('${gridId}', 'widths', ${wIdx}, this.value)">` : w;

            html += `<tr><td class="grid-axis-label">${displayW}</td>`;
            thicknesses.forEach(t => {
                const key = `${gridId}_${t}_${w}`;
                const status = globalGridData[key] || 0;
                let bg = 'white';
                let style = '';
                if (status === 1) bg = '#ea580c';
                if (status === 2) {
                    bg = '#e0f2fe';
                    style = 'background-image: repeating-linear-gradient(45deg, #94a3b8, #94a3b8 1px, transparent 1px, transparent 3px);';
                }
                if (status === 3) {
                    bg = '#1e3a8a';
                }
                const cellStyle = `background-color: ${bg}; ${style} cursor: ${isGlobalGridEditMode ? 'pointer' : 'default'}; transition: all 0.1s;`;
                html += `<td style="${cellStyle}" 
                    onmousedown="handleGridMouseDown('${gridId}', '${t}', '${w}')" 
                    onmouseenter="handleGridMouseEnter('${gridId}', '${t}', '${w}')"></td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody>`;

        // Footer
        html += `<tfoot><tr><td class="grid-axis-label footer-label">폭/두께</td>`;
        thicknesses.forEach((t, tIdx) => {
            const displayT = isGlobalGridEditMode ?
                `<input type="text" value="${t}" style="width: 38px; font-size: 10px; text-align: center; border: 1px solid #cbd5e1; background: #fff; padding: 2px;" onchange="updateGridValue('${gridId}', 'thicknesses', ${tIdx}, this.value)">` : t;
            html += `<td class="grid-axis-label footer-cell">${displayT}</td>`;
        });
        html += `</tr></tfoot></table>`;

        container.innerHTML = html;
    };

    window.updateGridValue = function (gridId, fieldType, index, value) {
        if (gridConfig[gridId] && gridConfig[gridId][fieldType]) {
            gridConfig[gridId][fieldType][index] = fieldType === 'widths' ? parseInt(value) || value : value;
        }
    };

    window.handleGridMouseDown = function (gridId, t, w) {
        if (!isGlobalGridEditMode) return;
        isPaintingGrid = true;
        const key = `${gridId}_${t}_${w}`;
        const current = globalGridData[key] || 0;
        currentPaintStatus = (current + 1) % 4;
        globalGridData[key] = currentPaintStatus;
        renderLineGrid(gridId);
    };

    window.handleGridMouseEnter = function (gridId, t, w) {
        if (!isGlobalGridEditMode || !isPaintingGrid) return;
        const key = `${gridId}_${t}_${w}`;
        if (globalGridData[key] === currentPaintStatus) return; // 동일하면 무시
        globalGridData[key] = currentPaintStatus;
        renderLineGrid(gridId);
    };

    window.addEventListener('mouseup', () => {
        isPaintingGrid = false;
    });

    window.toggleGlobalGridEditMode = function () {
        if (!window.isAdmin) return;
        isGlobalGridEditMode = !isGlobalGridEditMode;
        const btn = document.getElementById('btn-global-edit');
        const saveBtn = document.getElementById('btn-global-save');
        if (btn) btn.innerHTML = isGlobalGridEditMode ? '<i class="fas fa-lock-open"></i> 편집 모드 종료' : '📝 그리드 편집 모드';
        if (saveBtn) saveBtn.style.display = isGlobalGridEditMode ? 'inline-block' : 'none';
        const activeTabBtn = document.querySelector('#line-spec-tabs .tab-btn.active');
        if (activeTabBtn) activeTabBtn.click();
    };

    window.saveAllGridsData = async function () {
        if (!confirm("모든 라인의 변경사항(폭/두께 수치 포함)을 서버에 저장하시겠습니까?")) return;
        try {
            await db.collection("settings").doc("lineGridSpecs").set({
                data: globalGridData,
                config: gridConfig, // 수정한 폭/두께 설정도 함께 저장
                updatedAt: new Date().toISOString(),
                updatedBy: 'admin'
            });
            alert("성공적으로 저장되었습니다.");
            toggleGlobalGridEditMode();
        } catch (e) { alert("저장 실패: " + e.message); }
    };

    // --- [라인별 생산 가능 SPEC 자동 판단 로직] ---
    window.checkProductionCapability = function () {
        const line = document.getElementById('check-line').value;
        const material = document.getElementById('check-material').value;
        const thickness = parseFloat(document.getElementById('check-thickness').value);
        const width = parseFloat(document.getElementById('check-width').value);
        const coating = (document.getElementById('check-coating').value || "").toUpperCase();
        const resultEl = document.getElementById('check-result-display');

        if (!line || isNaN(thickness) || isNaN(width)) {
            resultEl.innerHTML = '<div style="padding:15px; background:#fff1f2; border:1px solid #fecdd3; color:#e11d48; border-radius:8px;">라인, 두께, 폭 수치를 모두 입력해주세요.</div>';
            return;
        }

        // [추가] CGL 라인의 경우 도금량 입력 필수
        if (line.includes('cgl') && !coating) {
            let example = "예: Z80, Z180";
            if (line === 'cgl-gl') example = "예: AZ80, AZ150";
            resultEl.innerHTML = `<div style="padding:15px; background:#fff1f2; border:1px solid #fecdd3; color:#e11d48; border-radius:8px;">도금부착량 정보를 입력해주세요. (${example})</div>`;
            return;
        }

        let status = 0; // 0: 불가, 1: 가능, 2: 협의, 3: 후부착
        let message = "";

        // 1. Grid 기반 라인들 (CPL, CRM, 1CCL, 2CCL, 3CCL)
        const gridLines = ['cpl', 'crm', '1ccl', '2ccl', '3ccl'];
        if (gridLines.includes(line)) {
            let gridId = `grid-${line}`;
            if (line.includes('ccl')) {
                gridId = `grid-${line}-${material}`;
            }

            if (!gridConfig[gridId]) renderLineGrid(gridId);

            const config = gridConfig[gridId];
            if (config) {
                const thicknesses = config.thicknesses.map(v => parseFloat(v));
                const widths = config.widths.map(v => parseInt(v));

                const minT = Math.min(...thicknesses);
                const maxT = Math.max(...thicknesses);
                const minW = Math.min(...widths);
                const maxW = Math.max(...widths);

                // 범위를 벗어나면 무조건 생산 불가
                if (thickness < minT || thickness > maxT || width < minW || width > maxW) {
                    status = 0;
                } else {
                    // [수정] 그리드 내부에 있을 때만 가장 가까운 규격을 찾아 색칠된(status 1,2,3) 여부 확인
                    const closestT = config.thicknesses.reduce((prev, curr) => Math.abs(parseFloat(curr) - thickness) < Math.abs(parseFloat(prev) - thickness) ? curr : prev);
                    const closestW = config.widths.reduce((prev, curr) => Math.abs(parseInt(curr) - width) < Math.abs(parseInt(prev) - width) ? curr : prev);

                    const key = `${gridId}_${closestT}_${closestW}`;
                    status = globalGridData[key] || 0;
                }
            }
        }
        // 2. Chart 기반 라인들 (CGL GI, CGL GL)
        else if (line === 'cgl-gi' || line === 'cgl-gl') {
            const dataObj = (line === 'cgl-gi') ? cglGiData : cglGlData;
            // Gr.E 매칭을 위해 점 제거 및 소문자 변환
            const matKey = material.toLowerCase().replace('.', '');
            const subData = dataObj[matKey] || dataObj['cq'];

            // [수정] 정확한 일치가 아닌, 해당 두께를 커버하는 스펙(Lower Bound) 찾기
            // 예: 0.36T 입력 시 0.35T 스펙 적용
            const sortedData = subData.data.sort((a, b) => a[0] - b[0]);
            let found = null;

            // 입력 두께가 최소 두께 이상일 때만 탐색
            if (sortedData.length > 0 && thickness >= sortedData[0][0]) {
                // 입력값보다 작거나 같은 두께 중 가장 큰 값 (Lower Bound)
                found = sortedData.filter(d => d[0] <= thickness).pop();

                // 단, found가 되더라도 다음 구간과의 격차가 너무 크면(예: 0.5T 차이) 로직에 따라 불가 처리할 수도 있으나,
                // 현재는 연속된 구간으로 간주하여 적용함.
                // 만약 thicknes가 데이터의 max값보다 훨씬 큰 경우(예: 5.0T)는 별도 상한 체크가 필요할 수 있음.
                const maxDataT = sortedData[sortedData.length - 1][0];
                // 마지막 구간(예: 2.0T)보다 크면 생산 불가로 처리 (Strict check)
                if (thickness > maxDataT) found = undefined;
            }

            if (found) {
                // [추가] 협의 전용 스펙(생산 가능 폭 없음)인 경우, 두께가 정확히 일치하지 않으면 불가 처리
                // 예: 0.25T(협의) -> 0.26T 입력 시 0.25T 규칙 적용 불가 (0.25T만 협의 가능하므로)
                // 반면 0.35T(생산) -> 0.36T 입력 시는 0.35T 규칙 적용 허용
                if (!found[1] && thickness > found[0] + 0.0001) {
                    found = undefined;
                }
            }

            if (found) {
                // [기본값 설정]
                // Gr.E는 통상 914mm 이상 생산, 그 외는 600mm 부터
                let minProdW = (matKey === 'gre') ? 914 : 600;
                let maxProdW = 0;
                let minNegW = 0;
                let maxNegW = 0;

                // 1) 생산 가능 폭 (found[1])
                if (Array.isArray(found[1])) {
                    minProdW = found[1][0];
                    maxProdW = found[1][1];
                } else if (found[1] !== null) {
                    maxProdW = found[1];
                }

                // 2) 협의 폭 (found[2])
                if (found[2]) {
                    if (Array.isArray(found[2])) {
                        minNegW = found[2][0];
                        maxNegW = found[2][1];
                    } else {
                        // 단일 값이면 [생산MAX, 협의MAX] 범위로 간주
                        minNegW = (maxProdW > 0) ? maxProdW : minProdW;
                        maxNegW = found[2];
                    }
                }

                // 폭 판단 로직
                // (1) 생산 가능 범위 포함 여부
                if (maxProdW > 0 && width >= minProdW && width <= maxProdW) {
                    status = 1;
                }
                // (2) 협의 범위 포함 여부
                else if (maxNegW > 0 && width >= minNegW && width <= maxNegW) {
                    status = 2;
                }
            }

            // 도금량 체크 및 조건부 협의
            // 문자가 섞여 있어도 숫자만 추출 (예: "Z220 (Test)" -> 220)
            const coatingVal = parseInt(coating.replace(/[^0-9]/g, '')) || 0;
            const coatingUpper = coating.toUpperCase();

            if (line === 'cgl-gi') {
                if (coatingUpper.includes('Z') && !coatingUpper.includes('AZ')) { // Z만 포함 (AZ 제외)
                    if (coatingVal < 30 || coatingVal > 300) {
                        status = 0;
                        message = "<br><small style='color:#ef4444;'>* 생산 불가 도금량입니다. (가능 범위: Z30 ~ Z300)</small>";
                    } else {
                        // 품질 협의 조건
                        if (thickness <= 0.4 && coatingVal >= 220) {
                            message += "<br><small style='color:#ef4444;'>* 박물재 고도금(0.4T↓, Z220↑)으로 인해 수주 활동 시 품질 협의가 필요합니다.</small>";
                            if (status === 1) status = 2;
                        }
                        if (thickness > 0.801 && coatingVal <= 80) {
                            message += "<br><small style='color:#ef4444;'>* 후물재 박도금(0.801T↑, Z80↓)으로 인해 수주 활동 시 품질 협의가 필요합니다.</small>";
                            if (status === 1) status = 2;
                        }
                    }
                }
            } else if (line === 'cgl-gl') {
                if (coatingUpper.includes('AZ')) {
                    if (coatingVal < 30 || coatingVal > 185) {
                        status = 0;
                        message = "<br><small style='color:#ef4444;'>* 생산 불가 도금량입니다. (가능 범위: AZ30 ~ AZ185)</small>";
                    } else {
                        // AZ120 초과 시 후부착 가능 여부 체크
                        if (coatingVal > 120) {
                            let isPostAttachable = false;
                            const pa = subData.postAttach;
                            if (pa) {
                                // 두께 범위 체크
                                const tMin = pa.t[0];
                                const tMax = pa.t[1];
                                if (thickness >= tMin && thickness <= tMax) {
                                    // 폭 제한 체크 (w가 없으면 제한 없음/기본폭)
                                    if (!pa.w || width <= pa.w) {
                                        isPostAttachable = true;
                                    }
                                }
                            }

                            if (isPostAttachable) {
                                // 후부착 가능 -> 상태 3
                                // 기존 불가가 아닌 경우에만 3으로 변경 (범위 밖이면 이미 0)
                                if (status !== 0) {
                                    status = 3;
                                    message = "<br><small style='color:#1e40af;'>* 고도금(AZ120 초과)으로 인해 후부착 공정이 필요합니다.</small>";
                                }
                            } else {
                                // 후부착 불가능 -> 생산 불가
                                status = 0;
                                message = "<br><small style='color:#ef4444;'>* AZ120 초과 고도금은 후부착 가능 범위(두께/폭) 내에서만 생산 가능합니다.</small>";
                            }
                        }
                    }

                    // [추가] 0.35T 이하 & AZ120 이상 품질 협의 조건 (사용자 요청 사항)
                    if (thickness <= 0.35 && coatingVal >= 120) {
                        message += "<br><small style='color:#ef4444;'>* 0.35T 이하, AZ120 이상은 수주 시 품질 협의가 필요합니다.</small>";
                        // 생산 가능(1) 상태라면 협의(2)로 변경 (후부착(3)이나 불가(0)는 그대로 유지)
                        if (status === 1) status = 2;
                    }
                }
            }
        }

        // 결과 렌더링
        let resultHtml = "";
        if (status === 1) resultHtml = `<div style="padding:15px; background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; border-radius:8px;">✅ <strong>[생산 가능]</strong> 입력하신 스펙은 정상 생산 범위 내에 있습니다.${message}</div>`;
        else if (status === 2) resultHtml = `<div style="padding:15px; background:#fff7ed; border:1px solid #ffedd5; color:#9a3412; border-radius:8px;">⚠️ <strong>[기술 협의]</strong> 해당 스펙은 사전 품질 검토(기술 협의)가 필요한 영역입니다.${message}</div>`;
        else if (status === 3) resultHtml = `<div style="padding:15px; background:#eff6ff; border:1px solid #dbeafe; color:#1e40af; border-radius:8px;">ℹ️ <strong>[후부착 필요]</strong> 특수 공정(후부착 등) 협의 후 생산 가능합니다.${message}</div>`;
        else resultHtml = `<div style="padding:15px; background:#fef2f2; border:1px solid #fee2e2; color:#ef4444; border-radius:8px;">❌ <strong>[생산 불가]</strong> 현재 해당 라인의 설비 능력 범위를 벗어나는 스펙입니다.</div>`;

        resultEl.innerHTML = resultHtml;
    };

    // 라인 선택에 따른 소재 옵션 및 도금량 필드 제어
    const checkLineSelector = document.getElementById('check-line');
    if (checkLineSelector) {
        checkLineSelector.addEventListener('change', (e) => {
            const line = e.target.value;
            const matSelect = document.getElementById('check-material');
            const coatingWrapper = document.getElementById('check-coating-wrapper');
            const coatingInput = document.getElementById('check-coating');

            // 1. 소재/강종 옵션 제어
            // 1. 소재/강종 옵션 제어
            let options = '';
            // CGL 뿐만 아니라 1,2,3CCL 라인도 동일한 소재 옵션을 선택할 수 있도록 확장
            if (line.includes('cgl')) {
                options = `
                    <option value="CQ">CQ (SAE1008)</option>
                    <option value="DQ">DQ (POSHRD2)</option>
                    <option value="DDQ">DDQ (POSHRD3)</option>
                    <option value="STRUCT">STRUCT (SAE1017)</option>
                    <option value="GRE">Gr.E</option>
                `;
                matSelect.disabled = false;
                matSelect.value = "CQ"; // 기본값 설정
            } else if (line.includes('ccl')) {
                matSelect.disabled = false;
                if (line.includes('1ccl')) {
                    // 1CCL
                    options = `
                        <option value="ppgi">PPGI 및 PPGL</option>
                        <option value="ppal">PPAL</option>
                    `;
                    matSelect.value = "ppgi";
                } else if (line.includes('2ccl')) {
                    // 2CCL - 모든 그리드 제목 반영
                    options = `
                        <option value="ppal-1000">PPAL (1000계열)</option>
                        <option value="ppal-others">PPAL (1000계열 외)</option>
                        <option value="ppgi-gl">PPGI/GL</option>
                        <option value="ppgi-print">PPGI/GL 프린트</option>
                        <option value="pet-vcm">PET 및 VCM</option>
                        <option value="ppal-print">PPAL 프린트</option>
                        <option value="snow-flower">스노우 플라워 엠보</option>
                    `;
                    matSelect.value = "ppal-1000";
                } else {
                    // 3CCL
                    options = `
                        <option value="ppgi-gl">PPGI 및 PPGL</option>
                        <option value="stucco">스타코 엠보 (Stucco Embossed)</option>
                        <option value="leather">가죽무늬 엠보 (Leather Embossed)</option>
                    `;
                    matSelect.value = "ppgi-gl";
                }
            } else {
                // 소재가 1개인 라인 처리 (CPL, CRM 등)
                matSelect.disabled = true;
                if (line === 'cpl' || line === 'crm') {
                    options = '<option value="Generic">일반 ( Generic )</option>';
                    matSelect.value = "Generic";
                } else {
                    // 예외 케이스 처리 (혹시 모를 기타 라인)
                    const lineName = line.toUpperCase();
                    options = `<option value="${lineName}">${lineName}</option>`;
                    matSelect.value = lineName;
                }
            }
            matSelect.innerHTML = options;

            // 2. 도금량 필드 제어 (CGL에서만 활성화)
            if (line.startsWith('cgl')) {
                coatingWrapper.style.display = 'flex';
                if (line === 'cgl-gi') {
                    coatingInput.placeholder = "예: Z80, Z180";
                } else if (line === 'cgl-gl') {
                    coatingInput.placeholder = "예: AZ80, AZ150";
                }
            } else {
                coatingWrapper.style.display = 'none';
                coatingInput.value = ""; // 초기화
            }
        });

        // 초기 로딩 시 상태 적용 (라인이 선택되어 있을 수 있음)
        checkLineSelector.dispatchEvent(new Event('change'));
    }

    loadGridData();

    const lineSpecTabContainer = document.getElementById('line-spec-tabs');
    if (lineSpecTabContainer) {
        const lineSpecTabs = lineSpecTabContainer.querySelectorAll('.tab-btn');
        lineSpecTabs.forEach(btn => {
            btn.addEventListener('click', async () => {
                const tabId = btn.getAttribute('data-line-tab');
                if (!tabId) return;
                lineSpecTabs.forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.line-spec-panel').forEach(panel => {
                    panel.style.display = 'none';
                    panel.classList.remove('active');
                });
                const panelId = `panel-line-${tabId}`;
                const targetPanel = document.getElementById(panelId);
                if (targetPanel) {
                    targetPanel.style.display = 'block';
                    setTimeout(() => targetPanel.classList.add('active'), 10);
                    const grids = targetPanel.querySelectorAll('.grid-wrapper');
                    grids.forEach(g => { renderLineGrid(g.id); });
                }
            });
        });
    }

    const processTabs = document.querySelectorAll('.process-tab-btn');
    processTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            processTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.process-panel').forEach(p => {
                p.style.display = 'none';
                p.classList.remove('active');
            });
            const target = btn.getAttribute('data-process-tab');
            const panel = document.getElementById(`process-panel-${target}`);
            if (panel) {
                panel.style.display = 'block';
                setTimeout(() => panel.classList.add('active'), 10);
            }
        });
    });


    // --- [WARRANTY GUIDE 탭 로직] ---
    const warrantyTabHeader = document.getElementById('warranty-tab-header');
    if (warrantyTabHeader) {
        const warrantyTabs = warrantyTabHeader.querySelectorAll('.warranty-tab-btn');
        warrantyTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-warranty-tab');
                if (!tabId) return;

                // 1. 버튼 활성 상태 변경
                warrantyTabs.forEach(t => t.classList.remove('active'));
                btn.classList.add('active');

                // 2. 패널 숨기기 및 보이기
                document.querySelectorAll('.warranty-panel').forEach(panel => {
                    panel.style.display = 'none';
                    panel.classList.remove('active');
                });

                const targetPanel = document.getElementById(`warranty-panel-${tabId}`);
                if (targetPanel) {
                    targetPanel.style.display = 'block';
                    setTimeout(() => targetPanel.classList.add('active'), 10);
                }
            });
        });
    }
});

// --- 전역 함수: 이미지 확대 모달 (Lightbox) ---
function openImageModal(src, caption) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    const captionText = document.getElementById('modal-caption');

    if (modal && modalImg) {
        modal.style.display = "block";
        modalImg.src = src;
        if (captionText) captionText.innerHTML = caption || '';
        document.body.style.overflow = "hidden"; // 배경 스크롤 방지
    }
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = ""; // 스크롤 복원
    }
}

// ESC 키로 모든 모달 닫기
document.addEventListener('keydown', function (event) {
    if (event.key === "Escape") {
        // 이미지 모달 닫기
        if (typeof closeImageModal === 'function') closeImageModal();
        
        // 관리자 모달 닫기
        const adminModal = document.getElementById('admin-modal');
        if (adminModal) adminModal.style.display = 'none';
        
        // VOC 상세보기 모달 닫기
        const vocModal = document.getElementById('voc-modal');
        if (vocModal) vocModal.style.display = 'none';

        // VOC 비밀번호 모달 닫기
        const vocPasswordModal = document.getElementById('voc-password-modal');
        if (vocPasswordModal) vocPasswordModal.style.display = 'none';
        
        // 불량 도감 모달 닫기
        const defectModal = document.getElementById('defect-modal');
        if (defectModal) defectModal.style.display = 'none';
        
        // 인증 정보 모달 닫기
        const certModal = document.getElementById('cert-modal');
        if (certModal) certModal.style.display = 'none';
        
        // 문서 뷰어 모달 닫기
        const docViewerModal = document.getElementById('doc-viewer-modal');
        if (docViewerModal && docViewerModal.style.display !== 'none') {
            docViewerModal.style.display = 'none';
            document.body.classList.remove('viewer-open');
            document.body.style.overflow = '';
        }

        // 모바일 사이드바 및 오버레이 닫기
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('open');
        }
    }
});

// --- [14. Certification Status Logic] ---
// --- [14. Certification Status Logic (Dynamic)] ---
let localCertifications = [];
// Initial Seed Data (Only used if DB is empty)
const initialCertData = [
    { id: 1, name: "ISO 9001", item: "품질경영시스템 (ISO 9001:2015)", org: "한국표준협회", firstDate: "2000-12-01", recentDate: "2024.10.10", validDate: "2027.10.09", note: "3년 주기\n(1년 정기 심사)" },
    { id: 2, name: "ISO 14001", item: "환경경영시스템 (ISO 14001:2015)", org: "크레비즈인증원", firstDate: "2013.05.24", recentDate: "2025.05.24", validDate: "2028.05.23", note: "3년 주기" },
    { id: 3, name: "ISO 45001", item: "안전보건경영시스템 (ISO 45001:2018)", org: "크레비즈인증원", firstDate: "2017-12-01", recentDate: "2023.12.01", validDate: "2026.11.30", note: "3년 주기" },
    { id: 4, name: "KS D 3506", item: "용융아연도금강판 및 강대", org: "한국표준협회", firstDate: "2007-04-11", recentDate: "2024.06.27", validDate: "2027.06.27", note: "3년 주기" },
    { id: 5, name: "KS D 3520", item: "도장 용융 아연 도금 강판 및 강대", org: "한국표준협회", firstDate: "1999-11-25", recentDate: "2024.06.27", validDate: "2027.06.27", note: "3년 주기" },
    { id: 6, name: "KS D 3770", item: "용융 55%알루미늄-아연 합금 도금 강판 및 강대", org: "한국표준협회", firstDate: "2021-09-15", recentDate: "2024.09.14", validDate: "2027.09.14", note: "3년 주기" },
    { id: 7, name: "KS D 3862", item: "도장용융 55%알루미늄-아연 합금 도금 강판 및 강대", org: "한국표준협회", firstDate: "2020-04-01", recentDate: "2023.04.12", validDate: "2026.03.31", note: "3년 주기" },
    { id: 8, name: "KS D 6711", item: "알루미늄 및 알루미늄 합금의 도장판 및 띠", org: "한국표준협회", firstDate: "2015-12-23", recentDate: "2024.06.27", validDate: "2027.06.27", note: "3년 주기" },
    { id: 9, name: "JIS G 3302", item: "용융아연도금강판 및 강대", org: "한국표준협회", firstDate: "2009-10-22", recentDate: "2024.10.21", validDate: "2027.10.21", note: "3년 주기" },
    { id: 10, name: "JIS G 3312", item: "도장용융아연도금강판 및 강대 1류,2류", org: "한국표준협회", firstDate: "2009-10-22", recentDate: "2024.10.21", validDate: "2027.10.21", note: "3년 주기" },
    { id: 11, name: "JIS G 3321", item: "용융 55%알루미늄-아연 합금 도금 강판 및 강대", org: "한국표준협회", firstDate: "2022-02-11", recentDate: "2025.03.21", validDate: "2028.02.10", note: "3년 주기" },
    { id: 12, name: "JIS G 3322", item: "도장용융 55%알루미늄-아연 합금 도금 강판 및 강대", org: "한국표준협회", firstDate: "2017-06-02", recentDate: "2023.06.25", validDate: "2026.06.01", note: "3년 주기" },
    { id: 13, name: "BIS", item: "Continuously Pre-Painted Galvanized Steel Sheets", org: "인도표준협회", firstDate: "2020-09-28", recentDate: "2025.09.28", validDate: "2026.09.27", note: "1년 주기" },
    { id: 14, name: "MED Module B", item: "That the surface materials and floor coverings whith low flame-spread characteristics : decorative veneers", org: "DNV", firstDate: "2018-12-28", recentDate: "2023.12.11", validDate: "2028.12.10", note: "5년 주기" },
    { id: 15, name: "MED Module D", item: "That the Quality system for the products.", org: "DNV", firstDate: "2019-10-10", recentDate: "2024.12.19", validDate: "2029.12.18", note: "5년 주기\n(1년 정기 심사)" },
    { id: 16, name: "HB 인증", item: "도장용융아연도금강판 및 강대(KS D 3520)", org: "한국공기청정협회", firstDate: "2018.09.28", recentDate: "2024.09.27", validDate: "2027.09.27", note: "3년 주기" },
    { id: 17, name: "HB 인증", item: "컬러 알루미늄 강판(KS D 6711 A3003 H22)", org: "한국공기청정협회", firstDate: "2021.01.29", recentDate: "2024.01.28", validDate: "2027.01.28", note: "3년 주기" },
    { id: 18, name: "HB 인증", item: "컬러 알루미늄 강판(KS D 6711 A1100 H16)", org: "한국공기청정협회", firstDate: "2021.01.29", recentDate: "2024.01.28", validDate: "2027.01.28", note: "3년 주기" },
    { id: 19, name: "HB 인증", item: "도장 용융 55%알루미늄-아연 합금 도금 강판 및 강대\n(KS D 3862)", org: "한국공기청정협회", firstDate: "2023.02.28", recentDate: "2023.02.28", validDate: "2026.02.27", note: "3년 주기" },
    { id: 20, name: "C3", item: "독일 건자재 품목", org: "MPA", firstDate: "2023.01.03", recentDate: "2025.12.22", validDate: "2027.01.31", note: "1년 주기" },
    { id: 21, name: "ISO 37301", item: "규범준수 경영시스템", org: "KCCA", firstDate: "2023.03.24", recentDate: "2023.03.24", validDate: "2028.03.23", note: "5년 주기\n(1년 정기 심사)" },
    { id: 22, name: "TISI", item: "태국 수출 (수입자 : 킴텍) 품목", org: "태국산업표준원", firstDate: "2023.05.09", recentDate: "2023.05.09", validDate: "Infinite", note: "주기 없음" },
    { id: 23, name: "EPD", item: "GI/GL/PPGI/PPGL 등", org: "EPD International", firstDate: "2023.08.22", recentDate: "2023.08.22", validDate: "2028.08.22", note: "5년 주기" },
    { id: 24, name: "일본 불연 인증", item: "PPGI/PPGL/PPAL", org: "일본 국토교통성", firstDate: "2023.12.07", recentDate: "2023.12.07", validDate: "Infinite", note: "주기 없음" },
    { id: 25, name: "일본 불연 인증", item: "GL", org: "일본 국토교통성", firstDate: "-", recentDate: "-", validDate: "Pending", note: "취득 진행 중" },
    { id: 26, name: "KS D 3034", item: "도장 용융 아연 알루미늄 마그네슘 합금 도금 강판 및 강대", org: "한국표준협회", firstDate: "-", recentDate: "-", validDate: "Pending", note: "취득 검토 중" },
    { id: 27, name: "KS D 3501", item: "열간 압연 연강판 및 강대", org: "한국표준협회", firstDate: "-", recentDate: "-", validDate: "Pending", note: "취득 검토 중" },
    { id: 28, name: "JIS G 3131", item: "열간 압연 연강판 및 강대", org: "한국표준협회", firstDate: "-", recentDate: "-", validDate: "Pending", note: "취득 검토 중" }
];

async function loadCertifications() {
    if (!db) return;
    try {
        const snap = await db.collection("certifications").get();
        let loaded = [];
        snap.forEach(doc => loaded.push({ docId: doc.id, ...doc.data() }));

        const currentIsAdmin = window.isAdmin || false;

        if (loaded.length !== initialCertData.length && currentIsAdmin) {
            try {
                const batchDelete = db.batch();
                snap.forEach(doc => batchDelete.delete(doc.ref));
                await batchDelete.commit();

                const batch = db.batch();
                initialCertData.forEach(d => {
                    const ref = db.collection("certifications").doc();
                    batch.set(ref, { ...d, createdAt: new Date().toISOString() });
                });
                await batch.commit();

                const newSnap = await db.collection("certifications").get();
                loaded = [];
                newSnap.forEach(doc => loaded.push({ docId: doc.id, ...doc.data() }));
            } catch (seedErr) {
                console.warn("Seeding failed (permissions?):", seedErr);
            }
        }

        if (loaded.length === 0) {
            localCertifications = [...initialCertData];
        } else {
            localCertifications = loaded.sort((a, b) => a.id - b.id);
        }
        renderCertification();
    } catch (e) {
        console.error("Failed to load certifications:", e);
        localCertifications = [...initialCertData];
        renderCertification();
    }
}

function renderCertification() {
    const tbody = document.getElementById('certification-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const today = new Date();

    localCertifications.forEach(row => {
        let remainHtml = '';
        let validDateDisplay = row.validDate;

        if (row.validDate === 'Infinite') {
            validDateDisplay = '유효기간 없음';
            remainHtml = '<span class="status-badge" style="background:#10b981;">Permanent</span>';
        } else if (row.validDate === 'Pending') {
            validDateDisplay = '-';
            remainHtml = '<span class="status-badge" style="background:#64748b;">Pending</span>';
        } else {
            validDateDisplay = '~ ' + (row.validDate || '').replace(/-/g, '.');
            // D-Day Calc
            const normalizedDate = (row.validDate || '').replace(/\./g, '-');
            const endDate = new Date(normalizedDate);

            if (!isNaN(endDate.getTime())) {
                const diffTime = endDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 365) {
                    remainHtml = `<span class="status-badge" style="background:#3b82f6;">D-${diffDays}</span>`;
                } else if (diffDays > 0) {
                    remainHtml = `<span class="status-badge" style="background:#f59e0b;">D-${diffDays}</span>`;
                } else {
                    remainHtml = `<span class="status-badge" style="background:#ef4444;">Expired</span>`;
                }
            } else {
                remainHtml = '<span class="status-badge" style="background:#64748b;">-</span>';
            }
        }

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';
        tr.style.height = '48px';

        // Hover effect
        tr.onmouseover = () => tr.style.background = '#f8fafc';
        tr.onmouseout = () => tr.style.background = 'white';

        let adminActionHtml = '';
        const currentIsAdmin = window.isAdmin;
        if (currentIsAdmin) {
            adminActionHtml = `
                    <td class="admin-only" style="text-align:center;">
                        <button class="btn-icon" onclick="openCertModal('${row.docId}')" style="color:#3b82f6;">✏️</button>
                        <button class="btn-icon" onclick="deleteCertification('${row.docId}')" style="color:#ef4444;">🗑️</button>
                    </td>
                `;
        } else {
            adminActionHtml = `<td class="admin-only" style="text-align:center; color:#94a3b8;">-</td>`;
        }


        tr.innerHTML = `
                <td style="text-align:center; padding:10px; font-weight:bold; color:#64748b;">${row.id}</td>
                <td style="text-align:center; padding:10px; font-weight:700; color:#1e3a8a;">${row.name}</td>
                <td style="text-align:left; padding:10px; font-size:13px;">${row.item}</td>
                <td style="text-align:center; padding:10px; font-size:13px;">${row.org}</td>
                <td style="text-align:center; padding:10px; font-size:13px; color:#475569;">${row.firstDate}</td>
                <td style="text-align:center; padding:10px; font-size:13px; color:#475569;">${row.recentDate}</td>
                <td style="text-align:center; padding:10px; font-size:13px; font-weight:bold;">${validDateDisplay}</td>
                <td style="text-align:center; padding:10px;">${remainHtml}</td>
                <td style="text-align:center; padding:10px; font-size:12px; white-space:pre-line; color:#64748b;">${row.note}</td>
                ${adminActionHtml}
            `;
        tbody.appendChild(tr);
    });

    // Hide 'admin-only' columns if not admin
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = window.isAdmin ? '' : 'none';
    });
}

// Modal & Form Logic
const certModal = document.getElementById('cert-modal');
const certForm = document.getElementById('cert-form');
const addCertBtn = document.getElementById('add-cert-btn');

if (addCertBtn) addCertBtn.onclick = () => openCertModal();

window.openCertModal = (docId = null) => {
    if (!certModal) return;
    document.getElementById('cert-id-hidden').value = docId || '';
    document.getElementById('cert-modal-title').textContent = docId ? '🏆 인증 정보 수정' : '🏆 신규 인증 등록';

    if (docId) {
        const row = localCertifications.find(c => c.docId === docId);
        if (row) {
            document.getElementById('cert-no').value = row.id;
            document.getElementById('cert-name').value = row.name;
            document.getElementById('cert-item').value = row.item;
            document.getElementById('cert-org').value = row.org;
            // Handle text-based dates (allow '-')
            const fDate = row.firstDate || '';
            const rDate = row.recentDate || '';
            document.getElementById('cert-first-date').value = fDate;
            document.getElementById('cert-recent-date').value = rDate;

            // Sync pickers if they look like valid dates
            const fPicker = document.getElementById('cert-first-date-picker');
            const rPicker = document.getElementById('cert-recent-date-picker');
            if (fPicker) fPicker.value = fDate.includes('.') ? fDate.replace(/\./g, '-') : (fDate.length === 10 ? fDate : '');
            if (rPicker) rPicker.value = rDate.includes('.') ? rDate.replace(/\./g, '-') : (rDate.length === 10 ? rDate : '');

            const vDate = row.validDate || '';
            document.getElementById('cert-valid-date').value = vDate;
            const vDatePicker = document.getElementById('cert-valid-date-picker');
            if (vDatePicker) vDatePicker.value = vDate.includes('.') ? vDate.replace(/\./g, '-') : (vDate.length === 10 ? vDate : '');

            document.getElementById('cert-note').value = row.note;
        }
    } else {
        certForm.reset();
        // Clear all pickers
        ['cert-first-date-picker', 'cert-recent-date-picker', 'cert-valid-date-picker'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        // Auto number
        const maxId = localCertifications.length > 0 ? Math.max(...localCertifications.map(c => c.id)) : 0;
        document.getElementById('cert-no').value = maxId + 1;
    }
    certModal.style.display = 'flex';
};

if (certForm) {
    certForm.onsubmit = async (e) => {
        e.preventDefault();
        const docId = document.getElementById('cert-id-hidden').value;
        const data = {
            id: parseInt(document.getElementById('cert-no').value) || 0,
            name: document.getElementById('cert-name').value,
            item: document.getElementById('cert-item').value,
            org: document.getElementById('cert-org').value,
            firstDate: document.getElementById('cert-first-date').value,
            recentDate: document.getElementById('cert-recent-date').value,
            validDate: document.getElementById('cert-valid-date').value,
            note: document.getElementById('cert-note').value
        };

        try {
            if (docId) {
                await db.collection("certifications").doc(docId).update(data);
            } else {
                await db.collection("certifications").add({ ...data, createdAt: new Date().toISOString() });
            }
            certModal.style.display = 'none';
            loadCertifications();
        } catch (err) {
            alert("저장 실패: " + err.message);
        }
    };
}

window.deleteCertification = async (docId) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
        await db.collection("certifications").doc(docId).delete();
        loadCertifications();
    } catch (err) {
        alert("삭제 실패: " + err.message);
    }
};

    // --- [12. 생산 가능성 검토 (Feasibility) 엔진 - 전면 재구축] ---
    let localFeasibilityRequests = [];
    let selectedFeasFiles = []; // 신규 첨부 파일 저장용
    const feasibilityListBody = document.getElementById('feasibility-list-body');
    const feasibilityForm = document.getElementById('feasibility-form');
    const feasibilityModal = document.getElementById('feasibility-modal');
    const feasAttachmentInput = document.getElementById('feas-attachments');
    const feasUploadTrigger = document.getElementById('feas-upload-trigger');
    const feasFilePreview = document.getElementById('feas-file-preview');

    if (feasUploadTrigger && feasAttachmentInput) {
        feasUploadTrigger.onclick = () => feasAttachmentInput.click();
    }

    if (feasAttachmentInput) {
        feasAttachmentInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            selectedFeasFiles = [...selectedFeasFiles, ...files];
            renderFeasFilePreview();
        };
    }

    function renderFeasFilePreview(existingAttachments = [], requestId = null) {
        if (!feasFilePreview) return;
        feasFilePreview.innerHTML = '';

        if (selectedFeasFiles.length === 0 && existingAttachments.length === 0) {
            feasFilePreview.innerHTML = '<p style="font-size: 12px; color: #94a3b8; margin: 0;">선택된 파일이 없습니다.</p>';
            return;
        }

        // 1. 기존 업로드된 파일 표시
        existingAttachments.forEach((file, idx) => {
            const div = document.createElement('div');
            div.className = 'media-preview-item';
            div.style.cssText = 'width: 70px; height: 70px; position:relative;';
            
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) || file.url.includes('image');
            if (isImage) {
                div.innerHTML = `<img src="${file.url}" alt="${file.name}" onclick="window.openSecureViewer('${file.url}')" style="cursor:pointer;">`;
            } else {
                div.innerHTML = `<div onclick="window.openSecureViewer('${file.url}')" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:24px; cursor:pointer; background:#f1f5f9; color:#64748b;"><i class="fas fa-file-alt"></i></div>`;
            }
            
            // 삭제 버튼 (관리자 또는 작성 권한 확인 로직을 넣을 수 있지만 일단 관리자 모드거나 수정 가능 상태일 때 노출)
            if (requestId && (window.isAdmin || document.getElementById('save-feasibility-btn').style.display !== 'none')) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'media-remove-btn';
                delBtn.innerHTML = '×';
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteUploadedFeasFile(requestId, idx);
                };
                div.appendChild(delBtn);
            }
            
            feasFilePreview.appendChild(div);
        });

        // 2. 새로 선택한 파일 표시
        selectedFeasFiles.forEach((file, idx) => {
            const div = document.createElement('div');
            div.className = 'media-preview-item';
            div.style.cssText = 'width: 70px; height: 70px; position:relative;';
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    div.innerHTML = `
                        <img src="${e.target.result}" alt="${file.name}">
                        <button type="button" class="media-remove-btn" onclick="removeSelectedFeasFile(${idx})">×</button>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                div.innerHTML = `
                    <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:24px; background:#f1f5f9; color:#64748b;"><i class="fas fa-file-alt"></i></div>
                    <button type="button" class="media-remove-btn" onclick="removeSelectedFeasFile(${idx})">×</button>
                    <div style="position:absolute; bottom:0; width:100%; font-size:8px; background:rgba(0,0,0,0.5); color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:2px;">${file.name}</div>
                `;
            }
            feasFilePreview.appendChild(div);
        });
    }

    window.removeSelectedFeasFile = (idx) => {
        selectedFeasFiles.splice(idx, 1);
        renderFeasFilePreview();
    };

    window.deleteUploadedFeasFile = async (requestId, fileIdx) => {
        if (!confirm('이 파일을 서버에서 완전히 삭제하시겠습니까?')) return;
        
        try {
            const doc = await db.collection("feasibility_requests").doc(requestId).get();
            const data = doc.data();
            if (!data || !data.attachments) return;
            
            const fileToDelete = data.attachments[fileIdx];
            
            // 1. Storage에서 파일 삭제
            try {
                const fileRef = storage.refFromURL(fileToDelete.url);
                await fileRef.delete();
            } catch (e) { console.warn("Storage delete failed (already gone?):", e); }
            
            // 2. Firestore 데이터 업데이트
            const newAttachments = data.attachments.filter((_, i) => i !== fileIdx);
            await db.collection("feasibility_requests").doc(requestId).update({
                attachments: newAttachments,
                updatedAt: new Date().toISOString()
            });
            
            alert('파일이 삭제되었습니다.');
            
            // 3. UI 업데이트 (목록 새로고침 및 모달 리렌더링)
            await loadFeasibilityRequests();
            const updatedReq = localFeasibilityRequests.find(r => r.id === requestId);
            if (updatedReq) {
                renderFeasFilePreview(updatedReq.attachments, requestId);
            }
        } catch (err) {
            alert('파일 삭제 실패: ' + err.message);
        }
    };

    async function loadFeasibilityRequests() {
        if (!db) return;
        try {
            const snap = await db.collection("feasibility_requests").orderBy("createdAt", "desc").get();
            localFeasibilityRequests = [];
            snap.forEach(doc => localFeasibilityRequests.push({ id: doc.id, ...doc.data() }));
            renderFeasibilityTable();
            updateFeasibilityDashboard();
        } catch (err) {
            console.error("Feasibility ordered load failed:", err);
            try {
                const snap = await db.collection("feasibility_requests").get();
                localFeasibilityRequests = [];
                snap.forEach(doc => localFeasibilityRequests.push({ id: doc.id, ...doc.data() }));
                renderFeasibilityTable();
                updateFeasibilityDashboard();
            } catch (e) { console.error("Feasibility fallback failed:", e); }
        }
    }
    window.loadFeasibilityRequests = loadFeasibilityRequests;

    function updateFeasibilityDashboard() {
        const all = localFeasibilityRequests;
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el('feas-dash-total', all.length);
        el('feas-dash-pending', all.filter(r => r.status === '접수').length);
        el('feas-dash-reviewing', all.filter(r => r.status === '검토중').length);
        el('feas-dash-approved', all.filter(r => r.status === '승인').length);
        el('feas-dash-rejected', all.filter(r => r.status === '불가' || r.status === '보완요청').length);
    }

    window.renderFeasibilityTable = function() {
        if (!feasibilityListBody) return;
        const statusEl = document.getElementById('feasibility-status-filter');
        const materialEl = document.getElementById('feasibility-material-filter');
        const searchEl = document.getElementById('feasibility-search-input');
        const statusFilter = statusEl ? statusEl.value : 'all';
        const materialFilter = materialEl ? materialEl.value : 'all';
        const searchText = searchEl ? searchEl.value.toLowerCase().trim() : '';

        let filtered = localFeasibilityRequests.filter(req => {
            const matchStatus = statusFilter === 'all' || req.status === statusFilter;
            const matchMaterial = materialFilter === 'all' || req.material === materialFilter;
            const matchSearch = !searchText ||
                (req.customer || '').toLowerCase().includes(searchText) ||
                (req.usage || '').toLowerCase().includes(searchText) ||
                (req.requesterName || '').toLowerCase().includes(searchText) ||
                (req.country || '').toLowerCase().includes(searchText);
            return matchStatus && matchMaterial && matchSearch;
        });

        if (filtered.length === 0) {
            feasibilityListBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:60px; color:#94a3b8; font-size:14px;">
                <div style="margin-bottom:8px; font-size:32px;">📭</div>검토 요청 내역이 없습니다.</td></tr>`;
            return;
        }

        feasibilityListBody.innerHTML = '';
        filtered.forEach((req, idx) => {
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid #f1f5f9; cursor:pointer; transition: background 0.2s;';
            tr.onmouseover = () => tr.style.background = '#f8fafc';
            tr.onmouseout = () => tr.style.background = 'transparent';
            tr.onclick = (e) => { if (!e.target.closest('.feas-delete-btn')) openFeasibilityModal(req.id); };

            const statusMap = { '접수': {c:'#64748b',i:'⏳'}, '검토중': {c:'#3b82f6',i:'🔍'}, '승인': {c:'#10b981',i:'✅'}, '불가': {c:'#ef4444',i:'❌'}, '보완요청': {c:'#f59e0b',i:'⚠️'} };
            const st = statusMap[req.status] || statusMap['접수'];
            const specStr = [req.thickness ? req.thickness + 'T' : '', req.width ? req.width + 'W' : ''].filter(Boolean).join(' × ') || '-';
            const requesterDisp = (req.requesterTeam ? `<div style="font-size:10px;color:#94a3b8;">[${req.requesterTeam}]</div>` : '') + `<div style="font-weight:600;color:#334155;">${req.requesterName || '-'}</div>`;

            let deleteHtml = '';
            if (window.isAdmin) {
                deleteHtml = `<button class="feas-delete-btn" onclick="event.stopPropagation(); deleteFeasibility('${req.id}')" style="border:none; background:#fee2e2; color:#ef4444; width:26px; height:26px; border-radius:6px; cursor:pointer; font-size:11px; transition:all 0.2s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'"><i class="fas fa-trash-alt"></i></button>`;
            }

            const hasAttachments = req.attachments && req.attachments.length > 0;
            const attachmentIcon = hasAttachments ? `<i class="fas fa-paperclip" style="font-size:10px; color:#3b82f6; margin-left:5px;" title="첨부파일 ${req.attachments.length}개"></i>` : '';

            tr.innerHTML = `
                <td style="padding:10px 6px; text-align:center; color:#94a3b8; font-size:12px;">${filtered.length - idx}</td>
                <td style="padding:10px 6px; text-align:center; font-size:12px; color:#475569; white-space:nowrap;">${req.requestDate || '-'}</td>
                <td style="padding:10px 6px; text-align:center; font-size:12px;">${requesterDisp}</td>
                <td style="padding:10px 6px; text-align:center;"><span style="background:#eff6ff; color:#1e3a8a; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:800;">${req.material || '-'}</span></td>
                <td style="padding:10px 6px; text-align:center; font-size:11px; color:#475569; font-family:'Roboto Mono',monospace;">${specStr}</td>
                <td style="padding:10px 6px; text-align:center; font-size:12px; color:#475569;">${req.steelGrade || '-'}</td>
                <td style="padding:10px 6px; text-align:center; font-size:12px; color:#475569;">${req.standard || '-'}</td>
                <td style="padding:10px 6px; text-align:center; font-weight:700; color:#1e293b; font-size:13px;">${req.customer || '-'}${attachmentIcon}</td>
                <td style="padding:10px 6px; text-align:center; color:#475569; font-size:12px;">${req.usage || '-'}${req.country ? ' <span style="color:#94a3b8;">(' + req.country + ')</span>' : ''}</td>
                <td style="padding:10px 6px; text-align:center;">
                    <span style="background:${st.c}12; color:${st.c}; padding:4px 8px; border-radius:5px; font-size:10px; font-weight:800; border:1px solid ${st.c}25; white-space:nowrap;">
                        ${st.i} ${req.status || '접수'}
                    </span>
                </td>
                <td style="padding:10px 6px; text-align:center;">
                    <div style="display:flex; gap:4px; justify-content:center; align-items:center;">
                        <button style="border:none; background:#e0f2fe; color:#0284c7; width:26px; height:26px; border-radius:6px; cursor:pointer; font-size:11px; transition:all 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'" onclick="event.stopPropagation(); openFeasibilityModal('${req.id}')"><i class="fas fa-eye"></i></button>
                        ${deleteHtml}
                    </div>
                </td>`;
            feasibilityListBody.appendChild(tr);
        });
    };

    window.openFeasibilityModal = (id = null) => {
        if (!feasibilityModal || !feasibilityForm) return;
        feasibilityForm.reset();
        document.getElementById('feasibility-id').value = id || '';
        const titleEl = document.getElementById('feasibility-modal-title');
        if (titleEl) titleEl.textContent = id ? '📋 생산 가능성 검토 상세' : '📋 신규 검토 요청 등록';

        // 1. 모든 입력 필드(전체)에 대한 읽기/쓰기 권한 제어
        const allInputs = feasibilityModal.querySelectorAll('input, select, textarea');
        const saveBtn = document.getElementById('save-feasibility-btn');

        if (id) {
            // 기존 건 조회 시
            if (window.isAdmin) {
                // 관리자는 모든 필드 수정 가능
                allInputs.forEach(inp => {
                    inp.disabled = false;
                    inp.style.backgroundColor = '#fff';
                    inp.style.cursor = 'auto';
                });
                if (saveBtn) saveBtn.style.display = 'flex';
            } else {
                // 비관리자는 모든 필드 읽기 전용
                allInputs.forEach(inp => {
                    inp.disabled = true;
                    inp.style.backgroundColor = '#f8fafc';
                    inp.style.cursor = 'not-allowed';
                });
                if (saveBtn) saveBtn.style.display = 'none';
            }
        } else {
            // 신규 등록 시
            allInputs.forEach(inp => {
                inp.disabled = false;
                inp.style.backgroundColor = '#fff';
                inp.style.cursor = 'auto';
            });
            if (saveBtn) saveBtn.style.display = 'flex';
        }

        // 2. 관리자 전용 섹션(검토 결과) 추가 제어
        const adminSections = feasibilityModal.querySelectorAll('.admin-only');
        adminSections.forEach(el => {
            if (id) {
                // 기존 건은 항상 표시하되 권한은 위에서 처리됨 (관리자만 수정 가능)
                el.style.setProperty('display', 'block', 'important');
            } else {
                // 신규 등록 시에는 관리자만 검토 결과 섹션이 보임
                if (window.isAdmin) {
                    el.style.setProperty('display', 'block', 'important');
                } else {
                    el.style.setProperty('display', 'none', 'important');
                }
            }
        });

        selectedFeasFiles = []; // 초기화
        renderFeasFilePreview();

        if (id) {
            const req = localFeasibilityRequests.find(r => r.id === id);
            if (!req) return;

            // 기존 첨부파일 표시
            if (req.attachments && req.attachments.length > 0) {
                renderFeasFilePreview(req.attachments, id);
            }

            const setVal = (elId, val) => { const e = document.getElementById(elId); if (e) e.value = val || ''; };
            setVal('feas-request-date', req.requestDate);
            // 직접입력 팀명 복원
            const teamSel = document.getElementById('feas-requester-team');
            const teamWrap = document.getElementById('feas-team-custom-wrap');
            const teamCustom = document.getElementById('feas-team-custom');
            const presetTeams = ['', '영업1팀', '영업2팀', '수출팀', '직접입력'];
            if (req.requesterTeam && !presetTeams.includes(req.requesterTeam)) {
                if (teamSel) teamSel.value = '직접입력';
                if (teamWrap) teamWrap.style.display = 'block';
                if (teamCustom) teamCustom.value = req.requesterTeam;
            } else {
                setVal('feas-requester-team', req.requesterTeam);
                if (teamWrap) teamWrap.style.display = 'none';
                if (teamCustom) teamCustom.value = '';
            }
            setVal('feas-requester-name', req.requesterName);

            setVal('feas-material', req.material);
            setVal('feas-steel-grade', req.steelGrade);
            setVal('feas-standard', req.standard);
            setVal('feas-thickness', req.thickness);
            setVal('feas-width', req.width);
            setVal('feas-coating', req.coating);
            setVal('feas-paint-spec', req.paintSpec);
            setVal('feas-resin-top', req.resinTop || req.resin); // 하위 호환성 위해 resin도 체크
            setVal('feas-resin-back', req.resinBack);
            setVal('feas-paint-structure', req.paintStructure);
            setVal('feas-color', req.color);
            setVal('feas-film', req.film || '무');
            setVal('feas-quantity', req.quantity);
            setVal('feas-warranty', req.warranty);
            setVal('feas-customer', req.customer);
            setVal('feas-country', req.country);
            setVal('feas-market', req.market);
            setVal('feas-usage', req.usage);
            setVal('feas-environment', req.environment);
            setVal('feas-remarks', req.remarks);
            setVal('feas-reply-status', req.status || '접수');
            setVal('feas-reply-manager', req.replyManager);
            setVal('feas-reply-date', req.replyDate);
            setVal('feas-reply-line', req.replyLine);
            setVal('feas-reply-condition', req.replyCondition);
            setVal('feas-reply-comment', req.replyComment);
        } else {
            document.getElementById('feas-request-date').value = new Date().toISOString().split('T')[0];
            const replyStatus = document.getElementById('feas-reply-status');
            if (replyStatus) replyStatus.value = '접수';
            const teamWrap = document.getElementById('feas-team-custom-wrap');
            if (teamWrap) teamWrap.style.display = 'none';
        }
        feasibilityModal.style.display = 'flex';
    };

    if (feasibilityForm) {
        feasibilityForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('feasibility-id').value;
            const submitBtn = document.getElementById('save-feasibility-btn');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

            const getVal = (elId) => { const e = document.getElementById(elId); return e ? e.value : ''; };
            // 직접입력 팀명 처리
            let teamValue = getVal('feas-requester-team');
            if (teamValue === '직접입력') {
                teamValue = getVal('feas-team-custom') || '직접입력';
            }
            try {
                // [파일 업로드 처리]
                let attachments = [];
                // 기존 데이터가 있으면 유지 (수정 시)
                if (id) {
                    const existingReq = localFeasibilityRequests.find(r => r.id === id);
                    if (existingReq && existingReq.attachments) {
                        attachments = [...existingReq.attachments];
                    }
                }

                if (selectedFeasFiles.length > 0) {
                    for (const file of selectedFeasFiles) {
                        const fileRef = storage.ref(`feasibility/${Date.now()}_${file.name}`);
                        const uploadTask = await fileRef.put(file);
                        const downloadURL = await uploadTask.ref.getDownloadURL();
                        attachments.push({
                            name: file.name,
                            url: downloadURL,
                            type: file.type,
                            uploadedAt: new Date().toISOString()
                        });
                    }
                }

                const data = {
                    requestDate: getVal('feas-request-date'),
                    requesterTeam: teamValue,
                    requesterName: getVal('feas-requester-name'),
    
                    material: getVal('feas-material'),
                    steelGrade: getVal('feas-steel-grade'),
                    standard: getVal('feas-standard'),
                    thickness: getVal('feas-thickness'),
                    width: getVal('feas-width'),
                    coating: getVal('feas-coating'),
                    paintSpec: getVal('feas-paint-spec'),
                    resinTop: getVal('feas-resin-top'),
                resinBack: getVal('feas-resin-back'),
                    paintStructure: getVal('feas-paint-structure'),
                    color: getVal('feas-color'),
                    film: getVal('feas-film'),
                    quantity: getVal('feas-quantity'),
                    warranty: getVal('feas-warranty'),
                    customer: getVal('feas-customer'),
                    country: getVal('feas-country'),
                    market: getVal('feas-market'),
                    usage: getVal('feas-usage'),
                    environment: getVal('feas-environment'),
                    remarks: getVal('feas-remarks'),
                    attachments: attachments, // 첨부파일 추가
                    status: getVal('feas-reply-status') || '접수',
                    replyManager: getVal('feas-reply-manager'),
                    replyDate: getVal('feas-reply-date'),
                    replyLine: getVal('feas-reply-line'),
                    replyCondition: getVal('feas-reply-condition'),
                    replyComment: getVal('feas-reply-comment'),
                    updatedAt: new Date().toISOString()
                };

                if (id) {
                    await db.collection("feasibility_requests").doc(id).update(data);
                } else {
                    data.createdAt = new Date().toISOString();
                    await db.collection("feasibility_requests").add(data);
                    
                    // 신규 등록 시 알림 메일 발송
                    if (localNotifyEmails.length > 0) {
                        await sendFeasibilityNotification(data);
                    }
                }
                alert(id ? '검토 요청이 업데이트되었습니다.' : '신규 검토 요청이 등록되었습니다.');
                feasibilityModal.style.display = 'none';
                loadFeasibilityRequests();
            } catch (err) {
                alert('저장 실패: ' + err.message);
                console.error(err);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
            }
        };
    }

    window.deleteFeasibility = async (id) => {
        if (!window.isAdmin) { alert('관리자 권한이 필요합니다.'); return; }
        if (!confirm('이 검토 요청을 삭제하시겠습니까?\n첨부된 파일도 모두 삭제됩니다.')) return;
        try {
            const doc = await db.collection("feasibility_requests").doc(id).get();
            const data = doc.data();
            if (data && data.attachments && data.attachments.length > 0) {
                for (const file of data.attachments) {
                    try {
                        const fileRef = storage.refFromURL(file.url);
                        await fileRef.delete();
                    } catch (e) { console.warn("Storage file delete failed:", e); }
                }
            }
            await db.collection("feasibility_requests").doc(id).delete();
            loadFeasibilityRequests();
        } catch (err) { alert('삭제 실패: ' + err.message); }
    };

    const addFeasibilityBtn = document.getElementById('add-feasibility-btn');
    if (addFeasibilityBtn) addFeasibilityBtn.onclick = () => openFeasibilityModal();

    const feasResetBtn = document.getElementById('feasibility-search-btn');
    if (feasResetBtn) {
        feasResetBtn.onclick = () => {
            const sf = document.getElementById('feasibility-status-filter');
            const mf = document.getElementById('feasibility-material-filter');
            const si = document.getElementById('feasibility-search-input');
            if (sf) sf.value = 'all';
            if (mf) mf.value = 'all';
            if (si) si.value = '';
            renderFeasibilityTable();
        };
    }

    // Initialize
    loadCertifications();
    loadFeasibilityRequests();
    loadNotificationEmails(); // 추가

