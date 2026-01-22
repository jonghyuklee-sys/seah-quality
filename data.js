// 세아씨엠 품질조회시스템 - 글로벌 전 규격 통합 데이터베이스 (KS/JIS/ASTM/EN 완벽 대응)
const steelData = {
    // [1] 도금 제품군 (Metallic Coated)
    GI: {
        KS: {
            isPrepainted: false, standard: 'KS D 3506', grades: ['SGCC', 'SGCD1', 'SGCD2', 'SGCD3', 'SGC340', 'SGC400', 'SGC440', 'SGC490', 'SGC570'],
            coatingOptions: ['Z06', 'Z08', 'Z10', 'Z12', 'Z14', 'Z18', 'Z20', 'Z22', 'Z25', 'Z27'],
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.05↓', S: '0.05↓' }, coating: { type: 'Zn', method: 'GI' }, tolerance: { thickness: '±0.05~0.15mm', flatness: '12mm↓' },
            properties: {
                SGCC: { ts: '270↑', chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.05↓', S: '0.05↓' } },
                SGCD1: { ts: '270↑', el: '34↑', chemical: { C: '0.12↓', Mn: '0.60↓', P: '0.04↓', S: '0.04↓' } },
                SGCD2: { ts: '270↑', el: '36↑', chemical: { C: '0.10↓', Mn: '0.50↓', P: '0.03↓', S: '0.03↓' } },
                SGCD3: { ts: '270↑', el: '38↑', chemical: { C: '0.08↓', Mn: '0.45↓', P: '0.03↓', S: '0.03↓' } },
                SGC340: { ys: '245↑', ts: '340↑', el: '20↑', chemical: { C: '0.20↓', Mn: '1.70↓', P: '0.05↓', S: '0.05↓' } },
                SGC400: { ys: '295↑', ts: '400↑', el: '18↑', chemical: { C: '0.20↓', Mn: '1.70↓', P: '0.05↓', S: '0.05↓' } },
                SGC440: { ys: '335↑', ts: '440↑', el: '18↑', chemical: { C: '0.20↓', Mn: '1.70↓', P: '0.05↓', S: '0.05↓' } },
                SGC490: { ys: '365↑', ts: '490↑', el: '16↑', chemical: { C: '0.25↓', Mn: '2.00↓', P: '0.05↓', S: '0.05↓' } },
                SGC570: { ys: '560↑', ts: '570↑', chemical: { C: '0.30↓', Mn: '2.00↓', P: '0.05↓', S: '0.05↓' } }
            }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3302', grades: ['SGCC', 'SGCD1', 'SGCD2', 'SGCD3', 'SGC340', 'SGC400', 'SGC440', 'SGC490', 'SGC570'],
            coatingOptions: ['Z06', 'Z08', 'Z10', 'Z12', 'Z14', 'Z18', 'Z20', 'Z22', 'Z25', 'Z27'],
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.05↓', S: '0.05↓' }, coating: { type: 'Zn', method: 'Hot-Dip' }, tolerance: { thickness: 'JIS G 3302' },
            properties: {
                SGCC: { ts: '270↑' },
                SGCD1: { ts: '270↑', el: '34↑' },
                SGC440: { ys: '335↑', ts: '440↑', el: '18↑' },
                SGC570: { ys: '560↑', ts: '570↑' }
            }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM A653', grades: ['CS Type A', 'CS Type B', 'FS Type B', 'SS Grade 33', 'SS Grade 40', 'SS Grade 50'],
            coatingOptions: ['G30', 'G40', 'G60', 'G90'],
            chemical: { C: '0.20↓', Mn: '1.15↓', P: '0.04↓', S: '0.04↓' }, coating: { type: 'Zn', method: 'Hot-Dip' }, tolerance: { thickness: 'ASTM A924' },
            properties: {
                'SS Grade 33': { ys: '230↑', ts: '310↑', el: '20↑' },
                'SS Grade 40': { ys: '275↑', ts: '380↑', el: '18↑' },
                'SS Grade 50': { ys: '340↑', ts: '450↑', el: '12↑' },
                'CS Type A': { chemical: { C: '0.10↓', Mn: '0.60↓', P: '0.03↓', S: '0.035↓' } }
            }
        },
        EN: {
            isPrepainted: false, standard: 'EN 10346', grades: ['DX51D', 'DX52D', 'S220GD', 'S250GD', 'S280GD', 'S320GD', 'S350GD'],
            coatingOptions: ['Z100', 'Z140', 'Z200', 'Z225', 'Z275'],
            chemical: { C: '0.12↓', Mn: '0.60↓', P: '0.10↓', S: '0.045↓' }, coating: { type: 'Z (Pure Zn)', method: 'Hot-Dip' },
            properties: {
                'DX51D': { ts: '270~500', el: '22↑' },
                'S250GD': { ys: '250↑', ts: '330↑', el: '19↑' },
                'S320GD': { ys: '320↑', ts: '390↑', el: '17↑' },
                'S350GD': { ys: '350↑', ts: '420↑', el: '16↑' }
            }
        }
    },
    GL: {
        KS: {
            isPrepainted: false, standard: 'KS D 3770', grades: ['SGLCC', 'SGLCD1', 'SGLCD2', 'SGLC400', 'SGLC440', 'SGLC490', 'SGLC570'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ135', 'AZ150', 'AZ165', 'AZ185'],
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.04↓', S: '0.04↓', Si: '1.6 typ', Al: '55 typ' }, coating: { type: '55% Al-Zn', method: 'GL' }, tolerance: { thickness: '±0.06~0.18mm' },
            properties: {
                SGLCC: { ts: '270↑', chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.04↓', S: '0.04↓' } },
                SGLC440: { ys: '335↑', ts: '440↑', el: '18↑' },
                SGLC570: { ys: '560↑', ts: '570↑' }
            }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3321', grades: ['SGLCC', 'SGLCD', 'SGLC400', 'SGLC440', 'SGLC490', 'SGLC570'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ135', 'AZ150', 'AZ185'],
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.04↓', S: '0.04↓' }, coating: { type: 'AZ (Al-Zn)', method: 'Hot-Dip' },
            properties: {
                SGLCC: { ts: '270↑' },
                SGLC440: { ys: '335↑', ts: '440↑', el: '18↑' }
            }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM A792', grades: ['CS Type A', 'CS Type B', 'SS Grade 33', 'SS Grade 50', 'SS Grade 80'],
            coatingOptions: ['AZ50', 'AZ55', 'AZ60'],
            chemical: { C: '0.20↓', Mn: '1.15↓', P: '0.04↓', S: '0.04↓' }, coating: { type: 'AZ (Al-Zn)', method: 'Hot-Dip' },
            properties: {
                'SS Grade 33': { ys: '230↑', ts: '310↑', el: '20↑' },
                'SS Grade 50': { ys: '340↑', ts: '450↑', el: '12↑' }
            }
        },
        EN: {
            isPrepainted: false, standard: 'EN 10346', grades: ['DX51D+AZ', 'DX52D+AZ', 'S250GD+AZ', 'S320GD+AZ', 'S350GD+AZ'],
            coatingOptions: ['AZ100', 'AZ150', 'AZ185'],
            chemical: { C: '0.12↓', Mn: '0.60↓', P: '0.10↓', S: '0.045↓' },
            properties: {
                'DX51D+AZ': { ts: '270~500', el: '22↑' },
                'S250GD+AZ': { ys: '250↑', ts: '330↑', el: '19↑' },
                'S350GD+AZ': { ys: '350↑', ts: '420↑', el: '16↑' }
            }
        }
    },
    AL: {
        KS: {
            isPrepainted: false, standard: 'KS D 6701', grades: ['3003-H14', '3105-H16', '3105-H24', '1100-O', '5052-H32'],
            coatingOptions: ['Bare'],
            chemical: { Al: '96.7↑', Mn: '1.0~1.5', Cu: '0.05~0.20' }, coating: { type: 'Pure Al/Al Alloy', method: 'Rolling' },
            properties: {
                '3003-H14': { ys: '115↑', ts: '140~190', el: '2↑' },
                '3105-H16': { ys: '150↑', ts: '175~225', el: '1↑' }
            }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS H 4000', grades: ['A1100P', 'A3003P', 'A3105P', 'A5052P'],
            coatingOptions: ['Bare'],
            properties: {
                'A3003P': { ys: '115↑', ts: '140~190', el: '2↑' }
            }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM B209', grades: ['1100', '3003', '3105', '5052'],
            coatingOptions: ['Bare'],
            properties: {
                '3003': { ys: '115↑', ts: '140~190' }
            }
        },
        EN: {
            isPrepainted: false, standard: 'EN 485', grades: ['AW-1050A', 'AW-3003', 'AW-3105'],
            coatingOptions: ['Bare'],
            properties: {
                'AW-3003': { ys: '115↑', ts: '140~190' }
            }
        }
    },
    ZM: {
        KS: {
            isPrepainted: false, standard: 'KS D 3030', grades: ['SDCC', 'SDCD1', 'SDCD2', 'SDCD3', 'SDC340', 'SDC400', 'SDC440', 'SDC490', 'SDC570'],
            coatingOptions: ['K06', 'K08', 'K10', 'K12', 'K14', 'K18', 'K20', 'K22', 'K25', 'K27'],
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.04↓', S: '0.04↓', Mg: '1.0~4.0' }, coating: { type: 'Zn-Al-Mg', method: 'ZM' },
            properties: {
                SDCC: { ts: '270↑', chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.04↓', S: '0.04↓' } },
                SDC440: { ys: '335↑', ts: '440↑', el: '18↑' },
                SDC570: { ys: '560↑', ts: '570↑' }
            }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3323', grades: ['SMMCC', 'SMMCD', 'SMM340', 'SMM400'],
            coatingOptions: ['K12', 'K18', 'K27', 'K35', 'K45'],
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.04↓', S: '0.04↓', Mg: '1.0~4.0' },
            properties: {
                SMMCC: { ts: '270↑' },
                SMM400: { ys: '295↑', ts: '400↑', el: '18↑' }
            }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM A1046', grades: ['CS Type A', 'FS Type B', 'SS Grade 33'],
            coatingOptions: ['ZM30', 'ZM40', 'ZM60', 'ZM75', 'ZM90'],
            chemical: { C: '0.20↓', Mn: '1.15↓', P: '0.04↓', S: '0.04↓' },
            properties: {
                'SS Grade 33': { ys: '230↑', ts: '310↑', el: '20↑' }
            }
        },
        EN: {
            isPrepainted: false, standard: 'EN 10346', grades: ['DX51D+ZM', 'DX52D+ZM', 'S250GD+ZM', 'S350GD+ZM'],
            coatingOptions: ['ZM60', 'ZM70', 'ZM90', 'ZM100', 'ZM120', 'ZM140', 'ZM175', 'ZM195', 'ZM200', 'ZM220', 'ZM275'],
            chemical: { C: '0.12↓', Mn: '0.60↓', P: '0.10↓', S: '0.045↓' },
            properties: {
                'DX51D+ZM': { ts: '270~500', el: '22↑' },
                'S250GD+ZM': { ys: '250↑', ts: '330↑', el: '19↑' },
                'S350GD+ZM': { ys: '350↑', ts: '420↑', el: '16↑' }
            }
        }
    },

    // [2] 컬러도장 제품군 (Color Coated)
    PPGI: {
        KS: {
            isPrepainted: true, standard: 'KS D 3520', grades: ['CGCC', 'CGCD1', 'CGCD2', 'CGCD3', 'CGCH', 'CGC340', 'CGC400', 'CGC440', 'CGC490', 'CGC570'],
            coatingOptions: ['Z06', 'Z08', 'Z10', 'Z12', 'Z14', 'Z18', 'Z20', 'Z22', 'Z25', 'Z27'],
            prepainted: {
                resins: ['PE', 'SMP', 'HDP', 'PVDF'],
                specs: {
                    'PE': { bend: '3T~5T', impact: '500gx50cm', salt: '500h' },
                    'HDP': { bend: '2T~3T', impact: '500gx50cm', salt: '1000h' },
                    'PVDF': { bend: '1T~2T', impact: '500gx50cm', salt: '1000h' }
                }
            },
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.05↓', S: '0.05↓' }, coating: { type: 'Paint/Zn', method: 'CCL' },
            properties: {
                CGCC: { ts: '270↑' },
                CGC440: { ys: '335↑', ts: '440↑', el: '18↑' }
            }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS G 3312', grades: ['CGCC', 'CGCD', 'CGCH'],
            coatingOptions: ['Z08', 'Z12', 'Z18', 'Z25', 'Z27'],
            chemical: { C: '0.15↓', Mn: '0.80↓' }, coating: { type: 'Paint/Zn', method: 'CCL' },
            properties: { CGCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM A755', grades: ['CS Type A', 'CS Type B', 'SS Grade 33', 'SS Grade 40'],
            coatingOptions: ['G40', 'G60', 'G90'],
            chemical: { C: '0.20↓', Mn: '1.15↓' }, coating: { type: 'Paint/Zn', method: 'CCL' },
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['DX51D', 'S250GD', 'S320GD'],
            coatingOptions: ['Z100', 'Z140', 'Z200', 'Z275'],
            chemical: { C: '0.12↓', Mn: '0.60↓' }, coating: { type: 'Paint/Zn', method: 'CCL' },
            properties: { 'DX51D': { ts: '270~500', el: '22↑' } }
        }
    },
    PPGL: {
        KS: {
            isPrepainted: true, standard: 'KS D 3862', grades: ['CGLCC', 'CGLCD1', 'CGLCD2', 'CGLC400', 'CGLC440', 'CGLC490', 'CGLC570'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ135', 'AZ150'],
            prepainted: {
                resins: ['Polyester', 'PVDF', 'HDP'],
                specs: {
                    'Polyester': { bend: '4T~6T', impact: '500gx30cm', salt: '1000h' },
                    'PVDF': { bend: '2T~3T', impact: '500gx50cm', salt: '2000h' }
                }
            },
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.04↓', S: '0.04↓', Si: '1.6 typ', Al: '55 typ' }, coating: { type: 'Paint/GL', method: 'CCL' },
            properties: {
                CGLCC: { ts: '270↑' },
                CGLC440: { ys: '335↑', ts: '440↑', el: '18↑' }
            }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS G 3322', grades: ['CGLCC', 'CGLCD', 'CGLC400'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ150'],
            chemical: { C: '0.15↓', Mn: '0.80↓' }, coating: { type: 'Paint/GL', method: 'CCL' },
            properties: { CGLCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM A755', grades: ['CS Type B', 'SS Grade 33', 'SS Grade 50'],
            coatingOptions: ['AZ50', 'AZ55', 'AZ60'],
            chemical: { C: '0.20↓', Mn: '1.15↓' },
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['DX51D+AZ', 'S250GD+AZ'],
            coatingOptions: ['AZ100', 'AZ150', 'AZ185'],
            chemical: { C: '0.12↓', Mn: '0.60↓' },
            properties: { 'DX51D+AZ': { ts: '270~500', el: '22↑' } }
        }
    },
    PPAL: {
        KS: {
            isPrepainted: true, standard: 'KS D 6711', grades: ['3003-H16', '3105-H16', '3003-H14'],
            coatingOptions: ['15μm (Top)', '20μm (Top)', '25μm (Top)', '35μm (Top)'],
            prepainted: {
                resins: ['PE', 'PVDF'],
                specs: {
                    'PE': { bend: '1T~2T', impact: 'Pass', salt: '1500h' },
                    'PVDF': { bend: '1T', impact: 'Pass', salt: '3000h' }
                }
            },
            chemical: { Al: '96.7↑', Mn: '1.0~1.5' }, coating: { type: 'Color Coating', method: 'CCL' },
            properties: {
                '3003-H16': { ys: '150↑', ts: '175~225', el: '1↑' },
                '3003-H14': { ys: '115↑', ts: '140~190', el: '2↑' }
            }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS H 4001', grades: ['A3003P', 'A3105P'],
            coatingOptions: ['20μm', '25μm'],
            properties: {
                'A3003P': { ys: '115↑', ts: '145~185' }
            }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM B209', grades: ['3003', '3105'],
            coatingOptions: ['Paint Coating'],
            properties: {
                '3003': { ys: '115↑', ts: '140~190' }
            }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['AW-3003', 'AW-3105'],
            coatingOptions: ['Coated'],
            properties: {
                'AW-3003': { ys: '115↑', ts: '140~180' }
            }
        }
    },
    PPZM: {
        KS: {
            isPrepainted: true, standard: 'KS D 3034', grades: ['CDCC', 'CDCD1', 'CDCD2', 'CDCD3', 'CDC340', 'CDC400', 'CDC440', 'CDC490', 'CDC570'],
            coatingOptions: ['K06', 'K08', 'K10', 'K12', 'K14', 'K18', 'K20', 'K22', 'K25', 'K27'],
            prepainted: {
                resins: ['PE', 'HDP', 'PVDF'],
                specs: {
                    'PE': { bend: '3T~5T', impact: '500gx50cm', salt: '1500h' },
                    'HDP': { bend: '2T~3T', impact: '500gx50cm', salt: '2000h' }
                }
            },
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.04↓', S: '0.04↓', Mg: '1.0~4.0' }, coating: { type: 'Paint/ZM', method: 'CCL' },
            properties: {
                CDCC: { ts: '270↑' },
                CDC440: { ys: '335↑', ts: '440↑', el: '18↑' }
            }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM A755', grades: ['CS Type A', 'SS Grade 33'],
            coatingOptions: ['ZM40', 'ZM60'],
            chemical: { C: '0.20↓', Mn: '1.15↓' },
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['DX51D+ZM', 'S250GD+ZM'],
            coatingOptions: ['ZM90', 'ZM120', 'ZM140'],
            chemical: { C: '0.12↓', Mn: '0.60↓' },
            properties: { 'DX51D+ZM': { ts: '270~500', el: '22↑' } }
        }
    }
};
