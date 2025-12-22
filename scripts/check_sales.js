const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Checking 銷項 sheet...\n');

const workbook = XLSX.readFile(excelPath);

if (!workbook.Sheets['銷項']) {
    console.log('Error: 銷項 sheet not found');
    process.exit(1);
}

const sheet = workbook.Sheets['銷項'];
const data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

console.log('='.repeat(80));
console.log('【銷項工作表】');
console.log('='.repeat(80));

console.log(`\n總列數: ${data.length}`);
console.log(`資料列數: ${data.length - 1}`);

// 顯示標題列
console.log('\n標題列:');
data[0].forEach((header, idx) => {
    if (header) {
        const col = String.fromCharCode(65 + idx);
        console.log(`  欄位 ${col} (index ${idx}): ${header}`);
    }
});

// 找公司名稱欄位
let companyColIndex = -1;
for (let i = 0; i < data[0].length; i++) {
    if (data[0][i] && data[0][i].includes('公司')) {
        companyColIndex = i;
        console.log(`\n公司名稱欄位在 index ${i} (欄位 ${String.fromCharCode(65 + i)})`);
        break;
    }
}

if (companyColIndex === -1) {
    console.log('\n無法找到公司名稱欄位，顯示前幾列資料:');
    for (let i = 0; i < Math.min(5, data.length); i++) {
        console.log(`Row ${i}:`, data[i].slice(0, 10));
    }
} else {
    // 檢查空白公司名稱
    let emptyCompanyRows = 0;
    const emptyRows = [];

    for (let i = 1; i < data.length; i++) {
        const company = data[i][companyColIndex];
        if (!company || company === '') {
            emptyCompanyRows++;
            if (emptyRows.length < 10) {
                emptyRows.push({
                    row: i + 1,
                    data: data[i].slice(0, Math.min(10, data[i].length))
                });
            }
        }
    }

    console.log(`\n公司名稱為空的列數: ${emptyCompanyRows}`);

    if (emptyRows.length > 0) {
        console.log('\n前 10 筆公司名稱為空的資料:');
        emptyRows.forEach(({row, data}) => {
            console.log(`  Row ${row}:`, data);
        });
    }

    console.log(`\n有公司名稱的資料: ${data.length - 1 - emptyCompanyRows} 筆`);
    console.log(`總資料 (含空白): ${data.length - 1} 筆`);
}

console.log('\n' + '='.repeat(80));
console.log('Done!');
