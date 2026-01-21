// 세아씨엠 품질조회 및 고객불만관리(VOC) 통합 엔진
document.addEventListener('DOMContentLoaded', function () {
    const steelTypeSelect = document.getElementById('steel-type');
    const standardTypeSelect = document.getElementById('standard-type');
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
        const specPatterns = [{ reg: /3506|D3506/, key: "KS D 3506", ref: "KS" }, { reg: /3520|D3520/, key: "KS D 3520", ref: "KS" }, { reg: /3302|G3302/, key: "JIS G 3302", ref: "JIS" }, { reg: /A653/, key: "ASTM A653", ref: "ASTM" }];
        let detectedSpec = { name: "미분류", ref: "기타" };
        for (const s of specPatterns) { if (s.reg.test(pool)) { detectedSpec = { name: s.key, ref: s.ref }; break; } }
        const gradeRegex = /(SGC[0-9]{3}|SGCC|DX51D|CS[A-C])/i; const gradeMatch = (fileName + " " + text).match(gradeRegex);
        return { spec: detectedSpec, grade: gradeMatch ? gradeMatch[0].toUpperCase() : "미지정" };
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
        if (!registeredFileList) return; registeredFileList.innerHTML = localFiles.length === 0 ? '<div style="text-align:center; padding:20px; color:#94a3b8;">파일 없음</div>' : '';
        localFiles.forEach(file => {
            const div = document.createElement('div'); div.className = 'file-list-item-new';
            div.innerHTML = `<div class="file-info-header" style="cursor:pointer;"><div class="file-icon">📄</div><div class="file-meta"><span class="file-name-link">${file.name}</span><div class="status-tags"><span class="status-badge badge-blue">${file.detectedSpec}</span><span class="status-badge badge-orange">${file.detectedGrade}</span></div></div></div><button class="btn-icon delete-file">✕</button>`;
            div.querySelector('.file-info-header').onclick = () => { window.open(file.content); };
            div.querySelector('.delete-file').onclick = () => {
                if (confirm('삭제하시겠습니까?')) {
                    db.collection("specs").doc(file.id).delete().then(loadLocalFiles);
                }
            };
            registeredFileList.appendChild(div);
        });
    }

    if (vocForm) {
        vocForm.onsubmit = async (e) => {
            e.preventDefault();
            const photoFile = document.getElementById('voc-photo').files[0];

            try {
                let photoURL = isEditMode ? localComplaints.find(v => v.id === currentVocId).photo : null;

                // 사진이 새로 업로드된 경우
                if (photoFile) {
                    const storageRef = storage.ref(`voc_photos/${Date.now()}_${photoFile.name}`);
                    const snapshot = await storageRef.put(photoFile);
                    photoURL = await snapshot.ref.getDownloadURL();
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
                    await db.collection("complaints").doc(currentVocId).update(vocData);
                } else {
                    await db.collection("complaints").add(vocData);
                }

                vocForm.reset();
                isEditMode = false;
                currentVocId = null;
                vocForm.querySelector('button[type="submit"]').textContent = 'VOC 접수완료';
                loadLocalComplaints();
                alert(isEditMode ? 'VOC 수정이 완료되었습니다.' : 'VOC 상세 접수가 완료되었습니다.');
            } catch (error) {
                console.error("VOC 저장 에러:", error);
                alert("VOC 저장 중 오류가 발생했습니다.");
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
                <td style="padding:12px;"><span class="voc-status" style="background:#f1f5f9; color:#475569;">${voc.category}</span></td>
                <td style="padding:12px; font-size:12px; color:#64748b;">${voc.receiptDate}</td>
                <td style="padding:12px; font-weight:600; color:#1e293b;">${voc.customer}</td>
                <td style="padding:12px; font-size:12px; color:#64748b; font-weight:700;">${voc.line}</td>
                <td style="padding:12px; font-size:13px; color:#475569;">${voc.title}</td>
                <td style="padding:12px;"><span class="voc-status ${isDone ? 'status-done' : 'status-pending'}">${voc.status}</span></td>
                <td style="padding:12px; text-align:center;"><button class="btn-icon" style="background:#f1f5f9; color:#64748b; width:24px; height:24px;" onclick="deleteVoc(event, '${voc.id}')">✕</button></td>
            `;
            vocListBody.appendChild(tr);
        });
    }

    window.deleteVoc = (e, id) => { e.stopPropagation(); if (confirm('이 VOC 내역을 완전히 삭제하시겠습니까?')) db.collection("complaints").doc(id).delete().then(loadLocalComplaints); };

    function openVocModal(voc) {
        currentVocId = voc.id; vocModal.style.display = 'flex';
        const isDone = voc.status === '완료';

        vocModalInfo.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; font-size:13px; margin-bottom:20px; background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #e2e8f0;">
                <div><strong style="color:#64748b;">구분:</strong> ${voc.category} (${voc.market})</div>
                <div><strong style="color:#64748b;">접수일:</strong> ${voc.receiptDate}</div>
                <div><strong style="color:#64748b;">고객사:</strong> ${voc.customer}</div>
                <div><strong style="color:#64748b;">담당자:</strong> ${voc.manager}</div>
                <div><strong style="color:#64748b;">SPEC:</strong> ${voc.spec}</div>
                <div><strong style="color:#64748b;">색상:</strong> ${voc.color || '-'}</div>
                <div><strong style="color:#64748b;">배치번호:</strong> ${voc.batch || '-'}</div>
                <div><strong style="color:#64748b;">생산라인:</strong> ${voc.line} (${voc.prodDate || '-'})</div>
                <div><strong style="color:#64748b;">납품수량:</strong> ${voc.deliveryQty || '-'}</div>
                <div><strong style="color:#64748b;">불만수량:</strong> ${voc.complaintQty || '-'}</div>
            </div>
            <div style="margin-bottom:15px;"><div style="font-weight:700; margin-bottom:8px; color:#1e293b;">📌 불만명: ${voc.title}</div></div>
            ${voc.photo ? `<div style="margin-bottom:15px;"><img src="${voc.photo}" style="width:100%; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer;" onclick="window.open(this.src)"></div>` : ''}
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button class="btn-secondary" style="flex:1; font-size:12px;" onclick="startEditSelectedVoc()">🖋️ 정보 수정</button>
            </div>
            ${voc.replyData ? `
                <div style="background:#eff6ff; padding:15px; border-radius:8px; border:1px solid #bfdbfe; font-size:13px;">
                    <div style="font-weight:700; margin-bottom:12px; color:#1e3a8a; border-bottom:1px solid #bfdbfe; padding-bottom:8px;">✅ 품질팀 조치 결과 (${voc.repliedAt})</div>
                    <div style="margin-bottom:8px;"><strong style="color:#1e40af;">[담당자]</strong> ${voc.replyData.manager} / <strong style="color:#1e40af;">[손실비용]</strong> ${voc.replyData.cost}</div>
                    <div style="margin-bottom:8px;"><strong style="color:#1e40af;">[근본원인]</strong><br>${voc.replyData.cause}</div>
                    <div style="margin-bottom:8px;"><strong style="color:#1e40af;">[개선대책]</strong><br>${voc.replyData.countermeasure}</div>
                    <div style="margin-bottom:8px;"><strong style="color:#1e40af;">[유효성평가]</strong><br>${voc.replyData.evaluation}</div>
                    ${voc.replyData.notes ? `<div><strong style="color:#1e40af;">[특이사항]</strong><br>${voc.replyData.notes}</div>` : ''}
                </div>
            ` : (isDone && voc.reply ? `<div style="background:#eff6ff; padding:15px; border-radius:8px; border:1px solid #bfdbfe;"><div style="font-weight:700; margin-bottom:8px; color:#1e3a8a;">✅ 조치 결과 (${voc.repliedAt})</div><div style="font-size:14px; color:#1e40af; line-height:1.6;">${voc.reply}</div></div>` : '')}
        `;

        document.getElementById('modal-voc-action-box').style.display = isDone ? 'none' : 'block';
        if (!isDone) {
            document.getElementById('modal-reply-manager').value = '';
            document.getElementById('modal-reply-cost').value = '';
            document.getElementById('modal-reply-cause').value = '';
            document.getElementById('modal-reply-countermeasure').value = '';
            document.getElementById('modal-reply-evaluation').value = '';
            document.getElementById('modal-reply-notes').value = '';
            document.getElementById('modal-reply-status').value = '완료';
        }
    }

    window.startEditSelectedVoc = () => {
        const voc = localComplaints.find(v => v.id === currentVocId);
        if (!voc) return;
        document.getElementById('voc-category').value = voc.category;
        document.getElementById('voc-market').value = voc.market;
        document.getElementById('voc-receipt-date').value = voc.receiptDate;
        document.getElementById('voc-customer').value = voc.customer;
        document.getElementById('voc-manager').value = voc.manager;
        document.getElementById('voc-spec').value = voc.spec;
        document.getElementById('voc-color').value = voc.color;
        document.getElementById('voc-batch').value = voc.batch;
        document.getElementById('voc-line').value = voc.line;
        document.getElementById('voc-prod-date').value = voc.prodDate;
        document.getElementById('voc-delivery-qty').value = voc.deliveryQty;
        document.getElementById('voc-complaint-qty').value = voc.complaintQty;
        document.getElementById('voc-title').value = voc.title;
        document.getElementById('voc-desc').value = voc.desc;

        isEditMode = true;
        vocForm.querySelector('button[type="submit"]').textContent = '수정 완료하기';
        vocModal.style.display = 'none';
        vocForm.scrollIntoView({ behavior: 'smooth' });
    };

    if (vocModalSaveBtn) {
        vocModalSaveBtn.onclick = async () => {
            const replyData = {
                manager: document.getElementById('modal-reply-manager').value,
                cost: document.getElementById('modal-reply-cost').value,
                cause: document.getElementById('modal-reply-cause').value,
                countermeasure: document.getElementById('modal-reply-countermeasure').value,
                evaluation: document.getElementById('modal-reply-evaluation').value,
                notes: document.getElementById('modal-reply-notes').value
            };
            const status = document.getElementById('modal-reply-status').value;

            if (!replyData.cause || !replyData.countermeasure) return alert('원인과 개선 대책은 필수 입력 항목입니다.');

            try {
                await db.collection("complaints").doc(currentVocId).update({
                    replyData: replyData,
                    status: status,
                    repliedAt: new Date().toLocaleString()
                });
                vocModal.style.display = 'none';
                loadLocalComplaints();
            } catch (error) {
                console.error("조치 결과 저장 에러:", error);
                alert("저장 중 오류가 발생했습니다.");
            }
        };
    }

    // [6. 조회 엔진]
    function updateOptions() {
        const steel = steelTypeSelect.value, std = standardTypeSelect.value; const data = (steel && std) ? steelData[steel]?.[std] : null;
        if (data) {
            gradeTypeSelect.disabled = false; gradeTypeSelect.innerHTML = '<option value="">재질 선택</option>' + data.grades.map(g => `<option value="${g}">${g}</option>`).join('');
            coatingWeightSelect.disabled = false; coatingWeightSelect.innerHTML = '<option value="">도금 선택</option>' + (data.coatingOptions || []).map(c => `<option value="${c}">${c}</option>`).join('');
        } else { gradeTypeSelect.disabled = true; coatingWeightSelect.disabled = true; }
    }
    if (steelTypeSelect) steelTypeSelect.onchange = updateOptions;
    if (standardTypeSelect) standardTypeSelect.onchange = updateOptions;
    if (searchBtn) {
        searchBtn.onclick = function () {
            const s = steelTypeSelect.value, st = standardTypeSelect.value, g = gradeTypeSelect.value;
            if (!s || !st || !g) return alert('모두 선택해주세요.');
            if (!steelData[s]?.[st]) { showInquiryPopup(); return; }
            displayResults(s, st, g);
        };
    }

    function displayResults(steelType, standardRef, grade) {
        const stdData = steelData[steelType][standardRef]; const stdProps = stdData.properties[grade];
        const matchedFile = localFiles.filter(f => f.detectedRef === standardRef && (f.detectedGrade.includes(grade) || grade.includes(f.detectedGrade))).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
        resultsCard.style.display = 'block'; resultsCardWasVisible = true;
        const t = thicknessInput.value || '0.00', w = widthInput.value || '000', c = coatingWeightSelect.value || '-';
        document.getElementById('results-title').textContent = `${t}T x ${w}W x ${grade} (${c}) 분석 결과`;
        const tolResult = ToleranceEngine.calculate(stdData.standard, t, w);
        document.getElementById('results-badges').innerHTML = `<span class="badge badge-blue">${steelType}</span>${matchedFile ? `<span class="badge badge-green">🧠 규격서 연동됨</span>` : `<span class="badge badge-orange">⚠️ 표준 데이터</span>`}`;
        document.getElementById('mechanical-tbody').innerHTML = `<tr><td class="text-bold">항복강도</td><td>YP</td><td>${stdProps.ys}</td><td>MPa</td><td>-</td></tr><tr><td class="text-bold">인장강도</td><td>TS</td><td>${stdProps.ts}</td><td>MPa</td><td>-</td></tr><tr><td class="text-bold">연신율</td><td>El</td><td>${stdProps.el}</td><td>%</td><td>-</td></tr><tr><td class="text-bold">굽힘성</td><td>Bnd</td><td>${stdProps.bend}</td><td>t</td><td>-</td></tr>`;
        document.getElementById('val-thickness').textContent = tolResult.thickness; document.getElementById('val-flatness').textContent = tolResult.flatness;
        document.getElementById('coating-cards').innerHTML = `<div class="info-box"><span class="label">도금 종류</span><span class="value">${stdData.coating.type}</span></div><div class="info-box"><span class="label">지정 도금량</span><span class="value">${c}</span></div><div class="info-box"><span class="label">적용 규격</span><span class="value">${stdData.standard.split(' ')[0]}</span></div>`;
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

    // 초기 기본 데이터
    const defaultDefects = [
        { title: '흑청/백청/적청', photo: null, reason: '습한 환경 또는 장기 보관으로 인한 소재 부식 발생', internal: '1. 제품 보관 환경 및 기간 확인\n2. 포장 상태(방수) 및 적재 방식 점검\n3. 운송 중 수분 접촉 가능성 및 크로메이트 처리 조건 확인', external: '1. 고객사 제품 보관 환경 및 운송 중 수분 노출 여부 확인\n2. 가공 공정 중 수분 접촉 가능성 조사' },
        { title: '형상불량 (WAVE)', photo: null, reason: 'Center/Edge Wave (Roll Crown 부적절), 입하 Level 부적절, Edge Zn 빌드업', internal: '1. 텐션레벨러 및 롤 교정 상태 점검\n2. 도금/도장 공정 장력 및 롤 압력 설정 확인\n3. 제품 두께/폭 편차 및 기계적 성질 확인', external: '1. 고객사 가공 설비 정렬 상태 및 가공 조건 확인\n2. 생산 6개월 초과 시 시효경화 가능성 확인' },
        { title: '스트레쳐 스트레인', photo: null, reason: '항복점 연신 현상, 어닐링 조건 또는 스킨 패스 압연량 부족 등', internal: '1. 원재료 화학 성분 및 기계적 특성(YP, TS) 확인\n2. CGL 어닐링 조건 및 스킨 패스 압연율 점검', external: '1. 가공 설비(프레스) 성형 조건 및 금형 상태 확인\n2. 가공 중 과도한 변형 발생 여부 확인' },
        { title: '미도금 (Uncoated)', photo: null, reason: '전처리 불량, 도금액 조성 불균형, 도금조 내 이물 혼입 등', internal: '1. 전처리 온도/농도, 도금액 아연 농도 및 불순물 분석\n2. 도금조 슬러지 발생 여부 및 라인 스피드 점검', external: '1. 샘플 확보 (주로 제조 공정 내부 문제)' },
        { title: '도금불량', photo: null, reason: '미제거 Rust, 도금층 두께 불균일, 벗겨짐, 요철, 크랙, 반점 등', internal: '1. 도금 두께 분포 데이터 및 도액 조성/온도 분석\n2. 도금조 롤/스키머 상태 및 크로메이트/오일링 조건 확인', external: '1. 고객 가공 시 도금층 손상 가능성(마찰) 확인\n2. 보관/운송 중 외부 요인에 의한 손상 조사' },
        { title: '도막 박리', photo: null, reason: '전처리/화성처리 불량, 프라이머 도포/경화 불량, 부착력 부족 등', internal: '1. 전처리 온도/농도, 프라이머/탑코트 도포량 및 경화 조건 확인\n2. 도료 유효기간 및 하지층 부착성 평가 결과 점검', external: '1. 가공 중 과도한 변형/충격 여부 확인\n2. 보관/사용 환경(화학물질, 고온다습) 조사' }
    ];

    async function loadLocalDefects() {
        try {
            const querySnapshot = await db.collection("defects").get();
            localDefects = [];
            querySnapshot.forEach((doc) => {
                localDefects.push({ id: doc.id, ...doc.data() });
            });

            if (localDefects.length === 0) {
                // 초기 데이터 삽입
                for (const d of defaultDefects) {
                    await db.collection("defects").add(d);
                }
                loadLocalDefects();
            } else {
                renderDefectGrid();
            }
        } catch (error) {
            console.error("불량 데이터 로드 에러:", error);
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
                        <div style="display:flex; gap:4px; flex-shrink:0;">
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

            // 저장 버튼 시각적 피드백
            const submitBtn = defectForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "저장 중...";
            }

            const idVal = document.getElementById('defect-id').value;
            const defectFile = document.getElementById('defect-photo').files[0];

            try {
                let photoURL = pendingDefectPhoto;

                // 새로운 사진이 선택된 경우 (파일로 온 경우)
                if (defectFile) {
                    const storageRef = storage.ref(`defect_photos/${Date.now()}_${defectFile.name}`);
                    const snapshot = await storageRef.put(defectFile);
                    photoURL = await snapshot.ref.getDownloadURL();
                }

                const defectData = {
                    title: document.getElementById('defect-title').value,
                    photo: photoURL,
                    reason: document.getElementById('defect-reason').value,
                    internal: document.getElementById('defect-internal').value,
                    external: document.getElementById('defect-external').value
                };

                if (idVal) {
                    await db.collection("defects").doc(idVal).update(defectData);
                    alert("성공적으로 수정되었습니다.");
                } else {
                    await db.collection("defects").add(defectData);
                    alert("신규 불량이 등록되었습니다.");
                }

                defectModal.style.display = 'none';
                pendingDefectPhoto = null;
                // 폼 초기화 추가
                defectForm.reset();
                if (defectPhotoPreview) defectPhotoPreview.style.display = 'none';

                loadLocalDefects();
            } catch (error) {
                console.error("불량 데이터 저장 에러:", error);
                if (error.code === 'permission-denied') {
                    alert("저장 권한이 없습니다. 파이어베이스 설정을 확인해주세요.");
                } else {
                    alert("저장 중 오류가 발생했습니다: " + error.message);
                }
            } finally {
                // 저장 버튼 비활성화 해제 (필요 시 추가)
                const submitBtn = defectForm.querySelector('button[type="submit"]');
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
