const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('檢查空白公司名稱的資料列是否整列都空白...\n');

const workbook = XLSX.readFile(excelPath);

const sourceSheets = ['群組資料 (2)', '重複資料 (2)', '獨立資料 (2)'];

const COMPANY_COL_INDEX = {
    '群組資料 (2)': 4,  // E欄
    '重複資料 (2)': 5,  // F欄
    '獨立資料 (2)': 4   // E欄
};

let totalEmptyCompany = 0;
let totalFullyEmpty = 0;
let totalPartiallyEmpty = 0;

sourceSheets.forEach(sheetName => {
    if (!workbook.Sheets[sheetName]) return;

    const sheet = workbook.Sheets[sheetName];
    let data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

    // 移除多餘標題列
    if ((sheetName === '重複資料 (2)' || sheetName === '獨立資料 (2)') && data.length > 1) {
        data = [data[0], ...data.slice(2)];
    }

    const colIndex = COMPANY_COL_INDEX[sheetName];

    console.log('='.repeat(80));
    console.log(`【${sheetName}】`);
    console.log('='.repeat(80));

    let emptyCompanyCount = 0;
    let fullyEmptyCount = 0;
    let partiallyEmptyCount = 0;

    const fullyEmptyRows = [];
    const partiallyEmptyRows = [];

    for (let i = 1; i < data.length; i++) {
        const company = data[i][colIndex];

        if (!company || company === '') {
            emptyCompanyCount++;

            // 檢查整列是否都是空白
            const isFullyEmpty = data[i].every(cell => !cell || cell === '');

            if (isFullyEmpty) {
                fullyEmptyCount++;
                if (fullyEmptyRows.length < 5) {
                    fullyEmptyRows.push(i + 1); // +1 for Excel row number
                }
            } else {
                partiallyEmptyCount++;
                if (partiallyEmptyRows.length < 5) {
                    partiallyEmptyRows.push({
                        row: i + 1,
                        data: data[i].filter(cell => cell !== '')
                    });
                }
            }
        }
    }

    totalEmptyCompany += emptyCompanyCount;
    totalFullyEmpty += fullyEmptyCount;
    totalPartiallyEmpty += partiallyEmptyCount;

    console.log(`\n公司名稱為空的資料: ${emptyCompanyCount} 筆`);
    console.log(`  - 整列都空白: ${fullyEmptyCount} 筆`);
    console.log(`  - 部分有資料: ${partiallyEmptyCount} 筆`);

    if (fullyEmptyRows.length > 0) {
        console.log(`\n整列空白的列號 (前 5 筆): ${fullyEmptyRows.join(', ')}`);
    }

    if (partiallyEmptyRows.length > 0) {
        console.log('\n部分有資料的列 (前 5 筆):');
        partiallyEmptyRows.forEach(({row, data}) => {
            console.log(`  Row ${row}: ${JSON.stringify(data.slice(0, 10))}`);
        });
    }

    console.log('');
});

console.log('='.repeat(80));
console.log('【總結】');
console.log('='.repeat(80));

console.log(`\n公司名稱為空的總計: ${totalEmptyCompany} 筆`);
console.log(`  - 整列都空白: ${totalFullyEmpty} 筆 ← 應該跳過`);
console.log(`  - 部分有資料: ${totalPartiallyEmpty} 筆 ← 應該保留`);

console.log(`\nsheet3 目前少了 ${totalEmptyCompany} 筆`);
console.log(`如果只排除「整列都空白」的資料:`);
console.log(`  應該有: 1468 - ${totalFullyEmpty} = ${1468 - totalFullyEmpty} 筆`);
console.log(`  實際上: 1420 筆`);
console.log(`  還差: ${1468 - totalFullyEmpty - 1420} 筆`);

console.log('\n' + '='.repeat(80));
console.log('Done!');
