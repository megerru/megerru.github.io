const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const sourcePath = 'C:\\Users\\USER\\Desktop\\世華.xlsx';

async function main() {
    console.log('處理世華 Excel 檔案...\n');

    // 讀取原始檔案
    const workbook = XLSX.readFile(sourcePath);
    const targetSheet = '工作表6 (2)';
    const sheet = workbook.Sheets[targetSheet];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log(`總共 ${data.length} 行資料（包含標題）\n`);

    // 欄位索引 (0-based)
    const COL_E = 4;  // 公司名稱
    const COL_G = 6;  // 銷售額
    const COL_O = 14; // 品名
    const COL_P = 15; // 銷售額（右邊）

    // 按公司分組
    const companies = {};

    // 跳過第一行標題，從第二行開始
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const company = row[COL_E];

        // 跳過空白公司名稱
        if (!company || company === '') continue;

        if (!companies[company]) {
            companies[company] = {
                rows: [],
                sumG: 0,
                processing: [], // 處理費/處理/廢棄物/服務費
                shipping: []    // 運費
            };
        }

        companies[company].rows.push(row);

        // 累加 G 欄（只累加非空白且為數字的值）
        const gValue = row[COL_G];
        if (gValue && typeof gValue === 'number') {
            companies[company].sumG += gValue;
        }

        // 根據 O 欄關鍵字分類
        const oValue = String(row[COL_O] || '').trim();
        const pValue = row[COL_P];

        // 只有當 O 欄不是空白時才分類
        if (oValue !== '') {
            // 運費關鍵字
            if (oValue.includes('運費')) {
                companies[company].shipping.push({
                    oValue,
                    pValue: (pValue && typeof pValue === 'number') ? pValue : 0
                });
            }
            // 處理類關鍵字
            else if (
                oValue.includes('處理費') ||
                oValue.includes('處理') ||
                oValue.includes('廢棄物') ||
                oValue.includes('服務費')
            ) {
                companies[company].processing.push({
                    oValue,
                    pValue: (pValue && typeof pValue === 'number') ? pValue : 0
                });
            }
        }
        // O 欄空白時：不處理 P 欄，G 欄已經在上面累加過了
    }

    // 計算每個公司的統計
    const results = [];

    Object.keys(companies).sort().forEach(company => {
        const data = companies[company];

        // 計算處理費總和
        const processingSum = data.processing.reduce((sum, item) => sum + item.pValue, 0);

        // 計算運費總和
        const shippingSum = data.shipping.reduce((sum, item) => sum + item.pValue, 0);

        results.push({
            company,
            sumG: data.sumG,
            processingSum,
            shippingSum,
            processingCount: data.processing.length,
            shippingCount: data.shipping.length,
            totalRows: data.rows.length
        });

        console.log(`${company}:`);
        console.log(`  資料筆數: ${data.rows.length}`);
        console.log(`  G欄總和: ${data.sumG.toLocaleString()}`);
        console.log(`  處理費類 (${data.processing.length}筆): ${processingSum.toLocaleString()}`);
        console.log(`  運費類 (${data.shipping.length}筆): ${shippingSum.toLocaleString()}`);
        console.log('');
    });

    // 建立新工作表
    console.log('\n建立新工作表「新表1」...');

    const newWorkbook = new ExcelJS.Workbook();
    await newWorkbook.xlsx.readFile(sourcePath);

    // 刪除舊的「新表1」（如果存在）
    const oldSheet = newWorkbook.getWorksheet('新表1');
    if (oldSheet) {
        newWorkbook.removeWorksheet(oldSheet.id);
        console.log('已刪除舊的「新表1」');
    }

    // 建立新工作表
    const newSheet = newWorkbook.addWorksheet('新表1');

    // 設定標題行
    newSheet.addRow(['公司名稱', '銷售額', '處理費/處理/廢棄物/服務費 總和', '運費 總和']);

    // 加入資料
    results.forEach(result => {
        newSheet.addRow([
            result.company,
            result.sumG,
            result.processingSum,
            result.shippingSum
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
        { width: 15 },  // 銷售額
        { width: 30 },  // 處理費
        { width: 20 }   // 運費
    ];

    // 儲存檔案
    await newWorkbook.xlsx.writeFile(sourcePath);

    console.log(`\n✓ 完成！已建立「新表1」工作表`);
    console.log(`  總共處理 ${results.length} 家公司`);
    console.log(`  檔案: ${sourcePath}`);
}

main().catch(err => {
    console.error('錯誤:', err);
    process.exit(1);
});
