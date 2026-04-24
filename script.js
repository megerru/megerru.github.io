// ===================================================================
// 配置常數 - 向後兼容，實際配置已移至 config.js
// ===================================================================
// CONFIG 變數在 config.js 中定義，這裡不再重複聲明

// ===================================================================
// 發票系統狀態管理 - 取代 UI 文字判斷
// ===================================================================

const invoiceState = {
    vatLocked: true,  // 營業稅是否鎖定（預設鎖定）

    isVatLocked() {
        return this.vatLocked;
    },

    setVatLocked(locked) {
        this.vatLocked = locked;
        this.syncVatButtonUI();
    },

    toggleVatLock() {
        this.setVatLocked(!this.vatLocked);
    },

    syncVatButtonUI() {
        const button = document.getElementById('toggle-vat-edit-button');
        if (!button) return;
        button.textContent = this.vatLocked ? '修改營業稅' : '鎖定營業稅';
    }
};

// ===================================================================
// 發票卡片模式 - 保留備用（統計方法可能未來有用）
// 注：addInvoice/updateInvoice/deleteInvoice 已於 Phase 3 重構中刪除（未被使用）
// ===================================================================

let invoiceCardsMode = {
    twoPartInvoices: [],    // 二聯式發票陣列
    threePartInvoices: [],  // 三聯式發票陣列

    // 統計方法（保留備用）
    calculateTwoPartStats() {
        let salesSum = 0, taxSum = 0, totalSum = 0, count = 0;
        this.twoPartInvoices.forEach(inv => {
            if (inv.total || inv.sales) {
                count++;
                salesSum += inv.sales;
                taxSum += inv.tax;
                totalSum += inv.total;
            }
        });
        return { count, salesSum, taxSum, totalSum };
    },

    calculateThreePartStats() {
        let salesSum = 0, taxSum = 0, totalSum = 0, count = 0;
        this.threePartInvoices.forEach(inv => {
            if (inv.sales) {
                count++;
                salesSum += inv.sales;
                taxSum += inv.tax;
                totalSum += inv.total;
            }
        });
        return { count, salesSum, taxSum, totalSum };
    }
};

// ===================================================================
// localStorage 持久化 - 發票數據保存和還原
// ===================================================================

const InvoiceStorage = {
    STORAGE_KEY: 'invoice_data_v1',

    extractTableData(type) {
        const body = getTableBody(type);
        if (!body) return [];

        const config = getInvoiceConfig(type);
        const invoices = [];
        let rowIndex = 1;

        for (const row of body.rows) {
            const invoice = { id: rowIndex };

            // 通用欄位提取（使用明確的欄位映射）
            const fieldMapping = {
                'data-date': 'date',
                'data-invoice-no': 'invoiceNo',
                'data-buyer': 'buyer',
                'data-item': 'item',
                'tax-id-3': 'taxId',
                'company-3': 'company'
            };

            Object.entries(fieldMapping).forEach(([fieldClass, fieldName]) => {
                const input = row.querySelector(`.${fieldClass}`);
                if (input) {
                    invoice[fieldName] = input.value || '';
                }
            });

            // 數字欄位提取（sales, tax, total）
            const numericFields = ['sales-2', 'tax-2', 'total-2', 'sales-3', 'tax-3', 'total-3'];
            numericFields.forEach(fieldClass => {
                const input = row.querySelector(`.${fieldClass}`);
                if (input) {
                    const fieldName = fieldClass.replace(/-[0-9]/, '');  // 移除 -2 或 -3
                    invoice[fieldName] = parseFloat(input.value) || 0;
                }
            });

            // 檢查是否至少有一個欄位有值（消除空行）
            const hasData = invoice.date || invoice.invoiceNo || invoice.buyer || invoice.item ||
                            invoice.taxId || invoice.company || invoice.sales || invoice.tax || invoice.total;

            if (hasData) {
                invoices.push(invoice);
                rowIndex++;
            }
        }

        return invoices;
    },

    save(type) {
        try {
            // 讀取既有的 localStorage 數據
            const existingData = this.load() || {
                twoPartInvoices: [],
                threePartInvoices: [],
                timestamp: new Date().toISOString()
            };

            // 只更新指定類型的數據，保留另一種類型的舊數據
            const data = this.extractTableData(type);
            console.log(`[InvoiceStorage.save] 保存 ${type}，提取到 ${data.length} 行數據`);

            if (type === 'two-part') {
                existingData.twoPartInvoices = data;
            } else {
                existingData.threePartInvoices = data;
            }

            existingData.timestamp = new Date().toISOString();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));
            console.log(`[InvoiceStorage.save] 成功保存，localStorage 現在包含: 二聯 ${existingData.twoPartInvoices.length} 行, 三聯 ${existingData.threePartInvoices.length} 行`);
        } catch (e) {
            console.warn('localStorage 保存失敗:', e.message);
        }
    },

    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) return null;

            const parsed = JSON.parse(data);

            // 遷移層：處理舊版本數據格式
            return this.migrate(parsed);
        } catch (e) {
            console.warn('localStorage 讀取失敗:', e.message);
            // 如果數據損壞，清空它
            try {
                localStorage.removeItem(this.STORAGE_KEY);
            } catch (e2) {}
            return null;
        }
    },

    // ===================================================================
    // 數據遷移層 - 支援未來 localStorage 格式升級
    // ===================================================================
    migrate(data) {
        // v1 格式檢查
        if (!data.version || data.version === 1) {
            // 確保必要欄位存在
            if (!data.twoPartInvoices) data.twoPartInvoices = [];
            if (!data.threePartInvoices) data.threePartInvoices = [];
            if (!data.timestamp) data.timestamp = new Date().toISOString();

            data.version = 1;
        }

        // 未來可以在此新增 v2, v3 等格式的遷移邏輯
        // if (data.version === 1) {
        //     // 升級到 v2 的邏輯
        //     data.version = 2;
        // }

        return data;
    },

    clear() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (e) {
            console.warn('localStorage 清空失敗:', e.message);
        }
    },

    restore(type, invoices) {
        const body = type === 'two-part' ?
            document.getElementById('invoice-table-body-two-part') :
            document.getElementById('invoice-table-body-three-part');

        if (!body) return;

        body.innerHTML = '';

        // 如果沒有數據要還原，直接返回（呼叫者應該調用 addInvoiceRow）
        if (!invoices || invoices.length === 0) return;

        // 使用狀態旗標取代 UI 文字判斷
        const isVatLocked = invoiceState.isVatLocked();
        const taxReadonlyAttr = isVatLocked ? 'readonly' : '';

        invoices.forEach((invoice, index) => {
            const newRow = body.insertRow();
            newRow.innerHTML = type === 'two-part' ?
                `<td>${index + 1}</td>
                 <td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7" value="${invoice.date}"></td>
                 <td class="col-optional col-invoice-no"><input type="text" class="data-invoice-no" placeholder="AB12345678" maxlength="10" value="${invoice.invoiceNo}"></td>
                 <td class="col-optional col-buyer"><input type="text" class="data-buyer" placeholder="買受人名稱" value="${invoice.buyer}"></td>
                 <td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目" value="${invoice.item}"></td>
                 <td><input type="number" class="sales-2" readonly value="${invoice.sales}"></td>
                 <td><input type="number" class="tax-2" value="${invoice.tax}" ${taxReadonlyAttr}></td>
                 <td><input type="number" class="total-2" placeholder="總計金額" value="${invoice.total}"></td>` :
                `<td>${index + 1}</td>
                 <td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7" value="${invoice.date}"></td>
                 <td class="col-optional col-invoice-no"><input type="text" class="data-invoice-no" placeholder="AB12345678" maxlength="10" value="${invoice.invoiceNo}"></td>
                 <td class="col-optional col-tax-id"><input type="tel" class="tax-id-3" maxlength="8" value="${invoice.taxId}"></td>
                 <td class="col-optional col-company"><input type="text" class="company-3" value="${invoice.company}"></td>
                 <td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目" value="${invoice.item}"></td>
                 <td><input type="number" class="sales-3" placeholder="未稅銷售額" value="${invoice.sales}"></td>
                 <td><input type="number" class="tax-3" value="${invoice.tax}" ${taxReadonlyAttr}></td>
                 <td><input type="number" class="total-3" readonly value="${invoice.total}"></td>`;

        });
    }
};

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


