/* ==========================================
   Main Application - SeAH C&M Performance Report
   ========================================== */

(function () {
    'use strict';

    // ==========================================
    // State
    // ==========================================
    let currentSection = 'dashboard';
    let currentModalData = null;

    // Section titles mapping
    const SECTION_TITLES = {
        dashboard: '종합 대시보드',
        costReduction: '제조원가 절감 현황',
        linePerformance: '라인별 실적',
        keyTasks: '주요과제 진행사항',
        equipEfficiency: '설비종합효율',
        scrap: '스크랩 현황',
        yield: 'A급 수율',
        tonPower: '톤파워',
        operationRate: '실가동률',
        lng: 'LNG원단위',
        power: '전력원단위',
        steam: '스팀',
        consumables: '소모품 원단위',
        factoryKPI: '공장KPI (폐기/재고)',
        complaints: '고객불만 및 반품',
        breakdown: '설비고장',
        productionTeam: '생산팀 상세실적',
        maintenanceTeam: '설비팀 상세실적',
        productionColdReports: '생산팀(냉연) 상세 보고',
        productionColorReports: '생산팀(칼라) 상세 보고'
    };

    // ==========================================
    // DOM References
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const contentArea = document.getElementById('contentArea');
    const pageTitle = document.getElementById('pageTitle');
    const reportMonth = document.getElementById('reportMonth');
    const selectYear = document.getElementById('selectYear');
    const selectMonth = document.getElementById('selectMonth');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');
    const btnSaveAll = document.getElementById('btnSaveAll');
    const toast = document.getElementById('toast');

    // ==========================================
    // Navigation
    // ==========================================
    async function navigateTo(sectionId) {
        if (!SectionRenderers[sectionId]) {
            console.warn(`섹션 '${sectionId}'에 대한 렌더러가 없습니다.`);
            showEmptyState(sectionId);
            return;
        }

        currentSection = sectionId;

        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        // Update title
        pageTitle.textContent = SECTION_TITLES[sectionId] || sectionId;

        // Destroy existing charts
        destroyAllCharts();

        // Render section (async 지원)
        await SectionRenderers[sectionId](contentArea);

        // Close mobile sidebar
        sidebar.classList.remove('open');
    }

    function showEmptyState(sectionId) {
        contentArea.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <i class="fas fa-chart-area"></i>
                        <p>${SECTION_TITLES[sectionId] || sectionId} 섹션</p>
                        <p class="hint">이 섹션은 아직 구현 준비 중입니다.</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // Modal - Data Input
    // ==========================================
    function openModal(title, content, onSave) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        currentModalData = onSave;
        modalOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalOverlay.classList.remove('show');
        document.body.style.overflow = '';
        currentModalData = null;
    }

    // 편집 모달 - 특정 섹션의 특정 서브키
    window.openEditModal = function (sectionId, subKey) {
        const data = dataManager.getSectionData(sectionId);
        let formHtml = '';
        let title = `${SECTION_TITLES[sectionId]} - 데이터 수정`;

        // 연도별+월별 데이터 패턴 (가장 일반적)
        const yearlyMonthlyPattern = (keyData, label) => {
            return `
                <div class="form-section-title">${label} - 연도별 평균</div>
                <div class="form-grid">
                    ${YEARS.map((y, i) => `
                        <div class="form-group">
                            <label>${y}</label>
                            <input type="number" step="any" name="yearly_${i}" value="${keyData?.yearly?.[i] ?? ''}" placeholder="-">
                        </div>
                    `).join('')}
                </div>
                <div class="form-section-title">${label} - 월별 데이터</div>
                <div class="form-grid">
                    ${MONTHS.map((m, i) => `
                        <div class="form-group">
                            <label>${m}</label>
                            <input type="number" step="any" name="monthly_${i}" value="${keyData?.monthly?.[i] ?? ''}" placeholder="-">
                        </div>
                    `).join('')}
                </div>
                <div class="form-section-title">목표값</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>목표</label>
                        <input type="number" step="any" name="target" value="${keyData?.target ?? ''}" placeholder="목표값">
                    </div>
                </div>
                ${keyData?.analysis !== undefined ? `
                    <div class="form-section-title">분석 코멘트</div>
                    <div class="form-group">
                        <textarea name="analysis" rows="3" style="width:100%">${keyData?.analysis || ''}</textarea>
                    </div>
                ` : ''}
            `;
        };

        // 섹션별 분기
        if (sectionId === 'costReduction') {
            if (subKey === 'summary') {
                formHtml = `
                    <div class="form-grid">
                        <div class="form-group"><label>목표 (억원)</label><input type="number" step="any" name="target" value="${data.target}"></div>
                        <div class="form-group"><label>실적 24년대비</label><input type="number" step="any" name="actual24" value="${data.actual24}"></div>
                        <div class="form-group"><label>4분기 대비</label><input type="number" step="any" name="q4Compare" value="${data.q4Compare}"></div>
                        <div class="form-group"><label>변동율 (%)</label><input type="number" step="any" name="changeRate" value="${data.changeRate}"></div>
                    </div>
                `;
            } else if (subKey === 'production') {
                formHtml = `
                    <div class="form-grid">
                        <div class="form-group"><label>24년 평균</label><input type="number" name="avg24" value="${data.production?.avg24 || ''}"></div>
                        <div class="form-group"><label>계획</label><input type="number" name="plan" value="${data.production?.plan || ''}"></div>
                        <div class="form-group"><label>실적</label><input type="number" name="actual" value="${data.production?.actual || ''}"></div>
                    </div>
                `;
            } else if (subKey === 'analysis') {
                formHtml = `
                    <div class="form-group" style="margin-bottom:16px">
                        <label>분석 코멘트</label>
                        <textarea name="comment" rows="2" style="width:100%">${data.analysis?.comment || ''}</textarea>
                    </div>
                    ${LINES.map(l => `
                        <div class="form-section-title">${l}</div>
                        <div class="form-grid" style="grid-template-columns:1fr 1fr">
                            <div class="form-group"><label>감소</label><input type="text" name="decrease_${l}" value="${data.analysis?.lines?.[l]?.decrease || ''}"></div>
                            <div class="form-group"><label>증가</label><input type="text" name="increase_${l}" value="${data.analysis?.lines?.[l]?.increase || ''}"></div>
                        </div>
                    `).join('')}
                `;
                const currentMonthLabel = `${dataManager.currentMonth}월`;
                const prevYearMonthLabel = `'${(dataManager.currentYear - 1).toString().slice(-2)} ${dataManager.currentMonth}월`;

                formHtml = `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">라인별 원단위(원/톤)과 개선금액(억원) 데이터를 입력해주세요.</p>`;
                LINES.forEach(l => {
                    const uc = data.lineData?.unitCost?.[l] || {};
                    const imp = data.lineData?.improvement?.[l] || {};
                    formHtml += `
                        <div class="form-section-title">${l} - 원단위</div>
                        <div class="form-grid">
                            <div class="form-group"><label>24년</label><input type="number" name="uc_${l}_y24" value="${uc.y24 ?? ''}"></div>
                            <div class="form-group"><label>25년</label><input type="number" name="uc_${l}_y25" value="${uc.y25 ?? ''}"></div>
                            <div class="form-group"><label>${prevYearMonthLabel}</label><input type="number" name="uc_${l}_m_prev" value="${uc.m_prev ?? uc.m1_prev ?? ''}"></div>
                            <div class="form-group"><label>${dataManager.currentYear % 100}년 목표</label><input type="number" name="uc_${l}_m_goal" value="${uc.m_goal ?? uc.m1_goal ?? ''}"></div>
                            <div class="form-group"><label>${currentMonthLabel} 실적</label><input type="number" name="uc_${l}_m_actual" value="${uc.m_actual ?? uc.m1 ?? ''}"></div>
                        </div>
                        <div class="form-section-title">${l} - 개선금액</div>
                        <div class="form-grid">
                             <div class="form-group"><label>${currentMonthLabel}</label><input type="number" step="any" name="imp_${l}_m_actual" value="${imp.m_actual ?? imp.m1 ?? ''}"></div>
                        </div>
                    `;
                });
            }
        } else if (sectionId === 'linePerformance') {
            if (subKey === 'costReduction') {
                formHtml = LINES.map(l => {
                    const v = data.costReduction?.[l] || {};
                    return `
                        <div class="form-section-title">${l}</div>
                        <div class="form-grid">
                            <div class="form-group"><label>목표</label><input type="number" step="any" name="cr_${l}_target" value="${v.target ?? ''}"></div>
                            <div class="form-group"><label>24년 대비</label><input type="number" step="any" name="cr_${l}_y24" value="${v.y24 ?? ''}"></div>
                            <div class="form-group"><label>4분기 대비</label><input type="number" step="any" name="cr_${l}_q4" value="${v.q4 ?? ''}"></div>
                        </div>
                    `;
                }).join('');
            } else if (subKey === 'production') {
                formHtml = LINES.map(l => {
                    const v = data.production?.[l] || {};
                    return `
                        <div class="form-section-title">${l}</div>
                        <div class="form-grid">
                            <div class="form-group"><label>24월평균</label><input type="number" name="pr_${l}_avg24" value="${v.avg24 ?? ''}"></div>
                            <div class="form-group"><label>계획량</label><input type="number" name="pr_${l}_plan" value="${v.plan ?? ''}"></div>
                            <div class="form-group"><label>생산량</label><input type="number" name="pr_${l}_actual" value="${v.actual ?? ''}"></div>
                        </div>
                    `;
                }).join('');
            }
        } else if (sectionId === 'keyTasks') {
            if (subKey === 'teamSummary') {
                formHtml = TEAMS.map(team => {
                    const v = data.teamSummary?.[team] || {};
                    return `
                        <div class="form-section-title">${team}</div>
                        <div class="form-grid">
                            <div class="form-group"><label>목표</label><input type="number" step="any" name="kt_${team}_target" value="${v.target ?? ''}"></div>
                            <div class="form-group"><label>당월</label><input type="number" step="any" name="kt_${team}_monthly" value="${v.monthly ?? ''}"></div>
                            <div class="form-group"><label>누적</label><input type="number" step="any" name="kt_${team}_cumulative" value="${v.cumulative ?? ''}"></div>
                            <div class="form-group"><label>진도율(%)</label><input type="number" name="kt_${team}_rate" value="${v.rate ?? ''}"></div>
                        </div>
                    `;
                }).join('');
            } else {
                formHtml = '<p>과제 상세 편집은 추후 지원 예정입니다.</p>';
            }
        } else if (sectionId === 'productionColdReports' || sectionId === 'productionColorReports') {
            var report = data[subKey] || { highlights: '', issues: '', plans: '', mfgCost: { fixed: { monthly: [] }, variable: { monthly: [] }, prodTarget: { monthly: [] }, prodActual: { monthly: [] }, unitCostTarget: 0 }, metrics: { electricity: { monthly: [] }, fuel: { monthly: [] }, repair: { monthly: [] }, consumables: { monthly: [] }, yield: { monthly: [] }, defects: {} } };
            var m = report.mfgCost || { fixed: { monthly: [] }, variable: { monthly: [] }, prodTarget: { monthly: [] }, prodActual: { monthly: [] }, unitCostTarget: 0 };
            var mt = report.metrics || { electricity: { monthly: [] }, fuel: { monthly: [] }, repair: { monthly: [] }, consumables: { monthly: [] }, yield: { monthly: [] }, defects: {} };
            var curMonthIdx = dataManager.data.meta.month - 1;

            var defectFields = '';
            var defects = mt.defects || {};
            if (sectionId === 'productionColdReports') {
                defectFields = ' \
                    <div class="form-group"><label>Pinhole (건)</label><input type="number" name="mt_defect_pinhole" value="' + (defects.pinhole ? defects.pinhole.monthly[curMonthIdx] : '') + '"></div> \
                    <div class="form-group"><label>Edge (건)</label><input type="number" name="mt_defect_edge" value="' + (defects.edge ? defects.edge.monthly[curMonthIdx] : '') + '"></div> \
                    <div class="form-group"><label>Scratch (건)</label><input type="number" name="mt_defect_scratch" value="' + (defects.scratch ? defects.scratch.monthly[curMonthIdx] : '') + '"></div>';
            } else {
                defectFields = ' \
                    <div class="form-group"><label>Overcoat (건)</label><input type="number" name="mt_defect_overcoat" value="' + (defects.overcoat ? defects.overcoat.monthly[curMonthIdx] : '') + '"></div> \
                    <div class="form-group"><label>Scratch (건)</label><input type="number" name="mt_defect_scratch" value="' + (defects.scratch ? defects.scratch.monthly[curMonthIdx] : '') + '"></div> \
                    <div class="form-group"><label>Blister (건)</label><input type="number" name="mt_defect_blister" value="' + (defects.blister ? defects.blister.monthly[curMonthIdx] : '') + '"></div>';
            }

            formHtml = ' \
                <div class="form-group" style="margin-bottom:16px"> \
                    <label>당월 주요 실적</label> \
                    <textarea name="highlights" rows="3" style="width:100%">' + (report.highlights || '') + '</textarea> \
                </div> \
                \
                <div class="form-section-title">1. 제조원가 분석 (' + dataManager.data.meta.month + '월)</div> \
                <div class="form-grid"> \
                    <div class="form-group"><label>생산 실적 (톤)</label><input type="number" name="mc_prodActual" value="' + (m.prodActual.monthly[curMonthIdx] || '') + '"></div> \
                    <div class="form-group"><label>제조경비 목표 (원/TON)</label><input type="number" name="mc_unitCostTarget" value="' + (m.unitCostTarget || '') + '"></div> \
                    <div class="form-group"><label>고정비 (원/TON)</label><input type="number" name="mc_fixed" value="' + (m.fixed.monthly[curMonthIdx] || '') + '"></div> \
                    <div class="form-group"><label>변동비 (원/TON)</label><input type="number" name="mc_variable" value="' + (m.variable.monthly[curMonthIdx] || '') + '"></div> \
                </div> \
                \
                <div class="form-section-title">2. 생산성 및 효율 실적 (' + dataManager.data.meta.month + '월)</div> \
                <div class="form-grid"> \
                    <div class="form-group"><label>수율 (%)</label><input type="number" step="any" name="mt_yield" value="' + (mt.yield.monthly[curMonthIdx] || '') + '"></div> \
                    <div class="form-group"><label>가동률 (%)</label><input type="number" step="any" name="mt_operRate" value="' + (mt.operRate ? mt.operRate.monthly[curMonthIdx] : '') + '"></div> \
                    <div class="form-group"><label>정기수선 (H)</label><input type="number" step="any" name="mt_regReplace" value="' + (mt.regReplace ? mt.regReplace.monthly[curMonthIdx] : '') + '"></div> \
                    <div class="form-group"><label>고장/비관련 (H)</label><input type="number" step="any" name="mt_irregFail" value="' + (mt.irregFail ? mt.irregFail.monthly[curMonthIdx] : '') + '"></div> \
                    <div class="form-group"><label>톤파워 (T/HR)</label><input type="number" step="any" name="mt_tonPower" value="' + (mt.tonPower ? mt.tonPower.monthly[curMonthIdx] : '') + '"></div> \
                </div> \
                \
                <div class="form-section-title">3. 유틸리티 원단위 실적 (' + dataManager.data.meta.month + '월)</div> \
                <div class="form-grid"> \
                    <div class="form-group"><label>전력 (kWh/T)</label><input type="number" step="any" name="mt_electricity" value="' + (mt.electricity.monthly[curMonthIdx] || '') + '"></div> \
                    <div class="form-group"><label>연료 (Nm3/T)</label><input type="number" step="any" name="mt_fuel" value="' + (mt.fuel.monthly[curMonthIdx] || '') + '"></div> \
                </div> \
                \
                <div class="form-section-title">4. 품질 결함 실적 (건)</div> \
                <div class="form-grid"> \
                    ' + defectFields + ' \
                </div> \
                \
                <div class="form-group" style="margin-top:16px"> \
                    <label>추가 자료 (PDF)</label> \
                    <div style="display:flex; align-items:center; gap:10px; margin-top:8px"> \
                        <input type="hidden" name="pdfUrl" value="' + (report.pdfUrl || '') + '"> \
                        <label class="btn-pdf-upload" style="cursor:pointer; padding:8px 16px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; display:inline-flex; align-items:center; gap:6px"> \
                            <i class="fas fa-upload"></i> PDF 업로드 \
                            <input type="file" accept=".pdf" style="display:none" onchange="handleTeamPdfUpload(this, \'' + sectionId + '\', \'' + subKey + '\')"> \
                        </label> \
                        <span id="pdf-status" style="font-size:12px; color:var(--text-secondary)">' + (report.pdfUrl ? '첨부됨' : '파일 없음') + '</span> \
                    </div> \
                </div>';
        } else {
            // 공통 패턴: 연도별+월별 데이터
            const keyData = data[subKey] || data;
            if (keyData.yearly || keyData.monthly) {
                formHtml = yearlyMonthlyPattern(keyData, subKey);
            } else {
                formHtml = `<p>이 섹션의 편집 양식은 준비 중입니다.</p>`;
            }
        }

        openModal(title, formHtml, () => {
            saveModalData(sectionId, subKey);
        });
    };

    // 대량 편집 모달
    window.openBulkEditModal = function (sectionId) {
        const data = dataManager.getSectionData(sectionId);
        let formHtml = '';
        if (sectionId === 'maintenanceTeam') {
            const categories = [
                { id: 'energyReduction', label: '1. 에너지 저감 실적' },
                { id: 'downtime', label: '2. 설비 비가동 현황' },
                { id: 'repairCost', label: '3. 수선비 집행실적' },
                { id: 'utility', label: '4. 유틸리티 사용 실적' }
            ];

            categories.forEach(cat => {
                const catData = data[cat.id];
                if (!catData) return;

                formHtml += `<div class="form-section-head" style="background:#f1f5f9; padding:10px 15px; font-weight:700; margin-top:30px; border-radius:6px; border-left:4px solid var(--seah-red);">${cat.label}</div>`;

                Object.keys(catData).forEach(sub => {
                    const kd = catData[sub];
                    if (!kd) return;

                    // 일반 지표 (target + monthly)
                    if (kd.monthly && !kd.CPL) {
                        formHtml += `
                            <div class="form-section-title" style="margin-top:15px; font-size:14px; color:var(--seah-red);">${sub === 'total' ? '종합' : sub}</div>
                            <div class="form-grid">
                                <div class="form-group"><label>목표</label><input type="number" step="any" name="mt_${cat.id}_${sub}_target" value="${kd.target ?? ''}"></div>
                                ${MONTHS.map((m, i) => `
                                    <div class="form-group"><label>${m}</label><input type="number" step="any" name="mt_${cat.id}_${sub}_m${i}" value="${kd.monthly?.[i] ?? ''}"></div>
                                `).join('')}
                            </div>
                        `;
                    }
                    // 라인별 지표 (byLine: { CPL: { monthly }, ... })
                    else if (sub === 'byLine') {
                        formHtml += `<div class="form-section-title" style="margin-top:15px; font-size:14px; color:var(--seah-red);">라인별 상세 (당월:${dataManager.data.meta.month}월)</div>`;
                        formHtml += `<div class="form-grid">`;
                        const curIdx = dataManager.data.meta.month - 1;
                        Object.keys(kd).forEach(line => {
                            if (line === 'yearly' || line === 'monthly' || line === 'target') return;
                            formHtml += `<div class="form-group"><label>${line}</label><input type="number" step="any" name="mt_${cat.id}_byLine_${line}_m${curIdx}" value="${kd[line]?.monthly?.[curIdx] ?? ''}"></div>`;
                        });
                        formHtml += `</div>`;
                    }
                });

                if (catData.analysis !== undefined) {
                    formHtml += `<div class="form-group" style="margin-top:15px;"><label>분석 코멘트</label><textarea name="mt_${cat.id}_analysis" rows="2" style="width:100%">${catData.analysis || ''}</textarea></div>`;
                }
            });
        } else {
            keys.forEach(key => {
                const kd = data[key];
                if (kd && (kd.yearly || kd.monthly)) {
                    const displayName = key === 'composite' ? '종합' : key;
                    formHtml += `
                        <div class="form-section-title">${displayName} (목표: ${kd.target || '-'})</div>
                        <div class="form-grid">
                            <div class="form-group"><label>목표</label><input type="number" step="any" name="bulk_${key}_target" value="${kd.target ?? ''}"></div>
                            ${YEARS.map((y, i) => `
                                <div class="form-group"><label>${y}</label><input type="number" step="any" name="bulk_${key}_y${i}" value="${kd.yearly?.[i] ?? ''}"></div>
                            `).join('')}
                            ${MONTHS.map((m, i) => `
                                <div class="form-group"><label>${m}</label><input type="number" step="any" name="bulk_${key}_m${i}" value="${kd.monthly?.[i] ?? ''}"></div>
                            `).join('')}
                        </div>
                    `;
                }
            });
        }

        openModal(`${SECTION_TITLES[sectionId]} - 전체 데이터 수정`, formHtml, () => {
            saveBulkModalData(sectionId);
        });
    };

    async function saveModalData(sectionId, subKey) {
        const form = modalBody;
        const inputs = form.querySelectorAll('input, textarea, select');
        const values = {};
        inputs.forEach(inp => {
            const name = inp.name;
            if (!name) return;
            let val = inp.value.trim();
            if (inp.type === 'number') {
                val = val === '' ? null : parseFloat(val);
                if (isNaN(val)) val = null;
            }
            values[name] = val;
        });

        const data = dataManager.getSectionData(sectionId);

        // 섹션별 데이터 매핑
        if (sectionId === 'costReduction') {
            if (subKey === 'summary') {
                data.target = values.target;
                data.actual24 = values.actual24;
                data.q4Compare = values.q4Compare;
                data.changeRate = values.changeRate;
            } else if (subKey === 'production') {
                data.production = { avg24: values.avg24, plan: values.plan, actual: values.actual };
            } else if (subKey === 'analysis') {
                data.analysis = data.analysis || { lines: {} };
                data.analysis.comment = values.comment;
                LINES.forEach(l => {
                    if (!data.analysis.lines[l]) data.analysis.lines[l] = {};
                    data.analysis.lines[l].decrease = values[`decrease_${l}`] || '';
                    data.analysis.lines[l].increase = values[`increase_${l}`] || '';
                });
            } else if (subKey === 'lineData') {
                if (!data.lineData) data.lineData = { unitCost: {}, improvement: {} };
                LINES.forEach(l => {
                    if (!data.lineData.unitCost[l]) data.lineData.unitCost[l] = {};
                    if (!data.lineData.improvement[l]) data.lineData.improvement[l] = {};
                    ['y24', 'y25', 'm_prev', 'm_goal', 'm_actual'].forEach(k => {
                        const v = values[`uc_${l}_${k}`];
                        if (v !== undefined) data.lineData.unitCost[l][k] = v;
                    });
                    ['m_actual'].forEach(k => {
                        const v = values[`imp_${l}_${k}`];
                        if (v !== undefined) data.lineData.improvement[l][k] = v;
                    });
                });
            }
        } else if (sectionId === 'linePerformance') {
            if (subKey === 'costReduction') {
                LINES.forEach(l => {
                    if (!data.costReduction[l]) data.costReduction[l] = {};
                    data.costReduction[l].target = values[`cr_${l}_target`];
                    data.costReduction[l].y24 = values[`cr_${l}_y24`];
                    data.costReduction[l].q4 = values[`cr_${l}_q4`];
                });
            } else if (subKey === 'production') {
                LINES.forEach(l => {
                    if (!data.production[l]) data.production[l] = {};
                    data.production[l].avg24 = values[`pr_${l}_avg24`];
                    data.production[l].plan = values[`pr_${l}_plan`];
                    data.production[l].actual = values[`pr_${l}_actual`];
                });
            }
        } else if (sectionId === 'keyTasks' && subKey === 'teamSummary') {
            TEAMS.forEach(function (team) {
                if (!data.teamSummary[team]) data.teamSummary[team] = {};
                data.teamSummary[team].target = values['kt_' + team + '_target'];
                data.teamSummary[team].monthly = values['kt_' + team + '_monthly'];
                data.teamSummary[team].cumulative = values['kt_' + team + '_cumulative'];
                data.teamSummary[team].rate = values['kt_' + team + '_rate'];
            });
        } else if (sectionId === 'productionColdReports' || sectionId === 'productionColorReports') {
            if (!data[subKey]) data[subKey] = { highlights: '', issues: '', plans: '', pdfUrl: '', mfgCost: { fixed: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, variable: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodTarget: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodActual: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, unitCostTarget: 0 }, metrics: { electricity: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, fuel: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, repair: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, consumables: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, yield: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, defects: {} } };
            var report = data[subKey];
            var curMonthIdx = dataManager.data.meta.month - 1;

            report.highlights = values.highlights;
            report.pdfUrl = values.pdfUrl;

            // 1. Mfg Cost
            if (!report.mfgCost) report.mfgCost = { fixed: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, variable: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodTarget: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodActual: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, unitCostTarget: 0 };
            var m = report.mfgCost;
            if (values.mc_prodActual !== undefined) m.prodActual.monthly[curMonthIdx] = values.mc_prodActual;
            if (values.mc_fixed !== undefined) m.fixed.monthly[curMonthIdx] = values.mc_fixed;
            if (values.mc_variable !== undefined) m.variable.monthly[curMonthIdx] = values.mc_variable;
            if (values.mc_unitCostTarget !== undefined) m.unitCostTarget = values.mc_unitCostTarget;

            // 2. Metrics (Utility, Yield, OperRate, etc.)
            if (!report.metrics) report.metrics = { electricity: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, fuel: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, repair: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, consumables: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, yield: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, operRate: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, regReplace: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, irregFail: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, tonPower: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, defects: {} };
            var mt = report.metrics;
            if (values.mt_electricity !== undefined) mt.electricity.monthly[curMonthIdx] = values.mt_electricity;
            if (values.mt_fuel !== undefined) mt.fuel.monthly[curMonthIdx] = values.mt_fuel;
            if (values.mt_yield !== undefined) mt.yield.monthly[curMonthIdx] = values.mt_yield;
            if (values.mt_operRate !== undefined) {
                if (!mt.operRate) mt.operRate = { yearly: [null, null, null], monthly: new Array(12).fill(null) };
                mt.operRate.monthly[curMonthIdx] = values.mt_operRate;
            }
            if (values.mt_regReplace !== undefined) {
                if (!mt.regReplace) mt.regReplace = { yearly: [null, null, null], monthly: new Array(12).fill(null) };
                mt.regReplace.monthly[curMonthIdx] = values.mt_regReplace;
            }
            if (values.mt_irregFail !== undefined) {
                if (!mt.irregFail) mt.irregFail = { yearly: [null, null, null], monthly: new Array(12).fill(null) };
                mt.irregFail.monthly[curMonthIdx] = values.mt_irregFail;
            }
            if (values.mt_tonPower !== undefined) {
                if (!mt.tonPower) mt.tonPower = { yearly: [null, null, null], monthly: new Array(12).fill(null) };
                mt.tonPower.monthly[curMonthIdx] = values.mt_tonPower;
            }

            // 3. Defects
            if (!mt.defects) mt.defects = {};
            var defectKeys = sectionId === 'productionColdReports' ? ['pinhole', 'edge', 'scratch'] : ['overcoat', 'scratch', 'blister'];
            defectKeys.forEach(function (dk) {
                if (!mt.defects[dk]) mt.defects[dk] = { yearly: [null, null, null], monthly: new Array(12).fill(null) };
                var val = values['mt_defect_' + dk];
                if (val !== undefined) mt.defects[dk].monthly[curMonthIdx] = val;
            });
        } else {
            // 공통 패턴: 연도별+월별 데이터
            if (!data[subKey]) data[subKey] = {};
            var keyData = data[subKey];
            if (values.target !== undefined) keyData.target = values.target;
            if (values.analysis !== undefined) keyData.analysis = values.analysis;
            var yearly = [];
            var monthly = [];
            for (var i = 0; i < 4; i++) {
                yearly.push(values['yearly_' + i] !== undefined ? values['yearly_' + i] : null);
            }
            for (var j = 0; j < 12; j++) {
                monthly.push(values['monthly_' + j] !== undefined ? values['monthly_' + j] : null);
            }
            if (yearly.some(function (v) { return v !== null; })) keyData.yearly = yearly;
            if (monthly.some(function (v) { return v !== null; })) keyData.monthly = monthly;
        }

        await dataManager.updateSectionData(sectionId, data);
        closeModal();
        navigateTo(currentSection);
        showToast('데이터가 파이어베이스에 저장되었습니다.');
    }

    async function saveBulkModalData(sectionId) {
        const form = modalBody;
        const inputs = form.querySelectorAll('input');
        const values = {};
        inputs.forEach(inp => {
            const name = inp.name;
            if (!name) return;
            values[name] = inp.value.trim() === '' ? null : parseFloat(inp.value);
        });

        if (sectionId === 'maintenanceTeam') {
            Object.keys(data).forEach(catKey => {
                const cat = data[catKey];
                Object.keys(cat).forEach(subKey => {
                    const kd = cat[subKey];
                    if (!kd) return;

                    // 일반 지표
                    if (kd.monthly && !kd.CPL) {
                        const targetVal = values[`mt_${catKey}_${subKey}_target`];
                        if (targetVal !== undefined) kd.target = targetVal;
                        for (let i = 0; i < 12; i++) {
                            const v = values[`mt_${catKey}_${subKey}_m${i}`];
                            if (v !== undefined) kd.monthly[i] = v;
                        }
                    }
                    // 라인별 지표
                    else if (subKey === 'byLine') {
                        const curIdx = dataManager.data.meta.month - 1;
                        Object.keys(kd).forEach(line => {
                            const v = values[`mt_${catKey}_byLine_${line}_m${curIdx}`];
                            if (v !== undefined) {
                                if (!kd[line]) kd[line] = { monthly: new Array(12).fill(null) };
                                kd[line].monthly[curIdx] = v;
                            }
                        });
                    }
                });
                if (values[`mt_${catKey}_analysis`] !== undefined) {
                    cat.analysis = values[`mt_${catKey}_analysis`];
                }
            });
        } else {
            Object.keys(data).forEach(key => {
                const kd = data[key];
                if (!kd || (!kd.yearly && !kd.monthly)) return;

                const targetVal = values[`bulk_${key}_target`];
                if (targetVal !== undefined) kd.target = targetVal;

                for (let i = 0; i < 4; i++) {
                    const v = values[`bulk_${key}_y${i}`];
                    if (v !== undefined && kd.yearly) kd.yearly[i] = v;
                }
                for (let i = 0; i < 12; i++) {
                    const v = values[`bulk_${key}_m${i}`];
                    if (v !== undefined && kd.monthly) kd.monthly[i] = v;
                }
            });
        }

        await dataManager.updateSectionData(sectionId, data);
        closeModal();
        navigateTo(currentSection);
        showToast('전체 데이터가 파이어베이스에 저장되었습니다.');
    }

    // ==========================================
    // Toast
    // ==========================================
    function showToast(message) {
        const toastMsg = document.getElementById('toastMessage');
        toastMsg.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ==========================================
    // Event Listeners
    // ==========================================
    async function init() {
        // 데이터 매니저 초기화 (Firebase 연동 대기)
        await dataManager.init();

        // 초기 보고 월 선택 드롭다운 설정 (데이터 로드 후 수행)
        const meta = dataManager.data.meta;
        selectYear.value = meta.year;
        selectMonth.value = meta.month;
        reportMonth.textContent = `${meta.year}년 ${meta.month}월`;

        // Menu navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) navigateTo(section);
            });
        });

        // Mobile menu toggle
        menuToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar on overlay click (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024 && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });

        // Month selector
        const updateMonth = async () => {
            const year = parseInt(selectYear.value);
            const month = parseInt(selectMonth.value);

            // 로딩 표시
            reportMonth.textContent = `로딩 중...`;
            contentArea.innerHTML = `
                <div class="card" style="margin-top:40px">
                    <div class="card-body" style="text-align:center;padding:60px">
                        <i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--seah-red);margin-bottom:16px;display:block"></i>
                        <p style="font-size:15px;color:var(--text-secondary)">${year}년 ${month}월 데이터를 불러오는 중...</p>
                    </div>
                </div>`;

            // 데이터 로드 (loadMonth에서 docExists 플래그도 설정됨)
            await dataManager.updateReportMonth(year, month);
            reportMonth.textContent = `${year}년 ${month}월`;

            // 해당 월에 데이터가 없으면 안내 표시
            if (!dataManager.docExists) {
                contentArea.innerHTML = `
                    <div class="card" style="margin-top:20px">
                        <div class="card-body" style="text-align:center;padding:40px">
                            <i class="fas fa-folder-open" style="font-size:48px;color:var(--text-light);margin-bottom:16px;display:block"></i>
                            <h3 style="margin-bottom:8px">${year}년 ${month}월 보고서</h3>
                            <p style="color:var(--text-secondary);margin-bottom:24px">아직 입력된 데이터가 없습니다. 아래 옵션을 선택해 주세요.</p>
                            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
                                <button class="btn-save-all" onclick="startNewMonth()" style="padding:12px 24px">
                                    <i class="fas fa-plus"></i> 새로 작성하기
                                </button>
                                <button class="btn-edit" onclick="copyPreviousMonth()" style="padding:12px 24px;font-size:14px">
                                    <i class="fas fa-copy"></i> 이전 월 데이터 복사
                                </button>
                            </div>
                        </div>
                    </div>`;

                window.startNewMonth = async () => {
                    await dataManager.save();
                    navigateTo(currentSection);
                    showToast(`${year}년 ${month}월 새 보고서가 파이어베이스에 생성되었습니다.`);
                };
                window.copyPreviousMonth = async () => {
                    contentArea.innerHTML = `
                        <div class="card" style="margin-top:40px">
                            <div class="card-body" style="text-align:center;padding:60px">
                                <i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--seah-red);margin-bottom:16px;display:block"></i>
                                <p>이전 월 데이터를 복사 중...</p>
                            </div>
                        </div>`;
                    const success = await dataManager.copyFromPreviousMonth(year, month);
                    if (success) {
                        showToast('이전 월 데이터가 복사되었습니다. 수정 후 저장해 주세요.');
                    } else {
                        showToast('이전 월 데이터가 없습니다. 새로 작성합니다.');
                    }
                    navigateTo(currentSection);
                };
                return;
            }

            navigateTo(currentSection);
            showToast(`${year}년 ${month}월 보고서를 불러왔습니다.`);
        };
        selectYear.addEventListener('change', updateMonth);
        selectMonth.addEventListener('change', updateMonth);

        // Modal close
        modalClose.addEventListener('click', closeModal);
        modalCancel.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
        modalConfirm.addEventListener('click', async () => {
            if (currentModalData) {
                try {
                    modalConfirm.disabled = true;
                    modalConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
                    await currentModalData();
                } catch (e) {
                    console.error('저장 에러:', e);
                    alert(`저장 중 오류가 발생했습니다: ${e.message}`);
                } finally {
                    modalConfirm.disabled = false;
                    modalConfirm.textContent = '저장';
                }
            }
        });

        // Save all
        btnSaveAll.addEventListener('click', async () => {
            try {
                btnSaveAll.disabled = true;
                const originalHtml = btnSaveAll.innerHTML;
                btnSaveAll.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

                await dataManager.save();
                const y = dataManager.currentYear;
                const m = dataManager.currentMonth;
                showToast(`${y}년 ${m}월 데이터가 저장되었습니다.`);
            } catch (e) {
                console.error('전체 저장 에러:', e);
                alert(`파이어베이스 저장에 실패했습니다:\n${e.message}\n\n시스템 관리자에게 문의하거나 보안 규칙 설정을 확인해 주세요.`);
            } finally {
                btnSaveAll.disabled = false;
                btnSaveAll.innerHTML = '<i class="fas fa-save"></i> 전체 저장';
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalOverlay.classList.contains('show')) {
                closeModal();
            }
        });

        // Load initial section
        navigateTo('dashboard');

        console.log('✅ 세아씨엠 성과개선 보고 시스템이 초기화되었습니다 (Firebase 연동됨).');
    }

    // 주요과제 상세 편집 모달
    window.openKeyTaskEditModal = function (team) {
        const data = dataManager.getSectionData('keyTasks');
        const tasks = data.tasks?.[team] || [];

        let formHtml = `
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
                <strong>${team}</strong>의 주요 과제 목록을 관리합니다. (간트 차트 상태는 화면의 셀을 직접 클릭해서 변경하세요)
            </p>
            <div class="data-table-wrapper">
                <table class="modal-task-table">
                    <thead>
                        <tr>
                            <th style="width:50px">No</th>
                            <th style="width:80px">라인</th>
                            <th>과제명</th>
                            <th style="width:70px">목표</th>
                            <th style="width:70px">당월</th>
                            <th style="width:70px">누적</th>
                            <th style="width:60px">진도%</th>
                            <th style="width:70px">담당</th>
                            <th style="width:40px">삭제</th>
                        </tr>
                    </thead>
                    <tbody id="modalTaskTableBody">
                        ${tasks.map((t, i) => `
                            <tr>
                                <td><input type="number" name="no_${i}" value="${t.no}"></td>
                                <td><input type="text" name="line_${i}" value="${t.line}"></td>
                                <td><input type="text" name="name_${i}" value="${t.name}"></td>
                                <td><input type="number" step="any" name="target_${i}" value="${t.target}"></td>
                                <td><input type="number" step="any" name="monthly_${i}" value="${t.monthly}"></td>
                                <td><input type="number" step="any" name="cumulative_${i}" value="${t.cumulative}"></td>
                                <td><input type="number" name="rate_${i}" value="${t.rate}"></td>
                                <td><input type="text" name="person_${i}" value="${t.person}"></td>
                                <td><button class="btn-remove-task" onclick="removeTaskRow(this)">&times;</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <button class="btn-add-task" onclick="addTaskRow()">
                <i class="fas fa-plus"></i> 새 과제 추가
            </button>
        `;

        // 행 삭제 함수 (전역 노출 필요없음, 모달 내에서만 사용)
        window.removeTaskRow = (btn) => {
            btn.closest('tr').remove();
        };

        // 행 추가 함수
        window.addTaskRow = () => {
            const tbody = document.getElementById('modalTaskTableBody');
            const idx = tbody.children.length;
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="number" name="no_${idx}" value="${idx + 1}"></td>
                <td><input type="text" name="line_${idx}" value=""></td>
                <td><input type="text" name="name_${idx}" value=""></td>
                <td><input type="number" step="any" name="target_${idx}" value=""></td>
                <td><input type="number" step="any" name="monthly_${idx}" value=""></td>
                <td><input type="number" step="any" name="cumulative_${idx}" value=""></td>
                <td><input type="number" name="rate_${idx}" value=""></td>
                <td><input type="text" name="person_${idx}" value=""></td>
                <td><button class="btn-remove-task" onclick="removeTaskRow(this)">&times;</button></td>
            `;
            tbody.appendChild(newRow);
        };

        // PDF 업로드 핸들러
        window.handleTaskPdfUpload = async (input, team, idx) => {
            const file = input.files[0];
            if (!file) return;

            const label = input.closest('label');
            const originalHtml = label.innerHTML;
            label.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // 로딩 표시
            label.style.pointerEvents = 'none';

            try {
                const year = selectYear.value;
                const month = selectMonth.value;
                const path = `reports/${year}/${month}/tasks/${team}/${Date.now()}_${file.name}`;
                const url = await dataManager.uploadFile(file, path);

                // UI 업데이트
                const cell = input.closest('.pdf-cell');
                cell.querySelector('input[type="hidden"]').value = url;

                // 보기 버튼 추가 (기존 버튼 있으면 교체)
                let viewBtn = cell.querySelector('.btn-pdf-view');
                if (!viewBtn) {
                    viewBtn = document.createElement('a');
                    viewBtn.className = 'btn-pdf-view';
                    viewBtn.target = '_blank';
                    viewBtn.title = '보기';
                    viewBtn.innerHTML = '<i class="fas fa-file-pdf"></i>';
                    cell.querySelector('.pdf-controls').prepend(viewBtn);
                }
                viewBtn.href = url;

                showToast('PDF 파일이 저장소에 업로드되었습니다.');
            } catch (e) {
                showToast('PDF 업로드에 실패했습니다.');
            } finally {
                label.innerHTML = originalHtml;
                label.style.pointerEvents = '';
            }
        };
        // 팀별 상세 보고 PDF 업로드 핸들러
        window.handleTeamPdfUpload = async function (input, sectionId, line) {
            var file = input.files[0];
            if (!file) return;

            var label = input.closest('label');
            var originalHtml = label.innerHTML;
            label.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            label.style.pointerEvents = 'none';

            try {
                var year = selectYear.value;
                var month = selectMonth.value;
                var path = 'reports/' + year + '/' + month + '/team_reports/' + sectionId + '/' + line + '/' + Date.now() + '_' + file.name;
                var url = await dataManager.uploadFile(file, path);

                // UI 업데이트
                var container = input.closest('.form-group');
                container.querySelector('input[type="hidden"]').value = url;
                document.getElementById('pdf-status').textContent = '첨부됨: ' + file.name;

                showToast('PDF 파일이 저장되었습니다. "저장" 버튼을 눌러야 최종 반영됩니다.');
            } catch (e) {
                console.error('PDF 업로드 에러:', e);
                showToast('PDF 업로드에 실패했습니다.');
            } finally {
                label.innerHTML = originalHtml;
                label.style.pointerEvents = '';
            }
        };
        openModal(`${team} - 주요 과제 편집`, formHtml, () => {
            saveKeyTaskData(team);
        });
    };

    async function saveKeyTaskData(team) {
        const tbody = document.getElementById('modalTaskTableBody');
        const rows = tbody.querySelectorAll('tr');
        const newTasks = [];
        const originalData = dataManager.getSectionData('keyTasks');
        const oldTasks = originalData.tasks?.[team] || [];

        rows.forEach((row, i) => {
            const inputs = row.querySelectorAll('input');
            const task = {};
            inputs.forEach(inp => {
                const namePart = inp.name.split('_')[0];
                let val = inp.value.trim();
                if (inp.type === 'number') {
                    val = val === '' ? 0 : parseFloat(val);
                    if (isNaN(val)) val = 0;
                }
                task[namePart] = val;
            });

            // 기존 스케줄 유지 또는 새로 생성
            const existingTask = oldTasks.find(t => t.name === task.name);
            task.schedule = existingTask ? existingTask.schedule : new Array(12).fill(0);

            newTasks.push(task);
        });

        if (!originalData.tasks) originalData.tasks = {};
        originalData.tasks[team] = newTasks;

        await dataManager.updateSectionData('keyTasks', originalData);
        closeModal();
        navigateTo(currentSection);
        showToast(`${team} 과제 데이터가 파이어베이스에 저장되었습니다.`);
    }

    // 현재 월 데이터 초기화
    window.resetSystem = async function () {
        const y = dataManager.currentYear;
        const m = dataManager.currentMonth;

        if (!confirm(`${y}년 ${m}월 데이터를 기본값으로 초기화하시겠습니까?\n(해당 월의 저장된 데이터가 완전히 삭제됩니다)`)) {
            return;
        }

        try {
            // 버튼 비활성화 (중복 클릭 방지)
            const btn = document.querySelector('.btn-reset');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 초기화 중...';

            console.log(`${y}년 ${m}월 데이터 초기화 시작...`);
            await dataManager.reset();

            showToast(`${y}년 ${m}월 데이터가 초기화되었습니다.`);

            // 삭제 확인 후 1초 뒤 새로고침
            setTimeout(() => {
                location.reload();
            }, 1000);
        } catch (e) {
            console.error('초기화 중 오류 발생:', e);
            alert('초기화 작업 중 오류가 발생했습니다. 다시 시도해 주세요.');
            // 버튼 복구
            const btn = document.querySelector('.btn-reset');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sync-alt"></i> 현재 월 데이터 초기화';
            }
        }
    }

    // ==========================================
    // Start
    // ==========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
