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
        if (endDate <= startDate) {
            alert("結束日期必須晚於起始日期！");
            return;
        }

        const totalDays = (Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) - Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) / (1000 * 60 * 60 * 24);
        if (totalDays < 1) {
            alert("計算出的總天數無效，期間必須至少為一天。");
            return;
        }
        
        const isLeap = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        const getDaysInYear = (year) => isLeap(year) ? 366 : 365;
        const dayOfYear = (date) => {
            const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
            const startOfYear = Date.UTC(date.getFullYear(), 0, 0);
            return (utcDate - startOfYear) / (1000 * 60 * 60 * 24);
        };

        const yearData = [];
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        if (startYear === endYear) {
            yearData.push({ adYear: startYear, minguoYear: startYear - 1911, days: totalDays, daysForCalc: totalDays });
        } else {
            const firstYearDays = getDaysInYear(startYear) - dayOfYear(startDate);
            yearData.push({ adYear: startYear, minguoYear: startYear - 1911, days: firstYearDays, daysForCalc: firstYearDays });

            for (let year = startYear + 1; year < endYear; year++) {
                yearData.push({ adYear: year, minguoYear: year - 1911, days: 365, daysForCalc: 365 });
            }
            const lastYearDays = dayOfYear(endDate);
            yearData.push({ adYear: endYear, minguoYear: endYear - 1911, days: lastYearDays, daysForCalc: lastYearDays });
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

        const firstYearPremium = totalPremium - allocatedPremium;
        premiumResults.push({ minguoYear: yearData[0].minguoYear, premium: firstYearPremium });
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
        alert("計算失敗！請檢查輸入的日期是否有效，或按 F12 查看錯誤日誌。");
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

let textMeasureSpan = null;
document.addEventListener('DOMContentLoaded', () => {
    textMeasureSpan = document.createElement('span');
    textMeasureSpan.style.visibility = 'hidden';
    textMeasureSpan.style.position = 'absolute';
    textMeasureSpan.style.whiteSpace = 'pre';
    document.body.appendChild(textMeasureSpan);
});

function adjustInputWidth(input) {
    if (!textMeasureSpan || !input.parentElement) return;
    const style = window.getComputedStyle(input);
    textMeasureSpan.style.font = style.font;
    textMeasureSpan.textContent = input.value || input.placeholder;
    const newTdWidth = textMeasureSpan.offsetWidth + 25; // 增加緩衝空間
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

function addInvoiceRow() {
    const body = getCurrentInvoiceBody();
    if (!body) return;
    const newRow = body.insertRow();
    const index = body.rows.length;

    if (invoiceTypeSelect.value === 'two-part') {
        newRow.innerHTML = `
            <td>${index}</td>
            <td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7"></td>
            <td class="col-optional col-buyer"><input type="text" class="data-buyer" placeholder="買受人名稱"></td>
            <td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目"></td>
            <td><input type="number" class="total-2" placeholder="總計金額"></td>
            <td><input type="number" class="sales-2" readonly></td>
            <td><input type="number" class="tax-2" readonly></td>`;
    } else {
        newRow.innerHTML = `
            <td>${index}</td>
            <td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7"></td>
            <td class="col-optional col-tax-id"><input type="tel" class="tax-id-3" maxlength="8"></td>
            <td class="col-optional col-company"><input type="text" class="company-3" readonly></td>
            <td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目"></td>
            <td><input type="number" class="sales-3" placeholder="未稅銷售額"></td>
            <td><input type="number" class="tax-3"></td>
            <td><input type="number" class="total-3" readonly></td>`;
    }

    newRow.querySelectorAll('input:not([readonly])').forEach(input => {
        if (input.placeholder) {
           adjustInputWidth(input);
        }
    });
    
    const firstVisibleInput = Array.from(newRow.querySelectorAll('input:not([readonly])')).find(el => el.offsetParent !== null);
    if (firstVisibleInput) {
        firstVisibleInput.focus();
    }
}

function resetInvoiceForm() {
    twoPartBody.innerHTML = '';
    threePartBody.innerHTML = '';

    document.querySelectorAll('.optional-columns-controls input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    twoPartTable.className = twoPartTable.className.replace(/show-[\w-]+/g, '').trim();
    threePartTable.className = threePartTable.className.replace(/show-[\w-]+/g, '').trim();
    
    addInvoiceRow();
    updateInvoiceSummary();
}

function exportToExcel() {
    const type = invoiceTypeSelect.value;
    const isTwoPart = type === 'two-part';
    const body = isTwoPart ? twoPartBody : threePartBody;
    const rows = body.rows;
    if (rows.length === 0 || (rows.length === 1 && !rows[0].querySelector('input[type="number"]')?.value)) {
        alert('沒有資料可以匯出！');
        return;
    }

    const headers = [];
    const data = [];
    const showDate = document.getElementById(isTwoPart ? 'toggle-col-date-2' : 'toggle-col-date-3').checked;
    const showBuyer = isTwoPart && document.getElementById('toggle-col-buyer-2').checked;
    const showItem = document.getElementById(isTwoPart ? 'toggle-col-item-2' : 'toggle-col-item-3').checked;
    const showTaxId = !isTwoPart && document.getElementById('toggle-col-tax-id-3').checked;
    const showCompany = !isTwoPart && document.getElementById('toggle-col-company-3').checked;

    headers.push('編號');
    if (showDate) headers.push('日期');
    if (isTwoPart) {
        if (showBuyer) headers.push('買受人');
        if (showItem) headers.push('品名');
        headers.push('銷售額(未稅)', '稅額', '總計(含稅)');
    } else {
        if (showTaxId) headers.push('統一編號');
        if (showCompany) headers.push('公司名稱');
        if (showItem) headers.push('品名');
        headers.push('銷售額(未稅)', '營業稅', '總計(含稅)');
    }

    for (const row of rows) {
        const rowData = [];
        if (isTwoPart) {
            const totalValue = row.querySelector('.total-2').value;
            if (!totalValue) continue;
            rowData.push(row.cells[0].textContent);
            if (showDate) rowData.push(row.querySelector('.data-date').value);
            if (showBuyer) rowData.push(row.querySelector('.data-buyer').value);
            if (showItem) rowData.push(row.querySelector('.data-item').value);
            rowData.push(parseFloat(row.querySelector('.sales-2').value) || 0, parseFloat(row.querySelector('.tax-2').value) || 0, parseFloat(totalValue) || 0);
        } else {
            const salesValue = row.querySelector('.sales-3').value;
            if (!salesValue) continue;
            rowData.push(row.cells[0].textContent);
            if (showDate) rowData.push(row.querySelector('.data-date').value);
            if (showTaxId) rowData.push(row.querySelector('.tax-id-3').value);
            if (showCompany) rowData.push(row.querySelector('.company-3').value);
            if (showItem) rowData.push(row.querySelector('.data-item').value);
            rowData.push(parseFloat(salesValue) || 0, parseFloat(row.querySelector('.tax-3').value) || 0, parseFloat(row.querySelector('.total-3').value) || 0);
        }
        data.push(rowData);
    }
    
    if (data.length === 0) {
        alert('沒有有效的資料可以匯出！');
        return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '發票明細');
    const fileName = isTwoPart ? '二聯式銷項發票.xlsx' : '三聯式銷項發票.xlsx';
    XLSX.writeFile(workbook, fileName);
}

function updateInvoiceSummary(){let e=0,t=0,n=0,o=0;if("two-part"===invoiceTypeSelect.value){const l=twoPartBody.rows;o=l.length;for(const a of l)e+=parseFloat(a.querySelector(".total-2").value)||0,t+=parseFloat(a.querySelector(".sales-2").value)||0,n+=parseFloat(a.querySelector(".tax-2").value)||0;document.getElementById("invoice-count-two").textContent=o,document.getElementById("total-sum-two").textContent=e.toLocaleString(),document.getElementById("sales-sum-two").textContent=t.toLocaleString(),document.getElementById("tax-sum-two").textContent=n.toLocaleString()}else{const l=threePartBody.rows;o=l.length;for(const a of l)t+=parseFloat(a.querySelector(".sales-3").value)||0,n+=parseFloat(a.querySelector(".tax-3").value)||0,e+=parseFloat(a.querySelector(".total-3").value)||0;document.getElementById("invoice-count-three").textContent=o,document.getElementById("sales-sum-three").textContent=t.toLocaleString(),document.getElementById("tax-sum-three").textContent=n.toLocaleString(),document.getElementById("total-sum-three").textContent=e.toLocaleString()}}
async function lookupCompanyByTaxId(taxId, companyInput) {if (!/^\d{8}$/.test(taxId)) {companyInput.value = '統編格式錯誤'; return;} companyInput.value = '查詢中...'; try {adjustInputWidth(companyInput);} catch(e){} try {const proxyUrl = 'https://api.allorigins.win/get?url=';const taxApiUrl = `https://data.gov.tw/api/v2/rest/dataset/9D17AE0D-09B5-4732-A8F4-81ADED04B679?&\$filter=Business_Accounting_NO eq ${taxId}`;const response = await fetch(proxyUrl + encodeURIComponent(taxApiUrl));if (response.ok) {const data = await response.json();const results = JSON.parse(data.contents);if (results && results.length > 0 && results[0]['營業人名稱']) {companyInput.value = results[0]['營業人名稱']; adjustInputWidth(companyInput); return;}}} catch (error) {console.error('稅籍 API 查詢失敗:', error);}companyInput.value = '備用查詢中...'; adjustInputWidth(companyInput); try {const g0vApiUrl = `https://company.g0v.ronny.tw/api/show/${taxId}`;const response = await fetch(g0vApiUrl);if (response.ok) {const data = await response.json();if (data && data.data) {const companyName = data.data['公司名稱'] || data.data['名稱'];if (companyName) {companyInput.value = companyName; adjustInputWidth(companyInput); return;}}}companyInput.value = '查無資料'; adjustInputWidth(companyInput); } catch (error) {console.error('g0v API 查詢失敗:', error);companyInput.value = '查詢失敗'; adjustInputWidth(companyInput);}}

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

document.getElementById('invoice-section').addEventListener('input', function(e) {
    const target = e.target;
    if (!target.matches('input')) return;

    adjustInputWidth(target);
    const row = target.closest('tr');
    
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
    const nextInput = findNextVisibleInput(targetInput);
    
    if (nextInput) {
        nextInput.focus();
    } else {
        addInvoiceRow();
    }
});
