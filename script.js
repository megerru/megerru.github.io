// ===================================================================
// 配置常數 - 向後兼容，實際配置已移至 config.js
// ===================================================================
// CONFIG 變數在 config.js 中定義，這裡不再重複聲明

// ===================================================================
// I. 頁面導覽與通用函式
// ===================================================================

const welcomeSection = document.getElementById('welcome-section');
const insuranceSection = document.getElementById('insurance-calculator-section');
const invoiceSection = document.getElementById('invoice-section');
const allSections = [welcomeSection, insuranceSection, invoiceSection];

/**
 * 顯示首頁
 */
function showWelcome() {
    showSection(welcomeSection, allSections);
}

/**
 * 顯示保險費計算機
 */
function showInsuranceCalculator() {
    showSection(insuranceSection, allSections);
    // 預設顯示年度保險費計算
    switchToAnnualInsurance();
}

/**
 * 顯示發票計算機
 */
function showInvoiceCalculator() {
    showSection(invoiceSection, allSections);
    switchInvoiceType();
}

// autoTab 函數已移至 common.js，這裡不再重複定義

// 切換到年度保險費計算
function switchToAnnualInsurance() {
    const annualSection = document.querySelectorAll('#insurance-calculator-section > .form-group, #insurance-calculator-section > .main-calculate-button, #result');
    const laborSection = document.getElementById('labor-insurance-section');
    const title = document.getElementById('insurance-title');
    const buttons = document.querySelectorAll('.insurance-toggle-button');

    annualSection.forEach(el => el.classList.remove('hidden'));
    laborSection.classList.add('hidden');
    title.textContent = '年度保險費分攤計算機';

    buttons[0].classList.add('active');
    buttons[1].classList.remove('active');
}

// 切換到勞健保計算
function switchToLaborInsurance() {
    const annualSection = document.querySelectorAll('#insurance-calculator-section > .form-group, #insurance-calculator-section > .main-calculate-button, #result');
    const laborSection = document.getElementById('labor-insurance-section');
    const title = document.getElementById('insurance-title');
    const buttons = document.querySelectorAll('.insurance-toggle-button');

    annualSection.forEach(el => el.classList.add('hidden'));
    laborSection.classList.remove('hidden');
    title.textContent = '勞健保計算機';

    buttons[0].classList.remove('active');
    buttons[1].classList.add('active');
}

// 勞健保計算函式
function calculateLaborInsurance() {
    const laborTotal = parseFloat(document.getElementById('laborInsuranceTotal').value) || 0;
    const healthTotal = parseFloat(document.getElementById('healthInsuranceTotal').value) || 0;

    const laborAmount = Math.round(laborTotal * CONFIG.LABOR_INSURANCE_RATE);
    const healthAmount = Math.round(healthTotal * CONFIG.HEALTH_INSURANCE_RATE);

    document.getElementById('laborResult').textContent = laborAmount.toLocaleString();
    document.getElementById('healthResult').textContent = healthAmount.toLocaleString();
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
        const rocYear = parseInt(year, 10);

        // 驗證民國年範圍
        if (rocYear < CONFIG.MIN_ROC_YEAR || rocYear > CONFIG.MAX_ROC_YEAR) {
            picker.value = '';
            return;
        }

        const adYear = rocYear + CONFIG.ROC_TO_AD_OFFSET;
        const monthPadded = month.padStart(2, '0');
        const dayPadded = day.padStart(2, '0');
        const formattedDate = `${adYear}-${monthPadded}-${dayPadded}`;
        const d = new Date(formattedDate);

        if (d instanceof Date && !isNaN(d) && d.getFullYear() === adYear) {
            picker.value = formattedDate;
        } else {
            picker.value = '';
        }
    } else {
        picker.value = '';
    }
}

function resetInsuranceForm() {
    // 重置年度保險費表單
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

    // 重置勞健保表單
    document.getElementById('laborInsuranceTotal').value = '';
    document.getElementById('healthInsuranceTotal').value = '';
    document.getElementById('laborResult').textContent = '0';
    document.getElementById('healthResult').textContent = '0';

    document.getElementById('startDateManualYear').focus();
}


/**
 * 計算保險費分攤
 */
