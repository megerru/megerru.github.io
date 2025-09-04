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

function updatePickerFromManual(type) {
    const yearInput = document.getElementById(`${type}DateManualYear`);
    const monthInput = document.getElementById(`${type}DateManualMonth`);
    const dayInput = document.getElementById(`${type}DateManualDay`);
    const picker = document.getElementById(`${type}Date`);
    const year = yearInput.value.trim();
    const month = monthInput.value.trim();
    const day = dayInput.value.trim();
    if (year && month && day) {
        const adYear = parseInt(year, 10) + 1911;
        const monthPadded = month.padStart(2, '0');
        const dayPadded = day.padStart(2, '0');
        const formattedDate = `${adYear}-${monthPadded}-${dayPadded}`;
        const d = new Date(formattedDate);
        if (d instanceof Date && !isNaN(d) && d.getFullYear() === adYear) {
            picker.value = formattedDate;
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
    document.getElementById('startDateManualYear').focus();
}

function calculatePremium() {
    try {
        updatePickerFromManual('start');
        updatePickerFromManual('end');
        const startDateString = document.getElementById('startDate').value;
        const endDateString = document.getElementById('endDate').value;
        const totalPremium = parseFloat(document.getElementById('totalPremium').value);

        if (!startDateString || !endDateString || isNaN(totalPremium) || totalPremium <= 0) {
            alert("請確保所有欄位都已正確填寫！"); return;
        }
        const startDate = new Date(startDateString);
        const endDate = new Date(endDateString);
        if (endDate <= startDate) {
            alert("結束日期必須晚於起始日期！"); return;
        }

        const totalDays = (Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) - Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) / (1000 * 60 * 60 * 24);
        if (totalDays < 1) {
            alert("計算出的總天數無效，期間必須至少為一天。"); return;
        }
        
        const isLeap = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        const getDaysInYear = (year) => isLeap(year) ? 366 : 365;
        const dayOfYear = (date) => (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 864e5;

        const yearData = [];
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        if (startYear === endYear) {
            yearData.push({ minguoYear: startYear - 1911, days: totalDays, daysForCalc: totalDays });
        } else {
            const firstYearDays = getDaysInYear(startYear) - dayOfYear(startDate);
            yearData.push({ minguoYear: startYear - 1911, days: firstYearDays, daysForCalc: firstYearDays });
            for (let year = startYear + 1; year < endYear; year++) {
                yearData.push({ minguoYear: year - 1911, days: 365, daysForCalc: 365 });
            }
            const lastYearDays = dayOfYear(endDate);
            yearData.push({ minguoYear: endYear - 1911, days: lastYearDays, daysForCalc: lastYearDays });
        }

        let allocatedPremium = 0;
        const premiumResults = [];
        const calculatedTotalDays = yearData.reduce((sum, d) => sum + d.days, 0);

        for (let i = yearData.length - 1; i > 0; i--) {
            const data = yearData[i];
            const premium = Math.round(totalPremium * (data.daysForCalc / calculatedTotalDays));
            premiumResults.push({ minguoYear: data.minguoYear, premium: premium });
            allocatedPremium += premium;
        }
        premiumResults.push({ minguoYear: yearData[0].minguoYear, premium: totalPremium - allocatedPremium });
        premiumResults.reverse();

        const resultContainer = document.getElementById('result-container');
        const periodSummary = document.getElementById('periodSummary');
        resultContainer.innerHTML = '';
        periodSummary.innerText = `期間總天數: ${calculatedTotalDays}天 (${yearData.map(d => `${d.minguoYear}年: ${d.days}天`).join(' / ')})`;
        premiumResults.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.innerHTML = `<h3>${result.minguoYear}年應分攤保費</h3><p>NT$ ${result.premium.toLocaleString()}</p>`;
            resultContainer.appendChild(resultDiv);
        });
        document.getElementById('result').className = 'result-visible';
    } catch (error) {
        console.error("計算過程中發生預期外的錯誤:", error);
        alert("計算失敗！請檢查輸入的日期是否有效。");
    }
}


// ===================================================================
// III. 銷項發票計算機
// ===================================================================
const twoPartBody = document.getElementById('invoice-table-body-two-part');
const threePartBody = document.getElementById('invoice-table-body-three-part');
const invoiceTypeSelect = document.getElementById('invoice-type-select');
const twoPartTable = document.getElementById('invoice-table-two-part');
const threePartTable = document.getElementById('invoice-table-three-part');
const vatEditButton = document.getElementById('toggle-vat-edit-button');
const deleteModeButton = document.getElementById('delete-mode-button');

let textMeasureSpan = null;
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('invoice-section')) {
        textMeasureSpan = document.createElement('span');
        textMeasureSpan.style.visibility = 'hidden';
        textMeasureSpan.style.position = 'absolute';
        textMeasureSpan.style.whiteSpace = 'pre';
        document.body.appendChild(textMeasureSpan);
    }
});

