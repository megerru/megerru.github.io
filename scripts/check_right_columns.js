const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Checking right-side calculation columns in sheet3...\n');

const workbook = XLSX.readFile(excelPath);

if (!workbook.Sheets['sheet3']) {
    console.log('Error: sheet3 not found');
    process.exit(1);
}

const sheet = workbook.Sheets['sheet3'];
const data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

console.log('='.repeat(80));
console.log('Sheet3 總欄位數:', data[0].length);
console.log('='.repeat(80));

console.log('\n完整標題列:');
data[0].forEach((header, idx) => {
    const col = idx < 26 ? String.fromCharCode(65 + idx) :
                String.fromCharCode(65 + Math.floor(idx/26) - 1) + String.fromCharCode(65 + (idx%26));

    if (header) {
        console.log(`  欄位 ${col} (index ${idx}): ${header}`);
    }
});

// 檢查群組資料的右邊計算欄位
console.log('\n' + '='.repeat(80));
console.log('檢查「群組資料 (2)」的樣本 - 應該有右邊計算欄位');
console.log('='.repeat(80));

for (let i = 1; i < Math.min(5, data.length); i++) {
    if (data[i][0] === '群組資料 (2)') {
        console.log(`\nRow ${i} (公司: ${data[i][4]}):`);
        console.log(`  銷項總銷售 (W, index 22): ${data[i][22] || '<空白>'}`);
        console.log(`  品名 (X, index 23): ${data[i][23] || '<空白>'}`);
        console.log(`  進項占比 (Y, index 24): ${data[i][24] || '<空白>'}`);
        console.log(`  Index 25: ${data[i][25] || '<空白>'}`);
        console.log(`  Index 26: ${data[i][26] || '<空白>'}`);
        console.log(`  Index 27: ${data[i][27] || '<空白>'}`);
        console.log(`  Index 28: ${data[i][28] || '<空白>'}`);
        break;
    }
}

// 檢查重複資料的右邊計算欄位
console.log('\n' + '='.repeat(80));
console.log('檢查「重複資料 (2)」的樣本 - 應該有右邊計算欄位');
console.log('='.repeat(80));

for (let i = 1; i < data.length; i++) {
    if (data[i][0] === '重複資料 (2)') {
        console.log(`\nRow ${i} (公司: ${data[i][4]}):`);
        console.log(`  Index 22: ${data[i][22] || '<空白>'}`);
        console.log(`  Index 23: ${data[i][23] || '<空白>'}`);
        console.log(`  Index 24: ${data[i][24] || '<空白>'}`);
        console.log(`  Index 25: ${data[i][25] || '<空白>'}`);
        console.log(`  Index 26: ${data[i][26] || '<空白>'}`);
        break;
    }
}

console.log('\n' + '='.repeat(80));
console.log('Done!');
