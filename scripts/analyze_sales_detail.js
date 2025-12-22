const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

// Read 銷項 sheet
const salesSheet = workbook.Sheets['銷項'];
const salesData = XLSX.utils.sheet_to_json(salesSheet, {
    header: 1,
    defval: ''
});

console.log('='.repeat(80));
console.log('銷項工作表詳細分析');
console.log('='.repeat(80));

console.log(`\n總列數: ${salesData.length}`);
console.log(`資料列數: ${salesData.length - 1} (扣除標題列)`);

// Find 銷售額 column
const headers = salesData[0];
let salesColIndex = -1;

for (let i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toString().includes('銷售額')) {
        salesColIndex = i;
        console.log(`\n銷售額欄位: ${String.fromCharCode(65 + i)} 欄 (index ${i})`);
        break;
    }
}

if (salesColIndex === -1) {
    console.log('\n❌ 找不到銷售額欄位');
    process.exit(1);
}

// Analyze all rows
console.log('\n分析所有資料列:');

let totalSum = 0;
let validRows = 0;
let emptyRows = 0;
let invalidRows = 0;

const rowDetails = [];

for (let i = 1; i < salesData.length; i++) {
    const row = salesData[i];
    const value = row[salesColIndex];
    const rowNum = i + 1; // Excel row number (1-based)

    if (value === undefined || value === null || value === '') {
        emptyRows++;
        if (i < 10 || i > salesData.length - 5) {
            rowDetails.push({rowNum, type: 'empty', value: null});
        }
    } else {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numValue)) {
            invalidRows++;
            if (invalidRows < 10) {
                rowDetails.push({rowNum, type: 'invalid', value: value});
            }
        } else {
            validRows++;
            totalSum += numValue;
            if (i < 10 || i > salesData.length - 5) {
                rowDetails.push({rowNum, type: 'valid', value: numValue});
            }
        }
    }
}

console.log(`  有效數值列: ${validRows}`);
console.log(`  空白列: ${emptyRows}`);
console.log(`  無效數值列: ${invalidRows}`);
console.log(`  總和: ${totalSum.toLocaleString()}`);

console.log('\n前幾列和後幾列的詳細資訊:');
rowDetails.forEach(detail => {
    const typeLabel = detail.type === 'valid' ? '✅' : detail.type === 'empty' ? '⬜' : '❌';
    const valueStr = detail.value === null ? '(空白)' :
                     detail.type === 'invalid' ? `"${detail.value}"` :
                     detail.value.toLocaleString();
    console.log(`  Row ${detail.rowNum}: ${typeLabel} ${valueStr}`);
});

// Check the specific range G2:G1423
console.log('\n' + '='.repeat(80));
console.log('檢查特定範圍 G2:G1423');
console.log('='.repeat(80));

let rangeSum = 0;
let rangeValid = 0;
let rangeEmpty = 0;

const startRow = 1; // Index 1 = Row 2 in Excel
const endRow = Math.min(1422, salesData.length - 1); // Index 1422 = Row 1423 in Excel

console.log(`\n實際檢查範圍: Row ${startRow + 1} to Row ${endRow + 1} (index ${startRow} to ${endRow})`);

for (let i = startRow; i <= endRow; i++) {
    const row = salesData[i];
    const value = row[salesColIndex];

    if (value !== undefined && value !== null && value !== '') {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(numValue)) {
            rangeSum += numValue;
            rangeValid++;
        }
    } else {
        rangeEmpty++;
    }
}

console.log(`  有效數值: ${rangeValid}`);
console.log(`  空白: ${rangeEmpty}`);
console.log(`  總和: ${rangeSum.toLocaleString()}`);

// Check if there are more rows beyond 1423
if (salesData.length > 1423) {
    console.log('\n' + '='.repeat(80));
    console.log(`⚠️  銷項工作表有 ${salesData.length - 1423} 列資料在 Row 1423 之後`);
    console.log('='.repeat(80));

    let beyondSum = 0;
    let beyondValid = 0;

    for (let i = 1423; i < salesData.length; i++) {
        const row = salesData[i];
        const value = row[salesColIndex];

        if (value !== undefined && value !== null && value !== '') {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            if (!isNaN(numValue)) {
                beyondSum += numValue;
                beyondValid++;
            }
        }
    }

    console.log(`  Row 1424 之後的資料:`);
    console.log(`    有效數值列: ${beyondValid}`);
    console.log(`    總和: ${beyondSum.toLocaleString()}`);
    console.log(`\n  如果包含這些資料:`);
    console.log(`    完整總和: ${(rangeSum + beyondSum).toLocaleString()}`);
}

console.log('\n' + '='.repeat(80));