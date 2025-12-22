const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Comparing 銷項 and 銷項 (2)...\n');

const workbook = XLSX.readFile(excelPath);

const sheetsToCheck = ['銷項', '銷項 (2)'];

sheetsToCheck.forEach(sheetName => {
    if (!workbook.Sheets[sheetName]) {
        console.log(`${sheetName}: Not found`);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

    console.log('='.repeat(80));
    console.log(`【${sheetName}】`);
    console.log('='.repeat(80));

    console.log(`總列數: ${data.length}`);
    console.log(`資料列數: ${data.length - 1}`);

    // 找公司名稱欄位
    let companyColIndex = -1;
    for (let i = 0; i < data[0].length; i++) {
        if (data[0][i] && (data[0][i].includes('公司') || data[0][i] === '公司名稱')) {
            companyColIndex = i;
            break;
        }
    }

    if (companyColIndex !== -1) {
        let emptyCount = 0;
        let validCount = 0;

        for (let i = 1; i < data.length; i++) {
            const company = data[i][companyColIndex];
            if (!company || company === '') {
                emptyCount++;
            } else {
                validCount++;
            }
        }

        console.log(`公司名稱欄位: index ${companyColIndex} (${String.fromCharCode(65 + companyColIndex)} 欄)`);
        console.log(`有公司名稱: ${validCount} 筆`);
        console.log(`空白公司: ${emptyCount} 筆`);
    }

    console.log('');
});

console.log('='.repeat(80));
console.log('Summary:');
console.log('='.repeat(80));

const sales1 = workbook.Sheets['銷項'];
const sales2 = workbook.Sheets['銷項 (2)'];

if (sales1 && sales2) {
    const data1 = XLSX.utils.sheet_to_json(sales1, {header: 1});
    const data2 = XLSX.utils.sheet_to_json(sales2, {header: 1});

    console.log(`銷項: ${data1.length - 1} 筆`);
    console.log(`銷項 (2): ${data2.length - 1} 筆`);
    console.log(`差異: ${(data1.length - 1) - (data2.length - 1)} 筆`);
}

console.log('\n' + '='.repeat(80));
console.log('Done!');
