const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('驗證：銷項 vs 群組+重複+獨立資料\n');

const workbook = XLSX.readFile(excelPath);

// 讀取銷項工作表
console.log('='.repeat(80));
console.log('【銷項工作表】');
console.log('='.repeat(80));

if (!workbook.Sheets['銷項']) {
    console.log('Error: 銷項 not found');
    process.exit(1);
}

const salesSheet = workbook.Sheets['銷項'];
const salesData = XLSX.utils.sheet_to_json(salesSheet, {header: 1, defval: ''});

console.log(`總列數: ${salesData.length}`);
console.log(`資料筆數: ${salesData.length - 1}`);

// 統計有公司名稱的筆數
const companyCol = 4; // E欄
let salesWithCompany = 0;
let salesWithoutCompany = 0;
let salesFullyEmpty = 0;

for (let i = 1; i < salesData.length; i++) {
    const company = salesData[i][companyCol];
    const isFullyEmpty = salesData[i].every(cell => !cell || cell === '');

    if (isFullyEmpty) {
        salesFullyEmpty++;
    } else if (company && company !== '') {
        salesWithCompany++;
    } else {
        salesWithoutCompany++;
    }
}

console.log(`  - 有公司名稱: ${salesWithCompany} 筆`);
console.log(`  - 無公司名稱但有資料: ${salesWithoutCompany} 筆`);
console.log(`  - 整列空白: ${salesFullyEmpty} 筆`);
console.log(`  - 有效資料: ${salesWithCompany + salesWithoutCompany} 筆`);

// 讀取三個分拆的工作表
console.log('\n' + '='.repeat(80));
console.log('【三個分拆工作表】');
console.log('='.repeat(80));

const sourceSheets = ['群組資料 (2)', '重複資料 (2)', '獨立資料 (2)'];
const COMPANY_COL_INDEX = {
    '群組資料 (2)': 4,
    '重複資料 (2)': 5,
    '獨立資料 (2)': 4
};

let totalSource = 0;
let totalSourceWithCompany = 0;
let totalSourceWithoutCompany = 0;
let totalSourceFullyEmpty = 0;

sourceSheets.forEach(sheetName => {
    if (!workbook.Sheets[sheetName]) {
        console.log(`Warning: ${sheetName} not found`);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    let data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

    // 移除多餘標題列
    if ((sheetName === '重複資料 (2)' || sheetName === '獨立資料 (2)') && data.length > 1) {
        data = [data[0], ...data.slice(2)];
    }

    const colIndex = COMPANY_COL_INDEX[sheetName];
    let withCompany = 0;
    let withoutCompany = 0;
    let fullyEmpty = 0;

    for (let i = 1; i < data.length; i++) {
        const company = data[i][colIndex];
        const isFullyEmpty = data[i].every(cell => !cell || cell === '');

        if (isFullyEmpty) {
            fullyEmpty++;
        } else if (company && company !== '') {
            withCompany++;
        } else {
            withoutCompany++;
        }
    }

    const dataRows = data.length - 1;
    totalSource += dataRows;
    totalSourceWithCompany += withCompany;
    totalSourceWithoutCompany += withoutCompany;
    totalSourceFullyEmpty += fullyEmpty;

    console.log(`\n${sheetName}:`);
    console.log(`  總資料筆數: ${dataRows}`);
    console.log(`  - 有公司名稱: ${withCompany} 筆`);
    console.log(`  - 無公司名稱但有資料: ${withoutCompany} 筆`);
    console.log(`  - 整列空白: ${fullyEmpty} 筆`);
    console.log(`  - 有效資料: ${withCompany + withoutCompany} 筆`);
});

console.log('\n' + '='.repeat(80));
console.log('【總計】');
console.log('='.repeat(80));

console.log(`\n三個分拆工作表總計:`);
console.log(`  總資料筆數: ${totalSource} 筆`);
console.log(`  - 有公司名稱: ${totalSourceWithCompany} 筆`);
console.log(`  - 無公司名稱但有資料: ${totalSourceWithoutCompany} 筆`);
console.log(`  - 整列空白: ${totalSourceFullyEmpty} 筆`);
console.log(`  - 有效資料: ${totalSourceWithCompany + totalSourceWithoutCompany} 筆`);

console.log('\n' + '='.repeat(80));
console.log('【比對結果】');
console.log('='.repeat(80));

const salesValid = salesWithCompany + salesWithoutCompany;
const sourceValid = totalSourceWithCompany + totalSourceWithoutCompany;

console.log(`\n銷項有效資料: ${salesValid} 筆`);
console.log(`分拆工作表有效資料: ${sourceValid} 筆`);
console.log(`差異: ${salesValid - sourceValid} 筆`);

if (salesValid === sourceValid) {
    console.log('\n✅ 完全一致！銷項的有效資料 = 三個分拆工作表的總和');
} else if (salesValid === sourceValid + 1) {
    console.log('\n⚠️  銷項比分拆工作表多 1 筆資料');
} else {
    console.log(`\n❌ 有差異：銷項 ${salesValid > sourceValid ? '多' : '少'} ${Math.abs(salesValid - sourceValid)} 筆`);
}

// 檢查 sheet3
if (workbook.Sheets['sheet3']) {
    const sheet3 = workbook.Sheets['sheet3'];
    const sheet3Data = XLSX.utils.sheet_to_json(sheet3, {header: 1, defval: ''});

    console.log('\n' + '='.repeat(80));
    console.log('【Sheet3】');
    console.log('='.repeat(80));
    console.log(`資料筆數: ${sheet3Data.length - 1} 筆`);

    if (sheet3Data.length - 1 === sourceValid) {
        console.log('✅ Sheet3 = 分拆工作表有效資料');
    } else if (sheet3Data.length - 1 === salesValid) {
        console.log('✅ Sheet3 = 銷項有效資料');
    } else {
        console.log(`⚠️  Sheet3 與銷項差異: ${(sheet3Data.length - 1) - salesValid} 筆`);
    }
}

console.log('\n' + '='.repeat(80));
console.log('Done!');
