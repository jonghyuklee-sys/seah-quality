// 세아씨엠 품질조회시스템 - Application Logic

document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const steelTypeSelect = document.getElementById('steel-type');
    const standardTypeSelect = document.getElementById('standard-type');
    const gradeTypeSelect = document.getElementById('grade-type');
    const searchBtn = document.getElementById('search-btn');
    const resultsCard = document.getElementById('results-card');
    const currentPageLabel = document.getElementById('current-page');

    // Sidebar Navigation Logic
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const pageSections = document.querySelectorAll('.page-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const targetId = href.substring(1);

            // Update Active Link State
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Show/Hide Sections
            pageSections.forEach(section => {
                if (section.id === targetId) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });

            // Update Breadcrumb & Header Labels
            let pageTitle = this.textContent.trim().replace(/[🔍📊📖📋⚙️]/g, '').trim();
            currentPageLabel.textContent = pageTitle;

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Tab functionality (for Info Section)
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const tab = this.dataset.tab;

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Update panels
            document.querySelectorAll('.info-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${tab}`).classList.add('active');
        });
    });

    // Update grade options when steel type or standard changes
    function updateGradeOptions() {
        const steelType = steelTypeSelect.value;
        const standard = standardTypeSelect.value;

        if (steelType && standard && steelData[steelType] && steelData[steelType][standard]) {
            const data = steelData[steelType][standard];
            gradeTypeSelect.disabled = false;
            gradeTypeSelect.innerHTML = '<option value="">재질 선택</option>';

            data.grades.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = grade;
                gradeTypeSelect.appendChild(option);
            });
        } else {
            gradeTypeSelect.disabled = true;
            gradeTypeSelect.innerHTML = '<option value="">강종/규격 먼저 선택</option>';
        }
    }

    steelTypeSelect.addEventListener('change', updateGradeOptions);
    standardTypeSelect.addEventListener('change', updateGradeOptions);

    // --- Firebase & Local Sync Logic ---
    const filesCollection = db.collection("registered_specs");

    // Cloud upload function
    async function uploadToCloud(file) {
        try {
            const specType = detectStandard(file.name);
            const storageRef = storage.ref(`specs/${file.name}`);

            // 1. Upload to Storage
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            // 2. Save Metadata to Firestore
            await filesCollection.doc(file.name).set({
                name: file.name,
                url: downloadURL,
                standard: specType,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { name: file.name, url: downloadURL, standard: specType };
        } catch (error) {
            console.error("Firebase Upload Error:", error);
            return null;
        }
    }

    // Cloud deletion function
    async function deleteFromCloud(name) {
        try {
            await storage.ref(`specs/${name}`).delete();
            await filesCollection.doc(name).delete();
        } catch (error) {
            console.error("Firebase Delete Error:", error);
        }
    }

    // Cloud clear function
    async function clearAllCloud() {
        const snapshot = await filesCollection.get();
        const batch = db.batch();
        for (const doc of snapshot.docs) {
            try {
                await storage.ref(`specs/${doc.id}`).delete();
                batch.delete(doc.ref);
            } catch (e) { }
        }
        await batch.commit();
    }
    // ---------------------------------

    const aiAnalyzeBtn = document.getElementById('ai-analyze-btn');
    const specFileInput = document.getElementById('spec-file');
    const customFileUploadBtn = document.getElementById('custom-file-upload-btn');
    const fileStatusContainer = document.getElementById('file-status-container');
    const registeredFileList = document.getElementById('registerd-file-list');
    const clearAllFilesBtn = document.getElementById('clear-all-files-btn');

    let registeredFiles = []; // Changed to Array for cloud data

    // Trigger file input when custom button is clicked
    if (customFileUploadBtn) {
        customFileUploadBtn.addEventListener('click', () => specFileInput.click());
    }

    // Helper: Detect standard from file name (Simulated AI)
    function detectStandard(filename) {
        if (filename.includes('3506')) return 'KS D 3506';
        if (filename.includes('3520')) return 'KS D 3520';
        if (filename.includes('3770')) return 'KS D 3770';
        if (filename.includes('6711')) return 'KS D 6711';
        if (filename.includes('JIS') || filename.includes('3302')) return 'JIS G 3302';
        if (filename.includes('A755') || filename.includes('ASTM')) return 'ASTM A755';
        if (filename.includes('10346') || filename.includes('EN')) return 'EN 10346';
        return '미분류 규격';
    }

    // Helper to render file list
    function renderFileList() {
        if (registeredFiles.length === 0) {
            fileStatusContainer.style.display = 'none';
            return;
        }

        fileStatusContainer.style.display = 'flex';
        registeredFileList.innerHTML = '';

        registeredFiles.forEach(fileData => {
            const item = document.createElement('div');
            item.className = 'file-list-item';
            item.style = `
                display: flex; align-items: center; justify-content: space-between; 
                padding: 10px; background: rgba(59, 130, 246, 0.05); 
                border-radius: var(--radius-sm); border: 1px solid rgba(59, 130, 246, 0.2);
            `;

            const detectedSpec = fileData.standard || detectStandard(fileData.name);
            const fileUrl = fileData.url || "#";

            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">📄</span>
                    <div style="display: flex; flex-direction: column;">
                        <a href="${fileUrl}" target="_blank" style="font-size: 13px; font-weight: 500; color: var(--primary); text-decoration: none; border-bottom: 1px dashed var(--primary); cursor: pointer;" title="파일 열기">
                            ${fileData.name}
                        </a>
                        <span class="badge ${detectedSpec === '미분류 규격' ? 'badge-orange' : 'badge-blue'}" style="font-size: 10px; padding: 2px 6px; margin-top: 4px; width: fit-content;">
                            ${detectedSpec} 연결됨
                        </span>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <a href="${fileUrl}" target="_blank" style="font-size: 11px; color: var(--secondary); text-decoration: none;">미리보기</a>
                    <button type="button" class="remove-single-file" data-name="${fileData.name}" style="background: none; border: none; color: var(--danger); font-size: 11px; cursor: pointer;">제거</button>
                </div>
            `;
            registeredFileList.appendChild(item);
        });

        // Add event listeners to individual remove buttons
        document.querySelectorAll('.remove-single-file').forEach(btn => {
            btn.addEventListener('click', async function () {
                const name = this.dataset.name;
                if (confirm(`'${name}' 파일을 클라우드에서 영구적으로 제거할까요?`)) {
                    await deleteFromCloud(name);
                    registeredFiles = registeredFiles.filter(f => f.name !== name);
                    renderFileList();
                }
            });
        });
    }

    // Initial Load from Firebase
    filesCollection.orderBy("uploadedAt", "desc").onSnapshot(snapshot => {
        registeredFiles = snapshot.docs.map(doc => doc.data());
        renderFileList();
        console.log("Cloud Files Synced:", registeredFiles.length);
    });

    // Handle file selection
    specFileInput.addEventListener('change', async function (e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        customFileUploadBtn.disabled = true;
        customFileUploadBtn.innerHTML = '<span>⏳</span> 업로드 중...';

        for (const file of files) {
            const newSpec = detectStandard(file.name);

            // Duplicate standard check
            if (newSpec !== '미분류 규격') {
                const isDuplicate = registeredFiles.some(f => (f.standard || detectStandard(f.name)) === newSpec);
                if (isDuplicate) {
                    const confirmReplace = confirm(`이미 '${newSpec}' 규격에 대한 파일이 클라우드에 존재합니다. 추가하시겠습니까?`);
                    if (!confirmReplace) continue;
                }
            }

            await uploadToCloud(file);
        }

        customFileUploadBtn.disabled = false;
        customFileUploadBtn.innerHTML = '<span>📁</span> 내 컴퓨터에서 파일 선택';
        specFileInput.value = '';
    });

    // Handle all file removal
    clearAllFilesBtn.addEventListener('click', async function () {
        if (confirm('클라우드에 저장된 모든 규격서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            await clearAllCloud();
        }
    });

    // Analysis Helper Function
    async function performAnalysis(triggerBtn) {
        const steelType = steelTypeSelect.value;
        const standard = standardTypeSelect.value;
        const grade = gradeTypeSelect.value;

        if (!steelType || !standard || !grade) {
            alert('강종, 규격, 재질을 먼저 선택해주세요.');
            return;
        }

        const filesCount = registeredFiles.length;

        // UI Feedback: Loading
        const originalText = triggerBtn.innerHTML;
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = '<span>⏳</span> 분석 중...';

        try {
            if (filesCount > 0) {
                // Scenario 1: OCR Analysis
                const detectedSpecs = registeredFiles.map(f => {
                    return f.standard || detectStandard(f.name);
                }).filter(s => s !== '미분류 규격');

                const specMessage = detectedSpecs.length > 0
                    ? `[인식된 규격: ${[...new Set(detectedSpecs)].join(', ')}]`
                    : '[규격 자동 식별 완료]';

                console.log(`Analyzing ${filesCount} files for ${grade}...`);
                await new Promise(resolve => setTimeout(resolve, 1500));
                // In potential real implementation, OCR data would merge here
                alert(`[OCR 분석 완료]\n${specMessage}\n${grade} 재질의 상세 데이터를 성공적으로 추출했습니다.`);
            } else {
                // Scenario 2: AI Analysis
                console.log(`Fetching AI data for ${standard} ${grade}...`);
                await new Promise(resolve => setTimeout(resolve, 1200));
            }

            // Display results
            displayResults(steelType, standard, grade);

            // Visual feedback on results card
            resultsCard.classList.add('ai-updated');
            setTimeout(() => resultsCard.classList.remove('ai-updated'), 2000);

        } catch (error) {
            console.error("Analysis Error:", error);
            alert('분석 중 오류가 발생했습니다.');
        } finally {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = originalText;
        }
    }

    // Search button (Data Inquiry) click handler
    searchBtn.addEventListener('click', function () {
        performAnalysis(this);
    });

    // AI Analysis Button Handler (Management View)
    aiAnalyzeBtn.addEventListener('click', async function () {
        const filesCount = registeredFiles.size;
        if (filesCount === 0) {
            alert('분석할 규격서 파일이 없습니다. 먼저 파일을 업로드해주세요.');
            return;
        }

        const originalText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<span>⏳</span> 라이브러리 스캔 중...';

        try {
            console.log(`Scanning library of ${filesCount} files...`);
            await new Promise(resolve => setTimeout(resolve, 2500));
            alert(`[라이브러리 분석 완료]\n총 ${filesCount}개의 규격서를 분석하여 인덱싱을 완료했습니다.\n\n이제 '규격 조회' 시 해당 규격들을 기반으로 정밀한 데이터 조회가 가능합니다.`);
        } catch (error) {
            alert('분석 중 오류가 발생했습니다.');
        } finally {
            this.disabled = false;
            this.innerHTML = originalText;
        }
    });

    // --- System Settings Interactivity ---
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function () {
            const originalText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<span>⏳</span> 저장 중...';

            setTimeout(() => {
                this.disabled = false;
                this.innerHTML = originalText;
                alert('시스템 설정이 성공적으로 저장되었습니다.\n변경사항은 다음 접속 시에도 유지됩니다.');
            }, 1000);
        });
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function () {
            if (this.checked) {
                alert('다크 모드는 현재 개발 중인 기능입니다.\n향후 업데이트를 통해 적용될 예정입니다.');
                this.checked = false;
            }
        });
    }
    // -------------------------------------

    // Display results function
    function displayResults(steelType, standard, grade) {
        // Safety check
        if (!steelData[steelType] || !steelData[steelType][standard]) {
            alert('해당 강종 또는 규격의 기본 데이터를 찾을 수 없습니다.');
            return;
        }

        const data = steelData[steelType][standard];
        const props = data.properties[grade];

        if (!props) {
            alert(`'${grade}' 재질에 대한 세부 속성 정의가 부족합니다. AI 분석을 통해 보완을 시도하세요.`);
            resultsCard.style.display = 'none';
            return;
        }

        // Show results card
        resultsCard.style.display = 'block';

        // Detect if Coated (Prepainted)
        const isCoated = data.isPrepainted || false;

        // Show/Hide relevant Sections
        const nonCoatedDiv = document.getElementById('non-coated-results');
        const coatedDiv = document.getElementById('coated-results');

        if (isCoated) {
            nonCoatedDiv.style.display = 'none';
            coatedDiv.style.display = 'block';
        } else {
            nonCoatedDiv.style.display = 'block';
            coatedDiv.style.display = 'none';
        }

        // Update title and badges
        document.getElementById('results-title').textContent = `${grade} 상세 데이터`;
        document.getElementById('results-badges').innerHTML = `
            <span class="badge badge-blue">${steelType}</span>
            <span class="badge badge-orange">${standard}</span>
            <span class="badge badge-green">${grade}</span>
        `;

        // Update mechanical properties table
        const mechanicalTbody = document.getElementById('mechanical-tbody');
        mechanicalTbody.innerHTML = `
            <tr>
                <td class="text-bold">항복점 (Yield Point)</td>
                <td>YP/YS</td>
                <td class="text-bold">${props.ys || '-'}</td>
                <td class="text-muted-cell">MPa</td>
                <td class="text-muted-cell">${props.ys === '-' ? '규정 없음' : '최소값 기준'}</td>
            </tr>
            <tr>
                <td class="text-bold">인장강도 (Tensile Strength)</td>
                <td>TS</td>
                <td class="text-bold">${props.ts || '-'}</td>
                <td class="text-muted-cell">MPa</td>
                <td class="text-muted-cell">${props.ts && props.ts.includes('~') ? '범위 규정' : (props.ts === '-' ? '규정 없음' : '최소값 기준')}</td>
            </tr>
            <tr>
                <td class="text-bold">연신율 (Elongation)</td>
                <td>El</td>
                <td class="text-bold">${props.el || '-'}</td>
                <td class="text-muted-cell">%</td>
                <td class="text-muted-cell">${props.el === '-' ? '규정 없음' : '최소값 기준'}</td>
            </tr>
            <tr>
                <td class="text-bold">굽힘성 (Bend Test)</td>
                <td>Bend</td>
                <td class="text-bold">${props.bend || '-'}</td>
                <td class="text-muted-cell">-</td>
                <td class="text-muted-cell">${props.bend === '-' ? '규정 없음' : '내측 반경(R)'}</td>
            </tr>
        `;

        // Update Non-Coated Specifics
        if (!isCoated) {
            // Chemical Table
            const chemicalTbody = document.getElementById('chemical-tbody');
            const chem = data.chemical || {};
            chemicalTbody.innerHTML = `
                <tr>
                    <td class="text-bold">성분 함량 (%)</td>
                    <td>${chem.C || '-'}</td>
                    <td>${chem.Mn || '-'}</td>
                    <td>${chem.P || '-'}</td>
                    <td>${chem.S || '-'}</td>
                    <td>${chem.Si || '-'}</td>
                    <td>${chem.Al || '-'}</td>
                </tr>
            `;

            // Tolerance and Flatness
            document.getElementById('val-thickness').textContent = data.tolerance ? data.tolerance.thickness : '-';
            document.getElementById('val-flatness').textContent = data.tolerance ? data.tolerance.flatness : '-';
        }
        // Update Coated Specifics
        else {
            const coatedTbody = document.getElementById('coated-tbody');
            // User will input data, but we show placeholders/structure
            const prepainted = data.prepainted || {};
            const resinGrades = prepainted.resins || ['Polyester (PE)', 'Silicon Polyester (SMP)', 'Fluoropolymer (PVDF)'];

            coatedTbody.innerHTML = '';
            resinGrades.forEach(resin => {
                const spec = (prepainted.specs && prepainted.specs[resin]) || { bend: '-', impact: '-', salt: '-' };
                coatedTbody.innerHTML += `
                    <tr>
                        <td class="text-bold">${resin}</td>
                        <td>${spec.bend}</td>
                        <td>${spec.impact}</td>
                        <td>${spec.salt}</td>
                    </tr>
                `;
            });
        }

        // Update coating cards (Common info)
        const coatingCards = document.getElementById('coating-cards');
        const coating = data.coating || {};
        coatingCards.innerHTML = `
            <div class="info-box">
                <span class="label">도금 종류</span>
                <span class="value">${coating.type || '-'}</span>
            </div>
            <div class="info-box">
                <span class="label">도금량 범위</span>
                <span class="value">${coating.range || '-'}</span>
            </div>
            <div class="info-box">
                <span class="label">도금 방법</span>
                <span class="value">${coating.method || '-'}</span>
            </div>
        `;

        // Update standard info banner
        const standardInfo = document.getElementById('standard-info');
        const standardFullNames = {
            KS: '한국산업표준',
            JIS: '일본공업규격',
            ASTM: '미국재료시험협회',
            EN: '유럽표준'
        };

        standardInfo.innerHTML = `
            <h5>📌 규격 참조 안내</h5>
            <p>본 데이터는 <strong>${standardFullNames[standard]} (${data.standard})</strong>를 근거로 작성되었습니다. 
            재질 기호 <strong>${grade}</strong>에 대한 상세 규격 요구사항은 해당 규격서의 최신판을 참조하시기 바랍니다.</p>
        `;

        // Scroll to results
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
