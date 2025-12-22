const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

console.log('='.repeat(80));
console.log('檢查各工作表的欄位結構');
console.log('='.repeat(80));

// Check all sheets
const sheets = ['銷項', '群組資料 (2)', '重複資料 (2)', '獨立資料 (2)', 'sheet3'];

sheets.forEach(sheetName => {
    if (!workbook.Sheets[sheetName]) {
        console.log(`\n❌ 找不到工作表: ${sheetName}`);
        return;
    }

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: ''
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`【${sheetName}】`);
    console.log('='.repeat(80));

    // Show header row
    console.log('\n標題列 (前 10 欄):');
    const headers = data[0] || [];
    for (let i = 0; i < Math.min(10, headers.length); i++) {
        const colLetter = String.fromCharCode(65 + i); // A, B, C, ...
        console.log(`  ${colLetter} (index ${i}): "${headers[i]}"`);
    }

    // Show first data row
    console.log('\n第一筆資料 (前 10 欄):');
    const firstDataRow = data[1] || [];
    for (let i = 0; i < Math.min(10, firstDataRow.length); i++) {
        const colLetter = String.fromCharCode(65 + i);
        const value = firstDataRow[i];
        const display = typeof value === 'number' ? value.toLocaleString() : `"${value}"`;
        console.log(`  ${colLetter} (index ${i}): ${display}`);
    }

    // Find which column contains "銷售額" header
    console.log('\n"銷售額" 欄位位置:');
    let salesColIndex = -1;
    for (let i = 0; i < headers.length; i++) {
        if (headers[i] && headers[i].toString().includes('銷售額')) {
            salesColIndex = i;
            const colLetter = String.fromCharCode(65 + i);
            console.log(`  找到於: ${colLetter} 欄 (index ${i})`);
            console.log(`  第一筆資料值: ${firstDataRow[i]}`);
        }
    }

    if (salesColIndex === -1) {
        console.log('  ⚠️  找不到"銷售額"欄位');
    }

    // Calculate sum
    console.log('\n計算加總 (從第 2 列開始):');
    let sum = 0;
    let count = 0;
    let nonEmpty = 0;

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (salesColIndex >= 0) {
            const value = row[salesColIndex];
            count++;

            if (value !== undefined && value !== null && value !== '') {
                nonEmpty++;
                const numValue = typeof value === 'number' ? value : parseFloat(value);
                if (!isNaN(numValue)) {
                    sum += numValue;
                }
            }
        }
    }

    console.log(`  總列數: ${count}`);
    console.log(`  非空白列數: ${nonEmpty}`);
    console.log(`  加總: ${sum.toLocaleString()}`);
});

// Special check for sheet3 - examine the 資料來源 column
console.log(`\n${'='.repeat(80)}`);
console.log('【Sheet3 資料來源統計】');
console.log('='.repeat(80));

if (workbook.Sheets['sheet3']) {
    const sheet3Data = XLSX.utils.sheet_to_json(workbook.Sheets['sheet3'], {
        header: 1,
        defval: ''
    });

    const sourceCounts = {};
    for (let i = 1; i < sheet3Data.length; i++) {
        const source = sheet3Data[i][0]; // 資料來源 is column A (index 0)
        if (source) {
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        }
    }

    console.log('\n各來源工作表的資料筆數:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} 筆`);
    });
}

console.log('\n' + '='.repeat(80));
