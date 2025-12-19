# CHANGELOG - 2025-12-19

## 核心成就：銷項發票發票號碼欄位功能實現

### 變更摘要

完成銷項發票模塊的「發票號碼」功能新增。該功能包括欄位顯示控制、格式驗證、自動遞增以及 Excel 匯出支持。

---

## 功能詳解

### 1️⃣ 發票號碼欄位新增

#### 二聯式發票
- **欄位位置**：日期之後、買受人之前
- **欄位排序**：日期 → **發票號碼** → 買受人 → 品名 → 總計(含稅) → 銷售額(未稅) → 稅額
- **數據類型**：文本（2英文字母 + 8數字）
- **示例格式**：AB12345678

#### 三聯式發票
- **欄位位置**：日期之後、統一編號之前
- **欄位排序**：日期 → **發票號碼** → 統一編號 → 公司名稱 → 品名 → 銷售額(未稅) → 營業稅 → 總計(含稅)
- **數據類型**：文本（2英文字母 + 8數字）
- **示例格式**：AB12345678

### 2️⃣ 勾選控制機制

在二聯式和三聯式的可選欄位勾選區新增「發票號碼」勾選框：
- 勾選時：在表格中顯示發票號碼欄位
- 取消勾選時：隱藏發票號碼欄位
- Excel 匯出時：按勾選狀態決定是否包含該欄位

### 3️⃣ 格式驗證與錯誤提示

**驗證規則**：發票號碼必須符合 `^[A-Z]{2}\d{8}$` 格式
- 2個英文字母（大寫）
- 8個數字

**自動轉換**：小寫英文字母自動轉大寫

**錯誤提示**：
- 格式錯誤時添加紅色框框（CSS class: `invoice-error`）
- 背景色：淺紅（#fff5f5）
- 邊框色：紅色（#dc3545，2px）

**驗證時機**：
- 實時驗證（input 事件）
- 長度少於 10 字符或不符合格式時顯示紅框
- 符合格式時移除紅框

### 4️⃣ "+"按鈕自動遞增功能

在二聯式和三聯式的「發票號碼」欄位標題右側新增藍色"+"按鈕。

**功能**：
- 點擊時讀取上一列的發票號碼
- 將該發票號碼的最後 8 位數字 +1
- 將結果填入當前列（最後新增的列）
- 自動聚焦到發票號碼輸入框

**邊界情況**：
- 若上一列為空或格式錯誤：顯示警告 "上一列為空值，無效操作"
- 若數字部分達到 99999999：遞增後變為 00000000（英文部分保持不變）

**示例**：
```
AB00000000 → AB00000001
AB00000999 → AB00001000
AB99999999 → AB00000000
```

**樣式**：
- 正常狀態：藍色背景（#007bff）
- Hover：深藍（#0056b3）
- Active：更深藍（#004085）

### 5️⃣ Excel 匯出支持

更新 `exportToExcel()` 函數以支持發票號碼：
- 檢查「發票號碼」勾選狀態
- 若勾選，在 Excel headers 中添加「發票號碼」欄位
- 在匯出數據時包含發票號碼值
- 欄位位置遵循用戶界面的顯示順序

---

## 技術實現細節

### 文件修改

#### index.html （4 行新增）
```html
<!-- 二聯式勾選框 -->
<label><input type="checkbox" id="toggle-col-invoice-2" onclick="toggleOptionalColumn('invoice-no', 2)"> 發票號碼</label>

<!-- 三聯式勾選框 -->
<label><input type="checkbox" id="toggle-col-invoice-3" onclick="toggleOptionalColumn('invoice-no', 3)"> 發票號碼</label>

<!-- 表格頭欄位 + "+"按鈕 -->
<th class="col-optional col-invoice-no">發票號碼<span class="invoice-increment-btn" onclick="incrementInvoiceNumber(2)">+</span></th>
```

#### script.js （83 行新增/修改）

