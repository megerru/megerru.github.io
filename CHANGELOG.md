# CHANGELOG

## [2024-12-23] - 發票系統 Bug 修復與資料持久化改進

### Fixed
- **表頭無法凍結與 Excel 匯出遺漏部分資料** (commit: 48dd18e)
  - 問題 1：勾選「發票號碼」後，往下滾動時標題無法固定在頂部
  - 根本原因：sticky 定位需要正確的父容器 `position: relative` 設定
  - 修正：
    - 為 `.invoice-table-container` 添加 `position: relative`
    - 為 `table` 添加 `position: relative`
    - 提升 `th` 的 `z-index` 從 1 到 10
    - 添加 `box-shadow` 讓凍結效果更明顯
  - 問題 2：有發票號碼但金額為 0 的列未匯出到 Excel
  - 症狀：5 列資料中，第 2、4 列有日期和發票號碼但金額為 0，匯出時被跳過
  - 根本原因：`hasData` 檢查時遺漏了 `sales` 和 `tax` 欄位
  - 修正：
    - 二聯式：檢查所有欄位（date, invoiceNo, buyer, item, sales, tax, total）
    - 三聯式：檢查所有欄位（date, invoiceNo, taxId, company, item, sales, tax, total）
    - 添加 `.trim()` 確保空白字串不被當作有效資料
  - 影響範圍：`style.css:130-133`, `script.js:960-1000`

- **隨機點擊欄位測試時產生重複發票號碼** (commit: eed090b)
  - 問題：用戶隨機點擊不同欄位測試 +1 功能時，產生重複的發票號碼
  - 根本原因：自動焦點移動邏輯導致 `lastFocusedInvoiceInput` 與用戶意圖不同步
  - 修正：移除 `nextEmptyInput` 的自動焦點移動邏輯，保持焦點在當前填入的欄位
  - 新行為：用戶完全控制焦點位置，不會自動跳到下一個空欄位
  - 影響範圍：`script.js:1503-1522`

- **切換發票類型時資料消失** (commit: 1ec0fa7)
  - 問題：在二聯式輸入日期和金額後切換到三聯式，再切回來時資料消失
  - 根本原因：`extractTableData()` 只提取「必填欄位有值」的行（二聯式必填 `total-2`，三聯式必填 `sales-3`）
  - 修正：改為提取「任何欄位有值」的行，並消除 `switchInvoiceType()` 的冗余保存（從 3 次減少到 1 次）
  - 影響範圍：`script.js:77-131`, `script.js:580-623`

- **發票號碼 +1 功能不工作** (commit: 1ec0fa7)
  - 問題：第一行輸入發票號碼（如 `AS12313212`）後，按「+」號無法遞增到 `AS12313213`
  - 根本原因：舊邏輯查找「倒數第二列」，當只有一列時無法找到參考（`lastRowIndex - 1 = -1`）
  - 修正：完全重寫邏輯，向上查找「最後一個有效的發票號碼」，自動新增列並填入遞增值
  - 新行為：
    - 從所有列中找最後一個符合格式 `[A-Z]{2}\d{8}` 的發票號碼
    - 自動新增一列（而非填入現有列）
    - 若無有效發票號碼，提示用戶先輸入
  - 影響範圍：`script.js:1408-1469`

### Technical Improvements
- **數據提取邏輯**
  - 從「必填欄位檢查」改為「任意欄位有值檢查」
  - 消除邊界情況：不再依賴 `requiredFieldClass` 來判斷有效行
  - 減少 `switchInvoiceType()` 複雜度：移除「第0步」和「第1步」的冗余保存

- **發票號碼遞增邏輯**
  - 消除「倒數第二列」這種脆弱的假設
  - 改用「向上查找最後有效值」的穩健模式
  - 新增自動建列功能，提升使用者體驗

---

## [2024-12-23] - 發票系統完整重構與匯出功能優化

