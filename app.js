// 세아씨엠 품질조회 및 고객불만관리(VOC) 통합 엔진
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

    let isAdmin = sessionStorage.getItem('seahAdminMode') === 'true'; // 새로고침 시에도 관리자 상태 유지
    let localFiles = [];
    let localComplaints = [];
    let localDefects = [];
    let localNotifyEmails = []; // 추가
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
    }
    updateAdminUI();

    if (adminLoginBtn) {
        adminLoginBtn.onclick = () => {
            if (isAdmin) {
                if (confirm('관리자 모드를 종료하시겠습니까?')) {
                    isAdmin = false;
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

    if (confirmAdminLoginBtn) {
        confirmAdminLoginBtn.onclick = () => {
            if (adminPasswordInput.value === '0000') {
                isAdmin = true;
                sessionStorage.setItem('seahAdminMode', 'true');
                updateAdminUI();
                adminModal.style.display = 'none';
                alert('관리자 모드로 전환되었습니다.');
            } else {
                if (loginStatusMsg) loginStatusMsg.style.display = 'block';
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
            }
        };
    }
    if (cancelAdminLoginBtn) cancelAdminLoginBtn.onclick = () => adminModal.style.display = 'none';

    adminPasswordInput.onkeydown = (e) => {
        if (e.key === 'Enter') confirmAdminLoginBtn.click();
    };

    // --- [3. 통합 내비게이션 시스템] ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pageSections = document.querySelectorAll('.page-section');

    function showSection(targetId) {
        pageSections.forEach(s => s.style.display = 'none');
        const target = document.getElementById(targetId);
        if (target) target.style.display = 'block';

        navLinks.forEach(l => {
            l.classList.remove('active');
            if (l.getAttribute('href') === `#${targetId}`) l.classList.add('active');
        });

        if (currentPageLabel) {
            const activeLink = document.querySelector(`.nav-link[href="#${targetId}"]`);
            if (activeLink) currentPageLabel.textContent = activeLink.textContent.replace(/[^\w\s가-힣]/g, '').trim();
        }

        if (resultsCard) {
            if (targetId === 'search-view') {
                if (resultsCardWasVisible) resultsCard.style.display = 'block';
            } else {
                resultsCardWasVisible = (resultsCard.style.display === 'block');
                resultsCard.style.display = 'none';
            }
        }

        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('open');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- [PDF 페이지 렌더링 전용 함수] ---
    async function renderPdfPage(num) {
        const body = document.getElementById('viewer-body');
        const canvasContainer = document.getElementById('viewer-canvas-container');
        const watermark = document.getElementById('viewer-watermark');
        const shield = document.getElementById('viewer-shield');
        const pageDisplay = document.getElementById('page-num-display');
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

            // 시각적 너비 계산 (줌 레벨에 따라 유동적으로 조절)
            const referenceZoom = isMobile ? 1.3 : 1.6;
            const visualWidth = (isMobile ? 98 : 85) * (currentZoom / referenceZoom);
            canvas.style.width = visualWidth + '%';

            canvas.style.maxWidth = 'none'; // 확대 시 1200px 제한 해제
            canvas.style.boxShadow = '0 15px 40px rgba(0,0,0,0.6)';
            canvas.style.background = 'white';

            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            canvasContainer.innerHTML = '';
            canvasContainer.appendChild(canvas);

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            // 표시 정보 업데이트
            if (pageDisplay) pageDisplay.textContent = `${num} / ${totalPageCount}`;
            if (zoomDisplay) zoomDisplay.textContent = `${Math.round(currentZoom * 77)}%`;
            currentPageNum = num;

            // 스크롤 상단 이동
            body.scrollTop = 0;

            // 보안 레이어 동기화
            const syncSecurityLayers = () => {
                const contentHeight = Math.max(body.scrollHeight, body.offsetHeight, canvasContainer.scrollHeight);
                if (watermark) watermark.style.height = contentHeight + 'px';
                if (shield) {
                    shield.style.height = contentHeight + 'px';
                    shield.style.display = 'block';
                }
            };
            setTimeout(syncSecurityLayers, 100);
        } catch (e) {
            console.error("페이지 렌더링 실패:", e);
        }
    }

    // 페이징 버튼 이벤트 바인딩
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
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

        const isPdf = url.toLowerCase().includes('.pdf') || url.includes('blob:') || url.includes('gs://') || url.includes('firebasestorage');

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

        body.oncontextmenu = (e) => {
            e.preventDefault();
            alert('보안: 이 문서는 우클릭 및 저장이 금지되어 있습니다.');
            return false;
        };
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
            e.preventDefault();
            const id = link.getAttribute('href').substring(1);
            showSection(id);
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
            alert("불량 도감 로드 실패: " + e.message);
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
            const titles = [...new Set(localDefects.map(d => d.title))].sort();
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
    let activeAnnotations = []; // [{x, y, color}] 


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

        vocListBody.innerHTML = filtered.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:60px; color:#94a3b8; font-size:14px;">현재 등록된 고객불만 내역이 없습니다.</td></tr>' : '';

        pagedItems.forEach((v, idx) => {
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.2s;';
            tr.onmouseover = () => tr.style.background = '#f8fafc';
            tr.onmouseout = () => tr.style.background = 'transparent';
            tr.onclick = () => openVocModal(v.id);

            const rowColor = v.category === '클레임' ? '#ef4444' : '#f59e0b';
            const managerDisplay = (v.team ? `<div style="color:#64748b; font-size:11px; margin-bottom:1px; line-height:1.2;">[${v.team}]</div>` : '') + `<div style="font-weight:600; color:#334155; line-height:1.2;">${v.manager}</div>`;

            tr.innerHTML = `
                <td style="padding:10px 14px; text-align:center;">
                    <span style="background:${rowColor}10; color:${rowColor}; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; border:1px solid ${rowColor}20;">${v.category}</span>
                </td>
                <td style="padding:10px 14px; text-align:center; font-size:13px; color:#64748b; white-space:nowrap;">${v.receiptDate}</td>
                <td style="padding:10px 14px; font-weight:700; color:#1e293b; text-align:center;">${v.customer}</td>
                <td style="padding:10px 14px; text-align:center; color:#475569; vertical-align:middle;">${managerDisplay}</td>
                <td style="padding:10px 14px; text-align:center;"><span style="font-weight:700; color:#1e3a8a; background:#eff6ff; padding:2px 8px; border-radius:4px; font-size:12px;">${v.line}</span></td>
                <td style="padding:10px 14px; color:#334155; font-weight:500; text-align:center; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</td>
                <td style="padding:10px 14px; text-align:center;"><span class="voc-status ${v.status === '완료' ? 'status-done' : 'status-pending'}" style="font-size:11px;">${v.status}</span></td>
                <td style="padding:10px 14px; text-align:center;">
                    <button class="admin-only" style="border:none; background:#fee2e2; color:#ef4444; width:30px; height:30px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'" onclick="event.stopPropagation(); deleteVoc('${v.id}')">
                        <i class="fas fa-trash-alt" style="font-size:12px;"></i>
                    </button>
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
            'modal-edit-receiptDate': v.receiptDate,
            'modal-edit-customer': v.customer,
            'modal-edit-team': v.team || '',
            'modal-edit-manager': v.manager,
            'modal-edit-spec': v.spec,
            'modal-edit-line': v.line,
            'modal-edit-prodDate': v.prodDate,
            'modal-edit-defect-type': v.defectType || '',
            'modal-edit-title': v.title,
            'modal-edit-description': v.description || '',

            'modal-reply-manager': v.replyManager || '',
            'modal-reply-cost': v.cost || '',
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
        const photoPreview = document.getElementById('modal-edit-photo-preview');
        const canvas = document.getElementById('annotation-canvas');

        activeAnnotations = v.annotations || [];

        if (photoContainer && photoPreview) {
            if (v.photo) {
                photoPreview.src = v.photo;
                photoContainer.style.display = 'block';
                photoPreview.onload = () => initAnnotationCanvas();
            } else {
                photoContainer.style.display = isAdmin ? 'block' : 'none';
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        }

        updateRecommendedActions();
        vocModal.style.display = 'flex';
        vocModal.querySelectorAll('input, select, textarea').forEach(i => i.disabled = !isAdmin);
        const saveBtn = document.getElementById('modal-voc-save-btn');
        if (saveBtn) saveBtn.style.display = isAdmin ? 'block' : 'none';
    };

    // --- VOC 신규 등록 및 수정 로직 복구 ---
    if (vocForm) {
        vocForm.onsubmit = async (e) => {
            e.preventDefault();
            const photoFile = document.getElementById('voc-photo').files[0];
            let photoUrl = null;

            if (photoFile) {
                const ref = storage.ref(`complaints/${Date.now()}_${photoFile.name}`);
                await ref.put(photoFile);
                photoUrl = await ref.getDownloadURL();
            }

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
                photo: photoUrl,
                status: '접수',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            // status: '접수',
            // createdAt: new Date().toISOString()
            // };

            db.collection("complaints").add(vocData).then(async (docRef) => {
                alert('VOC가 성공적으로 접수되었습니다.');
                vocForm.reset();
                loadLocalComplaints();

                // 담당자 메일 발송 (EmailJS 방식)
                if (localNotifyEmails.length > 0) {
                    await sendVocNotification(vocData);
                }
            }).catch(err => alert('오류 발생: ' + err.message));
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
                let newPhotoUrl = null;

                if (photoInput && photoInput.files && photoInput.files[0]) {
                    const file = photoInput.files[0];
                    const ref = storage.ref(`complaints/${Date.now()}_${file.name}`);
                    await ref.put(file);
                    newPhotoUrl = await ref.getDownloadURL();
                }

                const updatedData = {
                    category: document.getElementById('modal-edit-category').value,
                    market: document.getElementById('modal-edit-market').value,
                    receiptDate: document.getElementById('modal-edit-receiptDate').value,
                    customer: document.getElementById('modal-edit-customer').value,
                    team: document.getElementById('modal-edit-team').value,
                    manager: document.getElementById('modal-edit-manager').value,
                    spec: document.getElementById('modal-edit-spec').value,
                    line: document.getElementById('modal-edit-line').value,
                    prodDate: document.getElementById('modal-edit-prodDate').value,
                    defectType: document.getElementById('modal-edit-defect-type').value,
                    title: document.getElementById('modal-edit-title').value,
                    description: document.getElementById('modal-edit-description').value,

                    replyManager: document.getElementById('modal-reply-manager').value,
                    cost: document.getElementById('modal-reply-cost').value,
                    replyCause: document.getElementById('modal-reply-cause').value,
                    replyCountermeasure: document.getElementById('modal-reply-countermeasure').value,
                    replyEvaluation: document.getElementById('modal-reply-evaluation').value,
                    status: document.getElementById('modal-reply-status').value,
                    annotations: activeAnnotations
                };

                if (newPhotoUrl) updatedData.photo = newPhotoUrl;

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

    window.deleteVoc = async (id) => {
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
        const totalCost = displayData.reduce((acc, v) => acc + (parseInt(v.cost) || 0), 0);
        document.getElementById('dash-total-cost').textContent = "₩" + totalCost.toLocaleString();

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
                    scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
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
                    scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } } }
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
                    scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
                }
            });
        }

        // [6] 라인별 예상 손실 비용 (Bar)
        const lineCostMap = { 'CPL': 0, 'CRM': 0, 'CGL': 0, '1CCL': 0, '2CCL': 0, '3CCL': 0, 'SSCL': 0 };
        displayData.forEach(v => {
            if (v.line && lineCostMap.hasOwnProperty(v.line)) {
                lineCostMap[v.line] += (parseInt(v.cost) || 0);
            }
        });

        const costCtx = document.getElementById('lineCostChart');
        if (costCtx) {
            if (costChart) costChart.destroy();
            costChart = new Chart(costCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(lineCostMap),
                    datasets: [{
                        label: '손실 비용(원)',
                        data: Object.values(lineCostMap),
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
                            formatter: (v) => v > 0 ? (v / 10000).toFixed(0) + '만' : ''
                        }
                    },
                    scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
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
            const dType = v.defectType || '기타';
            if (defectMap.hasOwnProperty(dType)) {
                defectMap[dType] += (parseInt(v.cost) || 0);
            } else {
                // 도감에 없는 유형은 기타로 합산 또는 동적 추가
                defectMap['기타'] += (parseInt(v.cost) || 0);
            }
        });

        // 비용이 0보다 큰 항목만 필터링
        const filteredDefectLabels = Object.keys(defectMap).filter(k => defectMap[k] > 0);
        const filteredDefectValues = filteredDefectLabels.map(k => defectMap[k]);

        const defectCtx = document.getElementById('defectTypeChart');
        if (defectCtx) {
            if (defectTypeChart) defectTypeChart.destroy();
            defectTypeChart = new Chart(defectCtx, {
                type: 'bar',
                data: {
                    labels: filteredDefectLabels,
                    datasets: [{
                        label: '손실 금액',
                        data: filteredDefectValues,
                        backgroundColor: 'rgba(245, 158, 11, 0.7)',
                        borderColor: '#f59e0b',
                        borderWidth: 1, borderRadius: 5
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'right', color: '#f59e0b', font: { weight: 'bold' }, formatter: (v) => v > 0 ? (v / 10000).toFixed(0) + '만' : '' } },
                    scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
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

    // --- [8.1 VOC 알림 담당자 관리 로직] ---
    const notifyEmailList = document.getElementById('notify-email-list');
    const addNotifyEmailBtn = document.getElementById('add-notify-email-btn');
    const newNotifyEmailInput = document.getElementById('new-notify-email');

    async function loadNotificationEmails() {
        if (!db) return;
        try {
            const snap = await db.collection("notification_settings").get();
            localNotifyEmails = [];
            snap.forEach(doc => localNotifyEmails.push({ id: doc.id, ...doc.data() }));
            renderNotificationEmails();
        } catch (e) {
            console.error("알림 메일 로드 실패:", e);
        }
    }

    function renderNotificationEmails() {
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

    if (addNotifyEmailBtn) {
        addNotifyEmailBtn.onclick = async () => {
            const email = newNotifyEmailInput.value.trim();
            if (!email) return alert('이메일 주소를 입력해주세요.');
            if (!email.includes('@')) return alert('유효한 이메일 주소를 입력해주세요.');

            if (localNotifyEmails.some(item => item.email === email)) {
                return alert('이미 등록된 이메일입니다.');
            }

            try {
                await db.collection("notification_settings").add({
                    email: email,
                    createdAt: new Date().toISOString()
                });
                newNotifyEmailInput.value = '';
                loadNotificationEmails();
            } catch (e) {
                alert('추가 실패: ' + e.message);
            }
        };
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

    /**
     * VOC 알림 메일 발송 (EmailJS 기반)
     */
    async function sendVocNotification(vocData) {
        if (localNotifyEmails.length === 0) return;

        // 등록된 모든 메일 주소를 콤마로 연결
        const emailListStr = localNotifyEmails.map(item => item.email).join(', ');

        // 메일 템플릿에 전달할 데이터
        const templateParams = {
            to_emails: emailListStr,
            category: vocData.category,
            customer: vocData.customer,
            title: vocData.title,
            manager: (vocData.team ? `[${vocData.team}] ` : '') + vocData.manager,
            receipt_date: vocData.receiptDate,
            spec: vocData.spec,
            line: vocData.line,
            link: window.location.href
        };

        try {
            // 모든 연동 정보 업데이트 완료 (Service: service_hxi7rk6, Template: template_pb45hu3)
            await emailjs.send('service_hxi7rk6', 'template_pb45hu3', templateParams);
            console.log("✅ 알림 메일이 성공적으로 발송되었습니다.");
        } catch (error) {
            console.error("⚠️ 메일 발송 실패:", error);
            alert("메일 발송 중 오류가 발생했습니다: " + JSON.stringify(error));
        }
    }


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
                        <td rowspan="${rs}" style="padding:16px; font-weight:700; color:#1e3a8a; background:#f8fafc; text-align:center; border-right:1px solid #e2e8f0; width:130px; font-size:15px; line-height:1.5; vertical-align:middle;">
                            ${row.item.replace(/\n/g, '<br>')}
                        </td>`;
                }

                // 조건
                html += `
                    <td style="padding:16px; color:#475569; text-align:center; border-right:1px solid #e2e8f0; width:190px; font-size:15px; line-height:1.5; vertical-align:middle; background:#fff;">
                        ${row.condition.replace(/\n/g, '<br>')}
                    </td>`;

                // 합부 기준
                html += `
                    <td style="background:#fff;">
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

    // --- [초기화] ---
    function init() {
        loadLocalFiles();
        loadLocalComplaints();
        loadLocalDefects();
        loadNotificationEmails(); // 추가
    }
    init();

    // --- [보안: 다운로드 및 무단 복제 방지] ---
    // 1. 우클릭 방지
    document.addEventListener('contextmenu', (e) => {
        if (!isAdmin) {
            e.preventDefault();
            alert('보안 정책에 따라 우클릭을 통한 저장이 제한됩니다.');
        }
    });

    // 2. 주요 단축키 차단 (저장, 인쇄, 소스보기 등)
    document.addEventListener('keydown', (e) => {
        if (isAdmin) return;

        // Ctrl+S, Ctrl+P, Ctrl+U (소스), Ctrl+Shift+I (개발자도구)
        if ((e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'u')) ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.key === 'F12')) {
            e.preventDefault();
            alert('보안 정책에 따라 해당 기능을 사용할 수 없습니다.');
        }
    });

    // 3. 이미지 드래그 방지
    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG') e.preventDefault();
    });

    // 4. 인쇄 이벤트 감지
    window.onbeforeprint = (e) => {
        if (!isAdmin) {
            alert('보안 정책에 따라 인쇄 기능이 차단되었습니다.');
            return false;
        }
    };
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

    // Idea #4: 사진 마킹 (Annotation)
    window.initAnnotationCanvas = () => {
        const canvas = document.getElementById('annotation-canvas');
        const img = document.getElementById('modal-edit-photo-preview');
        if (!canvas || !img) return;

        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;

        redrawAnnotations();

        canvas.onclick = (e) => {
            if (!isAdmin) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / canvas.width;
            const y = (e.clientY - rect.top) / canvas.height;
            activeAnnotations.push({ x, y, color: '#ef4444' });
            redrawAnnotations();
        };
    };

    function redrawAnnotations() {
        const canvas = document.getElementById('annotation-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        activeAnnotations.forEach(ann => {
            ctx.beginPath();
            ctx.arc(ann.x * canvas.width, ann.y * canvas.height, 10, 0, 2 * Math.PI);
            ctx.lineWidth = 3;
            ctx.strokeStyle = ann.color;
            ctx.stroke();

            // 외곽 흰색 테두리 (가독성용)
            ctx.beginPath();
            ctx.arc(ann.x * canvas.width, ann.y * canvas.height, 12, 0, 2 * Math.PI);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        });
    }

    window.clearAnnotation = () => {
        if (!isAdmin) return;
        activeAnnotations = [];
        redrawAnnotations();
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
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

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
    window.exportVocPPT = async (e, lang) => {
        const PptxGen = window.PptxGenJS;
        if (!PptxGen) {
            alert('PPT 생성 라이브러리를 로드하지 못했습니다. 페이지를 새로고침(F5) 해주세요.');
            return;
        }
        if (!currentVocId) return;
        const voc = localComplaints.find(v => v.id === currentVocId);
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
                    { text: (isEng ? 'Line' : '생산라인'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, voc.line || '-',
                    { text: (isEng ? 'Type' : '불량유형'), options: { fill: 'F2F2F2', bold: true, align: 'center' } }, t.defectType
                ]
            ];
            slide.addTable(infoRows, { x: 0.3, y: 0.9, w: 11.0, colW: [1.2, 2.4, 1.2, 2.4, 1.3, 2.5], fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' }, valign: 'middle' });

            // 2. Complaint Details & Photo
            slide.addText('■ ' + (isEng ? 'Symptom & Photo' : '불만 상세 현상 및 사진'), { x: 0.3, y: 1.9, fontSize: 12, bold: true, fontFace: fontName, color: '1e3a8a' });
            slide.addText(t.description, { x: 0.3, y: 2.3, w: 6.5, h: 1.8, fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' }, valign: 'top', margin: 5, fill: 'FCFCFC' });

            if (voc.photo) {
                slide.addImage({ data: voc.photo, x: 7.0, y: 2.3, w: 4.3, h: 1.8, sizing: { type: 'contain' } });
            } else {
                slide.addText(isEng ? 'No Photo' : '사진 없음', { x: 7.0, y: 2.3, w: 4.3, h: 1.8, align: 'center', fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' } });
            }

            // 3. Cause Analysis
            slide.addText('■ ' + (isEng ? 'Root Cause Analysis' : '예상 원인 및 근본 원인 분석'), { x: 0.3, y: 4.3, fontSize: 12, bold: true, fontFace: fontName, color: '1e3a8a' });
            slide.addText(t.cause, { x: 0.3, y: 4.7, w: 11.0, h: 1.0, fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' }, valign: 'top', margin: 5, fill: 'FCFCFC' });

            // 4. Countermeasures
            slide.addText('■ ' + (isEng ? 'Improvement & Prevention' : '개선 및 재발 방지 대책'), { x: 0.3, y: 5.9, fontSize: 12, bold: true, fontFace: fontName, color: '1e3a8a' });
            slide.addText(`[개선 및 재발방지]\n${t.countermeasure}`, { x: 0.3, y: 6.3, w: 11.0, h: 1.2, fontSize: 10, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' }, valign: 'top', margin: 5, fill: 'FCFCFC' });

            // Footer
            slide.addText('(1)', { x: 10.5, y: 7.7, w: 0.8, align: 'right', fontSize: 9, fontFace: fontName, color: '666666' });

            pptx.writeFile({ fileName: `SeAH_Report_${voc.customer}_${lang.toUpperCase()}` });
        } catch (err) {
            console.error(err);
            alert('PPT 생성 실패: ' + err.message);
        } finally {
            pptBtn.textContent = pptOrigText;
            pptBtn.disabled = false;
        }
    };

    // Idea: VOC 처리 대장 전체 PPT 일괄 출력 (콤팩트 단일 슬라이드 반복)
    // window.exportVocBatchPPT = async (e, lang) => {
    //     const PptxGen = window.PptxGenJS;
    //     if (!PptxGen) {
    //         alert('PPT 생성 라이브러리를 로드하지 못했습니다. 페이지를 새로고침(F5) 해주세요.');
    //         return;
    //     }

    //     if (localComplaints.length === 0) {
    //         alert('출력할 데이터가 없습니다.');
    //         return;
    //     }

    //     const monthFilter = document.getElementById('voc-month-filter')?.value || 'all';
    //     let filtered = localComplaints;
    //     if (monthFilter !== 'all') {
    //         filtered = localComplaints.filter(v => v.receiptDate && v.receiptDate.startsWith(monthFilter));
    //     }

    //     if (filtered.length === 0) {
    //         alert('선택된 기간에 출력할 데이터가 없습니다.');
    //         return;
    //     }

    //     const batchBtn = e.target;
    //     const batchOrigText = batchBtn.textContent;
    //     batchBtn.disabled = true;

    //     try {
    //         const pptx = new PptxGen();
    //         const isEng = lang === 'eng';
    //         const fontName = 'Malgun Gothic';

    //         const translate = async (text) => {
    //             if (!isEng || !text || text === '-' || text === '0') return text;
    //             try {
    //                 const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`);
    //                 const data = await res.json();
    //                 return data.responseData.translatedText;
    //             } catch (err) { return text; }
    //         };

    //         for (let i = 0; i < filtered.length; i++) {
    //             const voc = filtered[i];
    //             batchBtn.textContent = `${isEng ? 'Translating' : '번역 및 생성 중'} (${i + 1}/${filtered.length})...`;

    //             const t = {
    //                 title: await translate(voc.title || '품질 부적합 조치 결과 보고서'),
    //                 customer: await translate(voc.customer || '-'),
    //                 content: await translate(voc.content || '-'),
    //                 cause: await translate(voc.cause || '-'),
    //                 action: await translate(voc.countermeasures || '-'),
    //                 evaluation: await translate(voc.evaluation || '-'),
    //                 defectType: await translate(voc.defectType || '기타'),
    //                 manager: await translate(voc.manager || '-'),
    //                 status: await translate(voc.status || '-'),
    //                 market: await translate(voc.market || '-'),
    //             };

    //             let slide = pptx.addSlide();

    //             // Header (Single Slide Compact Mode)
    //             slide.addText(t.title, { x: 0.3, y: 0.2, w: 6, fontSize: 18, bold: true, fontFace: fontName });
    //             slide.addText('SeAH 세아씨엠', { x: 7, y: 0.2, w: 2.7, align: 'right', fontSize: 16, bold: true, color: '1e3a8a', fontFace: fontName });
    //             slide.addShape(pptx.ShapeType.line, { x: 0.3, y: 0.6, w: 9.4, line: { color: '333333', width: 1.0 } });
    //             slide.addShape(pptx.ShapeType.line, { x: 8, y: 0.63, w: 1.7, line: { color: 'f15a22', width: 2.0 } });

    //             // Information Table
    //             const infoRows = [[
    //                 { text: (isEng ? 'Client' : '고객사'), options: { fill: 'F0F0F0', bold: true } }, t.customer,
    //                 { text: (isEng ? 'Date' : '접수일'), options: { fill: 'F0F0F0', bold: true } }, voc.receiptDate,
    //                 { text: (isEng ? 'Line' : '라인'), options: { fill: 'F0F0F0', bold: true } }, voc.line
    //             ]];
    //             slide.addTable(infoRows, { x: 0.3, y: 0.8, w: 9.4, colW: [1, 2.1, 1, 2.1, 1, 2.1], fontSize: 9, fontFace: fontName, border: { pt: 0.5, color: 'CCCCCC' } });

    //             // Sections
    //             slide.addText('■ ' + (isEng ? 'Details' : '불만 상세 현상'), { x: 0.3, y: 1.5, fontSize: 10, bold: true, fontFace: fontName });
    //             slide.addText(t.content, { x: 0.3, y: 1.8, w: 6.2, h: 1.8, fontSize: 9, fontFace: fontName, border: { pt: 0.5, color: 'DDDDDD' }, valign: 'top', margin: 5 });

    //             if (voc.photo) {
    //                 slide.addImage({ data: voc.photo, x: 6.7, y: 1.8, w: 3.0, h: 1.8, sizing: { type: 'contain' } });
    //             }

    //             slide.addText('■ ' + (isEng ? 'Analysis' : '사고 원인 분석'), { x: 0.3, y: 3.8, fontSize: 10, bold: true, fontFace: fontName });
    //             slide.addText(t.cause, { x: 0.3, y: 4.1, w: 9.4, h: 1.2, fontSize: 9, fontFace: fontName, border: { pt: 0.5, color: 'DDDDDD' }, valign: 'top', margin: 5 });

    //             slide.addText('■ ' + (isEng ? 'Action/Result' : '조치 내용 및 결과'), { x: 0.3, y: 5.5, fontSize: 10, bold: true, fontFace: fontName });
    //             slide.addText(`${t.action}\n\n[평가] ${t.evaluation}`, { x: 0.3, y: 5.8, w: 9.4, h: 1.4, fontSize: 9, fontFace: fontName, border: { pt: 0.5, color: 'DDDDDD' }, valign: 'top', margin: 5 });

    //             // Footer
    //             slide.addText(`(${i + 1})`, { x: 9.2, y: 7.3, fontSize: 8, fontFace: fontName, color: '999999' });
    //         }

    //         pptx.writeFile({ fileName: `SeAH_VOC_Full_Ledger_${monthFilter}_${lang.toUpperCase()}` });
    //     } catch (err) {
    //         console.error(err);
    //         alert('PPT 생성 실패: ' + err.message);
    //     } finally {
    //         batchBtn.textContent = batchOrigText;
    //         batchBtn.disabled = false;
    //     }
    // };
});