**1. 表格行生成邏輯**（行 382-393）
```javascript
// 二聯式和三聯式都添加
<td class="col-optional col-invoice-no">
  <input type="text" class="data-invoice-no" placeholder="AB12345678" maxlength="10">
</td>
```

**2. 發票號碼驗證**（行 619-635）
```javascript
if (target.classList.contains('data-invoice-no')) {
    target.value = target.value.toUpperCase();
    const isValid = /^[A-Z]{2}\d{8}$/.test(target.value);
    if (target.value.length === 10) {
        if (isValid) {
            target.classList.remove('invoice-error');
        } else {
            target.classList.add('invoice-error');
        }
    } else if (target.value.length > 0) {
        target.classList.add('invoice-error');
    } else {
        target.classList.remove('invoice-error');
    }
}
```

**3. Excel 匯出支持**（行 479, 487, 509, 523）
```javascript
const showInvoiceNo = document.getElementById(isTwoPart ? 'toggle-col-invoice-2' : 'toggle-col-invoice-3').checked;
if (showInvoiceNo) headers.push('發票號碼');
if (showInvoiceNo) rowData.push(row.querySelector('.data-invoice-no').value);
```

**4. 遞增功能**（行 743-799，新增函數）
```javascript
window.incrementInvoiceNumber = function(type) {
    const body = type === 2 ? twoPartBody : threePartBody;
    // 驗證上一列存在且格式正確
    // 提取英文和數字，遞增數字部分
    // 超過 99999999 時重置為 00000000
    // 填入當前列最後一行
}
```

#### style.css （31 行新增）

**1. 表格顯示控制**（行 165）
```css
table.show-invoice-no .col-invoice-no { display: table-cell; }
```

**2. "+"按鈕樣式**（行 168-187）
```css
.invoice-increment-btn {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 6px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    transition: background-color 0.2s;
}
```

**3. 驗證錯誤樣式**（行 189-194）
```css
input.invoice-error {
    border: 2px solid #dc3545 !important;
    background-color: #fff5f5 !important;
    box-shadow: inset 0 0 0 1px #dc3545 !important;
}
```

---

## 測試結果

✅ **格式驗證**
- AB12345678 ✓ 有效
- ab12345678 ✓ 自動轉大寫
- AB1234567 ✓ 拒絕（數字太少）
- AB123456789 ✓ 拒絕（數字太多）
- 1234567890 ✓ 拒絕（無英文）

✅ **遞增邏輯**
- AB00000000 +1 → AB00000001 ✓
- AB00000999 +1 → AB00001000 ✓
- AB99999999 +1 → AB00000000 ✓
- XY12345678 +1 → XY12345679 ✓

✅ **代碼品質**
- script.js 語法驗證通過
- 無破壞性變更（計算邏輯完全保留）

---

## 向後兼容性

✅ **完全向後兼容**
- 發票號碼為可選欄位（默認隱藏）
- 現有勾選和計算邏輯未修改
- 現有用戶不受影響
- 新功能完全選擇性使用

---

## 核心哲學應用（Linus 視角）

### 好品味設計
- ✅ 消除邊界情況：發票號碼遞增時自動處理進位和溢出
- ✅ 簡潔實現：驗證邏輯集中在 input 事件處理中
- ✅ 直觀 UI：紅框提示無需額外說明即可理解錯誤

### Never Break Userspace
- ✅ 發票號碼為可選欄位，不強制使用
- ✅ 現有功能完全保留，無任何破壞
- ✅ Excel 導出時按勾選狀態決定是否包含

### 實用主義
- ✅ 解決真實問題：用戶手動輸入發票號碼時易出錯、易重複
- ✅ 簡單方案：數字 +1 而非複雜的序列號生成
- ✅ 最小化複雜度：無額外配置或數據庫需求

---

## 發佈信息

- **提交時間**：2025-12-19
- **修改文件**：3 個（index.html, script.js, style.css）
- **總新增行數**：116 行
- **向後兼容性**：✅ 完全相容