### Added
- **智能發票匯出功能** (commit: 8fd8944)
  - 新增三種匯出模式：
    1. 僅匯出當前類型（二聯式或三聯式）
    2. 合併匯出（二聯式+三聯式智能排序）
    3. 分開匯出（產生兩個獨立 Excel 檔案）
  - 動態偵測資料可用性，自動顯示/隱藏匯出選項

- **State-Driven 架構核心模組** (commit: 8dbb16c)
  - `js/core/state.js` - 反應式狀態管理系統
  - `js/core/render.js` - 安全渲染引擎（XSS 防護）
  - `js/core/events.js` - 全域事件委派系統
  - `js/utils.js` - 安全工具函式庫（驗證、格式化）
  - `js/modules/invoice.js` - 統一發票系統模組（待整合）

### Fixed
- **匯出選項只顯示當前類型按鈕** (commit: fa38ae4)
  - 問題：Line 848 條件 `hasTwoPartData && hasThreePartData` 過於嚴格
  - 症狀：只有一種類型有資料時，合併/分開匯出按鈕消失
  - 修正：改為 `hasTwoPartData || hasThreePartData`
  - 邏輯：只要有任一種資料就應顯示所有匯出選項

- **合併匯出排序邏輯最終修正** (commit: e1e3417)
  - 確認排序規則：年月 → 發票類型 → 完整日期
  - 同月份內所有二聯式排完後，再排所有三聯式
  - 範例排序：
    ```
    1140101 二聯式
    1140110 二聯式
    1140105 三聯式  ← 雖然日期5號較早，但類型優先級較低
    1140201 二聯式  ← 新月份開始
    ```

- **切換發票類型時欄位資料消失** (commit: d3d3c94)
  - 修復 `extractTableData()` 欄位名稱對應錯誤
  - 問題：`'data-invoice-no'` 錯誤轉換為 `'invoiceno'`（應為 `'invoiceNo'`）
  - 解決：使用明確的 `fieldMapping` 物件，確保 camelCase 一致性

- **匯出功能無法讀取非當前類型資料** (commit: 57f0eac)
  - 修復 `checkHasValidData()` 只檢查可見 DOM 的問題
  - 新增 localStorage 資料檢查邏輯
  - 確保切換到其他類型時，匯出選項仍可正確顯示

- **合併匯出排序邏輯調整歷程**
  - commit 5929954: 嘗試完整日期優先（不符需求）
  - commit 8a22473: 嘗試月份分組 + 類型優先（正確）
  - commit 7248ab5: 誤解需求改為純日期排序（錯誤）
  - commit e1e3417: 最終確認月份分組 + 類型優先（正確）

### Changed
- **保留原有日期格式** (用戶要求)
  - 維持民國年 7 位數格式（YYYmmdd，如 1140629）
  - 理由：會計作業便利性考量

- **移除統編查詢速率限制** (用戶要求)
  - 原設計：每分鐘最多 5 次查詢
  - 實際實作：無速率限制（從未實作限制功能）
  - 理由：用戶需要頻繁查詢公司名稱

### Technical Improvements
- **架構改進**
  - 從 DOM-as-data-source 轉向 State-Driven Architecture
  - 實作 Single Source of Truth 模式
  - 全域事件委派取代 inline event handlers
  - XSS 防護（HTML 跳脫處理）

- **代碼品質**
  - 欄位名稱統一使用 camelCase（`invoiceNo`, `taxId`）
  - localStorage 資料持久化與遷移層
  - 減少代碼重複（統一發票系統模組）

### Notes
- 核心模組已建立但採用漸進式整合策略
- 現有功能保持 100% 向後相容
- 未來可逐步將舊代碼遷移至新架構

---

## 開發原則
遵循 Linus Torvalds 哲學：
- ✅ 消除特殊情況，追求「好品味」代碼
- ✅ Never break userspace（零破壞性）
- ✅ 實用主義優先（解決真實問題）
- ✅ 簡潔執念（避免過度設計）
