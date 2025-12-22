const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

const sheets = ['重複資料 (2)', '獨立資料 (2)'];

sheets.forEach(sheetName => {
    console.log('='.repeat(80));
    console.log(`檢查 ${sheetName}`);
    console.log('='.repeat(80));

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: ''
    });

    console.log(`\nRow 0 (標題列):`);
    const row0 = data[0];
    for (let i = 0; i < Math.min(12, row0.length); i++) {
        const col = String.fromCharCode(65 + i);
        console.log(`  ${col}: "${row0[i]}"`);
    }

    console.log(`\nRow 1 (第一筆資料？):`);
    const row1 = data[1];
    for (let i = 0; i < Math.min(12, row1.length); i++) {
        const col = String.fromCharCode(65 + i);
        const value = row1[i];
        const display = typeof value === 'number' ? value : `"${value}"`;
        console.log(`  ${col}: ${display}`);
    }

    console.log(`\nRow 2 (第二筆資料):`);
    const row2 = data[2];
    for (let i = 0; i < Math.min(12, row2.length); i++) {
        const col = String.fromCharCode(65 + i);
        const value = row2[i];
        const display = typeof value === 'number' ? value : `"${value}"`;
        console.log(`  ${col}: ${display}`);
    }

    // Check if row1 looks like a header or data
    console.log(`\n判斷 Row 1 的內容:`);

    // Check for invoice number column
    let invoiceCol;
    if (sheetName === '重複資料 (2)') {
        invoiceCol = 3; // D column
    } else {
        invoiceCol = 2; // C column
    }

    const row1Invoice = row1[invoiceCol];
    const row2Invoice = row2[invoiceCol];

    console.log(`  發票號碼欄位 (${String.fromCharCode(65 + invoiceCol)} 欄):`);
    console.log(`    Row 1: ${row1Invoice}`);
    console.log(`    Row 2: ${row2Invoice}`);

    // Check if it starts with HY (typical invoice pattern)
    const isRow1Invoice = row1Invoice && row1Invoice.toString().startsWith('HY');
    const isRow2Invoice = row2Invoice && row2Invoice.toString().startsWith('HY');

    if (isRow1Invoice) {
        console.log(`  → Row 1 看起來是 **真實發票資料**，不應該被刪除！`);
    } else {
        console.log(`  → Row 1 可能是多餘的標題列`);
    }

    if (isRow2Invoice) {
        console.log(`  → Row 2 是真實發票資料`);
    }

    console.log();
});

console.log('='.repeat(80));