// ===================================================================
// 保險費分攤計算 - 輔助函數
// ===================================================================

/**
 * 驗證並取得保險費輸入資料
 * @returns {{startDate: Date, endDate: Date, totalPremium: number} | null} 驗證通過的資料，或 null（驗證失敗）
 */
function validatePremiumInputs() {
    updatePickerFromManual('start');
    updatePickerFromManual('end');

    const startDateString = document.getElementById('startDate').value;
    const endDateString = document.getElementById('endDate').value;
    const totalPremium = parseFloat(document.getElementById('totalPremium').value);

    // 驗證輸入
    if (!startDateString || !endDateString || isNaN(totalPremium) || totalPremium <= 0) {
        alert("請確保所有欄位都已正確填寫！");
        return null;
    }

    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);

    if (endDate <= startDate) {
        alert("結束日期必須晚於起始日期!");
        return null;
    }

    const totalDays = (Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) -
                      Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) /
                      (1000 * 60 * 60 * 24);

    if (totalDays < 1) {
        alert("計算出的總天數無效,期間必須至少為一天。");
        return null;
    }

    return { startDate, endDate, totalPremium };
}

/**
 * 計算跨年度的天數分佈
 * @param {Date} startDate - 起始日期
 * @param {Date} endDate - 結束日期
 * @returns {Array} 年度資料陣列 [{minguoYear, days, daysForCalc}]
 */
function calculateYearlyData(startDate, endDate) {
    const yearData = [];
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    // 計算總天數
    const totalDays = (Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) -
                      Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) /
                      (1000 * 60 * 60 * 24);

    if (startYear === endYear) {
        // 同一年內
        yearData.push({ minguoYear: adToROC(startYear), days: totalDays, daysForCalc: totalDays });
    } else {
        // 跨年度
        const firstYearDays = getDaysInYear(startYear) - dayOfYear(startDate);
        yearData.push({ minguoYear: adToROC(startYear), days: firstYearDays, daysForCalc: firstYearDays });

        for (let year = startYear + 1; year < endYear; year++) {
            const daysInYear = getDaysInYear(year);
            yearData.push({ minguoYear: adToROC(year), days: daysInYear, daysForCalc: daysInYear });
        }

        const lastYearDays = dayOfYear(endDate);
        yearData.push({ minguoYear: adToROC(endYear), days: lastYearDays, daysForCalc: lastYearDays });
    }

    return yearData;
}

/**
 * 分攤保險費到各年度
 * @param {number} totalPremium - 總保費
 * @param {Array} yearData - 年度資料陣列
 * @returns {Array} 保費分攤結果 [{minguoYear, premium}]
 */
