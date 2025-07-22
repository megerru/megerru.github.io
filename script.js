// ===================================================================
// I. 頁面導覽與通用函式 (Page Navigation & Universal Functions)
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
    // 第一次顯示時，自動新增一列
    if (document.getElementById('invoice-table-body').rows.length === 0) {
        addInvoiceRow();
    }
}

function autoTab(currentElement, nextElementId) {
    if (currentElement.value.length === currentElement.maxLength) {
        document.getElementById(nextElementId).focus();
    }
}

// ===================================================================
// II. 保險費計算機 (Insurance Calculator)
// ===================================================================

// (此區塊的所有函式，除了 showCalculator 被重構外，其餘保持不變)
function toggleInputMode(type) {
    const picker = document.getElementById(`${type}Date`);
    const manualContainer = document.getElementById(`${type}DateManualContainer`);
    const button = document.querySelector(`#${type}-date-group .toggle-button`);
    if (picker.classList.toggle('hidden')) {
        manualContainer.classList.remove('hidden');
        button.textContent = '使用日曆';
        if (picker.value) { /* ... */ }
    } else {
        manualContainer.classList.add('hidden');
        button.textContent = '手動輸入';
        updatePickerFromManual(type);
    }
}
function updatePickerFromManual(type) { /* ... */ }
function resetForm() { /* ... */ }
function calculatePremium() { /* ... */ }
// (為簡潔，省略內部程式碼，請使用您驗證成功的版本)
function updatePickerFromManual(type) {const yearInput=document.getElementById(`${type}DateManualYear`),monthInput=document.getElementById(`${type}DateManualMonth`),dayInput=document.getElementById(`${type}DateManualDay`),picker=document.getElementById(`${type}Date`);const year=yearInput.value.trim(),month=monthInput.value.trim(),day=dayInput.value.trim();if(year&&month&&day){const assembledDate=`${year}/${month}/${day}`;const regex=/(\d{2,3})[年\/](\d{1,2})[月\/](\d{1,2})日?/;const match=assembledDate.match(regex);if(match){const minguoYear=parseInt(match[1],10);const adYear=minguoYear+1911;const monthPadded=match[2].padStart(2,"0");const dayPadded=match[3].padStart(2,"0");const formattedDate=`${adYear}-${monthPadded}-${dayPadded}`;const d=new Date(formattedDate);if(d instanceof Date&&!isNaN(d)&&d.getFullYear()===adYear){picker.value=formattedDate}else{picker.value=""}}else{picker.value=""}}else{picker.value=""}}
function resetForm(){["start","end"].forEach(type=>{document.getElementById(`${type}Date`).value="";document.getElementById(`${type}DateManualYear`).value="";document.getElementById(`${type}DateManualMonth`).value="";document.getElementById(`${type}DateManualDay`).value=""});document.getElementById("totalPremium").value="";const resultDiv=document.getElementById("result");resultDiv.classList.add("result-hidden");resultDiv.classList.remove("result-visible");if(!document.getElementById("startDateManualContainer").classList.contains("hidden")){document.getElementById("startDateManualYear").focus()}}
function getProratedMonthValueForStart(day){if(day>=1&&day<=10)return 1;if(day>=11&&day<=20)return.5;return 0}
function getProratedMonthValueForEnd(day){if(day>=21)return 1;if(day>=11)return.5;return 0}
function calculatePremium(){try{updatePickerFromManual("start");updatePickerFromManual("end");const startDateString=document.getElementById("startDate").value;const endDateString=document.getElementById("endDate").value;const totalPremium=parseFloat(document.getElementById("totalPremium").value);if(!startDateString||!endDateString||isNaN(totalPremium)||totalPremium<=0){alert("請確保所有欄位都已正確填寫！");return}const startDate=new Date(startDateString);const endDate=new Date(endDateString);startDate.setUTCHours(12,0,0,0);endDate.setUTCHours(12,0,0,0);if(endDate<=startDate){alert("結束日期必須晚於起始日期！");return}const firstAdYear=startDate.getFullYear();const secondAdYear=endDate.getFullYear();if(firstAdYear===secondAdYear||secondAdYear-firstAdYear>1){alert("目前僅支援橫跨兩個連續年度的計算。");return}let monthsInFirstYear=0;monthsInFirstYear+=getProratedMonthValueForStart(startDate.getDate());monthsInFirstYear+=11-startDate.getMonth();let monthsInSecondYear=0;monthsInSecondYear+=endDate.getMonth();monthsInSecondYear+=getProratedMonthValueForEnd(endDate.getDate());const totalEffectiveMonths=monthsInFirstYear+monthsInSecondYear;if(totalEffectiveMonths<=0){alert("根據您的規則，計算出的有效總月份為0，無法計算費用。");return}const premiumPerEffectiveMonth=totalPremium/totalEffectiveMonths;const premiumForFirstYear=Math.round(premiumPerEffectiveMonth*monthsInFirstYear);const premiumForSecondYear=Math.round(totalPremium-premiumForFirstYear);const firstMinguoYear=firstAdYear-1911;const secondMinguoYear=secondAdYear-1911;document.getElementById("periodSummary").innerText=`有效月數：${firstMinguoYear}年 (${monthsInFirstYear.toFixed(1)}個月) / ${secondMinguoYear}年 (${monthsInSecondYear.toFixed(1)}個月)`;document.getElementById("resultYear1").innerHTML=`<h3>${firstMinguoYear}年應分攤保費</h3><p>NT$ ${premiumForFirstYear}</p>`;document.getElementById("resultYear2").innerHTML=`<h3>${secondMinguoYear}年應分攤保費</h3><p>NT$ ${premiumForSecondYear}</p>`;document.getElementById("result").className="result-visible"}catch(error){console.error("計算過程中發生預期外的錯誤:",error);alert("計算失敗！請檢查輸入的日期是否有效，或按 F12 查看錯誤日誌。")}}


