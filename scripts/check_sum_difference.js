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

// Read sheet3
const sheet3 = workbook.Sheets['sheet3'];
const sheet3Data = sheet3 ? XLSX.utils.sheet_to_json(sheet3, {
    header: 1,
    defval: ''
}) : null;

console.log('='.repeat(70));
console.log('檢查 G 欄位（銷售額）加總差異');
console.log('='.repeat(70));

// Calculate sum for 銷項 G2:G1423 (index 1 to 1422, column index 6 for G)
let salesSum = 0;
let salesCount = 0;
let salesNonEmpty = 0;

console.log('\n【銷項工作表】');
console.log(`檢查範圍: G2:G1423 (row 2 to 1423, 共 ${1423-1} 列)`);

for (let i = 1; i < salesData.length && i <= 1422; i++) {
    const row = salesData[i];
    const gValue = row[6]; // G column is index 6

    salesCount++;

    if (gValue !== undefined && gValue !== null && gValue !== '') {
        salesNonEmpty++;
        const numValue = typeof gValue === 'number' ? gValue : parseFloat(gValue);
        if (!isNaN(numValue)) {
            salesSum += numValue;
        }
    }
}

console.log(`總列數: ${salesCount}`);
console.log(`非空白列數: ${salesNonEmpty}`);
console.log(`G 欄加總: ${salesSum.toLocaleString()}`);

// Calculate sum for sheet3 (column G is index 6, but sheet3 has 資料來源 in column A, so G is index 6)
if (sheet3Data) {
    console.log('\n【Sheet3 工作表】');

    let sheet3Sum = 0;
    let sheet3Count = 0;
    let sheet3NonEmpty = 0;

    // Sheet3 has header at row 0, data starts from row 1
    // Column structure: A=資料來源, B=日期, C=發票號碼, D=統編, E=公司名稱, F=品名, G=銷售額
    console.log(`總列數: ${sheet3Data.length - 1} (扣除標題列)`);

    for (let i = 1; i < sheet3Data.length; i++) {
        const row = sheet3Data[i];
        const gValue = row[6]; // G column is index 6 (0-indexed)

        sheet3Count++;

        if (gValue !== undefined && gValue !== null && gValue !== '') {
            sheet3NonEmpty++;
            const numValue = typeof gValue === 'number' ? gValue : parseFloat(gValue);
            if (!isNaN(numValue)) {
                sheet3Sum += numValue;
            }
        }
    }

    console.log(`總列數: ${sheet3Count}`);
    console.log(`非空白列數: ${sheet3NonEmpty}`);
    console.log(`G 欄加總: ${sheet3Sum.toLocaleString()}`);

    console.log('\n' + '='.repeat(70));
    console.log('【差異分析】');
    console.log('='.repeat(70));

    const diff = sheet3Sum - salesSum;
    const diffPercent = ((diff / salesSum) * 100).toFixed(2);

    console.log(`銷項 G 欄加總:  ${salesSum.toLocaleString()}`);
    console.log(`Sheet3 G 欄加總: ${sheet3Sum.toLocaleString()}`);
    console.log(`差異:           ${diff.toLocaleString()} (${diffPercent}%)`);

    if (Math.abs(diff) > 0.01) {
        console.log(`\n⚠️  發現差異！Sheet3 ${diff > 0 ? '多了' : '少了'} ${Math.abs(diff).toLocaleString()}`);
    } else {
        console.log(`\n✅ 兩者加總一致`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('【進一步分析】');
    console.log('='.repeat(70));

    // Check source sheets
    const sourceSheets = ['群組資料 (2)', '重複資料 (2)', '獨立資料 (2)'];
    let totalSourceSum = 0;

    console.log('\n三個來源工作表 G 欄加總：\n');

    sourceSheets.forEach(sheetName => {
        if (workbook.Sheets[sheetName]) {
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                header: 1,
                defval: ''
            });

            let sheetSum = 0;
            let sheetCount = 0;
            let nonEmpty = 0;

            // Different sheets have different starting columns
            let gColIndex;
            if (sheetName === '群組資料 (2)') {
                gColIndex = 6; // Starts at B, so G is at index 6 (B=1, C=2, D=3, E=4, F=5, G=6)
            } else if (sheetName === '重複資料 (2)') {
                gColIndex = 6; // Starts at C, so G is at index 6 (C=2, D=3, E=4, F=5, G=6, H=7)
            } else { // 獨立資料 (2)
                gColIndex = 6; // Starts at B, so G is at index 6
            }

            for (let i = 1; i < sheetData.length; i++) {
                const row = sheetData[i];
                const gValue = row[gColIndex];

                sheetCount++;

                if (gValue !== undefined && gValue !== null && gValue !== '') {
                    nonEmpty++;
                    const numValue = typeof gValue === 'number' ? gValue : parseFloat(gValue);
                    if (!isNaN(numValue)) {
                        sheetSum += numValue;
                    }
                }
            }

            totalSourceSum += sheetSum;

            console.log(`${sheetName}:`);
            console.log(`  總列數: ${sheetCount}, 非空白: ${nonEmpty}`);
            console.log(`  G 欄加總: ${sheetSum.toLocaleString()}`);
            console.log();
        }
    });

    console.log(`三個來源工作表 G 欄總和: ${totalSourceSum.toLocaleString()}`);
    console.log(`Sheet3 G 欄加總:        ${sheet3Sum.toLocaleString()}`);
    console.log(`差異:                   ${(sheet3Sum - totalSourceSum).toLocaleString()}`);

    const sourceDiff = totalSourceSum - salesSum;
    console.log(`\n三個來源工作表 vs 銷項:`);
    console.log(`差異: ${sourceDiff.toLocaleString()} (${((sourceDiff / salesSum) * 100).toFixed(2)}%)`);

} else {
    console.log('\n⚠️  找不到 sheet3 工作表');
}
