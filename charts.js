/* ==========================================
   Chart Utilities - SeAH C&M Performance Report
   ========================================== */

// Chart.js 기본 설정
Chart.defaults.font.family = "'Noto Sans KR', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.animation.duration = 800;

// 색상 팔레트
const CHART_COLORS = {
    yearBars: ['#9ca3af', '#6b7280', '#3b82f6', '#1d4ed8'],
    monthBars: '#374151',
    monthBars25: '#4b5563',
    target: '#1a2e5a',
    positive: '#10b981',
    negative: '#ef4444',
    plan: '#fbbf24',
    progress: '#3b82f6',
    groupColors: ['#1a1a2e', '#E31937', '#6d9b3a'],
    lineColors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
    barSets: [
        { bg: '#1a1a2e', border: '#1a1a2e' },
        { bg: '#E31937', border: '#E31937' },
        { bg: '#6d9b3a', border: '#6d9b3a' }
    ]
};

// 차트 인스턴스 저장소
const chartInstances = {};

function destroyChart(chartId) {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
    }
}

function destroyAllCharts() {
    Object.keys(chartInstances).forEach(id => {
        chartInstances[id].destroy();
        delete chartInstances[id];
    });
}

/* ------------------------------------------
   1. 연도별 + 월별 막대 차트 (목표선 포함)
   가장 많이 사용되는 패턴
   ------------------------------------------ */
