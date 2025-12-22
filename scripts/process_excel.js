const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const excelPath = 'C:\\Users\\USER\\Desktop\\更動1.xlsx';

async function main() {
console.log('Reading Excel file...\n');

// Read the workbook
const workbook = XLSX.readFile(excelPath);

// Define source sheets in order
const sourceSheets = ['群組資料 (2)', '重複資料 (2)', '獨立資料 (2)'];

// Define standardized column mapping
// All sheets will be normalized to this structure
const STANDARD_HEADERS = [
    '日期', '發票號碼', '統編', '公司名稱', '品名',
    '銷售額', '稅金', '總計', '備註', '1',
    '', // Empty column
    '日期', '發票號碼2', '統編', '公司名稱', '品名',
    '銷售額', '稅金', '總計'
];

// Define column mapping for each sheet (source index -> standard index)
const COLUMN_MAPPING = {
    '群組資料 (2)': {
        startCol: 1, // Starts at column B (index 1)
        companyCol: 4 // E欄 (index 4)
    },
    '重複資料 (2)': {
        startCol: 2, // Starts at column C (index 2)
        companyCol: 5 // F欄 (index 5)
    },
    '獨立資料 (2)': {
        startCol: 1, // Starts at column B (index 1)
        companyCol: 4 // E欄 (index 4)
    }
};

// Function to normalize company names
function normalizeCompanyName(name) {
    if (!name) return '';
    return name.replace('股份有限公司', '有限公司');
}

// Function to check if two company names are the same
function isSameCompany(name1, name2) {
    return normalizeCompanyName(name1) === normalizeCompanyName(name2);
}

// Function to normalize row data - keep ALL original columns
function normalizeRow(row, sheetName) {
    const mapping = COLUMN_MAPPING[sheetName];
    const startCol = mapping.startCol;

    // Simply copy the entire row starting from startCol
    // This preserves all columns including calculations on the right
    const normalized = [];

    for (let i = startCol; i < row.length; i++) {
        normalized.push(row[i] !== undefined ? row[i] : '');
    }

    return normalized;
}

// Read all source sheets and normalize data
const sheetsData = {};
const sheetHeaders = {}; // Store normalized headers for each sheet

sourceSheets.forEach(sheetName => {
    if (workbook.Sheets[sheetName]) {
        let data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
            defval: ''
        });

        // Note: Row 1 (index 1) in these sheets contains actual invoice data, NOT an extra header
        // The previous code incorrectly removed it, causing data loss of 2 invoices (324,280 in sales)
        // Do NOT remove row 1!

        // Extract and normalize header row
        const headerRow = normalizeRow(data[0], sheetName);
        sheetHeaders[sheetName] = headerRow;

        // Normalize all data rows
        const normalizedData = [headerRow];
        for (let i = 1; i < data.length; i++) {
            normalizedData.push(normalizeRow(data[i], sheetName));
        }

        sheetsData[sheetName] = normalizedData;
        console.log(`Loaded ${sheetName}: ${normalizedData.length - 1} data rows (${headerRow.length} columns preserved)`);
    } else {
        console.log(`Warning: Sheet "${sheetName}" not found`);
    }
});

// Collect ALL unique companies in order of first appearance
const companies = [];
const seenCompanies = new Set();

// Company name is always at index 3 in normalized data (統編 is index 2, 公司名稱 is index 3)
const NORMALIZED_COMPANY_COL = 3;

// Also collect rows without company names (but not fully empty)
const noCompanyRows = {}; // Store by sheet name

// Process sheets in order to maintain appearance order
sourceSheets.forEach(sheetName => {
    const sheetData = sheetsData[sheetName];
    if (!sheetData) return;

    noCompanyRows[sheetName] = [];

    for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        const company = row[NORMALIZED_COMPANY_COL];

        if (company && company !== '') {
            const normalized = normalizeCompanyName(company);
            if (!seenCompanies.has(normalized)) {
                companies.push(company);
                seenCompanies.add(normalized);
            }
        } else {
            // Check if row is not fully empty
            const isFullyEmpty = row.every(cell => !cell || cell === '');
            if (!isFullyEmpty) {
                noCompanyRows[sheetName].push({index: i, row: row});
            }
        }
    }
});

