const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

try {
    console.log('Reading Excel file...\n');

    // Read the Excel file
    const workbook = XLSX.readFile(excelPath);

    // Get sheet names
    console.log('='.repeat(60));
    console.log('Sheet Names:');
    console.log('='.repeat(60));
    workbook.SheetNames.forEach((name, idx) => {
        console.log(`  ${idx + 1}. ${name}`);
    });

    // Check all three sheets
    const targetSheets = {
        '群組資料 (2)': 4,  // Column E
        '重複資料 (2)': 5,  // Column F
        '獨立資料 (2)': 4   // Column E
    };

    function normalizeCompanyName(name) {
        if (!name) return '';
        return name.replace('股份有限公司', '有限公司');
    }

    const allCompanies = new Set();
    const sheetCompanyCounts = {};

    Object.entries(targetSheets).forEach(([sheetName, colIndex]) => {
        if (!workbook.Sheets[sheetName]) {
            console.log(`Warning: ${sheetName} not found`);
            return;
        }

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        console.log(`\n${sheetName}: ${data.length - 1} rows`);

        sheetCompanyCounts[sheetName] = {};

        for (let i = 1; i < data.length; i++) {
            const company = data[i][colIndex];
            if (company && company !== '') {
                const normalized = normalizeCompanyName(company);
                allCompanies.add(normalized);

                if (!sheetCompanyCounts[sheetName][normalized]) {
                    sheetCompanyCounts[sheetName][normalized] = 0;
                }
                sheetCompanyCounts[sheetName][normalized]++;
            }
        }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Total unique companies (normalized): ${allCompanies.size}`);
    console.log('='.repeat(60));

    // Sort companies by total count across all sheets
    const companyCounts = {};
    allCompanies.forEach(company => {
        let total = 0;
        Object.values(sheetCompanyCounts).forEach(sheetCounts => {
            total += sheetCounts[company] || 0;
        });
        companyCounts[company] = total;
    });

    const sortedCompanies = Object.entries(companyCounts).sort((a, b) => b[1] - a[1]);

    console.log('\nAll companies with total row counts:');
    sortedCompanies.forEach(([company, count], idx) => {
        console.log(`\n${idx + 1}. ${company}: ${count} rows total`);

        Object.entries(targetSheets).forEach(([sheetName]) => {
            const sheetCount = sheetCompanyCounts[sheetName][company] || 0;
            if (sheetCount > 0) {
                console.log(`   - ${sheetName}: ${sheetCount} rows`);
            }
        });
    });

    console.log('\n' + '='.repeat(60));
    console.log('Done!');
    console.log('='.repeat(60));

} catch (error) {
    console.error('Error reading Excel file:', error.message);

    if (error.code === 'MODULE_NOT_FOUND') {
        console.log('\nPlease install the required package:');
        console.log('  npm install xlsx');
    }
}