function createYearlyMonthlyBarChart(canvasId, config) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const { yearly = [], monthly = [], target, title, unit = '' } = config;

    const labels = [...YEARS, ...MONTHS];
    const data = [...yearly, ...monthly];

    const backgroundColors = data.map((v, i) => {
        if (v === null || target === undefined) {
            if (i < 4) return ['#d1d5db', '#9ca3af', '#6b7280', '#3b82f6'][i];
            return '#4b5563';
        }

        // 연도별 데이터 중 25년(i=3)과 모든 월별 데이터(i>=4)에 대해 목표 대비 색상 적용
        if (i === 3 || i >= 4) {
            const isBad = (config.higherIsBad && v > target) || (!config.higherIsBad && v < target);
            return isBad ? CHART_COLORS.negative : CHART_COLORS.positive;
        }

        // 22~24년 데이터는 기존 색상 유지
        return ['#d1d5db', '#9ca3af', '#6b7280'][i];
    });

    const annotations = {};
    if (target !== undefined) {
        annotations.targetLine = {
            type: 'line',
            yMin: target,
            yMax: target,
            borderColor: CHART_COLORS.target,
            borderWidth: 2,
            borderDash: [],
            label: {
                display: true,
                content: `목표 : ${target}${unit}`,
                position: 'end',
                backgroundColor: '#fff',
                color: CHART_COLORS.target,
                font: { size: 11, weight: '900' },
                yAdjust: 0,
                padding: { top: 0, bottom: 0, left: 6, right: 6 }
            }
        };
    }

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderRadius: 3,
                maxBarThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.y !== null ? ctx.parsed.y.toLocaleString() : '-'}${unit}`
                    }
                },
                annotation: { annotations },
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 14, weight: '600' },
                    padding: { bottom: 16 }
                } : undefined
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                },
                y: {
                    beginAtZero: config.beginAtZero === true,
                    min: config.beginAtZero !== true ? (() => {
                        const validValues = data.filter(v => v !== null && v !== undefined);
                        if (!validValues.length) return undefined;
                        const minVal = Math.min(...validValues);
                        const maxVal = Math.max(...validValues, config.target || minVal);
                        const diff = maxVal - minVal;
                        // 차이가 거의 없는 경우(예: 수율 99%대) 더 조밀하게 조정
                        return diff < 1 ? Math.floor(minVal * 10) / 10 - 0.1 : Math.floor(minVal * 0.98);
                    })() : undefined,
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: {
                        font: { size: 10 },
                        callback: (v) => v.toLocaleString() + unit
                    },
                    grace: '15%'
                }
            }
        },
        plugins: [{
            id: 'barValueLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets[0].data.forEach((value, index) => {
                    if (value === null || value === undefined) return;
                    const meta = chart.getDatasetMeta(0);
                    const bar = meta.data[index];
                    if (!bar) return;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 10px "Noto Sans KR"';

                    // 25년 및 월별 데이터 목표 대비 색상 적용
                    if ((index === 3 || index >= 4) && target !== undefined) {
                        const isBad = (config.higherIsBad && value > target) || (!config.higherIsBad && value < target);
                        ctx.fillStyle = isBad ? CHART_COLORS.negative : CHART_COLORS.positive;
                    } else {
                        ctx.fillStyle = '#333';
                    }

                    const y = value >= 0 ? bar.y - 6 : bar.y + 14;
                    ctx.fillText(value.toLocaleString(), bar.x, y);
                    ctx.restore();
                });
            }
        }]
    });

    chartInstances[canvasId] = chart;
    return chart;
}

/* ------------------------------------------
   2. 그룹 막대 차트 (라인별 비교)
   ------------------------------------------ */
function createGroupedBarChart(canvasId, config) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const { labels, datasets, title, unit = '' } = config;

    const coloredDatasets = datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: CHART_COLORS.barSets[i % 3].bg,
        borderRadius: 3,
        maxBarThickness: 25
    }));

    const chart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: coloredDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 11 }, usePointStyle: true, pointStyle: 'rect', padding: 16 }
                },
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 14, weight: '600' },
                    padding: { bottom: 16 }
                } : undefined
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                y: {
                    beginAtZero: config.beginAtZero === true,
                    min: config.beginAtZero !== true ? (() => {
                        const allVals = datasets.flatMap(ds => ds.data).filter(v => v !== null && v !== undefined);
                        if (!allVals.length) return undefined;
                        const minVal = Math.min(...allVals);
                        const maxVal = Math.max(...allVals);
                        const diff = maxVal - minVal;
                        return diff < 1 ? Math.floor(minVal * 10) / 10 - 0.1 : Math.floor(minVal * 0.95);
                    })() : undefined,
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: { font: { size: 10 }, callback: (v) => v.toLocaleString() + unit },
                    grace: '15%'
                }
            }
        },
        plugins: [{
            id: 'groupValueLabels',
            afterDatasetsDraw(chart) {
                chart.data.datasets.forEach((dataset, dsi) => {
                    const meta = chart.getDatasetMeta(dsi);
                    meta.data.forEach((bar, i) => {
                        const value = dataset.data[i];
                        if (value === null || value === undefined) return;
                        const { ctx } = chart;
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.font = 'bold 9px "Noto Sans KR"';

                        // 값이 0보다 크면 초록, 작으면 빨강 (개선금액 기준)
                        if (value > 0) ctx.fillStyle = CHART_COLORS.positive;
                        else if (value < 0) ctx.fillStyle = CHART_COLORS.negative;
                        else ctx.fillStyle = '#333';

                        const y = value >= 0 ? bar.y - 5 : bar.y + 12;
                        ctx.fillText(value.toLocaleString(), bar.x, y);
                        ctx.restore();
                    });
                });
            }
        }]
    });

    chartInstances[canvasId] = chart;
    return chart;
}

/* ------------------------------------------
   3. 단순 막대 차트 (2~3개 항목 비교)
   ------------------------------------------ */
function createSimpleBarChart(canvasId, config) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const { labels, values, colors, title, unit = '', showPercent } = config;

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors || ['#3b82f6', '#6d9b3a', '#f59e0b'],
                borderRadius: 5,
                maxBarThickness: 60
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 14, weight: '600' },
                    padding: { bottom: 16 }
                } : undefined
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 12, weight: '500' } } },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: { callback: (v) => v.toLocaleString() + unit }
                }
            }
        },
        plugins: [{
            id: 'simpleValueLabels',
            afterDatasetsDraw(chart) {
                const { ctx: c } = chart;
                chart.data.datasets[0].data.forEach((value, i) => {
                    if (value === null) return;
                    const bar = chart.getDatasetMeta(0).data[i];
                    c.save();
                    c.textAlign = 'center';
                    c.font = 'bold 14px "Noto Sans KR"';

                    // 첫 번째 막대(목표)는 검정, 나머지는 값에 따라 색상 적용 (보통 1, 2번은 실적/비교임)
                    if (i === 0) {
                        c.fillStyle = '#333';
                    } else {
                        // 제조원가 절감 등에서는 양수가 좋음
                        if (value > 0) c.fillStyle = CHART_COLORS.positive;
                        else if (value < 0) c.fillStyle = CHART_COLORS.negative;
                        else c.fillStyle = '#333';
                    }

                    c.fillText(value.toLocaleString(), bar.x, bar.y - 8);

                    if (showPercent && i === values.length - 1 && values[1]) {
                        const pct = Math.round((value / values[1]) * 100);
                        c.font = 'bold 16px "Noto Sans KR"';
                        c.fillStyle = pct >= 100 ? '#10b981' : '#E31937';
                        c.fillText(pct + '%', bar.x, bar.y - 28);
                    }
                    c.restore();
                });
            }
        }]
    });

    chartInstances[canvasId] = chart;
    return chart;
}

/* ------------------------------------------
   4. 복합 차트 (막대 + 꺾은선)
   ------------------------------------------ */
function createComboChart(canvasId, config) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const { labels, barData, lineData, barLabel, lineLabel, target, title, unit = '', lineUnit = '' } = config;

    const filteredBarData = barData.filter(v => v !== null);
    const barMin = Math.min(...filteredBarData);

    const annotations = {};
    if (target !== undefined) {
        annotations.targetLine = {
            type: 'line',
            yMin: target,
            yMax: target,
            borderColor: CHART_COLORS.target,
            borderWidth: 2,
            yScaleID: 'y',
            label: {
                display: true,
                content: `목표 : ${target}`,
                position: 'end',
                backgroundColor: '#fff',
                color: CHART_COLORS.target,
                font: { size: 11, weight: '900' },
                yAdjust: 0,
                padding: { top: 0, bottom: 0, left: 6, right: 6 }
            }
        };
    }

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: barLabel || '실적',
                    data: barData,
                    backgroundColor: barData.map((v, i) => {
                        if (v === null || target === undefined) {
                            if (i < 4) return ['#d1d5db', '#9ca3af', '#6b7280', '#3b82f6'][i];
                            return '#4b5563';
                        }
                        if (i === 3 || i >= 4) {
                            const isBad = (config.higherIsBad && v > target) || (!config.higherIsBad && v < target);
                            return isBad ? CHART_COLORS.negative : CHART_COLORS.positive;
                        }
                        return ['#d1d5db', '#9ca3af', '#6b7280'][i];
                    }),
                    borderRadius: 3,
                    maxBarThickness: 30,
                    yAxisID: 'y'
                },
                {
                    label: lineLabel || '비교지수',
                    data: lineData,
                    type: 'line',
                    borderColor: '#f97316',
                    backgroundColor: 'transparent',
                    pointBackgroundColor: '#f97316',
                    pointRadius: 3,
                    borderWidth: 2,
                    yAxisID: 'y1',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 11 }, usePointStyle: true, padding: 16 }
                },
                annotation: { annotations },
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 14, weight: '600' },
                    padding: { bottom: 16 }
                } : undefined
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: {
                    position: 'left',
                    beginAtZero: config.beginAtZero === true,
                    min: config.beginAtZero !== true ? (() => {
                        const validBars = barData.filter(v => v !== null && v !== undefined);
                        if (!validBars.length) return undefined;
                        const minVal = Math.min(...validBars);
                        const maxVal = Math.max(...validBars, target || minVal);
                        const diff = maxVal - minVal;
                        return diff < 1 ? Math.floor(minVal * 10) / 10 - 0.1 : Math.floor(minVal * 0.98);
                    })() : undefined,
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: { font: { size: 10 }, callback: (v) => v + unit },
                    grace: '15%'
                },
                y1: {
                    position: 'right',
                    grid: { display: false },
                    ticks: { font: { size: 10 }, callback: (v) => v + lineUnit }
                }
            }
        },
        plugins: [{
            id: 'comboValueLabels',
            afterDatasetsDraw(chart) {
                const { ctx: c } = chart;
                // Bar values
                const barMeta = chart.getDatasetMeta(0);
                chart.data.datasets[0].data.forEach((value, i) => {
                    if (value === null) return;
                    const bar = barMeta.data[i];
                    if (!bar) return;
                    c.save();
                    c.textAlign = 'center';
                    c.font = 'bold 9px "Noto Sans KR"';

                    if ((i === 3 || i >= 4) && target !== undefined) {
                        const isBad = (config.higherIsBad && value > target) || (!config.higherIsBad && value < target);
                        c.fillStyle = isBad ? CHART_COLORS.negative : CHART_COLORS.positive;
                    } else {
                        c.fillStyle = '#333';
                    }

                    c.fillText(value.toLocaleString(), bar.x, bar.y - 5);
                    c.restore();
                });
                // Line values
                const lineMeta = chart.getDatasetMeta(1);
                chart.data.datasets[1].data.forEach((value, i) => {
                    if (value === null) return;
                    const point = lineMeta.data[i];
                    if (!point) return;
                    c.save();
                    c.textAlign = 'center';
                    c.font = 'bold 9px "Noto Sans KR"';
                    c.fillStyle = '#f97316';
                    c.fillText(value.toFixed(2), point.x, point.y - 8);
                    c.restore();
                });
            }
        }]
    });

    chartInstances[canvasId] = chart;
    return chart;
}

/* ------------------------------------------
   5. 재고 추이 차트 (막대 + 꺾은선 - 단일 Y축)
   ------------------------------------------ */
function createInventoryChart(canvasId, config) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const { labels, barData, lineData, barLabel, lineLabel, title } = config;

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: barLabel,
                    data: barData,
                    backgroundColor: barData.map((_, i) => i < 4 ? ['#d1d5db', '#9ca3af', '#6b7280', '#3b82f6'][i] : '#4b5563'),
                    borderRadius: 3,
                    maxBarThickness: 30
                },
                {
                    label: lineLabel,
                    data: lineData,
                    type: 'line',
                    borderColor: '#E31937',
                    backgroundColor: 'transparent',
                    pointBackgroundColor: '#E31937',
                    pointRadius: 3,
                    borderWidth: 2,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 11 }, usePointStyle: true, padding: 16 }
                },
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 14, weight: '600' }
                } : undefined
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: config.beginAtZero === true,
                    min: config.beginAtZero !== true ? (() => {
                        const allVals = [...barData, ...lineData].filter(v => v !== null && v !== undefined);
                        return allVals.length ? Math.min(...allVals) * 0.95 : undefined;
                    })() : undefined,
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    grace: '15%' // Added grace to y scale
                }
            }
        }
    });

    chartInstances[canvasId] = chart;
    return chart;
}

/* ------------------------------------------
   6. 제조원가 전용 차트 (스택형 막대 + 꺾은선)
   ------------------------------------------ */
function createMfgCostChart(canvasId, config) {
    destroyChart(canvasId);
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');

    var labels = config.labels;
    var fixedData = config.fixedData;
    var varData = config.varData;
    var prodData = config.prodData;
    var target = config.target;
    var unit = config.unit || '원/TON';

    var chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '고정비',
                    data: fixedData,
                    backgroundColor: '#3b82f6',
                    stack: 'cost',
                    borderRadius: 2,
                    yAxisID: 'y'
                },
                {
                    label: '변동비',
                    data: varData,
                    backgroundColor: '#ef4444',
                    stack: 'cost',
                    borderRadius: 2,
                    yAxisID: 'y'
                },
                {
                    label: '생산량',
                    data: prodData,
                    type: 'line',
                    borderColor: '#f97316',
                    backgroundColor: 'transparent',
                    pointBackgroundColor: '#f97316',
                    pointRadius: 4,
                    borderWidth: 3,
                    yAxisID: 'y1',
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { boxWidth: 12, font: { size: 11 } }
                },
                annotation: {
                    annotations: {
                        targetLine: {
                            type: 'line',
                            yMin: target,
                            yMax: target,
                            borderColor: '#E31937',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                display: true,
                                content: '26년 제조경비 목표: ' + (target ? target.toLocaleString() : 0) + unit,
                                position: 'end',
                                backgroundColor: 'rgba(255,255,255,0.8)',
                                color: '#E31937',
                                font: { size: 10, weight: 'bold' },
                                padding: 4
                            }
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    position: 'left',
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: '(' + unit + ')', font: { size: 10 } },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { callback: function (v) { return v.toLocaleString(); } }
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    title: { display: true, text: '(톤)', font: { size: 10 } },
                    grid: { display: false },
                    ticks: { callback: function (v) { return v.toLocaleString(); } }
                }
            }
        }
    });

    chartInstances[canvasId] = chart;
    return chart;
}

/* ------------------------------------------
   7. 공통 추이 차트 (커스텀 데이터셋 지원)
   ------------------------------------------ */
function createCommonTrendChart(canvasId, config) {
    destroyChart(canvasId);
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');

    var labels = config.labels;
    var datasets = config.datasets;
    var title = config.title;
    var yTitle = config.yTitle || '';
    var y1Title = config.y1Title || '';

    var chart = new Chart(ctx, {
        type: 'bar', // Default
        data: {
            labels: labels,
            datasets: datasets.map(function (ds) {
                return Object.assign({
                    borderRadius: 2,
                    borderWidth: ds.type === 'line' ? 2 : 0,
                    pointRadius: ds.type === 'line' ? 3 : 0,
                    tension: 0.3
                }, ds);
            })
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { boxWidth: 10, font: { size: 10 } }
                },
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 13, weight: '600' }
                } : undefined
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: {
                    position: 'left',
                    beginAtZero: config.beginAtZero !== false,
                    title: { display: true, text: yTitle, font: { size: 10 } },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { font: { size: 10 } }
                },
                y1: y1Title ? {
                    position: 'right',
                    beginAtZero: true,
                    title: { display: true, text: y1Title, font: { size: 10 } },
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                } : undefined
            }
        }
    });

    chartInstances[canvasId] = chart;
    return chart;
}

/* ------------------------------------------
   유틸리티 함수
   ------------------------------------------ */
function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return typeof num === 'number' ? num.toLocaleString() : num;
}

function getProgressClass(rate) {
    if (rate >= 100) return 'excellent';
    if (rate >= 80) return 'good';
    if (rate >= 50) return 'warning';
    return 'danger';
}

function getValueClass(val) {
    if (val > 0) return 'positive-val';
    if (val < 0) return 'negative-val';
    return '';
}