function allocatePremium(totalPremium, yearData) {
    let allocatedPremium = 0;
    const premiumResults = [];
    const calculatedTotalDays = yearData.reduce((sum, d) => sum + d.days, 0);

    // 從最後一年往前計算（避免累積誤差）
    for (let i = yearData.length - 1; i > 0; i--) {
        const data = yearData[i];
        const premium = Math.round(totalPremium * (data.daysForCalc / calculatedTotalDays));
        premiumResults.push({ minguoYear: data.minguoYear, premium: premium });
        allocatedPremium += premium;
    }

    // 第一年用扣除法（確保總和精確等於總保費）
    premiumResults.push({
        minguoYear: yearData[0].minguoYear,
        premium: totalPremium - allocatedPremium
    });

    premiumResults.reverse();
    return premiumResults;
}

/**
 * 顯示保險費分攤結果
 * @param {Array} yearData - 年度資料陣列
 * @param {Array} premiumResults - 保費分攤結果
 */
function renderPremiumResults(yearData, premiumResults) {
    const resultContainer = document.getElementById('result-container');
    const periodSummary = document.getElementById('periodSummary');
    const calculatedTotalDays = yearData.reduce((sum, d) => sum + d.days, 0);

    resultContainer.innerHTML = '';
    periodSummary.innerText = `期間總天數: ${calculatedTotalDays}天 (${yearData.map(d => `${d.minguoYear}年: ${d.days}天`).join(' / ')})`;

    premiumResults.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `<h3>${result.minguoYear}年應分攤保費</h3><p>NT$ ${result.premium.toLocaleString()}</p>`;
        resultContainer.appendChild(resultDiv);
    });

    document.getElementById('result').className = 'result-visible';
}

/**
 * 計算保險費分攤（主函數）
 */
