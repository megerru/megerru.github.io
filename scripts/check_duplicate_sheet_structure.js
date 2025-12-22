const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

console.log('='.repeat(80));
console.log('檢查「重複資料 (2)」的完整欄位結構');
console.log('='.repeat(80));

const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets['重複資料 (2)'], {
    header: 1,
    defval: ''
});

const headers = sheetData[0];
const firstRow = sheetData[1];

console.log('\n所有欄位（標題列）：\n');

for (let i = 0; i < headers.length; i++) {
    const colLetter = i < 26 ? String.fromCharCode(65 + i) :
                     String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
    const header = headers[i];
    const value = firstRow[i];
    const valueStr = typeof value === 'number' ? value.toLocaleString() : `"${value}"`;

    console.log(`${colLetter.padEnd(3)} (index ${String(i).padEnd(2)}): 標題="${header}"`.padEnd(50) + ` | 第一筆=${valueStr}`);
}

// Calculate sum for each "銷售額" column
console.log('\n' + '='.repeat(80));
console.log('計算所有「銷售額」相關欄位的總和');
console.log('='.repeat(80));

for (let colIdx = 0; colIdx < headers.length; colIdx++) {
    const header = headers[colIdx];
    if (header && header.toString().includes('銷售額')) {
        const colLetter = colIdx < 26 ? String.fromCharCode(65 + colIdx) :
                         String.fromCharCode(64 + Math.floor(colIdx / 26)) + String.fromCharCode(65 + (colIdx % 26));

        let sum = 0;
        let count = 0;

        for (let i = 1; i < sheetData.length; i++) {
            const value = sheetData[i][colIdx];
            if (value !== undefined && value !== null && value !== '') {
                const numValue = typeof value === 'number' ? value : parseFloat(value);
                if (!isNaN(numValue)) {
                    sum += numValue;
                    count++;
                }
            }
        }

        console.log(`\n${colLetter} 欄 (index ${colIdx}): "${header}"`);
        console.log(`  總和: ${sum.toLocaleString()}`);
        console.log(`  有效資料: ${count} 筆`);
    }
}

console.log('\n' + '='.repeat(80));