console.log(`\nFound ${companies.length} unique companies across all sheets`);
console.log('First 10 companies:', companies.slice(0, 10));

// Prepare sheet3 data
const sheet3Data = [];

// Create unified header row
// Use the longest header from the three sheets (群組資料 (2) has most columns)
const baseHeader = sheetHeaders['群組資料 (2)'] || STANDARD_HEADERS;
const headerRow = ['資料來源', ...baseHeader];
sheet3Data.push(headerRow);

console.log(`\nSheet3 will have ${headerRow.length} columns (including 資料來源)`);

// Track row info for coloring
const companyRowRanges = [];

// Process each company
let totalRowsProcessed = 0;

companies.forEach((company, companyIdx) => {
    console.log(`\nProcessing company ${companyIdx + 1}/${companies.length}: ${company}`);

    const startRow = sheet3Data.length;
    let companyRowCount = 0;

    // Process each source sheet in order
    sourceSheets.forEach(sheetName => {
        const sheetData = sheetsData[sheetName];
        if (!sheetData) return;

        // Find all rows for this company (using normalized column index)
        const companyRows = [];
        for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            const rowCompany = row[NORMALIZED_COMPANY_COL];

            if (isSameCompany(rowCompany, company)) {
                companyRows.push(row);
            }
        }

        if (companyRows.length > 0) {
            console.log(`  Found ${companyRows.length} rows in ${sheetName}`);

            // Add rows to sheet3 with source label
            companyRows.forEach(row => {
                const newRow = [sheetName, ...row];
                sheet3Data.push(newRow);
                companyRowCount++;
            });
        } else {
            console.log(`  No data in ${sheetName}, skipping`);
        }
    });

    totalRowsProcessed += companyRowCount;

    // Store range for this company
    if (companyRowCount > 0) {
        companyRowRanges.push({
            company: company,
            startRow: startRow,
            endRow: startRow + companyRowCount - 1,
            rowCount: companyRowCount
        });
    }
});

// Add rows without company names at the end
console.log('\n' + '='.repeat(60));
console.log('Adding rows without company names (but with data)...');
console.log('='.repeat(60));

let noCompanyCount = 0;
sourceSheets.forEach(sheetName => {
    const rows = noCompanyRows[sheetName];
    if (rows && rows.length > 0) {
        console.log(`\n${sheetName}: ${rows.length} rows without company name`);
        rows.forEach(({index, row}) => {
            const newRow = [sheetName, ...row];
            sheet3Data.push(newRow);
            noCompanyCount++;
        });
    }
});

totalRowsProcessed += noCompanyCount;

console.log(`\n${'='.repeat(60)}`);
console.log(`Total rows in sheet3: ${sheet3Data.length} (including header)`);
console.log(`  - With company names: ${totalRowsProcessed - noCompanyCount} rows`);
console.log(`  - Without company names: ${noCompanyCount} rows`);
console.log(`Total data rows: ${totalRowsProcessed}`);
console.log(`${'='.repeat(60)}`);

// Create sheet3 with colors
const newWorkbook = new ExcelJS.Workbook();

// Read existing workbook
await newWorkbook.xlsx.readFile(excelPath);

// Remove old sheet3 if exists
const existingSheet3 = newWorkbook.getWorksheet('sheet3');
if (existingSheet3) {
    newWorkbook.removeWorksheet(existingSheet3.id);
}

// Create new sheet3
const worksheet = newWorkbook.addWorksheet('sheet3');

// Add data
worksheet.addRows(sheet3Data);

// Define alternating colors (light colors)
const colors = [
    'FFE7F3E7', // Light green
    'FFE3F2FD'  // Light blue
];

// Apply colors to each company
companyRowRanges.forEach((range, idx) => {
    const color = colors[idx % 2];

    for (let rowNum = range.startRow + 1; rowNum <= range.endRow + 1; rowNum++) {
        const row = worksheet.getRow(rowNum);
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: color }
            };
        });
    }
});

console.log('\nApplied alternating colors to companies');

// Save the file
await newWorkbook.xlsx.writeFile(excelPath);

console.log('\nProcessing complete!');
console.log(`File saved: ${excelPath}`);
console.log(`New sheet "sheet3" created with ${totalRowsProcessed} data rows and ${companies.length} companies`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
