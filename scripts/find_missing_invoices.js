const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

console.log('='.repeat(80));
console.log('找出 Sheet3 缺少的發票');
console.log('='.repeat(80));

// Read 銷項
const salesData = XLSX.utils.sheet_to_json(workbook.Sheets['銷項'], {
    header: 1,
    defval: ''
});

// Build sales invoice list with all details
const salesInvoices = [];

for (let i = 1; i < salesData.length - 1; i++) { // Skip header and last sum row
    const row = salesData[i];
    const invoice = row[2]; // C - 發票號碼
    const company = row[4]; // E - 公司名稱
    const sales = row[6]; // G - 銷售額
    const date = row[1]; // B - 日期

    if (invoice) {
        const salesValue = typeof sales === 'number' ? sales : parseFloat(sales) || 0;

        salesInvoices.push({
            rowNum: i + 1,
            invoice: `${invoice}`,
            company,
            sales: salesValue,
            date
        });
    }
}

console.log(`\n銷項工作表: ${salesInvoices.length} 張發票`);

// Read sheet3
const sheet3Data = XLSX.utils.sheet_to_json(workbook.Sheets['sheet3'], {
    header: 1,
    defval: ''
});

const sheet3Invoices = new Set();
const sheet3InvoiceDetails = [];

for (let i = 1; i < sheet3Data.length; i++) {
    const row = sheet3Data[i];
    const invoice = row[2]; // C - 發票號碼
    const company = row[4]; // E - 公司名稱
    const sales = row[6]; // G - 銷售額
    const source = row[0]; // A - 資料來源

    if (invoice) {
        const invoiceKey = `${invoice}`;
        sheet3Invoices.add(invoiceKey);

        const salesValue = typeof sales === 'number' ? sales : parseFloat(sales) || 0;

        sheet3InvoiceDetails.push({
            rowNum: i + 1,
            invoice: invoiceKey,
            company,
            sales: salesValue,
            source
        });
    }
}

console.log(`Sheet3 工作表: ${sheet3InvoiceDetails.length} 張發票 (${sheet3Invoices.size} 個唯一發票號碼)`);

// Find missing invoices
const missingInvoices = [];

salesInvoices.forEach(salesInv => {
    if (!sheet3Invoices.has(salesInv.invoice)) {
        missingInvoices.push(salesInv);
    }
});

console.log('\n' + '='.repeat(80));
console.log('【Sheet3 缺少的發票】');
console.log('='.repeat(80));

if (missingInvoices.length > 0) {
    let missingSum = 0;

    console.log(`\n總共缺少 ${missingInvoices.length} 張發票:\n`);

    missingInvoices.forEach((inv, idx) => {
        console.log(`${(idx + 1).toString().padStart(3)}. Row ${inv.rowNum.toString().padStart(4)} | 發票: ${inv.invoice.padEnd(12)} | 日期: ${inv.date.toString().padEnd(10)}`);
        console.log(`     公司: ${(inv.company || '(無)').substring(0, 50)}`);
        console.log(`     銷售額: ${inv.sales.toLocaleString()}`);
        console.log();
        missingSum += inv.sales;
    });

    console.log(`缺少的發票銷售額總和: ${missingSum.toLocaleString()}`);
} else {
    console.log('\n✅ 沒有缺少的發票');
}

// Also check if sheet3 has invoices not in 銷項
const salesInvoiceSet = new Set(salesInvoices.map(inv => inv.invoice));
const extraInvoices = [];

sheet3InvoiceDetails.forEach(inv => {
    if (!salesInvoiceSet.has(inv.invoice)) {
        extraInvoices.push(inv);
    }
});

console.log('\n' + '='.repeat(80));
console.log('【Sheet3 多出的發票（銷項沒有）】');
console.log('='.repeat(80));

if (extraInvoices.length > 0) {
    let extraSum = 0;

    console.log(`\n總共多出 ${extraInvoices.length} 張發票:\n`);

    extraInvoices.forEach((inv, idx) => {
        console.log(`${(idx + 1).toString().padStart(3)}. Row ${inv.rowNum.toString().padStart(4)} | 發票: ${inv.invoice.padEnd(12)} | 來源: ${inv.source.padEnd(15)}`);
        console.log(`     公司: ${(inv.company || '(無)').substring(0, 50)}`);
        console.log(`     銷售額: ${inv.sales.toLocaleString()}`);
        console.log();
        extraSum += inv.sales;
    });

    console.log(`多出的發票銷售額總和: ${extraSum.toLocaleString()}`);
} else {
    console.log('\n✅ 沒有多出的發票');
}

// Calculate actual sum differences
console.log('\n' + '='.repeat(80));
console.log('【總和驗證】');
console.log('='.repeat(80));

const salesSum = salesInvoices.reduce((sum, inv) => sum + inv.sales, 0);
const sheet3Sum = sheet3InvoiceDetails.reduce((sum, inv) => sum + inv.sales, 0);

console.log(`\n銷項 G 欄總和: ${salesSum.toLocaleString()}`);
console.log(`Sheet3 G 欄總和: ${sheet3Sum.toLocaleString()}`);
console.log(`差異: ${(salesSum - sheet3Sum).toLocaleString()}`);

if (missingInvoices.length > 0 || extraInvoices.length > 0) {
    const missingSum = missingInvoices.reduce((sum, inv) => sum + inv.sales, 0);
    const extraSum = extraInvoices.reduce((sum, inv) => sum + inv.sales, 0);
    const netDiff = missingSum - extraSum;

    console.log(`\n解釋:`);
    console.log(`  缺少的發票: ${missingSum.toLocaleString()}`);
    console.log(`  多出的發票: ${extraSum.toLocaleString()}`);
    console.log(`  淨差異: ${netDiff.toLocaleString()}`);
}

console.log('\n' + '='.repeat(80));