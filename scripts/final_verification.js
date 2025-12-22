const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

console.log('='.repeat(80));
console.log('最終驗證：銷項 vs Sheet3 vs 三個來源工作表');
console.log('='.repeat(80));

// Helper function to calculate sum for a specific column
function calculateSum(data, colIndex, skipRows = []) {
    let sum = 0;
    let count = 0;

    for (let i = 1; i < data.length; i++) {
        if (skipRows.includes(i)) continue;

        const value = data[i][colIndex];
        if (value !== undefined && value !== null && value !== '') {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            if (!isNaN(numValue)) {
                sum += numValue;
                count++;
            }
        }
    }

    return { sum, count };
}

// 銷項
const salesData = XLSX.utils.sheet_to_json(workbook.Sheets['銷項'], { header: 1, defval: '' });
const salesAllRows = calculateSum(salesData, 6); // G column
const salesWithoutLast = calculateSum(salesData, 6, [salesData.length - 1]); // Exclude last row

console.log('\n【銷項工作表】');
console.log(`  全部資料 (Row 2 ~ ${salesData.length}): ${salesAllRows.sum.toLocaleString()} (${salesAllRows.count} 筆)`);
console.log(`  不含最後一列 (Row 2 ~ ${salesData.length - 1}): ${salesWithoutLast.sum.toLocaleString()} (${salesWithoutLast.count} 筆)`);
console.log(`  最後一列 (Row ${salesData.length}): ${(salesAllRows.sum - salesWithoutLast.sum).toLocaleString()}`);

// Sheet3
if (workbook.Sheets['sheet3']) {
    const sheet3Data = XLSX.utils.sheet_to_json(workbook.Sheets['sheet3'], { header: 1, defval: '' });
    const sheet3Result = calculateSum(sheet3Data, 6); // G column (index 6)

    console.log('\n【Sheet3 工作表】');
    console.log(`  全部資料: ${sheet3Result.sum.toLocaleString()} (${sheet3Result.count} 筆)`);
    console.log(`  總列數: ${sheet3Data.length - 1} 列 (扣除標題)`);

    const diff = sheet3Result.sum - salesWithoutLast.sum;
    console.log(`\n  與銷項明細 (不含加總列) 差異: ${diff.toLocaleString()}`);
}

// 三個來源工作表
const sourceSheets = {
    '群組資料 (2)': { startCol: 1, salesCol: 6 },
    '重複資料 (2)': { startCol: 2, salesCol: 7 }, // H column for 重複資料
    '獨立資料 (2)': { startCol: 1, salesCol: 6 }
};

console.log('\n【三個來源工作表】');

let totalSource = 0;

Object.entries(sourceSheets).forEach(([sheetName, config]) => {
    if (workbook.Sheets[sheetName]) {
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
        const result = calculateSum(data, config.salesCol);

        totalSource += result.sum;

        console.log(`\n  ${sheetName}:`);
        console.log(`    銷售額欄位: ${String.fromCharCode(65 + config.salesCol)} 欄 (index ${config.salesCol})`);
        console.log(`    總和: ${result.sum.toLocaleString()} (${result.count} 筆)`);
    }
});

console.log(`\n  三個來源總和: ${totalSource.toLocaleString()}`);

if (workbook.Sheets['sheet3']) {
    const sheet3Data = XLSX.utils.sheet_to_json(workbook.Sheets['sheet3'], { header: 1, defval: '' });
    const sheet3Result = calculateSum(sheet3Data, 6);

    const diff = sheet3Result.sum - totalSource;
    console.log(`  與 Sheet3 差異: ${diff.toLocaleString()}`);
}

console.log('\n' + '='.repeat(80));
console.log('【結論】');
console.log('='.repeat(80));

const salesData2 = XLSX.utils.sheet_to_json(workbook.Sheets['銷項'], { header: 1, defval: '' });
const salesWithoutLast2 = calculateSum(salesData2, 6, [salesData2.length - 1]);

if (workbook.Sheets['sheet3']) {
    const sheet3Data2 = XLSX.utils.sheet_to_json(workbook.Sheets['sheet3'], { header: 1, defval: '' });
    const sheet3Result2 = calculateSum(sheet3Data2, 6);

    console.log(`\n銷項明細資料 (不含加總列): ${salesWithoutLast2.sum.toLocaleString()}`);
    console.log(`Sheet3 資料:               ${sheet3Result2.sum.toLocaleString()}`);
    console.log(`三個來源總和:              ${totalSource.toLocaleString()}`);

    const missing = salesWithoutLast2.sum - totalSource;
    console.log(`\n❗ 三個來源工作表比銷項明細少了: ${missing.toLocaleString()}`);
    console.log(`   這表示有 ${missing.toLocaleString()} 的資料在分拆時遺失了`);
}

console.log('\n' + '='.repeat(80));