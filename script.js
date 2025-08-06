// ===================================================================
// I. 頁面導覽與通用函式
// ===================================================================

function showWelcome() {
    document.getElementById('insurance-calculator-section').classList.add('hidden');
    document.getElementById('invoice-section').classList.add('hidden');
    document.getElementById('welcome-section').classList.remove('hidden');
}

function showInsuranceCalculator() {
    document.getElementById('welcome-section').classList.add('hidden');
    document.getElementById('invoice-section').classList.add('hidden');
    document.getElementById('insurance-calculator-section').classList.remove('hidden');
}

function showInvoiceCalculator() {
    document.getElementById('welcome-section').classList.add('hidden');
    document.getElementById('insurance-calculator-section').classList.add('hidden');
    document.getElementById('invoice-section').classList.remove('hidden');
    // 進入頁面時，根據下拉選單初始化
    switchInvoiceType();
}

function autoTab(currentElement, nextElementId) {
    if (currentElement.value.length === currentElement.maxLength) {
        document.getElementById(nextElementId).focus();
    }
}

// ===================================================================
// II. 保險費計算機
// ===================================================================

function toggleInputMode(type) {
    const picker = document.getElementById(`${type}Date`);
    const manualContainer = document.getElementById(`${type}DateManualContainer`);
    const button = document.querySelector(`#${type}-date-group .toggle-button`);
    const isPickerHidden = picker.classList.contains('hidden');
    if (isPickerHidden) {
        picker.classList.remove('hidden');
        manualContainer.classList.add('hidden');
        button.textContent = '手動輸入';
        updatePickerFromManual(type);
    } else {
        picker.classList.add('hidden');
        manualContainer.classList.remove('hidden');
        button.textContent = '使用日曆';
        if (picker.value) {
            const date = new Date(picker.value);
            document.getElementById(`${type}DateManualYear`).value = date.getFullYear() - 1911;
            document.getElementById(`${type}DateManualMonth`).value = (date.getMonth() + 1).toString().padStart(2, '0');
            document.getElementById(`${type}DateManualDay`).value = date.getDate().toString().padStart(2, '0');
        }
    }
}

function updatePickerFromManual(type) {
    const yearInput = document.getElementById(`${type}DateManualYear`);
    const monthInput = document.getElementById(`${type}DateManualMonth`);
    const dayInput = document.getElementById(`${type}DateManualDay`);
    const picker = document.getElementById(`${type}Date`);
    const year = yearInput.value.trim();
    const month = monthInput.value.trim();
    const day = dayInput.value.trim();
    if (year && month && day) {
        const assembledDate = `${year}/${month}/${day}`;
        const regex = /(\d{2,3})[年\/](\d{1,2})[月\/](\d{1,2})日?/;
        const match = assembledDate.match(regex);
        if (match) {
            const minguoYear = parseInt(match[1], 10);
            const adYear = minguoYear + 1911;
            const monthPadded = match[2].padStart(2, '0');
            const dayPadded = match[3].padStart(2, '0');
            const formattedDate = `${adYear}-${monthPadded}-${dayPadded}`;
            const d = new Date(formattedDate);
            if (d instanceof Date && !isNaN(d) && d.getFullYear() === adYear) {
                picker.value = formattedDate;
            } else { picker.value = ''; }
        } else { picker.value = ''; }
    } else { picker.value = ''; }
}

function resetInsuranceForm() {
    ['start', 'end'].forEach(type => {
        document.getElementById(`${type}Date`).value = '';
        document.getElementById(`${type}DateManualYear`).value = '';
        document.getElementById(`${type}DateManualMonth`).value = '';
        document.getElementById(`${type}DateManualDay`).value = '';
    });
    document.getElementById('totalPremium').value = '';
    const resultDiv = document.getElementById('result');
    resultDiv.classList.add('result-hidden');
    resultDiv.classList.remove('result-visible');
    if (!document.getElementById('startDateManualContainer').classList.contains('hidden')) {
        document.getElementById('startDateManualYear').focus();
    }
}

