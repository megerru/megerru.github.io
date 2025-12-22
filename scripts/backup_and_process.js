const fs = require('fs');
const XLSX = require('xlsx');

// 備份原始檔案
const sourcePath = 'C:\\Users\\USER\\Desktop\\世華.xlsx';
const backupPath = 'C:\\Users\\USER\\Desktop\\世華_備份_20251120.xlsx';

console.log('備份原始檔案...');
fs.copyFileSync(sourcePath, backupPath);
console.log(`✓ 備份完成: ${backupPath}\n`);

// 讀取 Excel 檔案
console.log('讀取 Excel 檔案...');
const workbook = XLSX.readFile(sourcePath);

console.log('\n可用的工作表:');
workbook.SheetNames.forEach((name, idx) => {
    console.log(`  ${idx + 1}. ${name}`);
});

// 檢查是否有「工作表6 (2)」
const targetSheet = '工作表6 (2)';
if (!workbook.Sheets[targetSheet]) {
    console.log(`\n錯誤: 找不到工作表「${targetSheet}」`);
    process.exit(1);
}

console.log(`\n讀取「${targetSheet}」...`);
const sheet = workbook.Sheets[targetSheet];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log(`總共 ${data.length} 行資料`);
console.log('\n前 3 行資料:');
for (let i = 0; i < Math.min(3, data.length); i++) {
    console.log(`行 ${i + 1}:`, data[i].slice(0, 20)); // 只顯示前 20 欄
}

// 顯示 E, G, O, P 欄的位置（0-based index: E=4, G=6, O=14, P=15）
console.log('\n欄位範例 (E, G, O, P):');
for (let i = 0; i < Math.min(5, data.length); i++) {
    console.log(`行 ${i + 1}:`);
    console.log(`  E欄(公司): ${data[i][4]}`);
    console.log(`  G欄: ${data[i][6]}`);
    console.log(`  O欄(品名): ${data[i][14]}`);
    console.log(`  P欄: ${data[i][15]}`);
}

console.log('\n資料結構分析完成。');
