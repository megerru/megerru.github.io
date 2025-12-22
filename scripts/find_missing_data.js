const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

console.log('='.repeat(80));
console.log('尋找遺失的資料：逐筆比對銷項 vs 三個來源工作表');
console.log('='.repeat(80));

// Read 銷項
const salesData = XLSX.utils.sheet_to_json(workbook.Sheets['銷項'], {
    header: 1,
    defval: ''
});

// Read source sheets
const sourceSheets = {
    '群組資料 (2)': workbook.Sheets['群組資料 (2)'],
    '重複資料 (2)': workbook.Sheets['重複資料 (2)'],
    '獨立資料 (2)': workbook.Sheets['獨立資料 (2)']
};

const sourcesData = {};
Object.entries(sourceSheets).forEach(([name, sheet]) => {
    sourcesData[name] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: ''
    });
});

// Build a map of all invoices in source sheets
// Key: 發票號碼, Value: { sheetName, rowIndex, data }
const sourceInvoices = new Map();

console.log('\n【統計三個來源工作表的發票】\n');

Object.entries(sourcesData).forEach(([sheetName, data]) => {
    let invoiceCol;
    let salesCol;
    let companyCol;
    let startRow = 1;

    // Different sheets have different column positions
    if (sheetName === '群組資料 (2)') {
        invoiceCol = 2; // C column
        salesCol = 6; // G column
        companyCol = 4; // E column
    } else if (sheetName === '重複資料 (2)') {
        invoiceCol = 3; // D column
        salesCol = 7; // H column (first 銷售額)
        companyCol = 5; // F column
        startRow = 1; // Already removed extra header
    } else { // 獨立資料 (2)
        invoiceCol = 2; // C column
        salesCol = 6; // G column
        companyCol = 4; // E column
    }

    let count = 0;
    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        const invoice = row[invoiceCol];
        const sales = row[salesCol];
        const company = row[companyCol];

        if (invoice) {
            const key = `${invoice}`;
            if (!sourceInvoices.has(key)) {
                sourceInvoices.set(key, []);
            }
            sourceInvoices.get(key).push({
                sheetName,
                rowIndex: i,
                invoice,
                company,
                sales: typeof sales === 'number' ? sales : parseFloat(sales) || 0
            });
            count++;
        }
    }

    console.log(`${sheetName}: ${count} 張發票`);
});

console.log(`\n總共 ${sourceInvoices.size} 個唯一發票號碼`);

// Check which invoices from 銷項 are missing in source sheets
console.log('\n' + '='.repeat(80));
console.log('【比對銷項 vs 來源工作表】');
console.log('='.repeat(80));

const missingInvoices = [];
const foundInvoices = [];
let missingSalesSum = 0;
let foundSalesSum = 0;

// Skip last row (it's the sum row at 1424)
for (let i = 1; i < salesData.length - 1; i++) {
    const row = salesData[i];
    const invoice = row[2]; // C column - 發票號碼
    const company = row[4]; // E column - 公司名稱
    const sales = row[6]; // G column - 銷售額

    const salesValue = typeof sales === 'number' ? sales : parseFloat(sales) || 0;

    if (invoice) {
        const found = sourceInvoices.has(`${invoice}`);

        if (found) {
            foundInvoices.push({
                rowIndex: i,
                rowNum: i + 1,
                invoice,
                company,
                sales: salesValue
            });
            foundSalesSum += salesValue;
        } else {
            missingInvoices.push({
                rowIndex: i,
                rowNum: i + 1,
                invoice,
                company,
                sales: salesValue
            });
            missingSalesSum += salesValue;
        }
    }
}

console.log(`\n找到的發票: ${foundInvoices.length} 張，銷售額總和: ${foundSalesSum.toLocaleString()}`);
console.log(`遺失的發票: ${missingInvoices.length} 張，銷售額總和: ${missingSalesSum.toLocaleString()}`);

if (missingInvoices.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('【遺失的發票明細】');
    console.log('='.repeat(80));

    console.log('\n(顯示前 50 張)\n');

    missingInvoices.slice(0, 50).forEach((invoice, idx) => {
        console.log(`${(idx + 1).toString().padStart(3)}. Row ${invoice.rowNum.toString().padStart(4)}: 發票 ${invoice.invoice.padEnd(12)} | 公司: ${(invoice.company || '(無)').substring(0, 20).padEnd(20)} | 銷售額: ${invoice.sales.toLocaleString().padStart(12)}`);
    });

    if (missingInvoices.length > 50) {
        console.log(`\n... 還有 ${missingInvoices.length - 50} 張發票未顯示`);
    }
}

// Also check for invoices in source but not in 銷項
console.log('\n' + '='.repeat(80));
console.log('【來源工作表有，但銷項沒有的發票】');
console.log('='.repeat(80));

const salesInvoices = new Set();
for (let i = 1; i < salesData.length - 1; i++) {
    const invoice = salesData[i][2];
    if (invoice) {
        salesInvoices.add(`${invoice}`);
    }
}

const extraInvoices = [];
let extraSalesSum = 0;

sourceInvoices.forEach((entries, invoice) => {
    if (!salesInvoices.has(invoice)) {
        entries.forEach(entry => {
            extraInvoices.push(entry);
            extraSalesSum += entry.sales;
        });
    }
});

console.log(`\n額外的發票: ${extraInvoices.length} 筆，銷售額總和: ${extraSalesSum.toLocaleString()}`);

if (extraInvoices.length > 0) {
    console.log('\n(顯示前 50 筆)\n');

    extraInvoices.slice(0, 50).forEach((entry, idx) => {
        console.log(`${(idx + 1).toString().padStart(3)}. ${entry.sheetName.padEnd(15)} | 發票 ${entry.invoice.padEnd(12)} | 公司: ${(entry.company || '(無)').substring(0, 20).padEnd(20)} | 銷售額: ${entry.sales.toLocaleString().padStart(12)}`);
    });

    if (extraInvoices.length > 50) {
        console.log(`\n... 還有 ${extraInvoices.length - 50} 筆未顯示`);
    }
}

// Final summary
console.log('\n' + '='.repeat(80));
console.log('【總結】');
console.log('='.repeat(80));

console.log(`\n銷項工作表 G 欄總和 (不含加總列): ${(foundSalesSum + missingSalesSum).toLocaleString()}`);
console.log(`  - 在來源工作表找到: ${foundSalesSum.toLocaleString()}`);
console.log(`  - 在來源工作表遺失: ${missingSalesSum.toLocaleString()}`);

console.log(`\n來源工作表多出的資料: ${extraSalesSum.toLocaleString()}`);

const netDifference = missingSalesSum - extraSalesSum;
console.log(`\n淨差異 (遺失 - 多出): ${netDifference.toLocaleString()}`);

console.log('\n' + '='.repeat(80));