function calculatePremium() {
    try {
        // 更新並獲取日期與保費輸入
        updatePickerFromManual('start');
        updatePickerFromManual('end');
        const startDateString = document.getElementById('startDate').value;
        const endDateString = document.getElementById('endDate').value;
        const totalPremium = parseFloat(document.getElementById('totalPremium').value);

        // --- 1. 基本驗證 ---
        if (!startDateString || !endDateString || isNaN(totalPremium) || totalPremium <= 0) {
            alert("請確保所有欄位都已正確填寫！");
            return;
        }

        const startDate = new Date(startDateString);
        const endDate = new Date(endDateString);

        if (endDate <= startDate) {
            alert("結束日期必須晚於起始日期！");
            return;
        }

        // --- 2. 計算總天數與各年度天數 (新邏輯：不包含結束日) ---
        // 使用 UTC 避免時區問題。總天數不包含結束日期當天。
        const totalDays = (Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) - Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) / (1000 * 60 * 60 * 24);

        if (totalDays < 1) {
            alert("計算出的總天數無效，期間必須至少為一天。");
            return;
        }

        const yearData = [];
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        // 循環遍歷從開始到結束的每一年
        for (let year = startYear; year <= endYear; year++) {
            // 計算該保險期間在 "這一年" 有幾天
            const periodStartForYear = (year === startYear) ? startDate : new Date(Date.UTC(year, 0, 1));
            // 期間的結束點是下一年的第一天，或是保單的最終結束日
            const periodEndForYear = (year === endYear) ? endDate : new Date(Date.UTC(year + 1, 0, 1));
            
            const daysInYear = (periodEndForYear - periodStartForYear) / (1000 * 60 * 60 * 24);

            // 如果該年度沒有任何天數，則跳過 (主要發生在結束日剛好是 1/1 的邊界情況)
            if (daysInYear === 0) continue;
            
            // 根據您的規則，中間的完整年度天數視為 365 天
            let daysForCalc = daysInYear;
            if (year > startYear && year < endYear) {
                // 只要是中間的完整年度，計算時就用365天
                daysForCalc = 365;
            }

            yearData.push({
                adYear: year,
                minguoYear: year - 1911,
                days: Math.round(daysInYear), // 實際天數，用於顯示
                daysForCalc: daysForCalc // 用於計算的天數 (考慮到365規則)
            });
        }
        
        // --- 3. 計算各年度應分攤保費 ---
        let allocatedPremium = 0;
        const premiumResults = [];

        // 從倒數第二個年度開始往前計算，以確保 rounding 誤差最小
        for (let i = yearData.length - 1; i > 0; i--) {
            const data = yearData[i];
            // 使用您的公式：總金額 * (該年天數 / 總天數)
            const premium = Math.round(totalPremium * (data.daysForCalc / totalDays));
            premiumResults.push({ minguoYear: data.minguoYear, premium: premium });
            allocatedPremium += premium;
        }

        // 第一年的保費 = 總保費 - 已分配的所有保費 (避免 rounding 誤差)
        const firstYearPremium = totalPremium - allocatedPremium;
        premiumResults.push({ minguoYear: yearData[0].minguoYear, premium: firstYearPremium });
        premiumResults.reverse(); // 將順序轉回 chronological order

        // --- 4. 動態更新畫面 ---
        const resultContainer = document.getElementById('result-container');
        const periodSummary = document.getElementById('periodSummary');
        
        // 清空舊的結果
        resultContainer.innerHTML = '';

        // 建立期間天數摘要文字
        let summaryText = `期間總天數: ${totalDays}天 (`;
        summaryText += yearData.map(d => `${d.minguoYear}年: ${d.days}天`).join(' / ');
        summaryText += ')';
        periodSummary.innerText = summaryText;

        // 根據計算結果，動態創建顯示區塊
        premiumResults.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.innerHTML = `<h3>${result.minguoYear}年應分攤保費</h3><p>NT$ ${result.premium.toLocaleString()}</p>`;
            resultContainer.appendChild(resultDiv);
        });

        document.getElementById('result').className = 'result-visible';

    } catch (error) {
        console.error("計算過程中發生預期外的錯誤:", error);
        alert("計算失敗！請檢查輸入的日期是否有效，或按 F12 查看錯誤日誌。");
    }
}

