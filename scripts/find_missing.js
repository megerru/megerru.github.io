const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

console.log('Finding missing data rows...\n');

const workbook = XLSX.readFile(excelPath);

// Define company column index for each sheet
const COMPANY_COL_INDEX = {
    '群組資料 (2)': 4,  // E欄
    '重複資料 (2)': 5,  // F欄
    '獨立資料 (2)': 4   // E欄
};

const sourceSheets = ['群組資料 (2)', '重複資料 (2)', '獨立資料 (2)'];

sourceSheets.forEach(sheetName => {
    if (!workbook.Sheets[sheetName]) return;

    const sheet = workbook.Sheets[sheetName];
    let data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});

    // Remove extra header row if needed
    if ((sheetName === '重複資料 (2)' || sheetName === '獨立資料 (2)') && data.length > 1) {
        data = [data[0], ...data.slice(2)];
    }

    const colIndex = COMPANY_COL_INDEX[sheetName];

    console.log('='.repeat(80));
    console.log(`【${sheetName}】`);
    console.log('='.repeat(80));

    let emptyCompanyRows = 0;
    const emptyRows = [];

    for (let i = 1; i < data.length; i++) {
        const company = data[i][colIndex];
        if (!company || company === '') {
            emptyCompanyRows++;
            if (emptyRows.length < 10) {
                emptyRows.push({
                    row: i + 1,
                    data: data[i].slice(0, Math.min(10, data[i].length))
                });
            }
        }
    }

    console.log(`總資料列數: ${data.length - 1}`);
    console.log(`公司名稱為空的列數: ${emptyCompanyRows}`);

    if (emptyRows.length > 0) {
        console.log('\n前 10 筆公司名稱為空的資料:');
        emptyRows.forEach(({row, data}) => {
            console.log(`  Row ${row}: ${JSON.stringify(data)}`);
        });
    }

    console.log('');
});

console.log('='.repeat(80));
console.log('Done!');
