// 세아씨엠 품질조회 및 고객불만관리(VOC) 통합 엔진
document.addEventListener('DOMContentLoaded', function () {
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

    // [관리자 모드 초기화]
    let isAdmin = localStorage.getItem('isAdmin') === 'true';
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminPasswordInput = document.getElementById('admin-password');
    const confirmAdminLoginBtn = document.getElementById('confirm-admin-login');
    const cancelAdminLoginBtn = document.getElementById('cancel-admin-login');
    const closeAdminModalBtn = document.getElementById('close-admin-modal');
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
        // 사이드바 메뉴 가시성 업데이트 (admin-only 클래스 처리)
        // CSS에서 이미 처리하지만, Nav Link 중복 방지를 위해 필요시 추가 처리 가능
    }

    // 초기 UI 업데이트
    updateAdminUI();

    // 로그인 버튼 클릭
    if (adminLoginBtn) {
        adminLoginBtn.onclick = () => {
            if (isAdmin) {
                // 로그아웃
                if (confirm('관리자 모드를 종료하시겠습니까?')) {
                    isAdmin = false;
                    localStorage.setItem('isAdmin', 'false');
                    updateAdminUI();
                    location.hash = '#search-view'; // 관리자 전용 페이지에서 튕겨내기
                }
            } else {
                // 로그인 모달 열기
                adminModal.style.display = 'flex';
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
                loginStatusMsg.style.display = 'none';
            }
        };
    }

    // 모달 닫기
    const closeAdminModal = () => {
        adminModal.style.display = 'none';
        adminPasswordInput.value = '';
    };
    if (closeAdminModalBtn) closeAdminModalBtn.onclick = closeAdminModal;
    if (cancelAdminLoginBtn) cancelAdminLoginBtn.onclick = closeAdminModal;

    // 비밀번호 확인
    if (confirmAdminLoginBtn) {
        confirmAdminLoginBtn.onclick = () => {
            if (adminPasswordInput.value === '0000') {
                isAdmin = true;
                localStorage.setItem('isAdmin', 'true');
                updateAdminUI();
                closeAdminModal();
                alert('관리자 모드로 전환되었습니다.');
            } else {
                loginStatusMsg.style.display = 'block';
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
            }
        };
    }

    // 엔터키 지원
    adminPasswordInput.onkeydown = (e) => {
        if (e.key === 'Enter') confirmAdminLoginBtn.click();
    };

    // 모바일 메뉴 토글
    if (mobileMenuBtn) {
        mobileMenuBtn.onclick = () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('open');
        };
    }

    if (sidebarOverlay) {
        sidebarOverlay.onclick = () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('open');
        };
    }

    // 규격 관리 엘리먼트
    const specFileInput = document.getElementById('spec-file');
    const customFileUploadBtn = document.getElementById('custom-file-upload-btn');
    const dropZone = document.getElementById('drop-zone');
    const registeredFileList = document.getElementById('registerd-file-list');
    const clearAllBtn = document.getElementById('clear-all-files-btn');

    // VOC 엘리먼트
    const vocForm = document.getElementById('voc-form');
    const vocListBody = document.getElementById('voc-list-body');
    const vocModal = document.getElementById('voc-modal');
    const vocModalInfo = document.getElementById('modal-voc-info');
    const vocModalReply = document.getElementById('modal-voc-reply');
    const vocModalSaveBtn = document.getElementById('modal-voc-save-btn');
    let currentVocId = null;
    let isEditMode = false;

    let resultsCardWasVisible = false;
    let localFiles = [];
    let localComplaints = [];

    // [1. Firebase 초기화 확인 및 데이터 로드]
    let localDefects = [];

    // 데이터 초기 로드
    function initAppData() {
        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK가 로드되지 않았습니다.");
            alert("Firebase SDK를 로드할 수 없습니다. 인터넷 연결을 확인해주세요.");
            return;
        }

        // 설정값 체크 (Placeholder 방지)
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.warn("⚠️ Firebase 설정이 완료되지 않았습니다 (Placeholder 사용 중).");
            alert("Firebase 설정(apiKey 등)이 완료되지 않았습니다. firebase-config.js 파일을 확인해주세요.");
            return;
        }

        loadLocalFiles();
        loadLocalComplaints();
        loadLocalDefects();
    }

    // Firebase 연결 대기 후 시작
    // initAppData() 호출 제거 (파일 하단으로 이동)

    // [2. 공차 판정 엔진]
    const ToleranceEngine = {
        calculate: (standard, t, w) => {
            if (!t || !w) return { thickness: '치수 입력 필요', flatness: '치수 입력 필요' };
            const thickness = parseFloat(t); const width = parseFloat(w);
            if (standard.includes('3506') || standard.includes('3520')) {
                let tol = (thickness < 0.40) ? (width < 1000 ? '±0.05' : '±0.06') : (thickness < 0.60 ? '±0.06' : '±0.07');
                let flat = width < 1000 ? '12mm 이하' : width < 1250 ? '15mm 이하' : '18mm 이하';
                return { thickness: `${tol}mm`, flatness: flat };
            }
            return { thickness: '표준 준용', flatness: '표준 준용' };
        }
    };

    // [3. 인식 엔진]
    function recognizeFullSpec(fileName, text = "") {
        const pool = (fileName + " " + text).toUpperCase().replace(/[\s\-_]/g, '');
        const specPatterns = [
            // KS 규격
            { reg: /3506|D3506/, key: "KS D 3506", ref: "KS" },
            { reg: /3770|D3770/, key: "KS D 3770", ref: "KS" },
            { reg: /6701|D6701/, key: "KS D 6701", ref: "KS" },
            { reg: /3030|D3030/, key: "KS D 3030", ref: "KS" },
            { reg: /3520|D3520/, key: "KS D 3520", ref: "KS" },
            { reg: /3862|D3862/, key: "KS D 3862", ref: "KS" },
            { reg: /6711|D6711/, key: "KS D 6711", ref: "KS" },
            { reg: /3034|D3034/, key: "KS D 3034", ref: "KS" },
            // JIS 규격
            { reg: /3302|G3302/, key: "JIS G 3302", ref: "JIS" },
            { reg: /3321|G3321/, key: "JIS G 3321", ref: "JIS" },
            { reg: /4000|H4000/, key: "JIS H 4000", ref: "JIS" },
            { reg: /3323|G3323/, key: "JIS G 3323", ref: "JIS" },
            { reg: /3312|G3312/, key: "JIS G 3312", ref: "JIS" },
            { reg: /3322|G3322/, key: "JIS G 3322", ref: "JIS" },
            { reg: /4001|H4001/, key: "JIS H 4001", ref: "JIS" },
            // ASTM/EN 및 기타
            { reg: /A653/, key: "ASTM A653", ref: "ASTM" },
            { reg: /A792/, key: "ASTM A792", ref: "ASTM" },
            { reg: /B209/, key: "ASTM B209", ref: "ASTM" },
            { reg: /A1046/, key: "ASTM A1046", ref: "ASTM" },
            { reg: /A755/, key: "ASTM A755", ref: "ASTM" },
            { reg: /10346/, key: "EN 10346", ref: "EN" },
            { reg: /10169/, key: "EN 10169", ref: "EN" },
            { reg: /485/, key: "EN 485", ref: "EN" }
        ];
        let detectedSpec = { name: "", ref: "기타" };
        for (const s of specPatterns) { if (s.reg.test(pool)) { detectedSpec = { name: s.key, ref: s.ref }; break; } }
        // 전 규격(KS, JIS, ASTM, EN) 냉연/도금 제품군 재질 정규식 완벽 보완
        const gradeRegex = /(SGCC|SGCD[1-3]|SGCD|SGC[0-9]{3}|DX5[1-4]D\+?[A-Z]{0,2}|S[0-9]{3}GD\+?[A-Z]{0,2}|CS\s?Type\s?[A-C]|FS\s?Type\s?[A-B]|SS\s?Grade\s?[0-9]{2,3}|SGLCC|SGLCD|SGLC[0-9]{3}|SDCC|SDCD[1-3]|SDC[0-9]{3}|CGCC|CGCD[1-3]|CGCD|CGCH|CGC[0-9]{3}|CGLCC|CGLCD|CGLC[0-9]{3}|CDCC|CDC[0-9]{3}|SMMCC|SMMCD|SMM[0-9]{3}|CMMCC|CMM[0-9]{3}|3003-H[0-9]{2}|3105-H[0-9]{2}|3003|3105|1100|5052|AW-[0-9]{4}|A[0-9]{4}P)/i;
        const gradeMatch = (fileName + " " + text).match(gradeRegex);
        return { spec: detectedSpec, grade: gradeMatch ? gradeMatch[0].toUpperCase() : "" };
    }

    // [4. 규격 파일 관리]
    async function extractTextFromPDF(dataUrl) {
        try { const pdf = await pdfjsLib.getDocument(dataUrl).promise; let text = ""; for (let i = 1; i <= Math.min(pdf.numPages, 2); i++) { const page = await pdf.getPage(i); const content = await page.getTextContent(); text += content.items.map(item => item.str).join(' '); } return text; } catch (e) { return ""; }
    }
    async function saveFile(file) {
        try {
            const text = file.type === "application/pdf" ? await extractTextFromPDF(URL.createObjectURL(file)) : "";
            const analysis = recognizeFullSpec(file.name, text);

            // 1. Firebase Storage에 파일 업로드
            const storageRef = storage.ref(`specs/${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            // 2. Firestore에 메타데이터 저장
            await db.collection("specs").add({
                name: file.name,
                content: downloadURL,
                detectedSpec: analysis.spec.name,
                detectedRef: analysis.spec.ref,
                detectedGrade: analysis.grade,
                uploadedAt: new Date().toISOString()
            });

            loadLocalFiles();
        } catch (error) {
            console.error("파일 저장 에러:", error);
            alert("파일 저장 중 오류가 발생했습니다.");
        }
    }

    function loadLocalFiles() {
        db.collection("specs").orderBy("uploadedAt", "desc").get().then((querySnapshot) => {
            localFiles = [];
            querySnapshot.forEach((doc) => {
                localFiles.push({ id: doc.id, ...doc.data() });
            });
            renderFileList();
        });
    }
    function renderFileList() {
        if (!registeredFileList) return;
        registeredFileList.innerHTML = localFiles.length === 0 ? '<div style="text-align:center; padding:20px; color:#94a3b8;">파일 없음</div>' : '';

        localFiles.forEach(file => {
            const div = document.createElement('div');
            div.className = 'file-list-item-new';

            // 배지 생성 (값이 있는 경우에만)
            const specBadge = file.detectedSpec ? `<span class="status-badge badge-blue">${file.detectedSpec}</span>` : '';
            const gradeBadge = file.detectedGrade ? `<span class="status-badge badge-orange">${file.detectedGrade}</span>` : '';

            div.innerHTML = `
            <div class="file-info-header" style="cursor:pointer;">
                <div class="file-icon">📄</div>
                <div class="file-meta">
                    <span class="file-name-link">${file.name}</span>
                    <div class="status-tags">
                        ${specBadge}
                        ${gradeBadge}
                    </div>
                </div>
            </div>
            <button class="btn-icon delete-file admin-only">✕</button>`;

            div.querySelector('.file-info-header').onclick = () => { window.open(file.content); };
            const delBtn = div.querySelector('.delete-file');
            if (delBtn) {
                delBtn.onclick = () => {
                    if (confirm('삭제하시겠습니까?')) {
                        db.collection("specs").doc(file.id).delete().then(loadLocalFiles);
                    }
                };
            }
            registeredFileList.appendChild(div);
        });
    }

    if (vocForm) {
        vocForm.onsubmit = async (e) => {
            e.preventDefault();
            const photoFile = document.getElementById('voc-photo').files[0];

            // 저장 버튼 시각적 피드백
            const submitBtn = vocForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "저장 중...";

            try {
                console.log("🚀 VOC 저장 시작...");
                let photoURL = isEditMode ? (localComplaints.find(v => v.id === currentVocId)?.photo || null) : null;

                // 사진이 새로 업로드된 경우
                if (photoFile) {
                    console.log("📸 사진 업로드 중...");
                    const storageRef = storage.ref(`voc_photos/${Date.now()}_${photoFile.name}`);
                    const snapshot = await storageRef.put(photoFile);
                    photoURL = await snapshot.ref.getDownloadURL();
                    console.log("✅ 사진 업로드 완료:", photoURL);
                }

                const vocData = {
                    category: document.getElementById('voc-category').value,
                    market: document.getElementById('voc-market').value,
                    receiptDate: document.getElementById('voc-receipt-date').value,
                    customer: document.getElementById('voc-customer').value,
                    manager: document.getElementById('voc-manager').value,
                    spec: document.getElementById('voc-spec').value,
                    color: document.getElementById('voc-color').value,
                    batch: document.getElementById('voc-batch').value,
                    line: document.getElementById('voc-line').value,
                    prodDate: document.getElementById('voc-prod-date').value,
                    deliveryQty: document.getElementById('voc-delivery-qty').value,
                    complaintQty: document.getElementById('voc-complaint-qty').value,
                    title: document.getElementById('voc-title').value,
                    desc: document.getElementById('voc-desc').value,
                    status: isEditMode ? localComplaints.find(v => v.id === currentVocId).status : '접수',
                    reply: isEditMode ? localComplaints.find(v => v.id === currentVocId).reply : '',
                    photo: photoURL,
                    createdAt: isEditMode ? localComplaints.find(v => v.id === currentVocId).createdAt : new Date().toISOString()
                };

                if (isEditMode) {
                    console.log("📝 VOC 데이터 업데이트 중 (ID:", currentVocId, ")...");
                    await db.collection("complaints").doc(currentVocId).update(vocData);
                } else {
                    console.log("🆕 VOC 신규 데이터 등록 중...");
                    await db.collection("complaints").add(vocData);
                }

                console.log("✅ 데이터베이스 저장 성공!");
                vocForm.reset();
                const wasEdit = isEditMode;
                isEditMode = false;
                currentVocId = null;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'VOC 접수완료';
                }
                loadLocalComplaints();
                alert(wasEdit ? 'VOC 수정이 완료되었습니다.' : 'VOC 상세 접수가 완료되었습니다.');
            } catch (error) {
                console.error("VOC 저장 에러:", error);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'VOC 접수완료';
                }
                if (error.code === 'permission-denied') {
                    alert("저장 권한이 없습니다. 파이어베이스 보안 규칙을 확인해주세요.");
                } else {
                    alert("VOC 저장 중 오류가 발생했습니다: " + error.message);
                }
            }
        };
    }

    function loadLocalComplaints() {
        db.collection("complaints").orderBy("createdAt", "desc").get().then((querySnapshot) => {
            localComplaints = [];
            querySnapshot.forEach((doc) => {
                localComplaints.push({ id: doc.id, ...doc.data() });
            });
            renderVocTable();
            updateQualityDashboard();
        });
    }

    // Chart.js Instance holders
    let lineChartInstance = null;
    let categoryChartInstance = null;

    function updateQualityDashboard() {
        if (!localComplaints || !document.getElementById('dash-total-count')) return;
        const total = localComplaints.length;
        const pending = localComplaints.filter(v => v.status !== '완료').length;
        const done = total - pending;
        const rate = total > 0 ? Math.round((done / total) * 100) : 0;

        let totalCost = 0;
        const lineMap = { 'CPL': 0, 'CRM': 0, 'CGL': 0, '1CCL': 0, '2CCL': 0, '3CCL': 0, 'SSCL': 0 };
        const catMap = { '클레임': 0, '컴플레인': 0 };

        localComplaints.forEach(voc => {
            if (voc.replyData && voc.replyData.cost) {
                const costVal = parseInt(voc.replyData.cost.replace(/[^0-9]/g, '')) || 0;
                totalCost += costVal;
            }
            if (lineMap.hasOwnProperty(voc.line)) lineMap[voc.line]++;
            if (catMap.hasOwnProperty(voc.category)) catMap[voc.category]++;
        });

        document.getElementById('dash-total-count').textContent = `${total} EA`;
        document.getElementById('dash-pending-count').textContent = `${pending} EA`;
        document.getElementById('dash-completion-rate').textContent = `${rate}%`;
        document.getElementById('dash-total-cost').textContent = `₩${totalCost.toLocaleString()}`;

        // [Chart.js] Line Performance Bar Chart
        const lineCtx = document.getElementById('lineChart');
        if (lineCtx && typeof Chart !== 'undefined') {
            if (lineChartInstance) lineChartInstance.destroy();
            lineChartInstance = new Chart(lineCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: Object.keys(lineMap),
                    datasets: [{
                        label: 'VOC 건수',
                        data: Object.values(lineMap),
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'],
                        borderRadius: 6,
                        barThickness: 30
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // [Chart.js] Category Doughnut Chart
        const catCtx = document.getElementById('categoryChart');
        if (catCtx && typeof Chart !== 'undefined') {
            if (categoryChartInstance) categoryChartInstance.destroy();
            categoryChartInstance = new Chart(catCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(catMap),
                    datasets: [{
                        data: Object.values(catMap),
                        backgroundColor: ['#e11d48', '#3b82f6'],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 15 } }
                    }
                }
            });
        }

        const recentTbody = document.getElementById('dash-recent-list');
        if (recentTbody) {
            const top5 = localComplaints.slice(0, 5);
            recentTbody.innerHTML = top5.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">데이터가 없습니다.</td></tr>' : top5.map(voc => `
                <tr style="border-bottom:1px solid #f1f5f9; font-size:12px;">
                    <td style="padding:10px; font-weight:600;">${voc.customer}</td>
                    <td style="padding:10px; color:#475569;">${voc.title}</td>
                    <td style="padding:10px;"><span class="voc-status ${voc.status === '완료' ? 'status-done' : 'status-pending'}" style="font-size:10px;">${voc.status}</span></td>
                    <td style="padding:10px; color:#94a3b8;">${voc.receiptDate}</td>
                </tr>
            `).join('');
        }
    }

    function renderVocTable() {
        if (!vocListBody) return;
        vocListBody.innerHTML = localComplaints.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:40px; color:#94a3b8;">접수된 VOC가 없습니다.</td></tr>' : '';
        localComplaints.forEach(voc => {
            const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #f1f5f9"; tr.style.cursor = "pointer";
            tr.onclick = (e) => { if (e.target.tagName !== 'BUTTON') openVocModal(voc); };
            const isDone = voc.status === '완료';
            tr.innerHTML = `
                <td style="padding:12px; text-align:center;"><span class="voc-status" style="background:#f1f5f9; color:#475569;">${voc.category}</span></td>
                <td style="padding:12px; font-size:12px; color:#64748b; text-align:center;">${voc.receiptDate}</td>
                <td style="padding:12px; font-weight:600; color:#1e293b; text-align:center;">${voc.customer}</td>
                <td style="padding:12px; font-size:12px; color:#64748b; font-weight:700; text-align:center;">${voc.line}</td>
                <td style="padding:12px; font-size:13px; color:#475569; text-align:center;">${voc.title}</td>
                <td style="padding:12px; text-align:center;"><span class="voc-status ${isDone ? 'status-done' : 'status-pending'}">${voc.status}</span></td>
                <td style="padding:12px; text-align:center;"><button class="btn-icon admin-only" style="background:#fee2e2; color:#dc2626; width:28px; height:28px; border:none; border-radius:6px; cursor:pointer; font-size:14px;" onclick="deleteVoc(event, '${voc.id}')">🗑️</button></td>
            `;
            vocListBody.appendChild(tr);
        });
    }

    window.deleteVoc = (e, id) => { e.stopPropagation(); if (confirm('이 VOC 내역을 완전히 삭제하시겠습니까?')) db.collection("complaints").doc(id).delete().then(loadLocalComplaints); };

    function openVocModal(voc) {
        currentVocId = voc.id;
        vocModal.style.display = 'flex';

        // 1. 접수 정보 필드 채우기 (모달 내 편집 필드)
        document.getElementById('modal-edit-category').value = voc.category || '클레임';
        document.getElementById('modal-edit-market').value = voc.market || '내수';
        document.getElementById('modal-edit-receiptDate').value = voc.receiptDate || '';
        document.getElementById('modal-edit-customer').value = voc.customer || '';
        document.getElementById('modal-edit-manager').value = voc.manager || '';
        document.getElementById('modal-edit-spec').value = voc.spec || '';
        document.getElementById('modal-edit-line').value = voc.line || 'CGL';
        document.getElementById('modal-edit-prodDate').value = voc.prodDate || '';
        document.getElementById('modal-edit-title').value = voc.title || '';

        // 사진 처리
        const photoContainer = document.getElementById('modal-edit-photo-container');
        const photoPreview = document.getElementById('modal-edit-photo-preview');
        if (voc.photo) {
            photoContainer.style.display = 'block';
            photoPreview.src = voc.photo;
        } else {
            photoContainer.style.display = 'none';
        }

        // 2. 품질팀 조치 결과 필드 채우기
        if (voc.replyData) {
            document.getElementById('modal-reply-manager').value = voc.replyData.manager || '';
            document.getElementById('modal-reply-cost').value = voc.replyData.cost || '';
            document.getElementById('modal-reply-cause').value = voc.replyData.cause || '';
            document.getElementById('modal-reply-countermeasure').value = voc.replyData.countermeasure || '';
            document.getElementById('modal-reply-evaluation').value = voc.replyData.evaluation || '';
            document.getElementById('modal-reply-status').value = voc.status || '완료';
        } else {
            document.getElementById('modal-reply-manager').value = '';
            document.getElementById('modal-reply-cost').value = '';
            document.getElementById('modal-reply-cause').value = '';
            document.getElementById('modal-reply-countermeasure').value = '';
            document.getElementById('modal-reply-evaluation').value = '';
            document.getElementById('modal-reply-status').value = voc.status || '접수';
        }

        // [관리자 권한 제어]
        if (vocModalSaveBtn) {
            vocModalSaveBtn.style.display = isAdmin ? 'block' : 'none';
        }
        // 모든 입력 필드 활성/비활성화 처리
        const inputs = vocModal.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = !isAdmin;
        });
    }

    if (vocModalSaveBtn) {
        vocModalSaveBtn.onclick = async () => {
            const saveBtn = document.getElementById('modal-voc-save-btn');
            const originalText = saveBtn.textContent;
            saveBtn.disabled = true;
            saveBtn.textContent = "변경 내용 저장 중...";

            // 1. 접수 정보 데이터 수집
            const updatedVocData = {
                category: document.getElementById('modal-edit-category').value,
                market: document.getElementById('modal-edit-market').value,
                receiptDate: document.getElementById('modal-edit-receiptDate').value,
                customer: document.getElementById('modal-edit-customer').value,
                manager: document.getElementById('modal-edit-manager').value,
                spec: document.getElementById('modal-edit-spec').value,
                line: document.getElementById('modal-edit-line').value,
                prodDate: document.getElementById('modal-edit-prodDate').value,
                title: document.getElementById('modal-edit-title').value,

                // 2. 품질팀 조치 결과 데이터 수집
                status: document.getElementById('modal-reply-status').value,
                replyData: {
                    manager: document.getElementById('modal-reply-manager').value,
                    cost: document.getElementById('modal-reply-cost').value,
                    cause: document.getElementById('modal-reply-cause').value,
                    countermeasure: document.getElementById('modal-reply-countermeasure').value,
                    evaluation: document.getElementById('modal-reply-evaluation').value
                },
                repliedAt: new Date().toLocaleString()
            };

            try {
                await db.collection("complaints").doc(currentVocId).update(updatedVocData);
                alert("모든 정보가 성공적으로 업데이트되었습니다.");
                vocModal.style.display = 'none';
                loadLocalComplaints();
            } catch (error) {
                console.error("VOC 통합 저장 에러:", error);
                alert("저장 중 오류가 발생했습니다: " + error.message);
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        };
    }

    // [6. 조회 엔진]
    const productLabels = {
        'GI': 'GI (용융아연도금)', 'GL': 'GL (갈바륨)', 'AL': 'AL (알루미늄도금)', 'ZM': 'ZM (삼원계 도금)',
        'PPGI': 'PPGI (컬러아연도금)', 'PPGL': 'PPGL (컬러갈바륨)', 'PPAL': 'PPAL (컬러알루미늄)', 'PPZM': 'PPZM (컬러삼원계)'
    };

    function updateSpecificStandards() {
        const stdCategory = standardTypeSelect.value;
        if (!stdCategory) {
            specificStandardSelect.innerHTML = '<option value="">규격을 먼저 선택하세요</option>';
            specificStandardSelect.disabled = true;
            resetSteelTypeSelect();
            updateOptions();
            return;
        }

        specificStandardSelect.disabled = false;
        const stdMap = {}; // code -> [steelTypes]
        for (const [steel, stas] of Object.entries(steelData)) {
            if (stas[stdCategory]) {
                const code = stas[stdCategory].standard;
                if (!stdMap[code]) stdMap[code] = [];
                stdMap[code].push(steel);
            }
        }

        // 가중치 기반 정렬 (사용자 지정 제품 순서 우선)
        const order = ['GI', 'GL', 'AL', 'ZM', 'PPGI', 'PPGL', 'PPAL', 'PPZM'];
        const sortedCodes = Object.keys(stdMap).sort((a, b) => {
            const minA = Math.min(...stdMap[a].map(s => order.indexOf(s)));
            const minB = Math.min(...stdMap[b].map(s => order.indexOf(s)));
            if (minA !== minB) return minA - minB;
            return a.localeCompare(b);
        });

        specificStandardSelect.innerHTML = '<option value="">상세 규격 선택</option>' +
            sortedCodes.map(code => {
                const displaySteel = stdMap[code].join(', ');
                return `<option value="${code}" data-steels='${JSON.stringify(stdMap[code])}'>${code} (${displaySteel})</option>`;
            }).join('');

        resetSteelTypeSelect();
        updateOptions();
    }

    function resetSteelTypeSelect() {
        steelTypeSelect.innerHTML = '<option value="">제품군 자동 선택</option>';
        steelTypeSelect.disabled = true;
    }

    function updateOptions() {
        const steel = steelTypeSelect.value, std = standardTypeSelect.value;
        const data = (steel && std) ? steelData[steel]?.[std] : null;
        if (data) {
            gradeTypeSelect.disabled = false;
            gradeTypeSelect.innerHTML = '<option value="">재질 선택</option>' + data.grades.map(g => `<option value="${g}">${g}</option>`).join('');
            coatingWeightSelect.disabled = false;
            coatingWeightSelect.innerHTML = '<option value="">도금 선택</option>' + (data.coatingOptions || []).map(c => `<option value="${c}">${c}</option>`).join('');
        } else {
            gradeTypeSelect.disabled = true;
            gradeTypeSelect.innerHTML = '<option value="">재질 선택</option>';
            coatingWeightSelect.disabled = true;
            coatingWeightSelect.innerHTML = '<option value="">도금 선택</option>';
        }
    }

    if (standardTypeSelect) standardTypeSelect.onchange = updateSpecificStandards;

    if (specificStandardSelect) {
        specificStandardSelect.onchange = function () {
            const selectedOption = this.options[this.selectedIndex];
            const steelsStr = selectedOption.getAttribute('data-steels');
            if (steelsStr) {
                const steels = JSON.parse(steelsStr);
                steelTypeSelect.disabled = false;

                // 제품군 select 업데이트 (해당 규격이 지원하는 제품만)
                let html = '<option value="">제품군 선택</option>';
                const order = ['GI', 'GL', 'AL', 'ZM', 'PPGI', 'PPGL', 'PPAL', 'PPZM'];
                const sortedSteels = steels.sort((a, b) => order.indexOf(a) - order.indexOf(b));

                html += sortedSteels.map(s => `<option value="${s}">${productLabels[s] || s}</option>`).join('');
                steelTypeSelect.innerHTML = html;

                if (steels.length === 1) {
                    steelTypeSelect.value = steels[0];
                } else {
                    steelTypeSelect.value = "";
                }
                updateOptions();
            } else {
                resetSteelTypeSelect();
                updateOptions();
            }
        };
    }

    if (steelTypeSelect) {
        steelTypeSelect.onchange = updateOptions;
    }

    if (searchBtn) {
        searchBtn.onclick = function () {
            const s = steelTypeSelect.value;
            const st = standardTypeSelect.value;
            const specCode = specificStandardSelect.value;
            const g = gradeTypeSelect.value;

            if (!s || !st || !specCode || !g) {
                return alert('모든 필드(규격, 상세 규격, 제품군, 재질)를 선택해주세요.');
            }
            if (!steelData[s]?.[st]) {
                showInquiryPopup();
                return;
            }
            displayResults(s, st, specCode, g);
        };
    }

    function displayResults(steelType, standardRef, specificStandard, grade) {
        const stdData = steelData[steelType][standardRef];
        const stdProps = stdData.properties[grade] || { ys: '-', ts: '-', el: '-', bend: '-' };

        // 상세 규격 코드와 재질이 모두 일치하는 파일 검색
        const matchedFile = localFiles.filter(f =>
            f.detectedSpec === specificStandard &&
            (f.detectedGrade.includes(grade) || grade.includes(f.detectedGrade))
        ).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];

        resultsCard.style.display = 'block';
        resultsCardWasVisible = true;

        const t = thicknessInput.value || '0.00', w = widthInput.value || '000', c = coatingWeightSelect.value || '-';
        document.getElementById('results-title').textContent = `${t}T x ${w}W x ${grade} (${c}) 분석 결과`;

        const tolResult = ToleranceEngine.calculate(specificStandard, t, w);

        // 배지 업데이트 및 연동 파일 정보 표시
        let badgeHtml = `<span class="badge badge-blue">${steelType}</span>`;
        if (matchedFile) {
            badgeHtml += `<span class="badge badge-green">🧠 규격서 연동됨</span>`;
            badgeHtml += `<span style="margin-left:10px; font-size:13px; color:#059669;">
                            <i class="fas fa-file-pdf"></i> 연동 파일: <a href="${matchedFile.content}" target="_blank" style="text-decoration:underline; font-weight:600; color:#059669;">${matchedFile.name}</a>
                          </span>`;
        } else {
            badgeHtml += `<span class="badge badge-orange">⚠️ 표준 데이터</span>`;
        }
        document.getElementById('results-badges').innerHTML = badgeHtml;

        // 1. 기계적 성질 업데이트
        document.getElementById('mechanical-tbody').innerHTML = `
            <tr><td class="text-bold">항복강도</td><td>YP</td><td>${stdProps.ys || '-'}</td><td>MPa</td><td>-</td></tr>
            <tr><td class="text-bold">인장강도</td><td>TS</td><td>${stdProps.ts || '-'}</td><td>MPa</td><td>-</td></tr>
            <tr><td class="text-bold">연신율</td><td>El</td><td>${stdProps.el || '-'}</td><td>%</td><td>-</td></tr>
            <tr><td class="text-bold">굽힘성</td><td>Bnd</td><td>${stdProps.bend || '-'}</td><td>t</td><td>-</td></tr>`;

        // 2. 화학 성분 업데이트 (Grade별 정보 우선, 없으면 Standard 기본 정보 사용)
        const chem = stdProps.chemical || stdData.chemical || {};
        const chemOrder = ['C', 'Mn', 'P', 'S', 'Si', 'Al'];
        document.getElementById('chemical-tbody').innerHTML = `
            <tr>
                <td class="text-bold">표준 성분</td>
                ${chemOrder.map(el => `<td>${chem[el] || '-'}</td>`).join('')}
            </tr>`;

        // 3. 도장 제품 전용 정보 업데이트
        const coatedSection = document.getElementById('coated-results');
        const nonCoatedSection = document.getElementById('non-coated-results');

        if (stdData.isPrepainted && stdData.prepainted) {
            coatedSection.style.display = 'block';
            const prepainted = stdData.prepainted;
            let coatedHtml = '';
            for (const [resin, specs] of Object.entries(prepainted.specs)) {
                coatedHtml += `
                    <tr>
                        <td class="text-bold">${resin}</td>
                        <td>${specs.bend || '-'}</td>
                        <td>${specs.impact || '-'}</td>
                        <td>${specs.salt || '-'}</td>
                    </tr>`;
            }
            document.getElementById('coated-tbody').innerHTML = coatedHtml;
        } else {
            coatedSection.style.display = 'none';
        }

        // 4. 공차 및 기타 정보
        document.getElementById('val-thickness').textContent = tolResult.thickness;
        document.getElementById('val-flatness').textContent = tolResult.flatness;

        document.getElementById('coating-cards').innerHTML = `
            <div class="info-box"><span class="label">도금 종류</span><span class="value">${stdData.coating.type || '-'}</span></div>
            <div class="info-box"><span class="label">지정 도금량</span><span class="value">${c}</span></div>
            <div class="info-box"><span class="label">적용 규격</span><span class="value">${stdData.standard}</span></div>`;

        resultsCard.scrollIntoView({ behavior: 'smooth' });
    }

    // [7. 수지별 품질 기준 엔진]
    const resinQualityData = {
        'RMP': {
            '색차': 'ΔE ≤ 1.0 (기준 시편 대비)',
            '도막': 'Top 20±5μm, Back 5±2μm',
            '광택': '±10% (지정 광택도 대비)',
            '연필경도': 'F ~ H 이상',
            'MEK': '50회 이상 (도막 박리 없을 것)',
            'C.C.E': '100/100 (박리 0%)',
            '굽힘': '3T ~ 5T (크랙 없을 것)',
            '내충격성': '500g * 50cm (박리 없을 것)',
            '내약품성': '5% NaOH / 5% H2SO4 (24hr 이상)',
            '내염수성': '500시간 (평면부 부식 1mm 이하)'
        },
        'HDP': {
            '색차': 'ΔE ≤ 0.8 (기준 시편 대비)',
            '도막': 'Top 25±5μm, Back 7±2μm',
            '광택': '±5% (지정 광택도 대비)',
            '연필경도': 'H ~ 2H 이상',
            'MEK': '100회 이상',
            'C.C.E': '100/100',
            '굽힘': '2T ~ 4T',
            '내충격성': '500g * 50cm',
            '내약품성': '우수 (고내후성 도료)',
            '내염수성': '750시간 이상'
        },
        'SMP': {
            '색차': 'ΔE ≤ 1.0',
            '도막': 'Top 20±3μm',
            '광택': '중/저광 (20~40%)',
            '연필경도': '2H ~ 3H (고경도)',
            'MEK': '100회 이상',
            'C.C.E': '100/100',
            '굽힘': '4T ~ 6T',
            '내충격성': '300g * 50cm',
            '내약품성': '매우 우수',
            '내염수성': '500시간 이상'
        },
        'ADP': {
            '색차': 'ΔE ≤ 1.0',
            '도막': 'Top 20±5μm (Anti-Dirt)',
            '광택': '±10%',
            '연필경도': 'F 이상',
            'MEK': '50회 이상',
            'C.C.E': '100/100',
            '굽힘': '3T ~ 5T',
            '내충격성': '500g * 50cm',
            '내약품성': '내오염성 특화',
            '내염수성': '500시간 이상'
        },
        'HBU': {
            '색차': 'ΔE ≤ 1.5',
            '도막': 'Top 35~45μm (High Build)',
            '광택': '매트/질감 (5~15%)',
            '연필경도': 'F ~ H',
            'MEK': '50회 이상',
            'C.C.E': '100/100',
            '굽힘': '3T ~ 5T',
            '내충격성': '500g * 30cm',
            '내약품성': '우수',
            '내염수성': '1,000시간 이상'
        },
        'SQP40': {
            '색차': 'ΔE ≤ 1.0',
            '도막': 'Top 40±5μm (두꺼운 도막)',
            '광택': '±10%',
            '연필경도': 'H 이상',
            'MEK': '100회 이상',
            'C.C.E': '100/100',
            '굽힘': '2T ~ 4T',
            '내충격성': '500g * 50cm',
            '내약품성': '매우 우수 (가전/고급건재)',
            '내염수성': '1,000시간 이상'
        },
        'PVDF': {
            '색차': 'ΔE ≤ 0.5 (초고내후성)',
            '도막': 'Top 25±5μm (불소도료)',
            '광택': '20~40% (선택)',
            '연필경도': 'F ~ H',
            'MEK': '100회 이상 (매우 강함)',
            'C.C.E': '100/100',
            '굽힘': '0T ~ 2T (가공성 우수)',
            '내충격성': '500g * 50cm',
            '내약품성': '최상 (강산/강알칼리 견딤)',
            '내염수성': '1,000~1,500시간 이상'
        },
        'HPP': {
            '색차': 'ΔE ≤ 1.0',
            '도막': 'Top 20±3μm',
            '광택': '고광택/선명도 중심',
            '연필경도': 'H 이상',
            'MEK': '100회 이상',
            'C.C.E': '100/100',
            '굽힘': '3T ~ 5T',
            '내충격성': '500g * 50cm',
            '내약품성': '우수',
            '내염수성': '500시간 이상'
        }
    };

    const resinBtns = document.querySelectorAll('.resin-btn');
    const resinTbody = document.getElementById('resin-quality-tbody');
    const resinCard = document.getElementById('resin-data-card');
    const resinTitle = document.getElementById('selected-resin-title');

    resinBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const resin = this.getAttribute('data-resin');
            if (!resinQualityData[resin]) return;

            // UI 업데이트
            resinBtns.forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
            this.classList.replace('btn-secondary', 'btn-primary');

            resinTitle.textContent = `${resin} 품질 기준`;
            resinCard.style.display = 'block';

            const data = resinQualityData[resin];
            resinTbody.innerHTML = Object.entries(data).map(([item, criteria]) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 15px; font-weight: 700; color: #1e3a8a; background: #f8fafc;">${item}</td>
                    <td style="padding: 15px; color: #334155; line-height: 1.5;">${criteria}</td>
                </tr>
            `).join('');

            resinCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });

    // 내비게이션
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link'), pageSections = document.querySelectorAll('.page-section');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault(); const targetId = this.getAttribute('href').substring(1);
            navLinks.forEach(l => l.classList.remove('active')); this.classList.add('active');
            pageSections.forEach(s => s.style.display = (s.id === targetId) ? 'block' : 'none');
            if (currentPageLabel) currentPageLabel.textContent = this.textContent.trim().replace(/[🔍📊📖📢📋⚙️🧪📊🖼️]/g, '').trim();
            if (resultsCard) { if (targetId === 'search-view') { if (resultsCardWasVisible) resultsCard.style.display = 'block'; } else { resultsCardWasVisible = (resultsCard.style.display === 'block'); resultsCard.style.display = 'none'; } }

            // 모바일에서 링크 클릭 시 사이드바 닫기
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('open');
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // 파일 관리 추가 이벤트
    if (customFileUploadBtn) customFileUploadBtn.onclick = (e) => { e.stopPropagation(); specFileInput.click(); };
    if (specFileInput) specFileInput.onchange = (e) => { if (e.target.files.length > 0) Array.from(e.target.files).forEach(saveFile); specFileInput.value = ''; };
    if (clearAllBtn) clearAllBtn.onclick = () => {
        if (confirm('모든 규격 파일을 삭제하시겠습니까?')) {
            db.collection("specs").get().then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    doc.ref.delete();
                });
                loadLocalFiles();
            });
        }
    };
    if (dropZone) { dropZone.onclick = () => specFileInput.click(); dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); }; dropZone.ondragleave = () => dropZone.classList.remove('dragover'); dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); Array.from(e.dataTransfer.files).forEach(saveFile); }; }

    // ========== [강종 정보 탭 버튼 이벤트] ==========
    const tabBtns = document.querySelectorAll('.tab-btn');
    const infoPanels = document.querySelectorAll('.info-panel');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            // 모든 탭 버튼에서 active 제거
            tabBtns.forEach(b => b.classList.remove('active'));
            // 클릭한 버튼에 active 추가
            this.classList.add('active');
            // 모든 패널 숨기기
            infoPanels.forEach(p => p.classList.remove('active'));
            // 해당 패널 보이기
            const targetPanel = document.getElementById('panel-' + tabName);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    // ========== [불량 유형 도감 CRUD] ==========
    const defectGrid = document.getElementById('defect-grid');
    const defectModal = document.getElementById('defect-modal');
    const defectForm = document.getElementById('defect-form');
    const addDefectBtn = document.getElementById('add-defect-btn');
    const defectPhotoInput = document.getElementById('defect-photo');
    const defectPhotoPreview = document.getElementById('defect-photo-preview');
    const defectPreviewImg = document.getElementById('defect-preview-img');
    let pendingDefectPhoto = null;

    // 사진 미리보기
    if (defectPhotoInput) {
        defectPhotoInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    pendingDefectPhoto = ev.target.result;
                    if (defectPreviewImg) defectPreviewImg.src = pendingDefectPhoto;
                    if (defectPhotoPreview) defectPhotoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // 초기 기본 데이터 (이미지 기반 상세 데이터 총 18종)
    const defaultDefects = [
        {
            title: '흑청/백청/적청',
            photo: null,
            reason: '습한 환경 또는 장기 보관으로 인한 소재 부식 발생',
            internal: '1. 제품 보관 환경(온도, 습도, 통풍) 및 기간 확인\n2. 제품 포장 상태(방수 처리 여부) 및 적재 방식 점검\n3. 운송 중 수분 접촉 가능성 확인\n4. 도금층의 크로메이트 처리 조건 및 균일성 확인',
            external: '1. 고객사의 제품 보관 환경 및 운송 과정 중 수분 노출 여부 확인\n2. 고객사의 가공 공정 중 수분 접촉 또는 보관 불량 가능성 조사'
        },
        {
            title: '형상불량 (WAVE)',
            photo: null,
            reason: 'Roll Crown 부적절(CRM/HC), 입하 Level 부적절, 또는 Edge Zn Over coating에 의한 빌드업',
            internal: '1. 제조 라인의 텐션레벨러 및 롤 교정 상태 점검\n2. 원재료 및 반제품 입고 시 형상 검사 기록 확인\n3. 도금/도장 공정 장력(연신율) 및 롤 압력 설정 확인\n4. 제품의 두께/폭 편차 및 기계적 성질 확인',
            external: '1. 고객사 가공 설비(성형기 등) 정렬 및 가공 조건 확인\n2. 기계적성질 시효경화 가능성 확인 (생산 6개월 초과 시)'
        },
        {
            title: '스트레쳐 스트레인',
            photo: null,
            reason: '항복점 연신 현상에 의해 가공 시 표면 줄무늬/굴곡 발생. 어닐링 조건 또는 스킨 패스 압연량 부족 등 특성 기인',
            internal: '1. 원재료 화학 성분 및 기계적 특성(YP, TS) 확인\n2. CGL 어닐링 조건 및 스킨 패스 압연율 점검\n3. CGL 텐션레벨러 연신율 및 롤 압력 설정 확인',
            external: '1. 고객사 가공 설비(프레스) 성형 조건 및 금형 상태 확인\n2. 가공 중 과도한 변형 발생 여부 확인'
        },
        {
            title: '미도금 (Uncoated)',
            photo: null,
            reason: '전처리 불량, 도금액 조성 불균형, 도금조 내 이물 혼입, 또는 라인 속도 불균일 등으로 인해 발생',
            internal: '1. 전처리 공정(탈지, 산세)의 온도, 농도, 시간 등 조건 확인\n2. 도금액 조성(아연 농도, 불순물 등) 분석\n3. 도금조 이물질 및 슬러지 발생 여부\n4. 도금 라인 스피드 및 강판 표면 청결도 점검',
            external: '1. 샘플 확보 (주로 제조 공정 내부 문제)'
        },
        {
            title: '도금불량',
            photo: null,
            reason: '미제거 Rust, 도금층 두께 불균일, 벗겨짐, 요철, 크랙, 반점 등 복합적인 원인',
            internal: '1. 도금 두께 측정 데이터 및 분포 확인\n2. 도금액 조성, 온도, 불순물 주기적 분석\n3. 도금조 롤/스키머 상태 및 전처리 공정 안정성 점검\n4. 도금 후 처리(크로메이트, 오일링) 조건 확인',
            external: '1. 고객 가공 시 도금층 손상 가능성(마찰/충격) 확인\n2. 보관/운송 중 외부 요인에 의한 손상 조사'
        },
        {
            title: '도막 박리',
            photo: null,
            reason: '전처리 불량, 프라이머 도포 불량, 도장 경화 불량, 또는 하지층과의 부착력 부족 등이 원인',
            internal: '1. 전처리 온도/농도, 프라이머/탑코트 도포량 및 경화 조건 점검\n2. 도료 보관 상태 및 유효기간 확인\n3. 하지층(도금층) 표면 상태 및 부착성 평가\n4. 제조 라인 청결도 점검',
            external: '1. 가공 중 과도한 변형/충격 여부 확인\n2. 보관/사용 환경(화학물질, 고온다습) 조사'
        },
        {
            title: '필름 불량',
            photo: null,
            reason: '보호필름 점착력 편차, 원단 문제로 인한 찢어짐, 온/습도에 의한 경시 변화 등 (6개월 이상 부착 시 보증 불가)',
            internal: '1. 로트별 보호필름 점착력 확인\n2. 샘플 후기 점착력 테스트',
            external: '1. 필름 부착 유지 기간 확인\n2. 코일 및 시트 보관 방법 확인\n3. 제품 가공 방법 확인'
        },
        {
            title: '색차',
            photo: null,
            reason: '지정 색상과의 차이. 도료 배치 간 편차, 도포량 불균일, 경화 조건 불균일, 또는 측정 장비 교정 불량 등',
            internal: '1. 도료 입고 시 색상/물성 확인\n2. 도장 라인 도포량 및 경화 조건(온도, 시간) 균일성 점검\n3. 색차계 교정 상태 및 제품별 데이터 분석',
            external: '1. 고객사 색상 측정 장비/방법 및 조명 환경 확인\n2. 시내외 시각적 판단 기준 확인'
        },
        {
            title: '블로킹',
            photo: null,
            reason: '코일 내 도장면끼리 달라붙는 현상. 경화 불량, 권취 압력 과다, 또는 고온/고습 보관 시 발생',
            internal: '1. 도장 경화로 온도/시간 조건 확인\n2. 도료 점도 및 건조 특성 점검\n3. 코일 권취 시 장력/압력 설정 및 보관 창고 환경 점검',
            external: '1. 고객사 제품 보관 환경(온도, 습도, 적재 방식) 확인\n2. 취급 중 발생 가능성 확인'
        },
        {
            title: '엣지 끓음 및 파핑',
            photo: null,
            reason: '엣지 도료 고임/끓음 또는 도막 내 기포 터짐(작은 구멍). 전처리 불량, 점도 과다, 건조 속도 과다 등 원인',
            internal: '1. 전처리 세척/건조 효율 점검\n2. 도금액/도료 점도 및 표면 장력 측정\n3. 코터 롤 엣지 부위 압력 및 건조로 온도 프로파일 확인',
            external: '1. 샘플 확보 및 엣지 컷팅 후 사용 가능 여부 확인'
        },
        {
            title: '덴트',
            photo: null,
            reason: '외부 충격으로 인한 함몰/찍힘 자국. 취급 부주의, 설비 충돌, 또는 낙하물 원인',
            internal: '1. 라인 내 설비(롤, 가이드) 손상 여부 점검\n2. 권취/언코일링 과정 충격 가능성 확인\n3. 포장/상하차 취급 주의 사항 및 창고 적재 점검',
            external: '1. 운송 중 고정 불량 또는 외부 충격 여부 확인\n2. 고객사 하역/보관/가공 중 부주의 여부'
        },
        {
            title: '애쉬',
            photo: null,
            reason: 'CGL Snout 내 Ash(Ash Pit) 또는 CRM W/R Scratch(Pit Scratch)에 의해 발생',
            internal: '1. 아연 드로스 발생량 제거 확인\n2. 도금욕 온도/성분 분석 및 Snout/Work Roll 점검',
            external: '1. 샘플 확보 (주로 제조 공정 내부 문제)'
        },
        {
            title: '덜마크',
            photo: null,
            reason: 'SPM 작업 중 이탈된 아연이 Work Roll 표면에 부착되어 전사되는 현상 (Top 위주)',
            internal: '1. 스킨패스 및 도금 Work Roll 확인\n2. 탈지 정상 여부 점검',
            external: '1. 샘플 확보 (주로 제조 공정 내부 문제)'
        },
        {
            title: '합금층 마크',
            photo: null,
            reason: '합금층의 불균일한 성장 또는 표면 노출. 합금화로 제어 불량 또는 도금액 조성 불균형 원인',
            internal: '1. 합금화로 온도 프로파일 및 유지 시간 확인\n2. 도금액 조성 및 합금층 성장 상태 분석',
            external: '1. 샘플 확보 (주로 제조 공정 내부 문제)'
        },
        {
            title: '채터링',
            photo: null,
            reason: '회전 부품 진동/마찰로 인한 반복적 흔적. 롤러 편심, 베어링 불량, 장력 제어 문제 등',
            internal: '1. 라인 내 회전 부품 정렬 및 진동 점검\n2. 베어링 마모 및 장력 제어 시스템 안정성 확인',
            external: '1. 고객사 언코일링 또는 가공 설비 진동 여부 확인'
        },
        {
            title: '블로윙 마크',
            photo: null,
            reason: 'Strip 잠열에 의한 흘러내림 또는 에어 나이프 공기압/노즐 상태 불량으로 인한 줄무늬',
            internal: '1. Strip 온도/두께/도금량 확인\n2. 에어 나이프 공기압, 유량 제어 및 노즐 청결/거리/각도 점검',
            external: '1. 샘플 확보 (주로 제조 공정 내부 문제)'
        },
        {
            title: '표면 불량',
            photo: null,
            reason: '스크래치, 이물 부착, 오염, 유분 잔류 등. 원재료 상태 또는 제조 공정 중 혼입 원인',
            internal: '1. 원재료 입고 시 표면 검사 기록 확인\n2. 롤러/가이드 청결 점검 및 오염원(먼지, 오일 등) 추적\n3. 제품 검사 시스템(SDD) 성능 점검',
            external: '1. 운송/하역 중 포장재 손상 확인\n2. 고객사 가공 중 스크래치/오염 접촉 여부 확인'
        },
        {
            title: '권취 불량',
            photo: null,
            reason: '라인 재가동 시 텐션 헌팅, 지게차에 의한 내권부 뒤틀림, 또는 재사용 시 권취 텐션 풀림 등',
            internal: '1. 코일 내권부 테이핑 및 지관 사용 여부 확인',
            external: '1. 코일 사용 후 재사용 여부 확인'
        }
    ];

    async function loadLocalDefects() {
        console.log("🔍 불량 데이터 불러오는 중...");
        try {
            const querySnapshot = await db.collection("defects").get();
            localDefects = [];
            querySnapshot.forEach((doc) => {
                localDefects.push({ id: doc.id, ...doc.data() });
            });

            // 누락된 기본 데이터 자동 추가 (중복 제외)
            const existingTitles = localDefects.map(d => d.title);
            const missingDefects = defaultDefects.filter(d => !existingTitles.includes(d.title));

            if (missingDefects.length > 0) {
                console.log(`ℹ️ ${missingDefects.length}개의 누락된 기본 데이터를 추가 중...`);
                const promises = missingDefects.map(d => db.collection("defects").add(d));
                await Promise.all(promises);

                // 추가 후 전체 목록 다시 로드
                const finalSnapshot = await db.collection("defects").get();
                localDefects = [];
                finalSnapshot.forEach((doc) => {
                    localDefects.push({ id: doc.id, ...doc.data() });
                });
            }

            console.log("✅ 불량 데이터 로드 완료:", localDefects.length, "건");
            renderDefectGrid();
        } catch (error) {
            console.error("❌ 불량 데이터 로드 에러:", error);
        }
    }

    function renderDefectGrid() {
        if (!defectGrid) return;
        defectGrid.innerHTML = localDefects.length === 0 ? '<p style="text-align:center; color:#94a3b8; padding:40px;">등록된 불량 유형이 없습니다.</p>' : '';
        localDefects.forEach(defect => {
            const card = document.createElement('div');
            card.className = 'standard-card';
            card.style.cssText = 'padding:0; overflow:hidden;';

            // 사진 영역 (정사각형)
            const photoHtml = defect.photo
                ? `<div style="width:100%; aspect-ratio:1; background:#f1f5f9; overflow:hidden;">
                     <img src="${defect.photo}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.open(this.src)">
                   </div>`
                : `<div style="width:100%; aspect-ratio:1; background:linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8;">
                     <span style="font-size:32px; margin-bottom:8px;">📷</span>
                     <span style="font-size:12px;">사진 없음</span>
                   </div>`;

            card.innerHTML = `
                ${photoHtml}
                <div style="padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <h3 style="margin:0; font-size:15px; font-weight:700; color:#1e293b;">${defect.title}</h3>
                        <div style="display:flex; gap:4px; flex-shrink:0;" class="admin-only">
                            <button style="background:#e0f2fe; color:#0284c7; width:26px; height:26px; border:none; border-radius:6px; cursor:pointer; font-size:12px;" onclick="editDefect('${defect.id}')">✏️</button>
                            <button style="background:#fee2e2; color:#dc2626; width:26px; height:26px; border:none; border-radius:6px; cursor:pointer; font-size:12px;" onclick="deleteDefect('${defect.id}')">🗑️</button>
                        </div>
                    </div>
                    <div style="font-size:13px; line-height:1.6; color:#475569;">
                        <div style="margin-bottom:10px;">
                            <div style="font-weight:600; color:#1e3a8a; margin-bottom:4px; font-size:12px;">🔍 예상 원인</div>
                            <div style="padding-left:2px;">${defect.reason || '-'}</div>
                        </div>
                        <div style="margin-bottom:10px;">
                            <div style="font-weight:600; color:#1e3a8a; margin-bottom:4px; font-size:12px;">🏭 내부 검토 항목 (생산)</div>
                            <div style="padding-left:2px; white-space:pre-wrap;">${(defect.internal || '-').replace(/\\n/g, '\n')}</div>
                        </div>
                        <div>
                            <div style="font-weight:600; color:#1e3a8a; margin-bottom:4px; font-size:12px;">💼 외부 검토 항목 (영업)</div>
                            <div style="padding-left:2px; white-space:pre-wrap;">${(defect.external || '-').replace(/\\n/g, '\n')}</div>
                        </div>
                    </div>
                </div>
            `;
            defectGrid.appendChild(card);
        });
    }

    // 신규 등록 버튼
    if (addDefectBtn) {
        addDefectBtn.onclick = () => {
            document.getElementById('defect-id').value = '';
            document.getElementById('defect-title').value = '';
            document.getElementById('defect-reason').value = '';
            document.getElementById('defect-internal').value = '';
            document.getElementById('defect-external').value = '';
            if (defectPhotoInput) defectPhotoInput.value = '';
            if (defectPhotoPreview) defectPhotoPreview.style.display = 'none';
            pendingDefectPhoto = null;
            document.getElementById('defect-modal-title').textContent = '📷 신규 불량 유형 등록';
            defectModal.style.display = 'flex';
        };
    }

    // 수정 버튼
    window.editDefect = (id) => {
        const defect = localDefects.find(d => d.id === id);
        if (!defect) return;
        document.getElementById('defect-id').value = defect.id;
        document.getElementById('defect-title').value = defect.title;
        document.getElementById('defect-reason').value = defect.reason;
        document.getElementById('defect-internal').value = defect.internal;
        document.getElementById('defect-external').value = defect.external;
        if (defectPhotoInput) defectPhotoInput.value = '';
        if (defect.photo) {
            pendingDefectPhoto = defect.photo;
            if (defectPreviewImg) defectPreviewImg.src = defect.photo;
            if (defectPhotoPreview) defectPhotoPreview.style.display = 'block';
        } else {
            pendingDefectPhoto = null;
            if (defectPhotoPreview) defectPhotoPreview.style.display = 'none';
        }
        document.getElementById('defect-modal-title').textContent = '📷 불량 유형 수정';
        defectModal.style.display = 'flex';
    };

    // 삭제 버튼
    window.deleteDefect = (id) => {
        if (!confirm('이 불량 유형을 삭제하시겠습니까?')) return;
        db.collection("defects").doc(id).delete().then(loadLocalDefects);
    };

    // 폼 제출 (추가/수정)
    if (defectForm) {
        defectForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = defectForm.querySelector('button[type="submit"]');
            const idVal = document.getElementById('defect-id').value;
            const defectFile = document.getElementById('defect-photo').files[0];

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "저장 중...";
            }

            // 타임아웃 설정 (30초 후 버튼 복구)
            const timeoutId = setTimeout(() => {
                if (submitBtn && submitBtn.disabled) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "저장하기";
                    console.warn("⚠️ 저장 프로세스 타임아웃 (30초 경과)");
                    alert("서버 응답이 너무 늦습니다. 인터넷 연결이나 Firebase 설정을 확인해주세요.");
                }
            }, 30000);

            try {
                console.log("🚀 [불량 도감] 저장 프로세스 시작...");
                let photoURL = pendingDefectPhoto;

                // 새로운 사진 파일이 선택된 경우 업로드 진행
                if (defectFile) {
                    console.log("📸 [1/2] 사진 업로드 시도 중:", defectFile.name);
                    try {
                        const storagePath = `defect_photos/${Date.now()}_${defectFile.name}`;
                        const storageRef = storage.ref(storagePath);

                        // 업로드 시작
                        const snapshot = await storageRef.put(defectFile);
                        console.log("📤 [1/2] 업로드 완료 snapshot 획득");

                        photoURL = await snapshot.ref.getDownloadURL();
                        console.log("🔗 [1/2] 다운로드 URL 획득 성공:", photoURL);
                    } catch (sError) {
                        console.error("❌ 사진 업로드 단계 실패:", sError);
                        throw new Error(`사진 업로드 중 오류가 발생했습니다: ${sError.message}`);
                    }
                } else {
                    console.log("ℹ️ 새로운 사진 파일 없음, 기존 URL/Base64 사용");
                }

                const defectData = {
                    title: document.getElementById('defect-title').value,
                    photo: photoURL || null,
                    reason: document.getElementById('defect-reason').value,
                    internal: document.getElementById('defect-internal').value,
                    external: document.getElementById('defect-external').value,
                    updatedAt: new Date().toISOString()
                };

                console.log("💾 [2/2] Firestore 데이터 기록 단계 (ID:", idVal || "New", ")");

                if (idVal) {
                    // 기존 데이터 수정
                    await db.collection("defects").doc(idVal).update(defectData);
                    console.log("✅ [2/2] 기존 데이터 업데이트 성공");
                    alert("성공적으로 수정되었습니다.");
                } else {
                    // 신규 데이터 등록
                    const docRef = await db.collection("defects").add(defectData);
                    console.log("✅ [2/2] 신규 데이터 등록 성공 (ID:", docRef.id, ")");
                    alert("신규 불량이 등록되었습니다.");
                }

                // 모달 닫기 및 초기화
                clearTimeout(timeoutId);
                defectModal.style.display = 'none';
                pendingDefectPhoto = null;
                defectForm.reset();
                if (defectPhotoPreview) defectPhotoPreview.style.display = 'none';

                // 목록 새로고침
                await loadLocalDefects();
                console.log("🎆 모든 저장 프로세스 완료 및 목록 갱신");

            } catch (error) {
                clearTimeout(timeoutId);
                console.error("❌ 불량 저장 에러 상세:", error);
                let userMsg = "저장 실패: " + (error.message || "알 수 없는 오류");

                if (error.code === 'permission-denied') {
                    userMsg = "권한이 없습니다 (permission-denied). Firebase Console에서 'Rules'를 점검해 주세요.";
                } else if (error.code === 'storage/unauthorized') {
                    userMsg = "Storage 권한이 없습니다. Firebase Storage 설정을 확인해 주세요.";
                }

                alert(userMsg);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "저장하기";
                }
            }
        };
    }

    // 모든 정의가 끝난 후 초기 데이터 로드 시작
    initAppData();
});
