const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Verifying sheet3 column alignment...\n');

const workbook = XLSX.readFile(excelPath);

if (!workbook.Sheets['sheet3']) {
    console.log('Error: sheet3 not found');
    process.exit(1);
}

const sheet = workbook.Sheets['sheet3'];
const data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

console.log('='.repeat(80));
console.log('Sheet3 標題列:');
console.log('='.repeat(80));
data[0].forEach((header, idx) => {
    if (header) {
        const col = String.fromCharCode(65 + idx);
        console.log(`  欄位 ${col} (index ${idx}): ${header}`);
    }
});

console.log('\n' + '='.repeat(80));
console.log('取樣資料列（前 5 筆來自不同來源）:');
console.log('='.repeat(80));

// 找出來自三個不同來源的樣本
const samples = {
    '群組資料 (2)': null,
    '重複資料 (2)': null,
    '獨立資料 (2)': null
};

for (let i = 1; i < data.length && Object.values(samples).some(v => v === null); i++) {
    const source = data[i][0];
    if (samples[source] === null) {
        samples[source] = i;
    }
}

Object.entries(samples).forEach(([source, rowIdx]) => {
    if (rowIdx !== null) {
        console.log(`\n【來源: ${source}】(row ${rowIdx})`);
        const row = data[rowIdx];

        // 重要欄位檢查
        const importantCols = [
            {idx: 0, name: '資料來源'},
            {idx: 1, name: '日期'},
            {idx: 2, name: '發票號碼'},
            {idx: 3, name: '統編'},
            {idx: 4, name: '公司名稱'},
            {idx: 5, name: '品名'},
            {idx: 6, name: '銷售額'}
        ];

        importantCols.forEach(({idx, name}) => {
            const value = row[idx] || '<空白>';
            console.log(`  ${name} (欄位 ${String.fromCharCode(65 + idx)}): ${value}`);
        });
    }
});

console.log('\n' + '='.repeat(80));
console.log('統計資訊:');
console.log('='.repeat(80));

// 統計資料來源分布
const sourceCounts = {};
for (let i = 1; i < data.length; i++) {
    const source = data[i][0];
    if (source) {
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }
}

console.log('\n資料來源分布:');
Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`  ${source}: ${count} 筆`);
});

console.log(`\n總資料筆數: ${data.length - 1}`);

// 檢查欄位對齊 - 公司名稱應該都在欄位 E (index 4)
console.log('\n' + '='.repeat(80));
console.log('欄位對齊驗證 - 公司名稱都在欄位 E (index 4)?');
console.log('='.repeat(80));

let alignmentOK = true;
const companyColIndex = 4;

for (let i = 1; i <= Math.min(10, data.length - 1); i++) {
    const company = data[i][companyColIndex];
    const source = data[i][0];

    if (!company || company === '') {
        console.log(`❌ Row ${i} (${source}): 欄位 E 無公司名稱`);
        alignmentOK = false;
    } else {
        console.log(`✅ Row ${i} (${source}): ${company}`);
    }
}

console.log('\n' + '='.repeat(80));
if (alignmentOK) {
    console.log('✅ 驗證通過：所有資料的公司名稱欄位已對齊！');
} else {
    console.log('❌ 驗證失敗：部分資料的欄位未對齊');
}
console.log('='.repeat(80));