function adjustInputWidth(input) {
    if (!textMeasureSpan || !input.parentElement) return;
    const style = window.getComputedStyle(input);
    textMeasureSpan.style.font = style.font;
    textMeasureSpan.textContent = input.value || input.placeholder;
    const newTdWidth = textMeasureSpan.offsetWidth + 25; 
    input.parentElement.style.minWidth = `${newTdWidth}px`;
}

function switchInvoiceType() {
    const type = invoiceTypeSelect.value;
    const twoPartControls = document.getElementById('optional-controls-two-part');
    const threePartControls = document.getElementById('optional-controls-three-part');
    const twoPartContainer = document.getElementById('invoice-table-two-part');
    const threePartContainer = document.getElementById('invoice-table-three-part');
    const twoPartSummary = document.getElementById('invoice-summary-two-part');
    const threePartSummary = document.getElementById('invoice-summary-three-part');

    if (type === "two-part") {
        twoPartContainer.classList.remove("hidden");
        twoPartSummary.classList.remove("hidden");
        twoPartControls.classList.remove('hidden');
        threePartContainer.classList.add("hidden");
        threePartSummary.classList.add("hidden");
        threePartControls.classList.add('hidden');
    } else {
        threePartContainer.classList.remove("hidden");
        threePartSummary.classList.remove("hidden");
        threePartControls.classList.remove('hidden');
        twoPartContainer.classList.add("hidden");
        twoPartSummary.classList.add("hidden");
        twoPartControls.classList.add('hidden');
    }
    resetInvoiceForm();
}

function toggleOptionalColumn(columnName, type) {
    const table = type === 2 ? twoPartTable : threePartTable;
    table.classList.toggle(`show-${columnName}`);
}

function getCurrentInvoiceBody() {
    return invoiceTypeSelect.value === 'two-part' ? twoPartBody : threePartBody;
}
function getCurrentTable() {
    return invoiceTypeSelect.value === 'two-part' ? twoPartTable : threePartTable;
}

function addInvoiceRow() {
    const body = getCurrentInvoiceBody();
    if (!body) return;
    const newRow = body.insertRow();
    const index = body.rows.length;
    const isVatLocked = vatEditButton.textContent === '修改稅額';
    const vatReadonlyState = isVatLocked ? 'readonly' : '';

    const deleteCheckboxHTML = `<input type="checkbox" class="delete-checkbox" style="display: none;">`;

    if (invoiceTypeSelect.value === 'two-part') {
        newRow.innerHTML = `<td>${deleteCheckboxHTML}<span>${index}</span></td><td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7"></td><td class="col-optional col-buyer"><input type="text" class="data-buyer" placeholder="買受人名稱"></td><td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目"></td><td><input type="number" class="total-2" placeholder="總計金額"></td><td><input type="number" class="sales-2" readonly></td><td><input type="number" class="tax-2" ${vatReadonlyState}></td>`;
    } else {
        newRow.innerHTML = `<td>${deleteCheckboxHTML}<span>${index}</span></td><td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7"></td><td class="col-optional col-tax-id"><input type="tel" class="tax-id-3" maxlength="8"></td><td class="col-optional col-company"><input type="text" class="company-3" readonly></td><td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目"></td><td><input type="number" class="sales-3" placeholder="未稅銷售額"></td><td><input type="number" class="tax-3" ${vatReadonlyState}></td><td><input type="number" class="total-3" readonly></td>`;
    }

    newRow.querySelectorAll('input:not([readonly])').forEach(input => { if (input.placeholder) { adjustInputWidth(input); }});
    const firstVisibleInput = Array.from(newRow.querySelectorAll('input:not([readonly])')).find(el => el.offsetParent !== null);
    if (firstVisibleInput) { firstVisibleInput.focus(); }
}

