const XLSX = require('xlsx');

const sourcePath = 'C:\\Users\\USER\\Desktop\\世華.xlsx';

console.log('分析「其他」類別的資料...\n');

// 讀取原始檔案
const workbook = XLSX.readFile(sourcePath);
const targetSheet = '工作表6 (2)';
const sheet = workbook.Sheets[targetSheet];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// 欄位索引 (0-based)
const COL_E = 4;  // 公司名稱
const COL_O = 14; // 品名

// 收集所有「其他」類別的品名
const otherItems = {};
let totalOther = 0;

// 跳過第一行標題
for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const company = row[COL_E];

    // 跳過空白公司名稱
    if (!company || company === '') continue;

    const oValue = String(row[COL_O] || '').trim();

    // 檢查是否為運費或處理類
    const isShipping = oValue.includes('運費');
    const isProcessing = oValue.includes('處理費') ||
                        oValue.includes('處理') ||
                        oValue.includes('廢棄物') ||
                        oValue.includes('服務費');

    // 如果都不是，就是「其他」
    if (!isShipping && !isProcessing) {
        totalOther++;

        if (!otherItems[oValue]) {
            otherItems[oValue] = {
                count: 0,
                companies: new Set()
            };
        }

        otherItems[oValue].count++;
        otherItems[oValue].companies.add(company);
    }
}

// 排序並顯示
const sorted = Object.entries(otherItems).sort((a, b) => b[1].count - a[1].count);

console.log('='.repeat(80));
console.log(`「其他」類別品名統計（總共 ${totalOther} 筆）`);
console.log('='.repeat(80));
console.log('');

sorted.forEach(([itemName, data], idx) => {
    console.log(`${idx + 1}. 「${itemName || '(空白)'}」: ${data.count} 筆`);
    console.log(`   出現在 ${data.companies.size} 家公司`);

    // 顯示前 3 家公司
    const companyList = Array.from(data.companies).slice(0, 3);
    console.log(`   例如: ${companyList.join('、')}${data.companies.size > 3 ? '...' : ''}`);
    console.log('');
});

console.log('='.repeat(80));
console.log(`總計: ${sorted.length} 種不同的品名`);
console.log('='.repeat(80));

// 檢查是否有看起來應該歸類為處理或運費的項目
console.log('\n可能需要調整關鍵字的項目：');
sorted.forEach(([itemName, data]) => {
    const lower = itemName.toLowerCase();
    if (lower.includes('費') || lower.includes('清') || lower.includes('收') ||
        lower.includes('運') || lower.includes('載')) {
        console.log(`  ⚠ 「${itemName}」(${data.count}筆) - 可能需要重新分類`);
    }
});
