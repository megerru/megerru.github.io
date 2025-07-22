// ===================================================================
// I. 頁面導覽與通用函式
// ===================================================================
function showWelcome(){document.getElementById("insurance-calculator-section").classList.add("hidden");document.getElementById("invoice-section").classList.add("hidden");document.getElementById("welcome-section").classList.remove("hidden")}
function showInsuranceCalculator(){document.getElementById("welcome-section").classList.add("hidden");document.getElementById("invoice-section").classList.add("hidden");document.getElementById("insurance-calculator-section").classList.remove("hidden")}
function showInvoiceCalculator(){document.getElementById("welcome-section").classList.add("hidden");document.getElementById("insurance-calculator-section").classList.add("hidden");document.getElementById("invoice-section").classList.remove("hidden");switchInvoiceType()}
function autoTab(currentElement,nextElementId){if(currentElement.value.length===currentElement.maxLength){document.getElementById(nextElementId).focus()}}

// ===================================================================
// II. 保險費計算機
// ===================================================================
// (為簡潔，省略內部程式碼，請使用您驗證成功的版本)
function toggleInputMode(e){const t=document.getElementById(`${e}Date`),n=document.getElementById(`${e}DateManualContainer`),o=document.querySelector(`#${e}-date-group .toggle-button`);t.classList.toggle("hidden")?(n.classList.remove("hidden"),o.textContent="使用日曆",t.value&&(()=>{const n=new Date(t.value);document.getElementById(`${e}DateManualYear`).value=n.getFullYear()-1911,document.getElementById(`${e}DateManualMonth`).value=(n.getMonth()+1).toString().padStart(2,"0"),document.getElementById(`${e}DateManualDay`).value=n.getDate().toString().padStart(2,"0")})()):(n.classList.add("hidden"),o.textContent="手動輸入",updatePickerFromManual(e))}function updatePickerFromManual(e){const t=document.getElementById(`${e}DateManualYear`),n=document.getElementById(`${e}DateManualMonth`),o=document.getElementById(`${e}DateManualDay`),l=document.getElementById(`${e}Date`);const a=t.value.trim(),d=n.value.trim(),c=o.value.trim();a&&d&&c?(()=>{const t=`${a}/${d}/${c}`;const n=/(\d{2,3})[年\/](\d{1,2})[月\/](\d{1,2})日?/.exec(t);n?(()=>{const t=parseInt(n[1],10)+1911,o=n[2].padStart(2,"0"),a=n[3].padStart(2,"0");const d=`${t}-${o}-${a}`;const c=new Date(d);c instanceof Date&&!isNaN(c)&&c.getFullYear()===t?l.value=d:l.value=""})():l.value=""})():l.value=""}function resetInsuranceForm(){["start","end"].forEach(e=>{document.getElementById(`${e}Date`).value="",document.getElementById(`${e}DateManualYear`).value="",document.getElementById(`${e}DateManualMonth`).value="",document.getElementById(`${e}DateManualDay`).value=""});document.getElementById("totalPremium").value="";const e=document.getElementById("result");e.classList.add("result-hidden"),e.classList.remove("result-visible"),document.getElementById("startDateManualContainer").classList.contains("hidden")||document.getElementById("startDateManualYear").focus()}function getProratedMonthValueForStart(e){return e>=1&&e<=10?1:e>=11&&e<=20?.5:0}function getProratedMonthValueForEnd(e){return e>=21?1:e>=11?.5:0}function calculatePremium(){try{updatePickerFromManual("start"),updatePickerFromManual("end");const e=document.getElementById("startDate").value,t=document.getElementById("endDate").value,n=parseFloat(document.getElementById("totalPremium").value);if(!e||!t||isNaN(n)||n<=0)return void alert("請確保所有欄位都已正確填寫！");const o=new Date(e),l=new Date(t);if(o.setUTCHours(12,0,0,0),l.setUTCHours(12,0,0,0),l<=o)return void alert("結束日期必須晚於起始日期！");const a=o.getFullYear(),d=l.getFullYear();if(a===d||d-a>1)return void alert("目前僅支援橫跨兩個連續年度的計算。");let c=0;c+=getProratedMonthValueForStart(o.getDate()),c+=11-o.getMonth();let r=0;r+=l.getMonth(),r+=getProratedMonthValueForEnd(l.getDate());const s=c+r;if(s<=0)return void alert("根據您的規則，計算出的有效總月份為0，無法計算費用。");const i=n/s,u=Math.round(i*c),m=Math.round(n-u);const g=a-1911,p=d-1911;document.getElementById("periodSummary").innerText=`有效月數：${g}年 (${c.toFixed(1)}個月) / ${p}年 (${r.toFixed(1)}個月)`,document.getElementById("resultYear1").innerHTML=`<h3>${g}年應分攤保費</h3><p>NT$ ${u}</p>`,document.getElementById("resultYear2").innerHTML=`<h3>${p}年應分攤保費</h3><p>NT$ ${m}</p>`,document.getElementById("result").className="result-visible"}catch(e){console.error("計算過程中發生預期外的錯誤:",e),alert("計算失敗！請檢查輸入的日期是否有效，或按 F12 查看錯誤日誌。")}}

// ===================================================================
// III. 銷項發票計算機
// ===================================================================