function calculatePremium() {
    try {
        // 1. 驗證輸入
        const inputs = validatePremiumInputs();
        if (!inputs) return;

        // 2. 計算年度資料
        const yearData = calculateYearlyData(inputs.startDate, inputs.endDate);

        // 3. 分攤保險費
        const premiumResults = allocatePremium(inputs.totalPremium, yearData);

        // 4. 顯示結果
        renderPremiumResults(yearData, premiumResults);
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


    window.switchInvoiceType = function() {
        const type = invoiceTypeSelect.value;
        const oppositeType = type === 'two-part' ? 'three-part' : 'two-part';

        // 使用配置取得 DOM 元素（消除硬編碼的 ID）
        const currentControls = getControlsElement(type);
        const oppositeControls = getControlsElement(oppositeType);
        const currentContainer = getTableElement(type);
        const oppositeContainer = getTableElement(oppositeType);
        const currentSummary = getSummaryElement(type);
        const oppositeSummary = getSummaryElement(oppositeType);
        const targetBody = getTableBody(type);

        // 離開前保存當前類型的數據（只保存一次，消除冗余）
        console.log(`[switchInvoiceType] 保存 ${oppositeType} 的數據`);
        InvoiceStorage.save(oppositeType);

        // 更新 UI 顯示
        currentContainer.classList.remove("hidden");
        currentSummary.classList.remove("hidden");
        currentControls.classList.remove('hidden');
        oppositeContainer.classList.add("hidden");
        oppositeSummary.classList.add("hidden");
        oppositeControls.classList.add('hidden');

        // 還原即將進入的類型數據
        const stored = InvoiceStorage.load();
        console.log(`[switchInvoiceType] 從 localStorage 讀取的數據:`, stored);

        // 決定是否有可還原的數據
        const invoicesToRestore = type === 'two-part' ?
            (stored && stored.twoPartInvoices) :
            (stored && stored.threePartInvoices);

        if (invoicesToRestore && invoicesToRestore.length > 0) {
            console.log(`[switchInvoiceType] 還原 ${type}，數據行數: ${invoicesToRestore.length}`);
            InvoiceStorage.restore(type, invoicesToRestore);
            updateInvoiceSummary();
        } else {
            console.log(`[switchInvoiceType] 沒有保存的 ${type} 數據，添加空行`);
            targetBody.innerHTML = '';
            addInvoiceRow();
        }
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
        const isVatLocked = invoiceState.isVatLocked();
        const vatReadonlyState = isVatLocked ? 'readonly' : '';

        if (invoiceTypeSelect.value === 'two-part') {
            newRow.innerHTML = `
                <td>${index}</td>
                <td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7"></td>
                <td class="col-optional col-invoice-no"><input type="text" class="data-invoice-no" placeholder="AB12345678" maxlength="10"></td>
                <td class="col-optional col-buyer"><input type="text" class="data-buyer" placeholder="買受人名稱"></td>
                <td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目"></td>
                <td><input type="number" class="sales-2" readonly></td>
                <td><input type="number" class="tax-2" ${vatReadonlyState}></td>
                <td><input type="number" class="total-2" placeholder="總計金額"></td>
            `;
        } else {
            newRow.innerHTML = `
                <td>${index}</td>
                <td class="col-optional col-date"><input type="tel" class="data-date" placeholder="1140629" maxlength="7"></td>
                <td class="col-optional col-invoice-no"><input type="text" class="data-invoice-no" placeholder="AB12345678" maxlength="10"></td>
                <td class="col-optional col-tax-id"><input type="tel" class="tax-id-3" maxlength="8"></td>
                <td class="col-optional col-company"><input type="text" class="company-3"></td>
                <td class="col-optional col-item"><input type="text" class="data-item" placeholder="品名/項目"></td>
                <td><input type="number" class="sales-3" placeholder="未稅銷售額"></td>
                <td><input type="number" class="tax-3" ${vatReadonlyState}></td>
                <td><input type="number" class="total-3" readonly></td>
            `;
        }


        const firstVisibleInput = Array.from(newRow.querySelectorAll('input:not([readonly])'))
            .find(el => el.offsetParent !== null);
        if (firstVisibleInput) firstVisibleInput.focus();

        updateInvoiceSummary();
    };

    window.resetInvoiceForm = function() {
        // 保存當前數據後清空
        const currentType = invoiceTypeSelect.value;
        InvoiceStorage.save(currentType);
        InvoiceStorage.clear();  // 清空 localStorage

        twoPartBody.innerHTML = '';
        threePartBody.innerHTML = '';
        vatEditButton.textContent = '修改營業稅';

        document.querySelectorAll('.optional-columns-controls input[type="checkbox"]')
            .forEach(cb => cb.checked = false);

        twoPartTable.className = twoPartTable.className.replace(/show-[\w-]+/g, '').trim();
        threePartTable.className = threePartTable.className.replace(/show-[\w-]+/g, '').trim();

        addInvoiceRow();
    };

    /**
     * 只重置當前發票類型（不影響另一種類型）
     */
    window.resetCurrentInvoiceType = function() {
        const currentType = invoiceTypeSelect.value;
        const body = currentType === 'two-part' ? twoPartBody : threePartBody;
        const table = currentType === 'two-part' ? twoPartTable : threePartTable;
        const controlsId = currentType === 'two-part' ? 'optional-controls-two-part' : 'optional-controls-three-part';

        // 清空當前類型的表格
        body.innerHTML = '';

        // 重置當前類型的可選欄位 checkbox
        document.getElementById(controlsId).querySelectorAll('input[type="checkbox"]')
            .forEach(cb => cb.checked = false);

        // 移除當前類型的顯示 class
        table.className = table.className.replace(/show-[\w-]+/g, '').trim();

        // 新增一行空列
        addInvoiceRow();

        // 更新統計
        updateInvoiceSummary();

        // 保存空狀態到 localStorage
        InvoiceStorage.save(currentType);
    };

    window.toggleVatEditMode = function() {
        const isTwoPart = invoiceTypeSelect.value === 'two-part';
        const taxInputs = isTwoPart ?
            twoPartBody.querySelectorAll('.tax-2') :
            threePartBody.querySelectorAll('.tax-3');

        // 切換狀態旗標（而非 UI 文字）
        invoiceState.toggleVatLock();
        const isLocked = invoiceState.isVatLocked();

        // DOM 跟隨狀態
        if (isLocked) {
            taxInputs.forEach(input => input.setAttribute('readonly', true));
        } else {
            taxInputs.forEach(input => input.removeAttribute('readonly'));
            if (taxInputs.length > 0) taxInputs[0].focus();
        }
        updateInvoiceSummary();
    };

    window.exportToExcel = function() {
        if (document.activeElement) document.activeElement.blur();

        // 檢查兩種類型是否都有資料
        const hasTwoPartData = checkHasValidData('two-part');
        const hasThreePartData = checkHasValidData('three-part');

        if (!hasTwoPartData && !hasThreePartData) {
            alert('沒有資料可以匯出!');
            return;
        }

        // 顯示匯出選項對話框
        showExportDialog(hasTwoPartData, hasThreePartData);
    };

    // 檢查指定類型是否有有效資料（從 localStorage 檢查）
    function checkHasValidData(type) {
        // 先檢查當前顯示的 DOM
        const currentType = invoiceTypeSelect.value;
        if (currentType === type) {
            const body = type === 'two-part' ? twoPartBody : threePartBody;
            const requiredClass = type === 'two-part' ? '.total-2' : '.sales-3';

            for (const row of body.rows) {
                if (row.querySelector(requiredClass)?.value.trim()) {
                    return true;
                }
            }
            return false;
        }

        // 如果不是當前顯示的類型，從 localStorage 檢查
        const stored = InvoiceStorage.load();
        if (!stored) return false;

        const invoices = type === 'two-part' ? stored.twoPartInvoices : stored.threePartInvoices;
        if (!invoices || invoices.length === 0) return false;

        // 檢查是否有至少一筆有效資料
        return invoices.some(inv => {
            if (type === 'two-part') {
                return inv.total && String(inv.total).trim() !== '';
            } else {
                return inv.sales && String(inv.sales).trim() !== '';
            }
        });
    }

    // 顯示匯出選項對話框
    function showExportDialog(hasTwoPartData, hasThreePartData) {
        const currentType = invoiceTypeSelect.value;
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const dialogContent = document.createElement('div');
        dialogContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
        `;

        let optionsHTML = '<h2 style="margin-top: 0; color: #333;">選擇匯出方式</h2>';

        // 選項 1：只匯出當前類型
        optionsHTML += `
            <button class="export-option-btn" data-mode="current" style="
                width: 100%;
                padding: 15px;
                margin: 10px 0;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s;
            " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4CAF50'">
                📄 只匯出當前類型 (${currentType === 'two-part' ? '二聯式' : '三聯式'})
            </button>
        `;

        // 選項 2 & 3：只要有任一種資料就顯示（用戶可能稍後新增另一種）
        if (hasTwoPartData || hasThreePartData) {
            optionsHTML += `
                <button class="export-option-btn" data-mode="merged" style="
                    width: 100%;
                    padding: 15px;
                    margin: 10px 0;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.3s;
                " onmouseover="this.style.background='#0b7dda'" onmouseout="this.style.background='#2196F3'">
                    📊 合併匯出 (按日期智能排序)
                </button>
                <button class="export-option-btn" data-mode="separate" style="
                    width: 100%;
                    padding: 15px;
                    margin: 10px 0;
                    background: #FF9800;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.3s;
                " onmouseover="this.style.background='#e68900'" onmouseout="this.style.background='#FF9800'">
                    📑 分開匯出 (兩個獨立檔案)
                </button>
            `;
        }

        optionsHTML += `
            <button class="export-option-btn" data-mode="cancel" style="
                width: 100%;
                padding: 12px;
                margin: 10px 0;
                background: #f44336;
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.3s;
            " onmouseover="this.style.background='#da190b'" onmouseout="this.style.background='#f44336'">
                取消
            </button>
        `;

        dialogContent.innerHTML = optionsHTML;
        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);

        // 綁定點擊事件
        dialogContent.querySelectorAll('.export-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                document.body.removeChild(dialog);

                if (mode === 'cancel') return;

                performExport(mode);
            });
        });
    }

    // 執行匯出
    function performExport(mode) {
        switch (mode) {
            case 'current':
                exportCurrentType();
                break;
            case 'merged':
                exportMerged();
                break;
            case 'separate':
                exportSeparate();
                break;
        }
    }

    // 匯出當前類型
    function exportCurrentType() {
        const type = invoiceTypeSelect.value;
        const isTwoPart = type === 'two-part';
        const body = isTwoPart ? twoPartBody : threePartBody;

        const headers = [];
        const data = [];
        const showDate = document.getElementById(isTwoPart ? 'toggle-col-date-2' : 'toggle-col-date-3').checked;
        const showInvoiceNo = document.getElementById(isTwoPart ? 'toggle-col-invoice-2' : 'toggle-col-invoice-3').checked;
        const showBuyer = isTwoPart && document.getElementById('toggle-col-buyer-2').checked;
        const showItem = document.getElementById(isTwoPart ? 'toggle-col-item-2' : 'toggle-col-item-3').checked;
        const showTaxId = !isTwoPart && document.getElementById('toggle-col-tax-id-3').checked;
        const showCompany = !isTwoPart && document.getElementById('toggle-col-company-3').checked;

        headers.push('編號');
        if (showDate) headers.push('日期');
        if (showInvoiceNo) headers.push('發票號碼');

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
                // 檢查是否至少有一個欄位有值（與 extractTableData 邏輯一致）
                const dateValue = row.querySelector('.data-date')?.value?.trim() || '';
                const invoiceNoValue = row.querySelector('.data-invoice-no')?.value?.trim() || '';
                const buyerValue = row.querySelector('.data-buyer')?.value?.trim() || '';
                const itemValue = row.querySelector('.data-item')?.value?.trim() || '';
                const salesValue = row.querySelector('.sales-2')?.value?.trim() || '';
                const taxValue = row.querySelector('.tax-2')?.value?.trim() || '';
                const totalValue = row.querySelector('.total-2')?.value?.trim() || '';

                // 只要有任一欄位有內容就匯出（包含金額為 0 的情況）
                const hasData = dateValue || invoiceNoValue || buyerValue || itemValue || salesValue || taxValue || totalValue;
                if (!hasData) continue;

                rowData.push(row.cells[0].textContent);
                if (showDate) rowData.push(row.querySelector('.data-date').value);
                if (showInvoiceNo) rowData.push(row.querySelector('.data-invoice-no').value);
                if (showBuyer) rowData.push(row.querySelector('.data-buyer').value);
                if (showItem) rowData.push(row.querySelector('.data-item').value);
                rowData.push(
                    parseFloat(row.querySelector('.sales-2').value) || 0,
                    parseFloat(row.querySelector('.tax-2').value) || 0,
                    parseFloat(totalValue) || 0
                );
            } else {
                // 檢查是否至少有一個欄位有值（與 extractTableData 邏輯一致）
                const dateValue = row.querySelector('.data-date')?.value?.trim() || '';
                const invoiceNoValue = row.querySelector('.data-invoice-no')?.value?.trim() || '';
                const taxIdValue = row.querySelector('.tax-id-3')?.value?.trim() || '';
                const companyValue = row.querySelector('.company-3')?.value?.trim() || '';
                const itemValue = row.querySelector('.data-item')?.value?.trim() || '';
                const salesValue = row.querySelector('.sales-3')?.value?.trim() || '';
                const taxValue = row.querySelector('.tax-3')?.value?.trim() || '';
                const totalValue = row.querySelector('.total-3')?.value?.trim() || '';

                // 只要有任一欄位有內容就匯出（包含金額為 0 的情況）
                const hasData = dateValue || invoiceNoValue || taxIdValue || companyValue || itemValue || salesValue || taxValue || totalValue;
                if (!hasData) continue;

                rowData.push(row.cells[0].textContent);
                if (showDate) rowData.push(row.querySelector('.data-date').value);
                if (showInvoiceNo) rowData.push(row.querySelector('.data-invoice-no').value);
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
    }

    // 匯出合併（按日期智能排序）
    function exportMerged() {
        // 收集兩種類型的所有資料
        const twoPartData = extractInvoiceData('two-part');
        const threePartData = extractInvoiceData('three-part');

        // 按照年月日排序，同月份內二聯式優先
        const allData = [...twoPartData, ...threePartData];
        allData.sort((a, b) => {
            const dateA = a.date || '9999999';
            const dateB = b.date || '9999999';

            // 提取年月（前5碼：YYYmm）
            const yearMonthA = dateA.substring(0, 5);
            const yearMonthB = dateB.substring(0, 5);

            // 先比較年月
            if (yearMonthA !== yearMonthB) {
                return yearMonthA.localeCompare(yearMonthB);
            }

            // 同年月時，二聯式優先
            if (a.type !== b.type) {
                return a.type === 'two-part' ? -1 : 1;
            }

            // 同類型再按完整日期排序
            return dateA.localeCompare(dateB);
        });

        if (allData.length === 0) {
            alert('沒有有效的資料可以匯出!');
            return;
        }

        // 建立表頭（包含所有可能的欄位）
        const headers = ['編號', '類型', '日期', '發票號碼', '買受人/統編', '公司名稱', '品名', '銷售額(未稅)', '稅額', '總計(含稅)'];
        const data = [];

        allData.forEach((invoice, index) => {
            const row = [
                index + 1,
                invoice.type === 'two-part' ? '二聯式' : '三聯式',
                invoice.date || '',
                invoice.invoiceNo || '',
                invoice.buyer || invoice.taxId || '',
                invoice.company || '',
                invoice.item || '',
                invoice.sales || 0,
                invoice.tax || 0,
                invoice.total || 0
            ];
            data.push(row);
        });

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '發票明細');

        XLSX.writeFile(workbook, '銷項發票_合併匯出.xlsx');
    }

    // 匯出分開（兩個獨立檔案）
    function exportSeparate() {
        const hasTwoPartData = checkHasValidData('two-part');
        const hasThreePartData = checkHasValidData('three-part');

        if (hasTwoPartData) {
            exportSingleType('two-part');
        }

        if (hasThreePartData) {
            setTimeout(() => {
                exportSingleType('three-part');
            }, 300); // 延遲避免瀏覽器阻擋多檔案下載
        }
    }

    // 匯出單一類型（內部使用）
    function exportSingleType(type) {
        const invoices = extractInvoiceData(type);

        if (invoices.length === 0) {
            return;
        }

        const isTwoPart = type === 'two-part';
        const headers = ['編號', '日期', '發票號碼'];

        if (isTwoPart) {
            headers.push('買受人', '品名', '銷售額(未稅)', '稅額', '總計(含稅)');
        } else {
            headers.push('統一編號', '公司名稱', '品名', '銷售額(未稅)', '營業稅', '總計(含稅)');
        }

        const data = invoices.map((inv, index) => {
            const row = [
                index + 1,
                inv.date || '',
                inv.invoiceNo || ''
            ];

            if (isTwoPart) {
                row.push(
                    inv.buyer || '',
                    inv.item || '',
                    inv.sales || 0,
                    inv.tax || 0,
                    inv.total || 0
                );
            } else {
                row.push(
                    inv.taxId || '',
                    inv.company || '',
                    inv.item || '',
                    inv.sales || 0,
                    inv.tax || 0,
                    inv.total || 0
                );
            }

            return row;
        });

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '發票明細');

        XLSX.writeFile(workbook, isTwoPart ? '二聯式銷項發票.xlsx' : '三聯式銷項發票.xlsx');
    }

    // 提取發票數據（供合併/分開匯出使用）
    function extractInvoiceData(type) {
        const currentType = invoiceTypeSelect.value;
        const isTwoPart = type === 'two-part';

        // 如果是當前顯示的類型，從 DOM 提取
        if (currentType === type) {
            const body = type === 'two-part' ? twoPartBody : threePartBody;
            const invoices = [];

            for (const row of body.rows) {
                const invoice = { type };

                if (isTwoPart) {
                    // 檢查是否至少有一個欄位有值（與 extractTableData 和 exportCurrentType 邏輯一致）
                    const dateValue = row.querySelector('.data-date')?.value?.trim() || '';
                    const invoiceNoValue = row.querySelector('.data-invoice-no')?.value?.trim() || '';
                    const buyerValue = row.querySelector('.data-buyer')?.value?.trim() || '';
                    const itemValue = row.querySelector('.data-item')?.value?.trim() || '';
                    const salesValue = row.querySelector('.sales-2')?.value?.trim() || '';
                    const taxValue = row.querySelector('.tax-2')?.value?.trim() || '';
                    const totalValue = row.querySelector('.total-2')?.value?.trim() || '';

                    const hasData = dateValue || invoiceNoValue || buyerValue || itemValue || salesValue || taxValue || totalValue;
                    if (!hasData) continue;

                    invoice.date = dateValue;
                    invoice.invoiceNo = invoiceNoValue;
                    invoice.buyer = buyerValue;
                    invoice.item = itemValue;
                    invoice.sales = parseFloat(salesValue) || 0;
                    invoice.tax = parseFloat(taxValue) || 0;
                    invoice.total = parseFloat(totalValue) || 0;
                } else {
                    // 檢查是否至少有一個欄位有值（與 extractTableData 和 exportCurrentType 邏輯一致）
                    const dateValue = row.querySelector('.data-date')?.value?.trim() || '';
                    const invoiceNoValue = row.querySelector('.data-invoice-no')?.value?.trim() || '';
                    const taxIdValue = row.querySelector('.tax-id-3')?.value?.trim() || '';
                    const companyValue = row.querySelector('.company-3')?.value?.trim() || '';
                    const itemValue = row.querySelector('.data-item')?.value?.trim() || '';
                    const salesValue = row.querySelector('.sales-3')?.value?.trim() || '';
                    const taxValue = row.querySelector('.tax-3')?.value?.trim() || '';
                    const totalValue = row.querySelector('.total-3')?.value?.trim() || '';

                    const hasData = dateValue || invoiceNoValue || taxIdValue || companyValue || itemValue || salesValue || taxValue || totalValue;
                    if (!hasData) continue;

                    invoice.date = dateValue;
                    invoice.invoiceNo = invoiceNoValue;
                    invoice.taxId = taxIdValue;
                    invoice.company = companyValue;
                    invoice.item = itemValue;
                    invoice.sales = parseFloat(salesValue) || 0;
                    invoice.tax = parseFloat(taxValue) || 0;
                    invoice.total = parseFloat(totalValue) || 0;
                }

                invoices.push(invoice);
            }

            return invoices;
        }

        // 如果不是當前顯示的類型，從 localStorage 提取
        const stored = InvoiceStorage.load();
        if (!stored) return [];

        const storedInvoices = isTwoPart ? stored.twoPartInvoices : stored.threePartInvoices;
        if (!storedInvoices || storedInvoices.length === 0) return [];

        // 將 localStorage 格式轉換為匯出格式
        return storedInvoices.filter(inv => {
            // 過濾掉空資料
            if (isTwoPart) {
                return inv.total && String(inv.total).trim() !== '';
            } else {
                return inv.sales && String(inv.sales).trim() !== '';
            }
        }).map(inv => ({
            type,
            date: inv.date || '',
            invoiceNo: inv.invoiceNo || '',  // 修正：使用駝峰式
            buyer: inv.buyer || '',
            taxId: inv.taxId || '',          // 修正：使用駝峰式
            company: inv.company || '',
            item: inv.item || '',
            sales: parseFloat(inv.sales) || 0,
            tax: parseFloat(inv.tax) || 0,
            total: parseFloat(inv.total) || 0
        }));
    }

    function updateInvoiceSummary() {
        const type = invoiceTypeSelect.value;
        const config = getInvoiceConfig(type);
        const body = getTableBody(type);
        const requiredClass = config.requiredFieldClass;

        let totalSum = 0, salesSum = 0, taxSum = 0, validRowCount = 0;

        // 統一邏輯：檢查必填欄位、累加統計
        for (const row of body.rows) {
            const requiredField = row.querySelector(`.${requiredClass}`);
            if (requiredField && requiredField.value.trim() !== '') {
                validRowCount++;

                // 提取各欄位值
                const salesInput = row.querySelector(`.${config.fields.sales.class}`);
                const taxInput = row.querySelector(`.${config.fields.tax.class}`);
                const totalInput = row.querySelector(`.${config.fields.total.class}`);

                salesSum += parseFloat(salesInput?.value) || 0;
                taxSum += parseFloat(taxInput?.value) || 0;
                totalSum += parseFloat(totalInput?.value) || 0;
            }
        }

        // 使用配置更新 DOM（消除硬編碼的元素 ID）
        document.getElementById(config.stats.count).textContent = validRowCount;
        document.getElementById(config.stats.sales).textContent = salesSum.toLocaleString();
        document.getElementById(config.stats.tax).textContent = taxSum.toLocaleString();
        document.getElementById(config.stats.total).textContent = totalSum.toLocaleString();
    }

    // 使用 debounce 優化：減少不必要的重複計算
    // 使用者輸入"1000"會觸發4次，現在只觸發1次（300ms後）
    const debouncedUpdateSummary = debounce(updateInvoiceSummary, 300);

    // 自動保存到 localStorage
    const debouncedSaveInvoice = debounce(function() {
        const type = invoiceTypeSelect.value;
        InvoiceStorage.save(type);
    }, 1000);

    /**
     * 查詢統編對應的公司名稱（使用 common.js 的函數）
     * @param {string} taxId - 統一編號
     * @param {HTMLInputElement} companyInput - 公司名稱輸入框
     */
    async function lookupCompanyByTaxId(taxId, companyInput) {
        companyInput.value = '查詢中...';

        // 使用 common.js 提供的查詢函數
        const companyName = await lookupCompanyName(taxId);
        companyInput.value = companyName;
    }

    // findNextVisibleInput 已移至 common.js，這裡不再重複定義

    // 防止 number input 被滾輪誤改值
    document.getElementById('invoice-section').addEventListener('wheel', function(e) {
        if (e.target.matches('input[type="number"]')) e.preventDefault();
    }, { passive: false });

    // Input 事件處理
    document.getElementById('invoice-section').addEventListener('input', function(e) {
        const target = e.target;
        if (!target.matches('input')) return;

        const row = target.closest('tr');
        if (!row) return;

        if (target.classList.contains('data-invoice-no')) {
            // 發票號碼驗證：2英文 + 8數字
            target.value = target.value.toUpperCase();

            // 驗證格式
            const isValid = /^[A-Z]{2}\d{8}$/.test(target.value);
            if (target.value.length === 10) {
                if (isValid) {
                    target.classList.remove('invoice-error');
                    // 檢查重複
                    const currentType = invoiceTypeSelect.value;
                    const body = currentType === 'two-part' ? twoPartBody : threePartBody;
                    checkDuplicateInvoiceNumbers(body, target);
                } else {
                    target.classList.add('invoice-error');
                }
            } else if (target.value.length > 0) {
                target.classList.add('invoice-error');
            } else {
                target.classList.remove('invoice-error');
                target.classList.remove('invoice-duplicate');
            }
        } else if (target.classList.contains('data-date') || target.classList.contains('tax-id-3')) {
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

        // 使用 debounce 版本：減少頻繁輸入時的重複計算
        debouncedUpdateSummary();
        debouncedSaveInvoice();  // 自動保存到 localStorage
    });

    // Focus 事件處理
    document.getElementById('invoice-section').addEventListener('focusin', function(e) {
        if (e.target.classList.contains('data-date') && e.target.value.includes('/')) {
            e.target.value = e.target.value.replace(/\//g, '');
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

    // 用於記錄按下「+」號前的最後焦點元素
    let lastFocusedInvoiceInput = null;

    document.getElementById('invoice-section').addEventListener('focusin', function(e) {
        if (e.target.classList && e.target.classList.contains('data-invoice-no')) {
            lastFocusedInvoiceInput = e.target;
        }
    });

    // 發票號碼自動遞增功能
    window.incrementInvoiceNumber = function(type) {
        const body = type === 2 ? twoPartBody : threePartBody;
        if (!body || body.rows.length === 0) {
            alert('沒有發票列可以參考');
            return;
        }

        // 第1步：先找目標欄位（要填入的那一格）
        let targetInput = null;
        let targetRowIndex = -1;

        // 檢查上次聚焦的欄位是否還在當前類型的表格中
        if (lastFocusedInvoiceInput && body.contains(lastFocusedInvoiceInput)) {
            targetInput = lastFocusedInvoiceInput;
            targetRowIndex = Array.from(body.rows).indexOf(targetInput.closest('tr'));
        } else {
            // 如果沒有記錄，找第一個空的發票號碼欄位
            for (let i = 0; i < body.rows.length; i++) {
                const row = body.rows[i];
                const invoiceInput = row.querySelector('.data-invoice-no');

                if (invoiceInput && !invoiceInput.value.trim()) {
                    targetInput = invoiceInput;
                    targetRowIndex = i;
                    break;
                }
            }
        }

        // 如果還是找不到，就新增一列
        if (!targetInput) {
            addInvoiceRow();
            const lastRow = body.rows[body.rows.length - 1];
            targetInput = lastRow.querySelector('.data-invoice-no');
            targetRowIndex = body.rows.length - 1;
        }

        // 第2步：從目標列「之前」往上找最後一個有效的發票號碼
        let lastValidInvoiceNo = null;
        let lastValidPrefix = null;
        let lastValidNum = null;

        for (let i = targetRowIndex - 1; i >= 0; i--) {
            const row = body.rows[i];
            const invoiceInput = row.querySelector('.data-invoice-no');

            if (invoiceInput && invoiceInput.value) {
                const value = invoiceInput.value.trim();

                // 驗證格式：2英文 + 8數字
                if (/^[A-Z]{2}\d{8}$/.test(value)) {
                    lastValidInvoiceNo = value;
                    lastValidPrefix = value.substring(0, 2);
                    lastValidNum = parseInt(value.substring(2), 10);
                    break;
                }
            }
        }

        if (!lastValidInvoiceNo) {
            alert('目標列之前沒有有效的發票號碼，無法遞增！\n請先在前面的列輸入完整的發票號碼（格式：AB12345678）');
            return;
        }

        // 第3步：遞增數字部分
        let newNum = lastValidNum + 1;

        // 如果超過8位數，重置為00000000
        if (newNum > 99999999) {
            newNum = 0;
        }

        // 格式化為8位數字（補零）
        const newNumber = String(newNum).padStart(8, '0');
        const newInvoiceNo = lastValidPrefix + newNumber;

        // 填入遞增後的發票號碼
        if (targetInput) {
            targetInput.value = newInvoiceNo;
            targetInput.classList.remove('invoice-error');

            // 檢查是否有重複的發票號碼
            checkDuplicateInvoiceNumbers(body, targetInput);

            // 保持焦點在當前欄位（不自動移動），讓用戶手動控制
            targetInput.focus();
        }
    };

    // 檢查重複的發票號碼（重新檢查所有欄位，確保修改後橘色框正確更新）
    function checkDuplicateInvoiceNumbers(body, currentInput) {
        const allInvoiceInputs = body.querySelectorAll('.data-invoice-no');

        // 先清除所有重複標記
        allInvoiceInputs.forEach(input => {
            input.classList.remove('invoice-duplicate');
        });

        // 統計每個發票號碼出現的次數
        const invoiceNumberCounts = {};
        allInvoiceInputs.forEach(input => {
            const value = input.value.trim();
            if (value && /^[A-Z]{2}\d{8}$/.test(value)) {
                invoiceNumberCounts[value] = (invoiceNumberCounts[value] || 0) + 1;
            }
        });

        // 標記所有重複的發票號碼（出現 2 次以上）
        let hasNewDuplicate = false;
        const currentValue = currentInput?.value?.trim();

        allInvoiceInputs.forEach(input => {
            const value = input.value.trim();
            if (value && invoiceNumberCounts[value] > 1) {
                input.classList.add('invoice-duplicate');
                // 只有當前修改的欄位是新產生的重複時才提示
                if (input === currentInput && value === currentValue) {
                    hasNewDuplicate = true;
                }
            }
        });

        // 只在新產生重複時才彈出警告（避免修改時重複提示）
        if (hasNewDuplicate && currentValue && invoiceNumberCounts[currentValue] > 1) {
            alert(`警告：發票號碼 ${currentValue} 重複出現 ${invoiceNumberCounts[currentValue]} 次！\n請檢查並修正重複的發票號碼。`);
        }
    }

    // 初始化發票狀態 UI 同步
    document.addEventListener('DOMContentLoaded', () => {
        invoiceState.syncVatButtonUI();
    });
}
