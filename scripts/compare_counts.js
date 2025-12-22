const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Comparing data counts between sheets...\n');

const workbook = XLSX.readFile(excelPath);

console.log('='.repeat(80));
console.log('【原始工作表資料筆數】');
console.log('='.repeat(80));

// 銷項工作表
if (workbook.Sheets['銷項']) {
    const sheet = workbook.Sheets['銷項'];
    const data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});
    console.log(`銷項: ${data.length - 1} 筆資料 (總列數: ${data.length})`);
}

// 三個來源工作表
const sourceSheets = ['群組資料 (2)', '重複資料 (2)', '獨立資料 (2)'];
let totalFromSources = 0;

sourceSheets.forEach(sheetName => {
    if (workbook.Sheets[sheetName]) {
        const sheet = workbook.Sheets[sheetName];
        let data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

        // Check for extra header row
        let dataRows = data.length - 1;
        let note = '';

        if (sheetName === '重複資料 (2)' || sheetName === '獨立資料 (2)') {
            if (data.length > 1) {
                dataRows = data.length - 2; // Subtract header and extra row
                note = ' (移除多餘標題列後)';
            }
        }

        console.log(`${sheetName}: ${dataRows} 筆資料${note} (總列數: ${data.length})`);
        totalFromSources += dataRows;
    }
});

console.log(`\n三個來源工作表總計: ${totalFromSources} 筆`);

// sheet3
if (workbook.Sheets['sheet3']) {
    const sheet = workbook.Sheets['sheet3'];
    const data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});
    console.log(`\nsheet3 (合併後): ${data.length - 1} 筆資料 (總列數: ${data.length})`);

    // 統計來源分布
    const sourceCounts = {};
    for (let i = 1; i < data.length; i++) {
        const source = data[i][0];
        if (source) {
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        }
    }

    console.log('\nsheet3 資料來源分布:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} 筆`);
    });

    const sheet3Total = Object.values(sourceCounts).reduce((a, b) => a + b, 0);
    console.log(`  總計: ${sheet3Total} 筆`);
}

console.log('\n' + '='.repeat(80));
console.log('【差異分析】');
console.log('='.repeat(80));

// 比對銷項和三個來源工作表
if (workbook.Sheets['銷項']) {
    const salesData = XLSX.utils.sheet_to_json(workbook.Sheets['銷項'], {header: 1, defval: ''});
    const salesCount = salesData.length - 1;

    console.log(`銷項: ${salesCount} 筆`);
    console.log(`三個來源總計: ${totalFromSources} 筆`);
    console.log(`差異: ${salesCount - totalFromSources} 筆`);

    if (workbook.Sheets['sheet3']) {
        const sheet3Data = XLSX.utils.sheet_to_json(workbook.Sheets['sheet3'], {header: 1, defval: ''});
        const sheet3Count = sheet3Data.length - 1;

        console.log(`\nsheet3: ${sheet3Count} 筆`);
        console.log(`銷項: ${salesCount} 筆`);
        console.log(`差異: ${salesCount - sheet3Count} 筆`);
    }
}

console.log('\n' + '='.repeat(80));
console.log('Done!');