function calculatePremium() {
    try {
        updatePickerFromManual('start');
        updatePickerFromManual('end');

        const startDateString = document.getElementById('startDate').value;
        const endDateString = document.getElementById('endDate').value;
        const totalPremium = parseFloat(document.getElementById('totalPremium').value);

        // 驗證輸入
        if (!startDateString || !endDateString || isNaN(totalPremium) || totalPremium <= 0) {
            alert("請確保所有欄位都已正確填寫！");
            return;
        }

        const startDate = new Date(startDateString);
        const endDate = new Date(endDateString);

        if (endDate <= startDate) {
            alert("結束日期必須晚於起始日期!");
            return;
        }

        const totalDays = (Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) -
                          Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) /
                          (1000 * 60 * 60 * 24);

        if (totalDays < 1) {
            alert("計算出的總天數無效,期間必須至少為一天。");
            return;
        }

        const yearData = [];
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        if (startYear === endYear) {
            yearData.push({ minguoYear: adToROC(startYear), days: totalDays, daysForCalc: totalDays });
        } else {
            const firstYearDays = getDaysInYear(startYear) - dayOfYear(startDate);
            yearData.push({ minguoYear: adToROC(startYear), days: firstYearDays, daysForCalc: firstYearDays });

            for (let year = startYear + 1; year < endYear; year++) {
                const daysInYear = getDaysInYear(year);
                yearData.push({ minguoYear: adToROC(year), days: daysInYear, daysForCalc: daysInYear });
            }

            const lastYearDays = dayOfYear(endDate);
            yearData.push({ minguoYear: adToROC(endYear), days: lastYearDays, daysForCalc: lastYearDays });
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
        premiumResults.push({
            minguoYear: yearData[0].minguoYear,
            premium: totalPremium - allocatedPremium
        });
        premiumResults.reverse();

        // 顯示結果
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
        alert("計算失敗!請檢查輸入的日期是否有效。");
    }
}

// ===================================================================
// III. 銷項發票計算機
// ===================================================================

