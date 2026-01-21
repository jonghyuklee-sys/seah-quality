// 세아씨엠 품질조회시스템 - 글로벌 전 규격 통합 데이터베이스 (KS/JIS/ASTM/EN 완벽 대응)
const steelData = {
    // [1] 도금 제품군 (Metallic Coated)
    GI: {
        KS: {
            isPrepainted: false, standard: 'KS D 3506', grades: ['SGCC', 'SGCD1', 'SGC340', 'SGC400', 'SGC440'],
            coatingOptions: ['Z06', 'Z08', 'Z10', 'Z12', 'Z14', 'Z18', 'Z20', 'Z22', 'Z25', 'Z27', 'Z30', 'Z35', 'Z45', 'Z60'],
            chemical: { C: '0.15↓', Mn: '0.80↓', P: '0.035↓', S: '0.030↓' }, coating: { type: 'Zn', method: 'GI' }, tolerance: { thickness: '±0.05~0.15mm', flatness: '12mm↓' },
            properties: { SGCC: { ts: '270↑', el: '-', bend: '0t' }, SGC340: { ys: '245↑', ts: '340↑', el: '20↑', bend: '1t' } }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3302', grades: ['SGCC', 'SGCD1', 'SGCD2', 'SGC340', 'SGC400', 'SGC440'],
            coatingOptions: ['Z06', 'Z08', 'Z10', 'Z12', 'Z14', 'Z18', 'Z20', 'Z22', 'Z25', 'Z27', 'Z35', 'Z45', 'Z60'],
            chemical: { C: '0.15↓', Mn: '0.80↓' }, coating: { type: 'Zn', method: 'Hot-Dip' }, tolerance: { thickness: 'JIS G 3302', flatness: 'JIS G 3302' },
            properties: { SGCC: { ts: '270↑' }, SGC340: { ys: '245↑', ts: '340↑' } }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM A653', grades: ['CS Type A', 'CS Type B', 'FS Type B', 'SS Grade 33', 'SS Grade 40', 'SS Grade 50'],
            coatingOptions: ['G30', 'G40', 'G60', 'G90', 'G115', 'G140', 'G165', 'G185', 'G210', 'G235', 'G250', 'G275', 'G300', 'G360'],
            chemical: { C: '0.20↓' }, coating: { type: 'Zn', method: 'Hot-Dip' }, tolerance: { thickness: 'ASTM A924' },
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑' }, 'CS Type A': { ys: '-', ts: '-' } }
        },
        EN: {
            isPrepainted: false, standard: 'EN 10346', grades: ['DX51D', 'DX52D', 'S220GD', 'S250GD', 'S280GD', 'S320GD', 'S350GD'],
            coatingOptions: ['Z100', 'Z140', 'Z200', 'Z225', 'Z275', 'Z350', 'Z450', 'Z600'],
            chemical: { C: '0.12↓' }, coating: { type: 'Z (Pure Zn)', method: 'Hot-Dip' },
            properties: { 'DX51D': { ts: '270~500' }, 'S250GD': { ys: '250↑', ts: '330↑' } }
        }
    },
    GL: {
        KS: {
            isPrepainted: false, standard: 'KS D 3770', grades: ['SGLCC', 'SGLCD', 'SGLC400', 'SGLC440', 'SGLC570'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ135', 'AZ150', 'AZ165', 'AZ185'],
            chemical: { C: '0.15↓', Si: '1.6 typ', Al: '55 typ' }, coating: { type: '55% Al-Zn', method: 'GL' }, tolerance: { thickness: '±0.06~0.18mm' },
            properties: { SGLCC: { ts: '270↑', bend: '1t' }, SGLC400: { ys: '295↑', ts: '400↑' } }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3321', grades: ['SGLCC', 'SGLCD', 'SGLC400', 'SGLC440', 'SGLC490', 'SGLC570'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ135', 'AZ150', 'AZ185'],
            chemical: { C: '0.15↓' }, coating: { type: 'AZ (Al-Zn)', method: 'Hot-Dip' },
            properties: { SGLCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM A792', grades: ['CS Type A', 'CS Type B', 'SS Grade 33', 'SS Grade 50', 'SS Grade 80'],
            coatingOptions: ['AZ50', 'AZ55', 'AZ60'],
            chemical: { C: '0.20↓' }, coating: { type: 'AZ (Al-Zn)', method: 'Hot-Dip' },
            properties: { 'SS Grade 33': { ys: '230↑', ts: '310↑' } }
        },
        EN: {
            isPrepainted: false, standard: 'EN 10346', grades: ['DX51D+AZ', 'DX52D+AZ', 'S250GD+AZ', 'S320GD+AZ', 'S350GD+AZ'],
            coatingOptions: ['AZ100', 'AZ150', 'AZ185'],
            properties: { 'DX51D+AZ': { ts: '270~500' } }
        }
    },
    AL: {
        KS: {
            isPrepainted: false, standard: 'KS D 6701', grades: ['3003-H14', '3105-H16', '3105-H24', '1100-O', '5052-H32'],
            coatingOptions: ['40 (g/㎡)', '60 (g/㎡)', '80 (g/㎡)', 'Ba-re'],
            chemical: { Al: '96.7↑', Mn: '1.0~1.5' }, coating: { type: 'Al-Si', method: 'Aluminized' },
            properties: { '3003-H14': { ts: '145~185' } }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS H 4000', grades: ['A1100P', 'A3003P', 'A3105P', 'A5052P'],
            coatingOptions: ['Bare', 'Coated'],
            properties: { 'A3003P': { ts: '145~185' } }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM B209', grades: ['1100', '3003', '3105', '5052'],
            coatingOptions: ['Bare'],
            properties: { '3003': { ts: '110~145' } }
        },
        EN: {
            isPrepainted: false, standard: 'EN 485', grades: ['AW-1050A', 'AW-3003', 'AW-3105'],
            coatingOptions: ['Bare'],
            properties: { 'AW-3003': { ts: '140~180' } }
        }
    },
    GIX: {
        KS: {
            isPrepainted: false, standard: 'KS D 3030', grades: ['SDCC', 'SDCD1', 'SDC340', 'SDC400', 'SDC440'],
            coatingOptions: ['K06', 'K08', 'K10', 'K12', 'K14', 'K18', 'K20', 'K22', 'K25', 'K27', 'K35', 'K45', 'K60'],
            chemical: { C: '0.15↓', Mg: '1.0~4.0' }, coating: { type: 'Zn-Al-Mg', method: 'GIX' },
            properties: { SDCC: { ts: '270↑' } }
        },
        JIS: {
            isPrepainted: false, standard: 'JIS G 3323', grades: ['SMMCC', 'SMMCD', 'SMM340', 'SMM400'],
            coatingOptions: ['K12', 'K18', 'K27', 'K35', 'K45'],
            properties: { SMMCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: false, standard: 'ASTM A1046', grades: ['CS Type A', 'FS Type B', 'SS Grade 33'],
            coatingOptions: ['ZM30', 'ZM40', 'ZM60', 'ZM75', 'ZM90'],
            properties: { 'CS Type A': { ys: '-', ts: '-' } }
        },
        EN: {
            isPrepainted: false, standard: 'EN 10346', grades: ['DX51D+ZM', 'DX52D+ZM', 'S250GD+ZM', 'S350GD+ZM'],
            coatingOptions: ['ZM60', 'ZM70', 'ZM90', 'ZM100', 'ZM120', 'ZM140', 'ZM175', 'ZM195', 'ZM200', 'ZM220', 'ZM275', 'ZM310'],
            properties: { 'DX51D+ZM': { ts: '270~500' } }
        }
    },

    // [2] 컬러도장 제품군 (Color Coated)
    PPGI: {
        KS: {
            isPrepainted: true, standard: 'KS D 3520', grades: ['CGCC', 'CGCD1', 'CGC340', 'CGC400'],
            coatingOptions: ['Z06', 'Z08', 'Z10', 'Z12', 'Z14', 'Z18', 'Z20', 'Z22', 'Z25', 'Z27'],
            prepainted: { resins: ['PE', 'SMP', 'PVDF'], specs: { 'PE': { bend: '3T~5T', impact: '500gx50cm', salt: '500h' } } },
            chemical: { C: '0.15↓' }, coating: { type: 'Paint/Zn', method: 'CCL' },
            properties: { CGCC: { ts: '270↑' } }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS G 3312', grades: ['CGCC', 'CGCD', 'CGCH'],
            coatingOptions: ['Z08', 'Z12', 'Z18', 'Z25', 'Z27'],
            chemical: { C: '0.15↓' }, coating: { type: 'Paint/Zn', method: 'CCL' },
            properties: { CGCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM A755', grades: ['CS Type A', 'CS Type B', 'SS Grade 33', 'SS Grade 40'],
            coatingOptions: ['G40', 'G60', 'G90'],
            chemical: { C: '0.20↓' }, coating: { type: 'Paint/Zn', method: 'CCL' },
            properties: { 'SS Grade 33': { ys: '230↑' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['DX51D', 'S250GD', 'S320GD'],
            coatingOptions: ['Z100', 'Z140', 'Z200', 'Z275'],
            chemical: { C: '0.12↓' }, coating: { type: 'Paint/Zn', method: 'CCL' },
            properties: { 'DX51D': { ts: '270~500' } }
        }
    },
    PPGL: {
        KS: {
            isPrepainted: true, standard: 'KS D 3862', grades: ['CGLCC', 'CGLCD', 'CGLC400', 'CGLC440'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ135', 'AZ150'],
            prepainted: { resins: ['Polyester', 'PVDF'], specs: { 'Polyester': { bend: '4T~6T', impact: '500gx30cm', salt: '1000h' } } },
            chemical: { C: '0.15↓' }, coating: { type: 'Paint/GL', method: 'CCL' },
            properties: { CGLCC: { ts: '270↑' } }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS G 3322', grades: ['CGLCC', 'CGLCD', 'CGLC400'],
            coatingOptions: ['AZ70', 'AZ90', 'AZ120', 'AZ150'],
            properties: { CGLCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM A755', grades: ['CS Type B', 'SS Grade 33', 'SS Grade 50'],
            coatingOptions: ['AZ50', 'AZ55', 'AZ60'],
            properties: { 'SS Grade 33': { ys: '230↑' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['DX51D+AZ', 'S250GD+AZ'],
            coatingOptions: ['AZ100', 'AZ150', 'AZ185'],
            properties: { 'DX51D+AZ': { ts: '270~500' } }
        }
    },
    PPAL: {
        KS: {
            isPrepainted: true, standard: 'KS D 6711', grades: ['3003-H16', '3105-H16', '3003-H14'],
            coatingOptions: ['15μm (Top)', '20μm (Top)', '25μm (Top)', '35μm (Top)'],
            prepainted: { resins: ['PE', 'PVDF'], specs: { 'PE': { bend: '1T~2T', impact: 'Pass', salt: '1500h' } } },
            chemical: { Al: '96.7↑' }, coating: { type: 'Color Coating', method: 'CCL' },
            properties: { '3003-H16': { ts: '170~215' } }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS H 4000', grades: ['A3003P', 'A3105P'],
            coatingOptions: ['20μm', '25μm'],
            properties: { 'A3003P': { ts: '145~185' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM B209', grades: ['3003', '3105'],
            coatingOptions: ['Paint Coating'],
            properties: { '3003': { ts: '140~190' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 485', grades: ['AW-3003', 'AW-3105'],
            coatingOptions: ['Coated'],
            properties: { 'AW-3003': { ts: '140~180' } }
        }
    },
    PPZM: {
        KS: {
            isPrepainted: true, standard: 'KS D 3520 (ZM)', grades: ['CDCC', 'CDC340', 'CDC440'],
            coatingOptions: ['K06', 'K08', 'K10', 'K12', 'K14', 'K18', 'K20', 'K22', 'K25', 'K27'],
            prepainted: { resins: ['PE', 'PVDF'], specs: { 'PE': { bend: '3T~5T', impact: '500gx50cm', salt: '2000h' } } },
            chemical: { C: '0.15↓' }, coating: { type: 'Paint/ZM', method: 'CCL' },
            properties: { CDCC: { ts: '270↑' } }
        },
        JIS: {
            isPrepainted: true, standard: 'JIS G 3323', grades: ['CMMCC', 'CMM340'],
            coatingOptions: ['K08', 'K12', 'K18'],
            properties: { CMMCC: { ts: '270↑' } }
        },
        ASTM: {
            isPrepainted: true, standard: 'ASTM A1046', grades: ['CS Type A', 'SS Grade 33'],
            coatingOptions: ['ZM40', 'ZM60'],
            properties: { 'CS Type A': { ys: '-', ts: '-' } }
        },
        EN: {
            isPrepainted: true, standard: 'EN 10169', grades: ['DX51D+ZM', 'S250GD+ZM'],
            coatingOptions: ['ZM90', 'ZM120', 'ZM140'],
            properties: { 'DX51D+ZM': { ts: '270~500' } }
        }
    }
};