const twoPartTable = document.getElementById('invoice-table-two-part');
const threePartTable = document.getElementById('invoice-table-three-part');
const twoPartBody = document.getElementById('invoice-table-body-two-part');
const threePartBody = document.getElementById('invoice-table-body-three-part');
const twoPartSummary = document.getElementById('invoice-summary-two-part');
const threePartSummary = document.getElementById('invoice-summary-three-part');
const invoiceTypeSelect = document.getElementById('invoice-type-select');

// 切換發票類型
function switchInvoiceType() {
    const type = invoiceTypeSelect.value;
    if (type === 'two-part') {
        twoPartTable.classList.remove('hidden');
        twoPartSummary.classList.remove('hidden');
        threePartTable.classList.add('hidden');
        threePartSummary.classList.add('hidden');
    } else {
        threePartTable.classList.remove('hidden');
        threePartSummary.classList.remove('hidden');
        twoPartTable.classList.add('hidden');
        twoPartSummary.classList.add('hidden');
    }
    // 切換後如果表格是空的，就新增一列
    if (getCurrentInvoiceBody().rows.length === 0) {
        addInvoiceRow();
    }
}

function getCurrentInvoiceBody() {
    return invoiceTypeSelect.value === 'two-part' ? twoPartBody : threePartBody;
}

// 新增一列
function addInvoiceRow() {
    const tableBody = getCurrentInvoiceBody();
    const newRow = tableBody.insertRow();
    const rowIndex = tableBody.rows.length - 1;

    if (invoiceTypeSelect.value === 'two-part') {
        newRow.innerHTML = `
            <td>${rowIndex}</td>
            <td><input type="number" class="total-2" placeholder="總計金額"></td>
            <td><input type="number" class="sales-2" readonly></td>
            <td><input type="number" class="tax-2" readonly></td>`;
    } else {
        newRow.innerHTML = `
            <td>${rowIndex}</td>
            <td><input type="number" class="sales-3" placeholder="未稅銷售額"></td>
            <td><input type="number" class="tax-3" placeholder="營業稅"></td>
            <td><input type="number" class="total-3" readonly></td>`;
    }
    newRow.querySelector('input').focus();
}

// 更新總計
function updateInvoiceSummary() {
    if (invoiceTypeSelect.value === 'two-part') {
        const allTotals = document.querySelectorAll('.total-2');
        let totalSum = 0, salesSum = 0, taxSum = 0;
        allTotals.forEach(input => {
            const row = input.closest('tr');
            totalSum += parseFloat(input.value) || 0;
            salesSum += parseFloat(row.querySelector('.sales-2').value) || 0;
            taxSum += parseFloat(row.querySelector('.tax-2').value) || 0;
        });
        document.getElementById('invoice-count-two').textContent = allTotals.length;
        document.getElementById('total-sum-two').textContent = totalSum.toLocaleString();
        document.getElementById('sales-sum-two').textContent = salesSum.toLocaleString();
        document.getElementById('tax-sum-two').textContent = taxSum.toLocaleString();
    } else {
        const allSales = document.querySelectorAll('.sales-3');
        const allTaxes = document.querySelectorAll('.tax-3');
        let totalSum = 0, salesSum = 0, taxSum = 0;
        allSales.forEach(input => {
            salesSum += parseFloat(input.value) || 0;
            totalSum += parseFloat(input.closest('tr').querySelector('.total-3').value) || 0;
        });
         allTaxes.forEach(input => {
            taxSum += parseFloat(input.value) || 0;
        });
        document.getElementById('invoice-count-three').textContent = allSales.length;
        document.getElementById('sales-sum-three').textContent = salesSum.toLocaleString();
        document.getElementById('tax-sum-three').textContent = taxSum.toLocaleString();
        document.getElementById('total-sum-three').textContent = totalSum.toLocaleString();
    }
}

// 事件監聽 (使用事件委派)
document.getElementById('invoice-section').addEventListener('input', function(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    // 二聯式邏輯
    if (e.target.classList.contains('total-2')) {
        const total = parseFloat(e.target.value) || 0;
        const tax = Math.round(total / 1.05 * 0.05);
        const sales = total - tax;
        row.querySelector('.sales-2').value = sales;
        row.querySelector('.tax-2').value = tax;
    }
    // 三聯式邏輯
    if (e.target.classList.contains('sales-3') || e.target.classList.contains('tax-3')) {
        const sales = parseFloat(row.querySelector('.sales-3').value) || 0;
        const tax = parseFloat(row.querySelector('.tax-3').value) || 0;
        row.querySelector('.total-3').value = sales + tax;
    }
    updateInvoiceSummary();
});

document.getElementById('invoice-section').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const allInputs = Array.from(row.querySelectorAll('input:not([readonly])'));
        const currentIndex = allInputs.indexOf(e.target);
        
        if (currentIndex === allInputs.length - 1) { // 如果是該列最後一個輸入框
            e.preventDefault();
            addInvoiceRow();
        } else if (currentIndex > -1) { // 跳到下一個輸入框
            e.preventDefault();
            allInputs[currentIndex + 1].focus();
        }
    }
});

// 重置發票表單
function resetInvoiceForm() {
    twoPartBody.innerHTML = '';
    threePartBody.innerHTML = '';
    addInvoiceRow();
    updateInvoiceSummary();
}