// 只在發票相關元素存在時才初始化
if (document.getElementById('invoice-section')) {
    const twoPartBody = document.getElementById('invoice-table-body-two-part');
    const threePartBody = document.getElementById('invoice-table-body-three-part');
    const invoiceTypeSelect = document.getElementById('invoice-type-select');
    const twoPartTable = document.getElementById('invoice-table-two-part');
    const threePartTable = document.getElementById('invoice-table-three-part');
    const vatEditButton = document.getElementById('toggle-vat-edit-button');

    let textMeasureSpan = null;

    document.addEventListener('DOMContentLoaded', () => {
        const h1Element = document.querySelector('h1');
        if (h1Element && h1Element.textContent.includes('銷項發票')) {
            textMeasureSpan = document.createElement('span');
            textMeasureSpan.style.visibility = 'hidden';
            textMeasureSpan.style.position = 'absolute';
            textMeasureSpan.style.whiteSpace = 'pre';
            document.body.appendChild(textMeasureSpan);
        }
    });

    window.adjustInputWidth = function(input) {
        if (!input || !textMeasureSpan || !input.parentElement) return;

        const style = window.getComputedStyle(input);
        textMeasureSpan.style.font = style.font;
        textMeasureSpan.textContent = input.value || input.placeholder;
        const newTdWidth = textMeasureSpan.offsetWidth + 25;
        input.parentElement.style.minWidth = `${newTdWidth}px`;
    };

    window.switchInvoiceType = function() {
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
    };

    window.toggleOptionalColumn = function(columnName, type) {
        const table = type === 2 ? twoPartTable : threePartTable;
        table.classList.toggle(`show-${columnName}`);
    };

    function getCurrentInvoiceBody() {
        return invoiceTypeSelect.value === 'two-part' ? twoPartBody : threePartBody;
    }

    window.addInvoiceRow = function() {
        const body = getCurrentInvoiceBody();
        if (!body) return;

        const newRow = body.insertRow();
        const index = body.rows.length;
        const isVatLocked = vatEditButton.textContent === '修改營業稅';
        const vatReadonlyState = isVatLocked ? 'readonly' : '';

        if (invoiceTypeSelect.value === 'two-part') {
            newRow.innerHTML = `
                <td>${index}</td>
                <td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7"></td>
                <td class="col-optional col-buyer"><input type="text" class="data-buyer" placeholder="買受人名稱"></td>
                <td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目"></td>
                <td><input type="number" class="total-2" placeholder="總計金額"></td>
                <td><input type="number" class="sales-2" readonly></td>
                <td><input type="number" class="tax-2" ${vatReadonlyState}></td>
            `;
        } else {
            newRow.innerHTML = `
                <td>${index}</td>
                <td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7"></td>
                <td class="col-optional col-tax-id"><input type="tel" class="tax-id-3" maxlength="8"></td>
                <td class="col-optional col-company"><input type="text" class="company-3"></td>
                <td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目"></td>
                <td><input type="number" class="sales-3" placeholder="未稅銷售額"></td>
                <td><input type="number" class="tax-3" ${vatReadonlyState}></td>
                <td><input type="number" class="total-3" readonly></td>
            `;
        }

        newRow.querySelectorAll('input:not([readonly])').forEach(input => {
            if (input.placeholder) adjustInputWidth(input);
        });

        const firstVisibleInput = Array.from(newRow.querySelectorAll('input:not([readonly])'))
            .find(el => el.offsetParent !== null);
        if (firstVisibleInput) firstVisibleInput.focus();

        updateInvoiceSummary();
    };

    window.resetInvoiceForm = function() {
        twoPartBody.innerHTML = '';
        threePartBody.innerHTML = '';
        vatEditButton.textContent = '修改營業稅';

        document.querySelectorAll('.optional-columns-controls input[type="checkbox"]')
            .forEach(cb => cb.checked = false);

        twoPartTable.className = twoPartTable.className.replace(/show-[\w-]+/g, '').trim();
        threePartTable.className = threePartTable.className.replace(/show-[\w-]+/g, '').trim();

        addInvoiceRow();

        // 移除無用的 readonly 設置（表格已被清空）
    };

    window.toggleVatEditMode = function() {
        const isTwoPart = invoiceTypeSelect.value === 'two-part';
        const taxInputs = isTwoPart ?
            twoPartBody.querySelectorAll('.tax-2') :
            threePartBody.querySelectorAll('.tax-3');
        const isCurrentlyLocked = vatEditButton.textContent === '修改營業稅';

        if (isCurrentlyLocked) {
            taxInputs.forEach(input => input.removeAttribute('readonly'));
            vatEditButton.textContent = '鎖定營業稅';
            if (taxInputs.length > 0) taxInputs[0].focus();
        } else {
            taxInputs.forEach(input => input.setAttribute('readonly', true));
            vatEditButton.textContent = '修改營業稅';
        }
        updateInvoiceSummary();
    };

    window.exportToExcel = function() {
        if (document.activeElement) document.activeElement.blur();

        const type = invoiceTypeSelect.value;
        const isTwoPart = type === 'two-part';
        const body = isTwoPart ? twoPartBody : threePartBody;

        // 檢查是否有有效資料
        let hasValidData = false;
        for (const row of body.rows) {
            if (isTwoPart) {
                if (row.querySelector('.total-2')?.value.trim()) {
                    hasValidData = true;
                    break;
                }
            } else {
                if (row.querySelector('.sales-3')?.value.trim()) {
                    hasValidData = true;
                    break;
                }
            }
        }

        if (!hasValidData) {
            alert('沒有資料可以匯出!');
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

        for (const row of body.rows) {
            const rowData = [];

            if (isTwoPart) {
                const totalValue = row.querySelector('.total-2').value;
                if (!totalValue) continue;

                rowData.push(row.cells[0].textContent);
                if (showDate) rowData.push(row.querySelector('.data-date').value);
                if (showBuyer) rowData.push(row.querySelector('.data-buyer').value);
                if (showItem) rowData.push(row.querySelector('.data-item').value);
                rowData.push(
                    parseFloat(row.querySelector('.sales-2').value) || 0,
                    parseFloat(row.querySelector('.tax-2').value) || 0,
                    parseFloat(totalValue) || 0
                );
            } else {
                const salesValue = row.querySelector('.sales-3').value;
                if (!salesValue) continue;

                rowData.push(row.cells[0].textContent);
                if (showDate) rowData.push(row.querySelector('.data-date').value);
                if (showTaxId) rowData.push(row.querySelector('.tax-id-3').value);
                if (showCompany) rowData.push(row.querySelector('.company-3').value);
                if (showItem) rowData.push(row.querySelector('.data-item').value);
                rowData.push(
                    parseFloat(salesValue) || 0,
                    parseFloat(row.querySelector('.tax-3').value) || 0,
                    parseFloat(row.querySelector('.total-3').value) || 0
                );
            }
            data.push(rowData);
        }

        if (data.length === 0) {
            alert('沒有有效的資料可以匯出!');
            return;
        }

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '發票明細');

        XLSX.writeFile(workbook, isTwoPart ? '二聯式銷項發票.xlsx' : '三聯式銷項發票.xlsx');
    };

    function updateInvoiceSummary() {
        let totalSum = 0;
        let salesSum = 0;
        let taxSum = 0;
        let validRowCount = 0;

        if (invoiceTypeSelect.value === "two-part") {
            const rows = twoPartBody.rows;
            for (const row of rows) {
                const totalInput = row.querySelector(".total-2");
                if (totalInput && totalInput.value.trim() !== '') {
                    validRowCount++;
                    totalSum += parseFloat(totalInput.value) || 0;
                    salesSum += parseFloat(row.querySelector(".sales-2").value) || 0;
                    taxSum += parseFloat(row.querySelector(".tax-2").value) || 0;
                }
            }
            document.getElementById("invoice-count-two").textContent = validRowCount;
            document.getElementById("total-sum-two").textContent = totalSum.toLocaleString();
            document.getElementById("sales-sum-two").textContent = salesSum.toLocaleString();
            document.getElementById("tax-sum-two").textContent = taxSum.toLocaleString();
        } else {
            const rows = threePartBody.rows;
            for (const row of rows) {
                const salesInput = row.querySelector(".sales-3");
                if (salesInput && salesInput.value.trim() !== '') {
                    validRowCount++;
                    salesSum += parseFloat(salesInput.value) || 0;
                    taxSum += parseFloat(row.querySelector(".tax-3").value) || 0;
                    totalSum += parseFloat(row.querySelector(".total-3").value) || 0;
                }
            }
            document.getElementById("invoice-count-three").textContent = validRowCount;
            document.getElementById("sales-sum-three").textContent = salesSum.toLocaleString();
            document.getElementById("tax-sum-three").textContent = taxSum.toLocaleString();
            document.getElementById("total-sum-three").textContent = totalSum.toLocaleString();
        }
    }

    /**
     * 查詢統編對應的公司名稱（使用 common.js 的函數）
     * @param {string} taxId - 統一編號
     * @param {HTMLInputElement} companyInput - 公司名稱輸入框
     */
    async function lookupCompanyByTaxId(taxId, companyInput) {
        companyInput.value = '查詢中...';
        try {
            adjustInputWidth(companyInput);
        } catch(e) {}

        // 使用 common.js 提供的查詢函數
        const companyName = await lookupCompanyName(taxId);
        companyInput.value = companyName;

        try {
            adjustInputWidth(companyInput);
        } catch(e) {}
    }

    // findNextVisibleInput 已移至 common.js，這裡不再重複定義

    // Input 事件處理
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
            const taxInput = row.querySelector('.tax-2');

            if (taxInput && taxInput.hasAttribute('readonly')) {
                const sales = Math.round(total / CONFIG.VAT_MULTIPLIER);
                row.querySelector('.sales-2').value = sales;
                taxInput.value = total - sales;
            } else {
                const tax = parseFloat(taxInput.value) || 0;
                row.querySelector('.sales-2').value = total - tax;
            }
        } else if (target.classList.contains('tax-2')) {
            const total = parseFloat(row.querySelector('.total-2').value) || 0;
            const tax = parseFloat(target.value) || 0;
            row.querySelector('.sales-2').value = total - tax;
        } else if (target.classList.contains('sales-3')) {
            const sales = parseFloat(target.value) || 0;
            const tax = Math.round(sales * CONFIG.VAT_RATE);
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

    // Focus 事件處理
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

    /**
     * 處理 Enter 鍵 - 移動到下一個輸入框或新增行
     * @param {HTMLInputElement} targetInput - 當前輸入框
     */
    function handleEnterKey(targetInput) {
        const nextInput = findNextVisibleInput(targetInput);
        if (nextInput) {
            nextInput.focus();
        } else {
            addInvoiceRow();
        }
    }

    /**
     * 處理方向鍵 - 導航到目標儲存格
     * @param {HTMLInputElement} targetInput - 當前輸入框
     * @param {string} key - 按鍵名稱
     */
    function handleArrowKey(targetInput, key) {
        const direction = key.replace('Arrow', '').toLowerCase();
        const targetInputToFocus = navigateTableCell(targetInput, direction);

        if (targetInputToFocus) {
            targetInputToFocus.focus();
            targetInputToFocus.select();
        }
    }

    // 鍵盤事件處理（簡化版）
    document.getElementById('invoice-section').addEventListener('keydown', function(e) {
        const targetInput = e.target;
        if (!targetInput.matches('input')) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            handleEnterKey(targetInput);
        } else if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            handleArrowKey(targetInput, e.key);
        }
    });
}
