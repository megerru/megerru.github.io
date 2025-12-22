const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

console.log('='.repeat(80));
console.log('比對每張發票的銷售額數值：銷項 vs 來源工作表');
console.log('='.repeat(80));

// Read 銷項
const salesData = XLSX.utils.sheet_to_json(workbook.Sheets['銷項'], {
    header: 1,
    defval: ''
});

// Build sales invoice map
const salesInvoiceMap = new Map();

for (let i = 1; i < salesData.length - 1; i++) { // Skip header and last sum row
    const row = salesData[i];
    const invoice = row[2]; // C - 發票號碼
    const company = row[4]; // E - 公司名稱
    const sales = row[6]; // G - 銷售額

    if (invoice) {
        const salesValue = typeof sales === 'number' ? sales : parseFloat(sales) || 0;
        const key = `${invoice}`;

        if (!salesInvoiceMap.has(key)) {
            salesInvoiceMap.set(key, []);
        }

        salesInvoiceMap.get(key).push({
            rowNum: i + 1,
            company,
            sales: salesValue
        });
    }
}

console.log(`\n銷項工作表: ${salesInvoiceMap.size} 個唯一發票號碼`);

// Read source sheets and compare
const sourceSheets = {
    '群組資料 (2)': { invoiceCol: 2, salesCol: 6, companyCol: 4 },
    '重複資料 (2)': { invoiceCol: 3, salesCol: 7, companyCol: 5 },
    '獨立資料 (2)': { invoiceCol: 2, salesCol: 6, companyCol: 4 }
};

const differences = [];
let totalDifference = 0;
let matchCount = 0;
let mismatchCount = 0;

Object.entries(sourceSheets).forEach(([sheetName, config]) => {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: ''
    });

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const invoice = row[config.invoiceCol];
        const company = row[config.companyCol];
        const sales = row[config.salesCol];

        if (invoice) {
            const salesValue = typeof sales === 'number' ? sales : parseFloat(sales) || 0;
            const key = `${invoice}`;

            if (salesInvoiceMap.has(key)) {
                const salesEntries = salesInvoiceMap.get(key);

                // Find matching entry (could be multiple rows with same invoice in 銷項)
                let foundMatch = false;

                salesEntries.forEach(salesEntry => {
                    const diff = Math.abs(salesEntry.sales - salesValue);

                    if (diff < 0.01) {
                        // Match
                        matchCount++;
                        foundMatch = true;
                    } else {
                        // Different value
                        mismatchCount++;
                        totalDifference += (salesEntry.sales - salesValue);

                        differences.push({
                            invoice,
                            company,
                            sheetName,
                            sourceRowNum: i + 1,
                            salesRowNum: salesEntry.rowNum,
                            salesValue: salesEntry.sales,
                            sourceValue: salesValue,
                            difference: salesEntry.sales - salesValue
                        });
                    }
                });
            }
        }
    }
});

console.log(`\n配對結果:`);
console.log(`  數值一致: ${matchCount} 筆`);
console.log(`  數值不一致: ${mismatchCount} 筆`);

if (differences.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('【數值不一致的發票】');
    console.log('='.repeat(80));

    console.log(`\n總共 ${differences.length} 筆差異，累計差異: ${totalDifference.toLocaleString()}\n`);

    // Sort by absolute difference
    differences.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    console.log('(顯示前 50 筆，按差異金額排序)\n');

    differences.slice(0, 50).forEach((diff, idx) => {
        console.log(`${(idx + 1).toString().padStart(3)}. 發票 ${diff.invoice.padEnd(12)} | ${diff.sheetName.padEnd(15)}`);
        console.log(`     公司: ${(diff.company || '(無)').substring(0, 40)}`);
        console.log(`     銷項值 (Row ${diff.salesRowNum}): ${diff.salesValue.toLocaleString().padStart(12)}`);
        console.log(`     來源值 (Row ${diff.sourceRowNum}): ${diff.sourceValue.toLocaleString().padStart(12)}`);
        console.log(`     差異: ${diff.difference.toLocaleString().padStart(12)}`);
        console.log();
    });

    if (differences.length > 50) {
        console.log(`... 還有 ${differences.length - 50} 筆未顯示\n`);
    }
}

// Check sheet3 actual values
console.log('='.repeat(80));
console.log('【驗證 Sheet3 的實際數值】');
console.log('='.repeat(80));

if (workbook.Sheets['sheet3']) {
    const sheet3Data = XLSX.utils.sheet_to_json(workbook.Sheets['sheet3'], {
        header: 1,
        defval: ''
    });

    // Build invoice map for sheet3
    const sheet3Map = new Map();

    for (let i = 1; i < sheet3Data.length; i++) {
        const row = sheet3Data[i];
        const source = row[0]; // A - 資料來源
        const invoice = row[2]; // C - 發票號碼
        const company = row[4]; // E - 公司名稱
        const sales = row[6]; // G - 銷售額

        if (invoice) {
            const salesValue = typeof sales === 'number' ? sales : parseFloat(sales) || 0;
            const key = `${invoice}`;

            if (!sheet3Map.has(key)) {
                sheet3Map.set(key, []);
            }

            sheet3Map.get(key).push({
                rowNum: i + 1,
                source,
                company,
                sales: salesValue
            });
        }
    }

    console.log(`\nSheet3: ${sheet3Map.size} 個唯一發票號碼`);

    // Compare sheet3 vs 銷項
    const sheet3Differences = [];
    let sheet3TotalDiff = 0;

    salesInvoiceMap.forEach((salesEntries, invoice) => {
        if (sheet3Map.has(invoice)) {
            const sheet3Entries = sheet3Map.get(invoice);

            salesEntries.forEach(salesEntry => {
                sheet3Entries.forEach(sheet3Entry => {
                    const diff = salesEntry.sales - sheet3Entry.sales;

                    if (Math.abs(diff) >= 0.01) {
                        sheet3Differences.push({
                            invoice,
                            salesValue: salesEntry.sales,
                            sheet3Value: sheet3Entry.sales,
                            difference: diff,
                            source: sheet3Entry.source
                        });
                        sheet3TotalDiff += diff;
                    }
                });
            });
        }
    });

    console.log(`\nSheet3 vs 銷項的數值差異: ${sheet3Differences.length} 筆`);
    console.log(`累計差異: ${sheet3TotalDiff.toLocaleString()}`);

    if (sheet3Differences.length > 0) {
        console.log('\n前 20 筆差異:\n');

        sheet3Differences.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

        sheet3Differences.slice(0, 20).forEach((diff, idx) => {
            console.log(`${(idx + 1).toString().padStart(3)}. 發票 ${diff.invoice.padEnd(12)} | 來源: ${diff.source.padEnd(15)}`);
            console.log(`     銷項: ${diff.salesValue.toLocaleString().padStart(12)} | Sheet3: ${diff.sheet3Value.toLocaleString().padStart(12)} | 差異: ${diff.difference.toLocaleString().padStart(12)}`);
        });
    }
}

console.log('\n' + '='.repeat(80));