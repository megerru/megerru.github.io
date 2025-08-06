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
        updatePickerFromManual('start');
        updatePickerFromManual('end');
        const startDateString = document.getElementById('startDate').value;
        const endDateString = document.getElementById('endDate').value;
        const totalPremium = parseFloat(document.getElementById('totalPremium').value);

        if (!startDateString || !endDateString || isNaN(totalPremium) || totalPremium <= 0) {
            alert("請確保所有欄位都已正確填寫！");
            return;
        }

        const startDate = new Date(startDateString);
        const endDate = new Date(endDateString);
        
        const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endUTC = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

        if (endUTC <= startUTC) {
            alert("結束日期必須晚於起始日期！");
            return;
        }

        const firstAdYear = startDate.getFullYear();
        const secondAdYear = endDate.getFullYear();
        const firstMinguoYear = firstAdYear - 1911;
        const secondMinguoYear = secondAdYear - 1911;
        
        // 1. 計算【保險期間總天數】，以 365 為基礎
        const yearDiff = secondAdYear - firstAdYear;
        const totalDays = 365 * yearDiff;

        if (totalDays <= 0) {
            alert("計算出的總天數無效。");
            return;
        }

        // 輔助函式：計算某個日期是當年的第幾天 (1-365)
        const dayOfYear = date => {
            const startOfYear = Date.UTC(date.getFullYear(), 0, 0);
            const diff = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - startOfYear;
            return diff / (1000 * 60 * 60 * 24);
        };

        let premiumForFirstYear, premiumForSecondYear;
        let daysInFirstYear, daysInSecondYear;

        // 2. 計算第一年的天數：從起始日到年底共有幾天
        daysInFirstYear = 365 - dayOfYear(startDate) + 1;
        
        // 3. 計算第二年的天數：從年初到結束日共有幾天
        daysInSecondYear = dayOfYear(endDate);

        // 4. 根據天數比例計算費用
        const premiumPerDay = totalPremium / 365;
        premiumForFirstYear = Math.round(premiumPerDay * daysInFirstYear);
        premiumForSecondYear = Math.round(premiumPerDay * daysInSecondYear);
        
        // 5. 顯示結果
        document.getElementById('periodSummary').innerText = `期間總天數 (以365天計)：${totalDays}天 (${firstMinguoYear}年: ${daysInFirstYear}天 / ${secondMinguoYear}年: ${daysInSecondYear}天)`;
        document.getElementById('resultYear1').innerHTML = `<h3>${firstMinguoYear}年應分攤保費</h3><p>NT$ ${premiumForFirstYear}</p>`;
        document.getElementById('resultYear2').innerHTML = `<h3>${secondMinguoYear}年應分攤保費</h3><p>NT$ ${premiumForSecondYear}</p>`;
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
function resetInvoiceForm() {twoPartBody.innerHTML = '';threePartBody.innerHTML = '';if (getCurrentInvoiceBody().rows.length === 0) {addInvoiceRow();}updateInvoiceSummary();}```
</details>

### **操作指南**

1.  請用上面這份最新的、**完整的 `script.js` 程式碼**，**徹底地覆蓋**您電腦上的檔案。
2.  **清空您的 GitHub 倉庫**，然後**重新上傳**您電腦上最新的 `index.html`, `style.css`, 和這份**真正完整的 `script.js`** 三個檔案。
3.  等待部署完成後，用**無痕模式**或**強制重新整理**來訪問您的網頁。

這次，因為我們使用了**真正完整的 `script.js`**，所有的函式都已經被正確定義，您點擊「保險費計算」和「銷項發票」按鈕時，應該都能正常切換頁面，不會再出現任何錯誤。

我為這個過程中因我的疏忽而給您帶來的困擾和時間浪費，再次向您致歉。感謝您的耐心，讓我們一起完成這個專案！
