const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Reading Excel file...\n');

const workbook = XLSX.readFile(excelPath);

const missingInvoices = ['HY53934853', 'HY53934883'];

console.log('='.repeat(80));
console.log('追蹤遺失發票在各工作表的狀況');
console.log('='.repeat(80));

missingInvoices.forEach(invoice => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`發票: ${invoice}`);
    console.log('='.repeat(80));

    // Check 銷項
    console.log('\n【銷項】');
    const salesData = XLSX.utils.sheet_to_json(workbook.Sheets['銷項'], {
        header: 1,
        defval: ''
    });

    for (let i = 1; i < salesData.length; i++) {
        const row = salesData[i];
        if (row[2] === invoice) {
            console.log(`  ✅ 找到於 Row ${i + 1}`);
            console.log(`     日期: ${row[1]}`);
            console.log(`     公司: ${row[4]}`);
            console.log(`     品名: ${row[5]}`);
            console.log(`     銷售額: ${row[6]}`);
        }
    }

    // Check 三個來源工作表
    const sourceSheets = {
        '群組資料 (2)': { invoiceCol: 2, dateCol: 1, companyCol: 4, itemCol: 5, salesCol: 6 },
        '重複資料 (2)': { invoiceCol: 3, dateCol: 2, companyCol: 5, itemCol: 6, salesCol: 7 },
        '獨立資料 (2)': { invoiceCol: 2, dateCol: 1, companyCol: 4, itemCol: 5, salesCol: 6 }
    };

    let foundInSources = false;

    Object.entries(sourceSheets).forEach(([sheetName, config]) => {
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
            defval: ''
        });

        console.log(`\n【${sheetName}】`);

        let found = false;

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (row[config.invoiceCol] === invoice) {
                console.log(`  ✅ 找到於 Row ${i + 1}`);
                console.log(`     日期: ${row[config.dateCol]}`);
                console.log(`     公司: ${row[config.companyCol]}`);
                console.log(`     品名: ${row[config.itemCol]}`);
                console.log(`     銷售額: ${row[config.salesCol]}`);

                // Check if this row is empty (company name check)
                const company = row[config.companyCol];
                if (!company || company === '') {
                    console.log(`     ⚠️  公司名稱為空白！`);
                }

                found = true;
                foundInSources = true;
            }
        }

        if (!found) {
            console.log(`  ❌ 沒有找到`);
        }
    });

    // Check sheet3
    console.log(`\n【Sheet3】`);
    const sheet3Data = XLSX.utils.sheet_to_json(workbook.Sheets['sheet3'], {
        header: 1,
        defval: ''
    });

    let foundInSheet3 = false;

    for (let i = 1; i < sheet3Data.length; i++) {
        const row = sheet3Data[i];
        if (row[2] === invoice) {
            console.log(`  ✅ 找到於 Row ${i + 1}`);
            console.log(`     資料來源: ${row[0]}`);
            console.log(`     日期: ${row[1]}`);
            console.log(`     公司: ${row[4]}`);
            console.log(`     品名: ${row[5]}`);
            console.log(`     銷售額: ${row[6]}`);
            foundInSheet3 = true;
        }
    }

    if (!foundInSheet3) {
        console.log(`  ❌ 沒有找到`);
    }

    console.log(`\n【結論】`);
    if (!foundInSources) {
        console.log(`  ❌ 此發票不在三個來源工作表中`);
        console.log(`  → 這張發票在銷項→來源工作表的分拆過程中遺失了`);
    } else if (!foundInSheet3) {
        console.log(`  ⚠️  此發票存在於來源工作表，但未被複製到 sheet3`);
        console.log(`  → process_excel.js 的邏輯有問題`);
    } else {
        console.log(`  ✅ 此發票在所有工作表都存在`);
    }
});

console.log(`\n${'='.repeat(80)}`);