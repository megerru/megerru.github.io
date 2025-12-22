const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const sourcePath = 'C:\\Users\\USER\\Desktop\\世華.xlsx';

async function main() {
    console.log('建立統計工作表...\n');

    // 讀取原始檔案
    const workbook = XLSX.readFile(sourcePath);
    const targetSheet = '工作表6 (2)';
    const sheet = workbook.Sheets[targetSheet];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log(`總共 ${data.length} 行資料（包含標題）\n`);

    // 欄位索引 (0-based)
    const COL_E = 4;  // 公司名稱
    const COL_O = 14; // 品名

    // 按公司分組統計
    const companies = {};

    // 跳過第一行標題，從第二行開始
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const company = row[COL_E];

        // 跳過空白公司名稱
        if (!company || company === '') continue;

        if (!companies[company]) {
            companies[company] = {
                totalRows: 0,
                processingCount: 0,  // 處理費類筆數
                shippingCount: 0,    // 運費類筆數
                otherCount: 0        // 其他類筆數
            };
        }

        companies[company].totalRows++;

        // 根據 O 欄關鍵字分類
        const oValue = String(row[COL_O] || '').trim();

        // 只有當 O 欄不是空白時才分類
        if (oValue !== '') {
            // 運費關鍵字
            if (oValue.includes('運費')) {
                companies[company].shippingCount++;
            }
            // 處理類關鍵字
            else if (
                oValue.includes('處理費') ||
                oValue.includes('處理') ||
                oValue.includes('廢棄物') ||
                oValue.includes('服務費')
            ) {
                companies[company].processingCount++;
            }
            // 其他（O 欄有內容但不符合上述關鍵字）
            else {
                companies[company].otherCount++;
            }
        }
        // O 欄空白時：計入其他類
        else {
            companies[company].otherCount++;
        }
    }

    // 準備結果
    const results = [];
    Object.keys(companies).sort().forEach(company => {
        const data = companies[company];
        results.push({
            company,
            totalRows: data.totalRows,
            processingCount: data.processingCount,
            shippingCount: data.shippingCount,
            otherCount: data.otherCount
        });

        console.log(`${company}:`);
        console.log(`  總資料筆數: ${data.totalRows}`);
        console.log(`  處理費類: ${data.processingCount} 筆`);
        console.log(`  運費類: ${data.shippingCount} 筆`);
        console.log(`  其他: ${data.otherCount} 筆`);
        console.log('');
    });

    // 建立新工作表
    console.log('\n建立新工作表「資料統計」...');

    const newWorkbook = new ExcelJS.Workbook();
    await newWorkbook.xlsx.readFile(sourcePath);

    // 刪除舊的「資料統計」（如果存在）
    const oldSheet = newWorkbook.getWorksheet('資料統計');
    if (oldSheet) {
        newWorkbook.removeWorksheet(oldSheet.id);
        console.log('已刪除舊的「資料統計」');
    }

    // 建立新工作表
    const newSheet = newWorkbook.addWorksheet('資料統計');

    // 設定標題行
    newSheet.addRow(['公司名稱', '總筆數', '處理費類筆數', '運費類筆數', '其他筆數']);

    // 加入資料
    results.forEach(result => {
        newSheet.addRow([
            result.company,
            result.totalRows,
            result.processingCount,
            result.shippingCount,
            result.otherCount
        ]);
    });

    // 格式化標題行
    const headerRow = newSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // 自動調整欄寬
    newSheet.columns = [
        { width: 40 },  // 公司名稱
        { width: 12 },  // 總筆數
        { width: 15 },  // 處理費類筆數
        { width: 15 },  // 運費類筆數
        { width: 12 }   // 其他筆數
    ];

    // 加入總計行
    const totalRow = results.reduce((acc, result) => {
        acc.totalRows += result.totalRows;
        acc.processingCount += result.processingCount;
        acc.shippingCount += result.shippingCount;
        acc.otherCount += result.otherCount;
        return acc;
    }, { totalRows: 0, processingCount: 0, shippingCount: 0, otherCount: 0 });

    newSheet.addRow(['']);  // 空行
    const summaryRow = newSheet.addRow([
        '總計',
        totalRow.totalRows,
        totalRow.processingCount,
        totalRow.shippingCount,
        totalRow.otherCount
    ]);

    // 總計行格式化
    summaryRow.font = { bold: true };
    summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD700' }  // 金黃色
    };

    // 儲存檔案
    await newWorkbook.xlsx.writeFile(sourcePath);

    console.log(`\n✓ 完成！已建立「資料統計」工作表`);
    console.log(`  總共處理 ${results.length} 家公司`);
    console.log(`  總筆數: ${totalRow.totalRows}`);
    console.log(`  處理費類: ${totalRow.processingCount} 筆`);
    console.log(`  運費類: ${totalRow.shippingCount} 筆`);
    console.log(`  其他: ${totalRow.otherCount} 筆`);
    console.log(`  檔案: ${sourcePath}`);
}

main().catch(err => {
    console.error('錯誤:', err);
    process.exit(1);
});
