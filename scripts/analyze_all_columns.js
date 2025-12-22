const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Analyzing ALL columns in each sheet...\n');

const workbook = XLSX.readFile(excelPath);
const sheets = ['群組資料 (2)', '重複資料 (2)', '獨立資料 (2)'];

sheets.forEach(sheetName => {
    if (!workbook.Sheets[sheetName]) {
        console.log(`Warning: ${sheetName} not found`);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    let data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

    console.log('\n' + '='.repeat(80));
    console.log(`【${sheetName}】`);
    console.log('='.repeat(80));

    // Find max column length
    let maxCols = 0;
    for (let row of data) {
        maxCols = Math.max(maxCols, row.length);
    }

    console.log(`\n最大欄位數: ${maxCols}`);
    console.log('\n完整標題列對應 (row 0):');

    for (let idx = 0; idx < maxCols; idx++) {
        const header = data[0][idx] || '';
        const col = idx < 26 ? String.fromCharCode(65 + idx) :
                    String.fromCharCode(65 + Math.floor(idx/26) - 1) + String.fromCharCode(65 + (idx%26));

        if (header) {
            console.log(`  欄位 ${col} (index ${idx}): ${header}`);
        } else {
            console.log(`  欄位 ${col} (index ${idx}): <空白>`);
        }
    }

    // Show a sample data row
    if (data.length > 1) {
        console.log('\n樣本資料列 (row 1) - 非空白欄位:');
        for (let idx = 0; idx < data[1].length; idx++) {
            const value = data[1][idx];
            if (value !== '' && value !== undefined && value !== null) {
                const col = idx < 26 ? String.fromCharCode(65 + idx) :
                        String.fromCharCode(65 + Math.floor(idx/26) - 1) + String.fromCharCode(65 + (idx%26));
                console.log(`  欄位 ${col} (index ${idx}): ${value}`);
            }
        }
    }
});

console.log('\n' + '='.repeat(80));
console.log('Done!');
