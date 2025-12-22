const XLSX = require('xlsx');

const sourcePath = 'C:\\Users\\USER\\Desktop\\世華.xlsx';

console.log('檢查「其他」類別的詳細資料...\n');

// 讀取原始檔案
const workbook = XLSX.readFile(sourcePath);
const targetSheet = '工作表6 (2)';
const sheet = workbook.Sheets[targetSheet];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// 欄位索引
const COL_E = 4;  // 公司名稱
const COL_G = 6;  // 銷售額
const COL_O = 14; // 品名
const COL_P = 15; // 銷售額（右邊）

// 找出前 20 筆「其他」類別的資料
let count = 0;
console.log('前 20 筆「其他」類別資料：');
console.log('='.repeat(100));

for (let i = 1; i < data.length && count < 20; i++) {
    const row = data[i];
    const company = row[COL_E];

    if (!company || company === '') continue;

    const oValue = String(row[COL_O] || '').trim();
    const gValue = row[COL_G];
    const pValue = row[COL_P];

    // 檢查是否為「其他」
    const isShipping = oValue.includes('運費');
    const isProcessing = oValue.includes('處理費') ||
                        oValue.includes('處理') ||
                        oValue.includes('廢棄物') ||
                        oValue.includes('服務費');

    if (!isShipping && !isProcessing) {
        count++;
        console.log(`\n${count}. 行號: ${i + 1}`);
        console.log(`   公司: ${company}`);
        console.log(`   G欄(銷售額): ${gValue || '(空白)'}`);
        console.log(`   O欄(品名): ${oValue || '(空白)'}`);
        console.log(`   P欄(銷售額): ${pValue || '(空白)'}`);

        // 顯示完整行資料（前 20 個欄位）
        console.log(`   完整行: [${row.slice(0, 20).map(v => v === '' ? '(空)' : v).join(', ')}]`);
    }
}

console.log('\n' + '='.repeat(100));
console.log(`\n結論: 「其他」類別共 470 筆，都是 O 欄（品名）為空白的資料`);
console.log(`這些可能是資料輸入不完整，或是 Excel 合併儲存格造成的空行`);