// ===================================================================
// III. 銷項發票計算機 (此區塊維持不變)
// ===================================================================
const twoPartBody = document.getElementById('invoice-table-body-two-part');
const threePartBody = document.getElementById('invoice-table-body-three-part');
const invoiceTypeSelect = document.getElementById('invoice-type-select');
function switchInvoiceType(){const e=invoiceTypeSelect.value;"two-part"===e?(document.getElementById("invoice-table-two-part").classList.remove("hidden"),document.getElementById("invoice-summary-two-part").classList.remove("hidden"),document.getElementById("invoice-table-three-part").classList.add("hidden"),document.getElementById("invoice-summary-three-part").classList.add("hidden")):(document.getElementById("invoice-table-three-part").classList.remove("hidden"),document.getElementById("invoice-summary-three-part").classList.remove("hidden"),document.getElementById("invoice-table-two-part").classList.add("hidden"),document.getElementById("invoice-summary-two-part").classList.add("hidden")),resetInvoiceForm()}
function getCurrentInvoiceBody(){return"two-part"===invoiceTypeSelect.value?twoPartBody:threePartBody}
function addInvoiceRow(){const e=getCurrentInvoiceBody(),t=e.insertRow(),n=e.rows.length-1;"two-part"===invoiceTypeSelect.value?t.innerHTML=`\n            <td>${n}</td>\n            <td><input type="number" class="total-2" placeholder="總計金額"></td>\n            <td><input type="number" class="sales-2" readonly></td>\n            <td><input type="number" class="tax-2" readonly></td>`:t.innerHTML=`\n            <td>${n}</td>\n            <td><input type="number" class="sales-3" placeholder="未稅銷售額"></td>\n            <td><input type="number" class="tax-3"></td>\n            <td><input type="number" class="total-3" readonly></td>\n            <td><input type="text" class="tax-id-3" maxlength="8"></td>\n            <td><input type="text" class="company-3" readonly></td>`,t.querySelector("input:not([readonly])").focus()}
function updateInvoiceSummary(){let e=0,t=0,n=0,o=0;if("two-part"===invoiceTypeSelect.value){const l=twoPartBody.rows;o=l.length;for(const a of l)e+=parseFloat(a.querySelector(".total-2").value)||0,t+=parseFloat(a.querySelector(".sales-2").value)||0,n+=parseFloat(a.querySelector(".tax-2").value)||0;document.getElementById("invoice-count-two").textContent=o,document.getElementById("total-sum-two").textContent=e.toLocaleString(),document.getElementById("sales-sum-two").textContent=t.toLocaleString(),document.getElementById("tax-sum-two").textContent=n.toLocaleString()}else{const l=threePartBody.rows;o=l.length;for(const a of l)t+=parseFloat(a.querySelector(".sales-3").value)||0,n+=parseFloat(a.querySelector(".tax-3").value)||0,e+=parseFloat(a.querySelector(".total-3").value)||0;document.getElementById("invoice-count-three").textContent=o,document.getElementById("sales-sum-three").textContent=t.toLocaleString(),document.getElementById("tax-sum-three").textContent=n.toLocaleString(),document.getElementById("total-sum-three").textContent=e.toLocaleString()}}
async function lookupCompanyByTaxId(taxId, companyInput) {if (!/^\d{8}$/.test(taxId)) {companyInput.value = '統編格式錯誤';return;}companyInput.value = '查詢中...';try {const proxyUrl = 'https://api.allorigins.win/get?url=';const taxApiUrl = `https://data.gov.tw/api/v2/rest/dataset/9D17AE0D-09B5-4732-A8F4-81ADED04B679?&\$filter=Business_Accounting_NO eq ${taxId}`;const response = await fetch(proxyUrl + encodeURIComponent(taxApiUrl));if (response.ok) {const data = await response.json();const results = JSON.parse(data.contents);if (results && results.length > 0 && results[0]['營業人名稱']) {companyInput.value = results[0]['營業人名稱'];return;}}} catch (error) {console.error('稅籍 API 查詢失敗:', error);}companyInput.value = '備用查詢中...';try {const g0vApiUrl = `https://company.g0v.ronny.tw/api/show/${taxId}`;const response = await fetch(g0vApiUrl);if (response.ok) {const data = await response.json();if (data && data.data) {const companyName = data.data['公司名稱'] || data.data['名稱'];if (companyName) {companyInput.value = companyName;return;}}}companyInput.value = '查無資料';} catch (error) {console.error('g0v API 查詢失敗:', error);companyInput.value = '查詢失敗(網路問題)';}}
document.getElementById('invoice-section').addEventListener('input', function(e) {const row = e.target.closest('tr');if (!row) return;if (e.target.classList.contains('total-2')) {const total = parseFloat(e.target.value) || 0;const tax = Math.round(total / 1.05 * 0.05);row.querySelector('.sales-2').value = total - tax;row.querySelector('.tax-2').value = tax;}if (e.target.classList.contains('sales-3')) {const sales = parseFloat(e.target.value) || 0;const tax = Math.round(sales * 0.05);row.querySelector('.tax-3').value = tax;row.querySelector('.total-3').value = sales + tax;}if (e.target.classList.contains('tax-3')) {const sales = parseFloat(row.querySelector('.sales-3').value) || 0;const tax = parseFloat(e.target.value) || 0;row.querySelector('.total-3').value = sales + tax;}if (e.target.classList.contains('tax-id-3')) {const taxId = e.target.value;if (taxId.length === 8) {const companyInput = row.querySelector('.company-3');lookupCompanyByTaxId(taxId, companyInput);} else {row.querySelector('.company-3').value = '';}}updateInvoiceSummary();});
document.getElementById('invoice-section').addEventListener('keydown', function(e) {if (e.key !== 'Enter') return;const targetInput = e.target;const row = targetInput.closest('tr');if (!row) return;e.preventDefault();const allInputsInRow = Array.from(row.querySelectorAll('input:not([readonly])'));const currentIndex = allInputsInRow.indexOf(targetInput);if (currentIndex === allInputsInRow.length - 1) {addInvoiceRow();} else if (currentIndex > -1) {allInputsInRow[currentIndex + 1].focus();}});
function resetInvoiceForm() {twoPartBody.innerHTML = '';threePartBody.innerHTML = '';if (getCurrentInvoiceBody().rows.length === 0) {addInvoiceRow();}updateInvoiceSummary();}