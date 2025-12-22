const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

console.log('='.repeat(80));
console.log('檢查 Sheet3 實際包含了哪些欄位');
console.log('='.repeat(80));

if (!workbook.Sheets['sheet3']) {
    console.log('❌ Sheet3 不存在');
    process.exit(1);
}

const sheet3Data = XLSX.utils.sheet_to_json(workbook.Sheets['sheet3'], {
    header: 1,
    defval: ''
});

const headers = sheet3Data[0];

console.log('\nSheet3 的欄位結構（前 30 欄）:\n');

for (let i = 0; i < Math.min(30, headers.length); i++) {
    const colLetter = i < 26 ? String.fromCharCode(65 + i) :
                     String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
    console.log(`${colLetter.padEnd(3)} (index ${String(i).padEnd(2)}): "${headers[i]}"`);
}

console.log(`\n總共 ${headers.length} 欄`);

// Find all 銷售額 columns
console.log('\n' + '='.repeat(80));
console.log('所有「銷售額」欄位');
console.log('='.repeat(80));

const salesColumns = [];

for (let i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toString().includes('銷售額')) {
        salesColumns.push(i);
        const colLetter = i < 26 ? String.fromCharCode(65 + i) :
                         String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
        console.log(`${colLetter} 欄 (index ${i}): "${headers[i]}"`);
    }
}

// Calculate sum for each sales column and show breakdown by source
console.log('\n' + '='.repeat(80));
console.log('各「銷售額」欄位的加總（按資料來源分組）');
console.log('='.repeat(80));

salesColumns.forEach(colIdx => {
    const colLetter = colIdx < 26 ? String.fromCharCode(65 + colIdx) :
                     String.fromCharCode(64 + Math.floor(colIdx / 26)) + String.fromCharCode(65 + (colIdx % 26));

    console.log(`\n${colLetter} 欄 (index ${colIdx}):`);

    const sourceBreakdown = {};
    let totalSum = 0;
    let totalCount = 0;

    for (let i = 1; i < sheet3Data.length; i++) {
        const row = sheet3Data[i];
        const source = row[0]; // 資料來源 in column A
        const value = row[colIdx];

        if (!sourceBreakdown[source]) {
            sourceBreakdown[source] = { sum: 0, count: 0 };
        }

        if (value !== undefined && value !== null && value !== '') {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            if (!isNaN(numValue)) {
                sourceBreakdown[source].sum += numValue;
                sourceBreakdown[source].count++;
                totalSum += numValue;
                totalCount++;
            }
        }
    }

    Object.entries(sourceBreakdown).forEach(([source, data]) => {
        console.log(`  ${source}: ${data.sum.toLocaleString()} (${data.count} 筆)`);
    });

    console.log(`  ---`);
    console.log(`  總計: ${totalSum.toLocaleString()} (${totalCount} 筆)`);
});

console.log('\n' + '='.repeat(80));