// ===================================================================
// III. 銷項發票計算機 (Invoice Calculator)
// ===================================================================

const invoiceTableBody = document.getElementById('invoice-table-body');
let rowCounter = 0;

// 新增一列表格
function addInvoiceRow() {
    rowCounter++;
    const newRow = invoiceTableBody.insertRow(); // 在表格末尾新增一行
    newRow.innerHTML = `
        <td>
            <input type="number" placeholder="總計金額" data-row="${rowCounter}" class="invoice-total">
        </td>
        <td>
            <input type="number" readonly class="invoice-tax">
        </td>
    `;
    // 新增完後，自動聚焦到新的總計輸入框
    newRow.querySelector('.invoice-total').focus();
}

// 更新底部的總計數據
function updateInvoiceSummary() {
    const allTotals = document.querySelectorAll('.invoice-total');
    const allTaxes = document.querySelectorAll('.invoice-tax');

    let totalSum = 0;
    allTotals.forEach(input => {
        totalSum += parseFloat(input.value) || 0;
    });

    let taxSum = 0;
    allTaxes.forEach(input => {
        taxSum += parseFloat(input.value) || 0;
    });

    document.getElementById('invoice-count').textContent = allTotals.length;
    document.getElementById('invoice-total-sum').textContent = totalSum.toLocaleString(); // 加上千分位
    document.getElementById('invoice-tax-sum').textContent = taxSum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); // 四捨五入到整數並加千分位
}

// 監聽整個表格的輸入與按鍵事件 (事件委派)
invoiceTableBody.addEventListener('input', function(e) {
    // 當「總計」輸入框有變動時
    if (e.target.classList.contains('invoice-total')) {
        const totalValue = parseFloat(e.target.value) || 0;
        const taxValue = Math.round(totalValue / 1.05 * 0.05); // 計算稅額並四捨五入
        
        // 找到同一列的稅額輸入框並填入值
        const taxInput = e.target.closest('tr').querySelector('.invoice-tax');
        taxInput.value = taxValue;

        // 更新總計
        updateInvoiceSummary();
    }
});

invoiceTableBody.addEventListener('keydown', function(e) {
    // 當在「總計」輸入框按下 Enter 鍵時
    if (e.key === 'Enter' && e.target.classList.contains('invoice-total')) {
        e.preventDefault(); // 防止預設的表單提交行為
        addInvoiceRow(); // 新增一列
    }
});