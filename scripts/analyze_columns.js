const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

const sheets = ['群組資料 (2)', '重複資料 (2)', '獨立資料 (2)'];

sheets.forEach(sheetName => {
    if (!workbook.Sheets[sheetName]) {
        console.log(`Warning: ${sheetName} not found`);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    let data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

    console.log('\n' + '='.repeat(60));
    console.log(`【${sheetName}】`);
    console.log('='.repeat(60));

    console.log('\n標題列 (row 0):');
    data[0].forEach((header, idx) => {
        if (header) {
            console.log(`  欄位 ${String.fromCharCode(65 + idx)} (index ${idx}): ${header}`);
        }
    });

    if (data.length > 1) {
        console.log('\n第二列 (row 1):');
        data[1].forEach((cell, idx) => {
            if (cell) {
                console.log(`  欄位 ${String.fromCharCode(65 + idx)} (index ${idx}): ${cell}`);
            }
        });
    }

    if (data.length > 2) {
        console.log('\n第三列 (row 2):');
        data[2].forEach((cell, idx) => {
            if (cell) {
                console.log(`  欄位 ${String.fromCharCode(65 + idx)} (index ${idx}): ${cell}`);
            }
        });
    }

    console.log(`\n總列數: ${data.length} (含標題)`);
});

console.log('\n' + '='.repeat(60));
console.log('Done!');