function resetInvoiceForm() {
    twoPartBody.innerHTML = '';
    threePartBody.innerHTML = '';
    vatEditButton.textContent = '修改稅額';
    deleteModeButton.textContent = '刪除資料列';
    deleteModeButton.classList.remove('delete-active');
    document.querySelectorAll('.optional-columns-controls input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    twoPartTable.className = twoPartTable.className.replace(/show-|deletion-mode/g, '').trim();
    threePartTable.className = threePartTable.className.replace(/show-|deletion-mode/g, '').trim();
    addInvoiceRow();
    updateInvoiceSummary();
}

function toggleVatEditMode() {
    const isTwoPart = invoiceTypeSelect.value === 'two-part';
    const taxInputSelector = isTwoPart ? '.tax-2' : '.tax-3';
    const body = getCurrentInvoiceBody();
    const taxInputs = body.querySelectorAll(taxInputSelector);
    const isCurrentlyLocked = vatEditButton.textContent === '修改稅額';

    if (isCurrentlyLocked) {
        taxInputs.forEach(input => input.removeAttribute('readonly'));
        vatEditButton.textContent = '鎖定稅額';
        if (taxInputs.length > 0) taxInputs[0].focus();
    } else {
        taxInputs.forEach(input => input.setAttribute('readonly', true));
        vatEditButton.textContent = '修改稅額';
    }
}

function reindexRows(tableBody) {
    const rows = tableBody.rows;
    for(let i = 0; i < rows.length; i++) {
        rows[i].querySelector('td:first-child span').textContent = i + 1;
    }
}

function toggleDeleteMode() {
    const table = getCurrentTable();
    const body = getCurrentInvoiceBody();
    const isDeleteModeActive = table.classList.contains('deletion-mode');

    if (isDeleteModeActive) {
        const rowsToDelete = body.querySelectorAll('.delete-checkbox:checked');
        if (rowsToDelete.length > 0 && confirm(`確定要刪除這 ${rowsToDelete.length} 筆資料嗎？`)) {
            rowsToDelete.forEach(checkbox => checkbox.closest('tr').remove());
            reindexRows(body);
            updateInvoiceSummary();
        }
        table.classList.remove('deletion-mode');
        deleteModeButton.textContent = '刪除資料列';
        deleteModeButton.classList.remove('delete-active');
    } else {
        table.classList.add('deletion-mode');
        deleteModeButton.textContent = '確認刪除';
        deleteModeButton.classList.add('delete-active');
    }
}

function exportToExcel() {
    // ... (Existing export logic remains the same)
}
function updateInvoiceSummary(){
    // ... (Existing summary logic remains the same)
}
async function lookupCompanyByTaxId(taxId, companyInput) {
    // ... (Existing lookup logic remains the same)
}

function findNextVisibleInput(currentInput) {
    const row = currentInput.closest('tr');
    if (!row) return null;
    const allVisibleInputs = Array.from(row.querySelectorAll('input:not([readonly])')).filter(el => el.offsetParent !== null);
    const currentIndex = allVisibleInputs.indexOf(currentInput);
    if (currentIndex > -1 && currentIndex < allVisibleInputs.length - 1) {
        return allVisibleInputs[currentIndex + 1];
    }
    return null;
}

if(document.getElementById('invoice-section')){
    document.getElementById('invoice-section').addEventListener('input', function(e) {
        const target = e.target;
        if (!target.matches('input')) return;
        const row = target.closest('tr');
        if (!row) return;

        adjustInputWidth(target);
        if (target.classList.contains('data-date') || target.classList.contains('tax-id-3')) {
            const numericValue = target.value.replace(/\D/g, '');
            target.value = numericValue;
            if (numericValue.length === target.maxLength) {
                const nextInput = findNextVisibleInput(target);
                if (nextInput) nextInput.focus();
                if (target.classList.contains('tax-id-3')) {
                    lookupCompanyByTaxId(numericValue, row.querySelector('.company-3'));
                }
            }
        } else if (target.classList.contains('total-2')) {
            const total = parseFloat(target.value) || 0;
            const sales = Math.round(total / 1.05);
            row.querySelector('.sales-2').value = sales;
            row.querySelector('.tax-2').value = total - sales;
        } else if (target.classList.contains('tax-2')) { // New logic for two-part tax edit
            const total = parseFloat(row.querySelector('.total-2').value) || 0;
            const tax = parseFloat(target.value) || 0;
            row.querySelector('.sales-2').value = total - tax;
        } else if (target.classList.contains('sales-3')) {
            const sales = parseFloat(target.value) || 0;
            const tax = Math.round(sales * 0.05);
            row.querySelector('.tax-3').value = tax;
            row.querySelector('.total-3').value = sales + tax;
        } else if (target.classList.contains('tax-3')) {
            const sales = parseFloat(row.querySelector('.sales-3').value) || 0;
            const tax = parseFloat(target.value) || 0;
            row.querySelector('.total-3').value = sales + tax;
        }
        updateInvoiceSummary();
        row.querySelectorAll('input[readonly]').forEach(adjustInputWidth);
    });

    document.getElementById('invoice-section').addEventListener('focusin', function(e) {
        if (e.target.classList.contains('data-date') && e.target.value.includes('/')) {
            e.target.value = e.target.value.replace(/\//g, '');
            adjustInputWidth(e.target);
        }
    });

    document.getElementById('invoice-section').addEventListener('focusout', function(e) {
        if (e.target.classList.contains('data-date')) {
            const input = e.target;
            if (input.value.length === 7 && !input.value.includes('/')) {
                const y = input.value.substring(0, 3);
                const m = input.value.substring(3, 5);
                const d = input.value.substring(5, 7);
                input.value = `${y}/${m}/${d}`;
                adjustInputWidth(input);
            }
        }
    });

    document.getElementById('invoice-section').addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        const targetInput = e.target;
        if (!targetInput.matches('input')) return;
        e.preventDefault();
        const isVatLocked = vatEditButton.textContent === '修改稅額';
        if (targetInput.classList.contains('sales-3') && isVatLocked) {
            addInvoiceRow(); return;
        }
        const nextInput = findNextVisibleInput(targetInput);
        if (nextInput) { nextInput.focus(); } else { addInvoiceRow(); }
    });
}