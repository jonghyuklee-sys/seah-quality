// 세아씨엠 품질조회시스템 - 글로벌 전 규격 통합 데이터베이스 (KS/JIS/ASTM/EN 완벽 대응)
const steelData = {
    // [0] 냉연 제품군 (Cold Rolled / Pickled)
    CR: {
        KS: {
            isPrepainted: false, standard: 'KS D 3512', grades: ['SPCC', 'SPCD', 'SPCE', 'SPCF', 'SPCG'],
            coatingOptions: ['Oil (Oiled)', 'Dry (Unoiled)'],
            chemical: { C: '0.15↓', Mn: '0.60↓', P: '0.05↓', S: '0.05↓' },
            properties: {
                SPCC: { ts: '270↑', el_table: [{ t: 0.4, val: '27↑' }, { t: 0.6, val: '29↑' }, { t: 1.0, val: '31↑' }, { t: 1.6, val: '32↑' }, { t: 99, val: '33↑' }] },
                SPCD: { ts: '270↑', el_table: [{ t: 0.4, val: '31↑' }, { t: 0.6, val: '33↑' }, { t: 1.0, val: '35↑' }, { t: 1.6, val: '36↑' }, { t: 99, val: '37↑' }] },
                SPCE: { ts: '270↑', el_table: [{ t: 0.4, val: '33↑' }, { t: 0.6, val: '35↑' }, { t: 1.0, val: '37↑' }, { t: 1.6, val: '38↑' }, { t: 99, val: '39↑' }] }
            }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3141', grades: ['SPCC', 'SPCD', 'SPCE', 'SPCF', 'SPCG'],
            coatingOptions: ['Oil (Oiled)', 'Dry (Unoiled)'],
            properties: {
                SPCC: { ts: '270↑', el_table: [{ t: 0.4, val: '27↑' }, { t: 0.6, val: '29↑' }, { t: 1.0, val: '31↑' }, { t: 99, val: '32↑' }] },
                SPCD: { ts: '270↑', el_table: [{ t: 0.4, val: '31↑' }, { t: 0.6, val: '33↑' }, { t: 1.0, val: '35↑' }, { t: 99, val: '36↑' }] },
                SPCE: { ts: '270↑', el_table: [{ t: 0.4, val: '33↑' }, { t: 0.6, val: '35↑' }, { t: 1.0, val: '37↑' }, { t: 1.6, val: '38↑' }, { t: 99, val: '39↑' }] }
            }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM A1008', grades: ['CS Type A', 'CS Type B', 'DS Type A', 'DS Type B', 'DDS', 'EDDS', 'SS Grade 33'],
            properties: {
                'CS Type B': { ys: '140~275', el: '30↑' },
                'SS Grade 33': { ys: '230↑', ts: '330↑', el: '18↑' }
            }
        },
        EN: {
            isPrepainted: false, standard: 'EN 10130', grades: ['DC01', 'DC03', 'DC04', 'DC05', 'DC06', 'DC07'],
            properties: {
                'DC01': { ys: '280↓', ts: '270~410', el: '28↑' },
                'DC04': { ys: '210↓', ts: '270~350', el: '38↑' }
            }
        }
    },
    PO: {
        KS: {
            isPrepainted: false, standard: 'KS D 3501', grades: ['SPHC', 'SPHD', 'SPHE'],
            coatingOptions: ['Oil (Oiled)'],
            properties: { SPHC: { ts: '270↑' } }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3131', grades: ['SPHC', 'SPHD', 'SPHE'],
            coatingOptions: ['Oil (Oiled)'],
            properties: { SPHC: { ts: '270↑' } }
        }
    },
    FH: {
        KS: {
            isPrepainted: false, standard: 'KS D 3512 FH', grades: ['SCP1 Full Hard'],
            properties: { 'SCP1 Full Hard': { ts: '490~590', chemical: { C: '0.15↓' } } }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3141 FH', grades: ['SPCC-1 Full Hard'],
            properties: { 'SPCC-1 Full Hard': { ts: '490~590' } }
        }
    },

    // [1] 도금 제품군 (Metallic Coated)
    GI: {
        KS: {
            isPrepainted: false, standard: 'KS D 3506', grades: ['SGCC', 'SGCD1', 'SGCD2', 'SGCD3', 'SGCD4', 'SGC340', 'SGC400', 'SGC440', 'SGC490', 'SGC570'],
            coatingOptions: ['Z06', 'Z08', 'Z10', 'Z12', 'Z14', 'Z18', 'Z20', 'Z22', 'Z25', 'Z27'],
            properties: {
                SGCC: { ts: '270↑' },
                SGC440: { ys: '335↑', ts: '440↑', el: '18↑' }
            }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3302', grades: ['SGCC', 'SGCD1', 'SGCD2', 'SGCD3', 'SGCD4', 'SGC340', 'SGC400', 'SGC440', 'SGC490', 'SGC570'],
            coatingOptions: ['Z06', 'Z08', 'Z10', 'Z12', 'Z14', 'Z18', 'Z20', 'Z22', 'Z25', 'Z27'],
            properties: {
                SGCC: { ts: '270↑' },
                SGC440: { ys: '335↑', ts: '440↑', el: '18↑' }
            }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM A653', grades: ['CS Type A', 'CS Type B', 'FS Type B', 'SS Grade 33', 'SS Grade 40', 'SS Grade 50'],
            coatingOptions: ['G30', 'G40', 'G60', 'G90'],
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑', el: '20↑' } }
        },
        EN: {
            isPrepainted: false, standard: 'EN 10346', grades: ['DX51D', 'DX52D', 'S220GD', 'S250GD', 'S280GD', 'S320GD', 'S350GD'],
            coatingOptions: ['Z100', 'Z140', 'Z200', 'Z225', 'Z275'],
            properties: { 'DX51D': { ts: '270~500', el: '22↑' } }
        }
    },
    GL: {
        KS: {
            isPrepainted: false, standard: 'KS D 3770', grades: ['SGLCC', 'SGLCD', 'SGLCDD', 'SGLC400', 'SGLC440', 'SGLC490', 'SGLC570'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ150', 'AZ185'],
            properties: {
                SGLCC: { ts: '270↑' },
                SGLC440: { ys: '335↑', ts: '440↑', el: '18↑' }
            }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3321', grades: ['SGLCC', 'SGLCD', 'SGLCDD', 'SGLC400', 'SGLC440', 'SGLC490', 'SGLC570'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ150', 'AZ185'],
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
            isPrepainted: false, standard: 'KS D 3030', grades: ['SGMCC', 'SGMCD1', 'SGMCD2', 'SGMCD3', 'SGMC340', 'SGMC400', 'SGMC440', 'SGMC490', 'SGMC570'],
            coatingOptions: ['ZM60', 'ZM80', 'ZM100', 'ZM120', 'ZM140', 'ZM180', 'ZM200', 'ZM220', 'ZM250', 'ZM275'],
            properties: { SGMCC: { ts: '270↑' }, SGMC440: { ys: '335↑', ts: '440↑', el: '18↑' } }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3323', grades: ['SMMCC', 'SMMCD1', 'SMMCD2', 'SMMCD3', 'SMMC340', 'SMMC400', 'SMMC440', 'SMMC490', 'SMMC570'],
            coatingOptions: ['ZM60', 'ZM80', 'ZM100', 'ZM120', 'ZM140', 'ZM180', 'ZM200', 'ZM220', 'ZM275', 'ZM350', 'ZM450'],
            properties: { SMMCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM A1046', grades: ['CS Type A', 'FS Type B', 'SS Grade 33'],
            coatingOptions: ['ZM30', 'ZM40', 'ZM60', 'ZM75', 'ZM90'],
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑' } }
        },
        EN: {
            isPrepainted: false, standard: 'EN 10346', grades: ['DX51D+ZM', 'DX52D+ZM', 'S250GD+ZM', 'S320GD+ZM', 'S350GD+ZM'],
            coatingOptions: ['ZM60', 'ZM70', 'ZM90', 'ZM100', 'ZM120', 'ZM140', 'ZM175', 'ZM195', 'ZM200', 'ZM220', 'ZM275'],
            properties: { 'DX51D+ZM': { ts: '270~500', el: '22↑' } }
        }
    },

    // [2] 컬러도장 제품군 (Color Coated)
    PPGI: {
        KS: {
            isPrepainted: true, standard: 'KS D 3520', grades: ['CGCC', 'CGCD1', 'CGCD2', 'CGCD3', 'CGC340', 'CGC400', 'CGC440', 'CGC490', 'CGC570'],
            coatingOptions: ['Z06', 'Z08', 'Z10', 'Z12', 'Z14', 'Z18', 'Z20', 'Z22', 'Z25', 'Z27'],
            properties: { CGCC: { ts: '270↑' }, CGC440: { ys: '335↑', ts: '440↑', el: '18↑' } }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS G 3312', grades: ['CGCC', 'CGCD1', 'CGCD2', 'CGCD3', 'CGC340', 'CGC400', 'CGC440', 'CGC490', 'CGC570'],
            coatingOptions: ['Z08', 'Z12', 'Z18', 'Z25', 'Z27'],
            properties: { CGCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM A755', grades: ['CS Type A', 'CS Type B', 'SS Grade 33', 'SS Grade 40'],
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['DX51D', 'S250GD', 'S320GD', 'S350GD'],
            properties: { 'DX51D': { ts: '270~500', el: '22↑' } }
        }
    },
    PPGL: {
        KS: {
            isPrepainted: true, standard: 'KS D 3862', grades: ['CGLCC', 'CGLCD', 'CGLCDD', 'CGLC400', 'CGLC440', 'CGLC490', 'CGLC570'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ135', 'AZ150'],
            properties: { CGLCC: { ts: '270↑' }, CGLC440: { ys: '335↑', ts: '440↑', el: '18↑' } }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS G 3322', grades: ['CGLCC', 'CGLCD', 'CGLC400', 'CGLC440', 'CGLC490', 'CGLC570'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ150'],
            properties: { CGLCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM A755', grades: ['CS Type A', 'CS Type B', 'SS Grade 33', 'SS Grade 50'],
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['DX51D+AZ', 'DX52D+AZ', 'S250GD+AZ', 'S320GD+AZ', 'S350GD+AZ'],
            properties: { 'DX51D+AZ': { ts: '270~500', el: '22↑' } }
        }
    },
    PPAL: {
        KS: {
            isPrepainted: true, standard: 'KS D 6711', grades: ['3003-H14', '3003-H16', '3105-H16', '3105-H24', '1100-O', '5052-H32'],
            coatingOptions: ['15μm', '20μm', '25μm', '35μm'],
            properties: { '3003-H14': { ys: '115↑', ts: '140~190' } }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS H 4001', grades: ['A1100P', 'A3003P', 'A3105P', 'A5052P'],
            properties: { 'A3003P': { ys: '115↑', ts: '145~185' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM B209', grades: ['1100', '3003', '3105', '5052'],
            properties: { '3003': { ys: '115↑', ts: '140~190' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 1396', grades: ['AW-1050A', 'AW-3003', 'AW-3105', 'AW-5052'],
            properties: { 'AW-3003': { ys: '115↑', ts: '140~180' } }
        }
    },
    PPZM: {
        KS: {
            isPrepainted: true, standard: 'KS D 3034', grades: ['CGMCC', 'CGMCD1', 'CGMCD2', 'CGMCD3', 'CGMC340', 'CGMC400', 'CGMC440', 'CGMC490', 'CGMC570'],
            coatingOptions: ['ZM60', 'ZM80', 'ZM100', 'ZM120', 'ZM140', 'ZM180', 'ZM200', 'ZM220', 'ZM250', 'ZM275'],
            properties: { CGMCC: { ts: '270↑' }, CGMC440: { ys: '335↑', ts: '440↑', el: '18↑' } }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS G 3318', grades: ['CGMCC', 'CGMCD1', 'CGMCD2', 'CGMCD3', 'CGMC340', 'CGMC400', 'CGMC440', 'CGMC490', 'CGMC570'],
            coatingOptions: ['ZM60', 'ZM100', 'ZM120', 'ZM180', 'ZM275'],
            properties: { CGMCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM A755', grades: ['CS Type A', 'CS Type B', 'SS Grade 33', 'SS Grade 40'],
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['DX51D+ZM', 'S250GD+ZM', 'S320GD+ZM', 'S350GD+ZM'],
            properties: { 'DX51D+ZM': { ts: '270~500', el: '22↑' } }
        }
    }
};
