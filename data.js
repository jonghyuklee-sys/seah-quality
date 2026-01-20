// 강종별 규격 데이터
const steelData = {
    GI: {
        KS: {
            isPrepainted: false,
            grades: ['SGCC', 'SGCD1', 'SGCD2', 'SGCD3', 'SGC340', 'SGC400', 'SGC440', 'SGC490', 'SGC570'],
            standard: 'KS D 3506',
            properties: {
                SGCC: { ys: '-', ts: '270↑', el: '-', bend: '0t', note: '일반용' },
                SGCD1: { ys: '-', ts: '270↑', el: '30↑', bend: '0t', note: '가공용' },
                SGCD2: { ys: '-', ts: '270↑', el: '34↑', bend: '0t', note: '심가공용' },
                SGCD3: { ys: '-', ts: '270↑', el: '38↑', bend: '0t', note: '초심가공용' },
                SGC340: { ys: '245↑', ts: '340↑', el: '20↑', bend: '1t', note: '구조용 340MPa급' },
                SGC400: { ys: '295↑', ts: '400↑', el: '18↑', bend: '1.5t', note: '구조용 400MPa급' },
                SGC440: { ys: '335↑', ts: '440↑', el: '18↑', bend: '1.5t', note: '구조용 440MPa급' },
                SGC490: { ys: '365↑', ts: '490↑', el: '15↑', bend: '2t', note: '구조용 490MPa급' },
                SGC570: { ys: '560↑', ts: '570↑', el: '7↑', bend: '3t', note: '고강도 구조용' }
            },
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.035↓', S: '0.030↓', Si: '-', Al: '-' },
            coating: { type: 'Zn', range: '60~450 g/m²', method: '용융도금' },
            tolerance: { thickness: '±0.05~0.20mm (KS D 3506 기준)', flatness: '12mm 이하 (두께 1.6mm 미만 기준)' }
        },
        JIS: {
            isPrepainted: false,
            grades: ['SGCC', 'SGCD1', 'SGCD2', 'SGCD3', 'SGC340', 'SGC400', 'SGC440', 'SGC490', 'SGC570'],
            standard: 'JIS G 3302',
            properties: {
                SGCC: { ys: '-', ts: '270↑', el: '-', bend: '0t', note: '일반용' },
                SGCD1: { ys: '-', ts: '270↑', el: '30↑', bend: '0t', note: '가공용' },
                SGCD2: { ys: '-', ts: '270↑', el: '34↑', bend: '0t', note: '심가공용' },
                SGCD3: { ys: '-', ts: '270↑', el: '38↑', bend: '0t', note: '초심가공용' },
                SGC340: { ys: '245↑', ts: '340↑', el: '20↑', bend: '1t', note: '구조용' },
                SGC400: { ys: '295↑', ts: '400↑', el: '18↑', bend: '1.5t', note: '구조용' },
                SGC440: { ys: '335↑', ts: '440↑', el: '18↑', bend: '1.5t', note: '구조용' },
                SGC490: { ys: '365↑', ts: '490↑', el: '15↑', bend: '2t', note: '구조용' },
                SGC570: { ys: '560↑', ts: '570↑', el: '7↑', bend: '3t', note: '고강도' }
            },
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.035↓', S: '0.030↓', Si: '-', Al: '-' },
            coating: { type: 'Zn', range: '60~450 g/m²', method: '용융도금' },
            tolerance: { thickness: 'JIS G 3302 Table 6 준용', flatness: 'JIS G 3302 Table 8 준용' }
        },
        ASTM: {
            isPrepainted: false,
            grades: ['CS Type A', 'CS Type B', 'CS Type C', 'FS Type A', 'FS Type B', 'SS Grade 33', 'SS Grade 40', 'SS Grade 50', 'SS Grade 80'],
            standard: 'ASTM A653/A653M',
            properties: {
                'CS Type A': { ys: '-', ts: '-', el: '-', bend: '-', note: 'Commercial Steel' },
                'CS Type B': { ys: '-', ts: '-', el: '-', bend: '-', note: 'Commercial Steel' },
                'CS Type C': { ys: '-', ts: '-', el: '-', bend: '-', note: 'Commercial Steel' },
                'FS Type A': { ys: '-', ts: '-', el: '-', bend: '-', note: 'Forming Steel' },
                'FS Type B': { ys: '-', ts: '-', el: '-', bend: '-', note: 'Forming Steel' },
                'SS Grade 33': { ys: '230↑', ts: '310↑', el: '20↑', bend: '-', note: 'Structural' },
                'SS Grade 40': { ys: '275↑', ts: '380↑', el: '18↑', bend: '-', note: 'Structural' },
                'SS Grade 50': { ys: '345↑', ts: '450↑', el: '12↑', bend: '-', note: 'Structural' },
                'SS Grade 80': { ys: '550↑', ts: '585↑', el: '-', bend: '-', note: 'Structural' }
            },
            chemical: { C: '0.20↓', Mn: '1.35↓', P: '0.035↓', S: '0.040↓', Si: '0.03↓', Al: '-' },
            coating: { type: 'Zn', range: 'G30~G210', method: 'Hot-Dip' },
            tolerance: { thickness: 'ASTM A924 Table 1 준용', flatness: 'ASTM A924 Table 11 준용' }
        },
        EN: {
            isPrepainted: false,
            grades: ['DX51D', 'DX52D', 'DX53D', 'DX54D', 'DX56D', 'S220GD', 'S250GD', 'S280GD', 'S320GD', 'S350GD'],
            standard: 'EN 10346',
            properties: {
                DX51D: { ys: '-', ts: '270~500', el: '-', bend: '0t', note: '일반가공용' },
                DX52D: { ys: '-', ts: '270~420', el: '26↑', bend: '0t', note: '드로잉용' },
                DX53D: { ys: '-', ts: '270~380', el: '30↑', bend: '0t', note: '심드로잉용' },
                DX54D: { ys: '-', ts: '260~350', el: '36↑', bend: '0t', note: '초심드로잉용' },
                DX56D: { ys: '-', ts: '260~350', el: '39↑', bend: '0t', note: '극심드로잉용' },
                S220GD: { ys: '220↑', ts: '300↑', el: '20↑', bend: '0t', note: '구조용' },
                S250GD: { ys: '250↑', ts: '330↑', el: '19↑', bend: '0t', note: '구조용' },
                S280GD: { ys: '280↑', ts: '360↑', el: '18↑', bend: '1t', note: '구조용' },
                S320GD: { ys: '320↑', ts: '390↑', el: '17↑', bend: '1t', note: '구조용' },
                S350GD: { ys: '350↑', ts: '420↑', el: '16↑', bend: '1.5t', note: '구조용' }
            },
            chemical: { C: '0.12↓', Mn: '0.60↓', P: '0.10↓', S: '0.045↓', Si: '0.50↓', Al: '-' },
            coating: { type: 'Z', range: 'Z100~Z600', method: 'Hot-Dip' },
            tolerance: { thickness: 'EN 10143 Table 1 준용', flatness: 'EN 10143 Table 6 준용' }
        }
    },
    GL: {
        KS: {
            isPrepainted: false,
            grades: ['SGACC', 'SGACD1', 'SGACD2', 'SGACD3', 'SGAC340', 'SGAC400', 'SGAC440', 'SGAC490'],
            standard: 'KS D 3770',
            properties: {
                SGACC: { ys: '-', ts: '270↑', el: '-', bend: '0t', note: '일반용' },
                SGACD1: { ys: '-', ts: '270↑', el: '28↑', bend: '0t', note: '가공용' },
                SGACD2: { ys: '-', ts: '270↑', el: '32↑', bend: '0t', note: '심가공용' },
                SGACD3: { ys: '-', ts: '270↑', el: '36↑', bend: '0t', note: '초심가공용' },
                SGAC340: { ys: '245↑', ts: '340↑', el: '18↑', bend: '1t', note: '구조용' },
                SGAC400: { ys: '295↑', ts: '400↑', el: '16↑', bend: '1.5t', note: '구조용' },
                SGAC440: { ys: '335↑', ts: '440↑', el: '14↑', bend: '2t', note: '구조용' },
                SGAC490: { ys: '365↑', ts: '490↑', el: '12↑', bend: '2t', note: '구조용' }
            },
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.035↓', S: '0.030↓', Si: '-', Al: '-' },
            coating: { type: 'Al-Zn', range: 'AZ70~AZ185', method: '용융도금 (55%Al-Zn)' },
            tolerance: { thickness: 'KS D 3770 Table 5 기준', flatness: 'KS D 3770 Table 7 기준' }
        },
        JIS: {
            isPrepainted: false,
            grades: ['SGLCC', 'SGLCD1', 'SGLCD2', 'SGLCD3', 'SGLC400', 'SGLC440', 'SGLC490', 'SGLC570'],
            standard: 'JIS G 3321',
            properties: {
                SGLCC: { ys: '-', ts: '270↑', el: '-', bend: '1t', note: '일반용' },
                SGLCD1: { ys: '-', ts: '270↑', el: '27↑', bend: '1t', note: '가공용' },
                SGLCD2: { ys: '-', ts: '270↑', el: '31↑', bend: '1t', note: '심가공용' },
                SGLCD3: { ys: '-', ts: '270↑', el: '35↑', bend: '1t', note: '초심가공용' },
                SGLC400: { ys: '295↑', ts: '400↑', el: '16↑', bend: '2t', note: '구조용' },
                SGLC440: { ys: '335↑', ts: '440↑', el: '14↑', bend: '2t', note: '구조용' },
                SGLC490: { ys: '365↑', ts: '490↑', el: '12↑', bend: '2.5t', note: '구조용' },
                SGLC570: { ys: '560↑', ts: '570↑', el: '5↑', bend: '3t', note: '고강도' }
            },
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.035↓', S: '0.030↓', Si: '-', Al: '-' },
            coating: { type: 'Al-Zn', range: 'AZ70~AZ185', method: '용융도금 (55%Al-Zn)' },
            tolerance: { thickness: 'JIS G 3321 Table 4 준용', flatness: 'JIS G 3321 Table 6 준용' }
        }
    },
    AL: {
        KS: {
            isPrepainted: false,
            grades: ['SA1C', 'SA1D', 'SA1E'],
            standard: 'KS D 3765',
            properties: {
                SA1C: { ys: '-', ts: '270↑', el: '-', bend: '1t', note: '일반용 Type1' },
                SA1D: { ys: '-', ts: '270↑', el: '26↑', bend: '1t', note: '가공용 Type1' },
                SA1E: { ys: '-', ts: '270↑', el: '30↑', bend: '0t', note: '심가공용 Type2' }
            },
            chemical: { C: '0.10↓', Mn: '0.50↓', P: '0.030↓', S: '0.030↓', Si: '-', Al: '-' },
            coating: { type: 'Al/Al-Si', range: '40~120 g/m²', method: '용융도금' },
            tolerance: { thickness: 'KS D 3765 Table 4 기준', flatness: 'KS D 3765 Table 6 기준' }
        }
    },
    GIX: {
        KS: {
            isPrepainted: false,
            grades: ['SDCC', 'SDCD1', 'SDC340', 'SDC400', 'SDC440', 'SDC490', 'SDC570'],
            standard: 'KS D 3030',
            properties: {
                SDCC: { ys: '-', ts: '270↑', el: '-', bend: '0t', note: '삼원계 도금(3030) 일반용' },
                SDCD1: { ys: '-', ts: '270↑', el: '30↑', bend: '0t', note: '삼원계 도금(3030) 가공용' },
                SDC340: { ys: '245↑', ts: '340↑', el: '20↑', bend: '1t', note: '삼원계 도금(3030) 구조용' },
                SDC400: { ys: '295↑', ts: '400↑', el: '18↑', bend: '1.5t', note: '삼원계 도금(3030) 구조용' },
                SDC570: { ys: '560↑', ts: '570↑', el: '7↑', bend: '3t', note: '삼원계 도금(3030) 고강도' }
            },
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.035↓', S: '0.030↓', Si: '-', Al: '-' },
            coating: { type: 'Zn-Al-Mg (Low Al)', range: '60~600 g/m²', method: '용융 삼원계 도금' },
            tolerance: { thickness: 'KS D 3030 Table 7 기준', flatness: 'KS D 3030 Table 10 기준' }
        },
        JIS: {
            isPrepainted: false,
            standard: 'JIS G 3323',
            grades: ['SMMCC', 'SMM340', 'SMM400', 'SMM570'],
            properties: {
                SMMCC: { ys: '-', ts: '270↑', el: '-', bend: '0t', note: 'Zn-Al-Mg Commercial' }
            },
            coating: { type: 'Zn-Al-Mg', range: 'K12~K60', method: 'Hot-Dip' }
        },
        ASTM: {
            isPrepainted: false,
            standard: 'ASTM A1046',
            grades: ['CS Type A', 'SS Grade 33', 'SS Grade 40', 'SS Grade 80'],
            properties: {
                'CS Type A': { ys: '-', ts: '-', el: '-', bend: '-', note: 'Zn-Mg-Al Alloy' }
            },
            coating: { type: 'Zn-Al-Mg', range: 'ZM30~ZM180', method: 'Hot-Dip' }
        },
        EN: {
            isPrepainted: false,
            standard: 'EN 10346',
            grades: ['DX51D+ZM', 'S250GD+ZM', 'S350GD+ZM'],
            properties: {
                'DX51D+ZM': { ys: '-', ts: '270~500', el: '22↑', bend: '-', note: 'Zn-Al-Mg (ZM)' }
            },
            coating: { type: 'ZM (Zn-Mg-Al)', range: 'ZM60~ZM310', method: 'Hot-Dip' }
        }
    },
    GLX: {
        KS: {
            isPrepainted: false,
            grades: ['SACC', 'SACD', 'SAC340', 'SAC400', 'SAC570'],
            standard: 'KS D 3033',
            properties: {
                SACC: { ys: '-', ts: '270↑', el: '-', bend: '0t', note: '삼원계 도금(3033) 일반용' },
                SACD: { ys: '-', ts: '270↑', el: '27↑', bend: '0t', note: '삼원계 도금(3033) 가공용' },
                SAC340: { ys: '245↑', ts: '340↑', el: '20↑', bend: '1t', note: '삼원계 도금(3033) 구조용' },
                SAC400: { ys: '295↑', ts: '400↑', el: '18↑', bend: '1.5t', note: '삼원계 도금(3033) 구조용' },
                SAC570: { ys: '560↑', ts: '570↑', el: '7↑', bend: '3t', note: '삼원계 도금(3033) 고강도' }
            },
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.035↓', S: '0.030↓', Si: '-', Al: '-' },
            coating: { type: 'Al-Mg-Zn (High Al)', range: '60~600 g/m²', method: '용융 삼원계 도금' },
            tolerance: { thickness: 'KS D 3030/3033 Table 7 기준', flatness: 'KS D 3030/3033 Table 10 기준' }
        },
        JIS: {
            isPrepainted: false,
            standard: 'JIS G 3323',
            grades: ['SNM340', 'SNM400', 'SNM440'],
            properties: {
                SNM340: { ys: '245↑', ts: '340↑', el: '18↑', bend: '1t', note: 'Al-Mg-Zn Alloy' }
            },
            coating: { type: 'Al-Mg-Zn', range: 'N12~N60', method: 'Hot-Dip' }
        },
        ASTM: {
            isPrepainted: false,
            standard: 'ASTM A1046',
            grades: ['SS Grade 33', 'SS Grade 40'],
            properties: {
                'SS Grade 33': { ys: '230↑', ts: '310↑', el: '20↑', bend: '-', note: 'Al-Mg-Zn Structural' }
            },
            coating: { type: 'Al-Mg-Zn', range: 'ZM30~ZM180', method: 'Hot-Dip' }
        },
        EN: {
            isPrepainted: false,
            standard: 'EN 10346',
            grades: ['S220GD+ZM', 'S350GD+ZM'],
            properties: {
                'S220GD+ZM': { ys: '220↑', ts: '300↑', el: '20↑', bend: '-', note: 'High Al Al-Mg-Zn' }
            },
            coating: { type: 'ZM Alloy', range: 'ZM60~ZM310', method: 'Hot-Dip' }
        }
    },
    // Prepainted Categories
    PPGI: {
        KS: {
            isPrepainted: true,
            grades: ['CGCC', 'CGCD1', 'CGCD2', 'CGC340', 'CGC400', 'CGC440'],
            standard: 'KS D 3520',
            properties: {
                CGCC: { ys: '-', ts: '270↑', el: '-', bend: '-', note: '도장 일반용' },
                CGCD1: { ys: '-', ts: '270↑', el: '28↑', bend: '-', note: '도장 가공용' },
                CGC340: { ys: '245↑', ts: '340↑', el: '18↑', bend: '-', note: '도장 구조용' }
            },
            coating: { type: 'Zn + Coating', range: 'User Specify', method: 'Roll Coating' },
            prepainted: {
                resins: ['Polyester (PE)', 'Silicon Polyester (SMP)', 'Fluoropolymer (PVDF)'],
                specs: {
                    'Polyester (PE)': { bend: '2T ~ 4T', impact: '500g x 50cm', salt: '240 ~ 500 hrs' },
                    'Silicon Polyester (SMP)': { bend: '3T ~ 5T', impact: '500g x 50cm', salt: '500 ~ 1000 hrs' },
                    'Fluoropolymer (PVDF)': { bend: '2T ~ 3T', impact: '500g x 50cm', salt: '1000 ~ 2000 hrs' }
                }
            }
        },
        ASTM: {
            isPrepainted: true,
            grades: ['CS Type A', 'CS Type B', 'SS Grade 33', 'SS Grade 40', 'SS Grade 50', 'SS Grade 80'],
            standard: 'ASTM A755/A755M',
            properties: {
                'CS Type A': { ys: '-', ts: '-', el: '-', bend: '-', note: 'PPGI Commercial' },
                'CS Type B': { ys: '-', ts: '-', el: '-', bend: '-', note: 'PPGI Commercial' },
                'SS Grade 33': { ys: '230↑', ts: '310↑', el: '20↑', bend: '-', note: 'PPGI Structural' },
                'SS Grade 40': { ys: '275↑', ts: '380↑', el: '18↑', bend: '-', note: 'PPGI Structural' }
            },
            coating: { type: 'Zn + Coating', range: 'A755 Standard', method: 'Roll Coating' },
            prepainted: {
                resins: ['Polyester', 'SMP', 'PVDF'],
                specs: {
                    'Polyester': { bend: '2T ~ 4T', impact: '3.4 J ↑', salt: 'A755 Specs' },
                    'SMP': { bend: '3T ~ 5T', impact: '3.4 J ↑', salt: 'A755 Specs' },
                    'PVDF': { bend: '2T ~ 3T', impact: '3.4 J ↑', salt: 'A755 Specs' }
                }
            }
        }
    },
    PPGL: {
        KS: {
            isPrepainted: true,
            grades: ['CGACC', 'CGACD1', 'CGAC340', 'CGAC400'],
            standard: 'KS D 3862',
            properties: {
                CGACC: { ys: '-', ts: '270↑', el: '-', bend: '-', note: '도장 갈바륨 일반용' },
                CGAC340: { ys: '245↑', ts: '340↑', el: '18↑', bend: '-', note: '도장 갈바륨 구조용' }
            },
            coating: { type: 'Al-Zn + Coating', range: 'User Specify', method: 'Roll Coating' },
            prepainted: {
                resins: ['Polyester (PE)', 'PVDF'],
                specs: {
                    'Polyester (PE)': { bend: '3T ~ 5T', impact: '500g x 50cm', salt: '1000 hrs ↑' },
                    'PVDF': { bend: '2T ~ 3T', impact: '500g x 50cm', salt: '2000 hrs ↑' }
                }
            }
        },
        ASTM: {
            isPrepainted: true,
            grades: ['CS Type A', 'CS Type B', 'SS Grade 33', 'SS Grade 40', 'SS Grade 50', 'SS Grade 80'],
            standard: 'ASTM A755/A755M (GL Substrate)',
            properties: {
                'CS Type A': { ys: '-', ts: '-', el: '-', bend: '-', note: 'PPGL Commercial' },
                'SS Grade 33': { ys: '230↑', ts: '310↑', el: '20↑', bend: '-', note: 'PPGL Structural' }
            },
            coating: { type: 'Al-Zn + Coating', range: 'A755 Standard', method: 'Roll Coating' },
            prepainted: {
                resins: ['Polyester', 'PVDF'],
                specs: {
                    'Polyester': { bend: '3T ~ 5T', impact: '3.4 J ↑', salt: '1000 hrs ↑' },
                    'PVDF': { bend: '2T ~ 3T', impact: '3.4 J ↑', salt: '2000 hrs ↑' }
                }
            }
        }
    },
    PPAL: {
        KS: {
            isPrepainted: true,
            grades: ['ACCC', 'ACCD1', 'ACC340'],
            standard: 'KS D 6711',
            properties: {
                ACCC: { ys: '-', ts: '-', el: '-', bend: '-', note: '도장 알루미늄 일반용' }
            },
            coating: { type: 'Al + Coating', range: 'User Specify', method: 'Roll Coating' },
            prepainted: {
                resins: ['PE', 'PVDF'],
                specs: {
                    'PE': { bend: '1T ~ 2T', impact: 'Pass', salt: '1000 hrs ↑' },
                    'PVDF': { bend: '0T ~ 1T', impact: 'Pass', salt: '3000 hrs ↑' }
                }
            }
        }
    },
    PPZM: {
        KS: {
            isPrepainted: true,
            grades: ['CDCC', 'CDCD1', 'CDC340'],
            standard: 'KS D 3520 (삼원계 원판)',
            properties: {
                CDCC: { ys: '-', ts: '270↑', el: '-', bend: '-', note: '도장 삼원계 일반용' },
                CDC340: { ys: '245↑', ts: '340↑', el: '18↑', bend: '-', note: '도장 삼원계 구조용' }
            },
            coating: { type: 'Zn-Al-Mg + Coating', range: 'User Specify', method: 'Roll Coating' },
            prepainted: {
                resins: ['Polyester (PE)', 'PVDF'],
                specs: {
                    'Polyester (PE)': { bend: '2T ~ 4T', impact: '500g x 50cm', salt: '1500 hrs ↑' },
                    'PVDF': { bend: '2T ~ 3T', impact: '500g x 50cm', salt: '3000 hrs ↑' }
                }
            }
        }
    }
};
