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
// 發票卡片模式 - 全域數據模型（支持同時顯示二聯式和三聯式）
// ===================================================================

let invoiceCardsMode = {
    twoPartInvoices: [],    // 二聯式發票陣列
    threePartInvoices: [],  // 三聯式發票陣列
    nextId: 1,              // 全域 ID 生成器
    collapsedCards: {},     // 卡片收合狀態

    generateId() {
        return this.nextId++;
    },

    addInvoice(type, data = {}) {
        const invoice = {
            id: this.generateId(),
            type: type,
            date: data.date || '',
            invoiceNo: data.invoiceNo || '',
            buyer: data.buyer || '',
            item: data.item || '',
            taxId: data.taxId || '',
            company: data.company || '',
            sales: parseFloat(data.sales) || 0,
            tax: parseFloat(data.tax) || 0,
            total: parseFloat(data.total) || 0
        };

        if (type === 'two-part') {
            this.twoPartInvoices.push(invoice);
        } else {
            this.threePartInvoices.push(invoice);
        }

        return invoice;
    },

    updateInvoice(id, type, updates) {
        const invoices = type === 'two-part' ? this.twoPartInvoices : this.threePartInvoices;
        const invoice = invoices.find(inv => inv.id === id);
        if (invoice) {
            Object.assign(invoice, updates);
        }
        return invoice;
    },

    deleteInvoice(id, type) {
        if (type === 'two-part') {
            this.twoPartInvoices = this.twoPartInvoices.filter(inv => inv.id !== id);
        } else {
            this.threePartInvoices = this.threePartInvoices.filter(inv => inv.id !== id);
        }
    },

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
    },

    toggleCardCollapse(type) {
        this.collapsedCards[type] = !this.collapsedCards[type];
        return this.collapsedCards[type];
    },

    clear() {
        this.twoPartInvoices = [];
        this.threePartInvoices = [];
        this.collapsedCards = {};
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
        const requiredClass = config.requiredFieldClass;
        const invoices = [];
        let rowIndex = 1;

        for (const row of body.rows) {
            // 檢查必填欄位是否有值
            const requiredField = row.querySelector(`.${requiredClass}`)?.value || '';
            if (!requiredField.trim()) continue;

            const invoice = { id: rowIndex };

            // 通用欄位提取
            const commonFields = ['data-date', 'data-invoice-no', 'data-buyer', 'data-item', 'tax-id-3', 'company-3'];
            commonFields.forEach(fieldClass => {
                const input = row.querySelector(`.${fieldClass}`);
                if (input) {
                    const fieldName = fieldClass.replace('data-', '').replace('-3', '').replace('-', '');
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

            invoices.push(invoice);
            rowIndex++;
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

            // 數據格式驗證：確保有 twoPartInvoices 和 threePartInvoices
            if (!parsed.twoPartInvoices) parsed.twoPartInvoices = [];
            if (!parsed.threePartInvoices) parsed.threePartInvoices = [];

            return parsed;
        } catch (e) {
            console.warn('localStorage 讀取失敗:', e.message);
            // 如果數據損壞，清空它
            try {
                localStorage.removeItem(this.STORAGE_KEY);
            } catch (e2) {}
            return null;
        }
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

            newRow.querySelectorAll('input:not([readonly])').forEach(input => {
                if (input.placeholder) {
                    try {
                        adjustInputWidth(input);
                    } catch (e) {}
                }
            });
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
        const oppositeType = type === 'two-part' ? 'three-part' : 'two-part';

        // 使用配置取得 DOM 元素（消除硬編碼的 ID）
        const currentControls = getControlsElement(type);
        const oppositeControls = getControlsElement(oppositeType);
        const currentContainer = getTableElement(type);
        const oppositeContainer = getTableElement(oppositeType);
        const currentSummary = getSummaryElement(type);
        const oppositeSummary = getSummaryElement(oppositeType);
        const targetBody = getTableBody(type);

        // 第0步：確保立即保存兩種類型的數據（不依賴 debounce）
        console.log(`[switchInvoiceType] 第0步：強制保存當前兩種類型的數據`);
        InvoiceStorage.save('two-part');
        InvoiceStorage.save('three-part');

        // 第1步：保存即將離開的類型數據（在改變 DOM 之前）
        console.log(`[switchInvoiceType] 第1步：再次保存 ${oppositeType} 的數據（確保最新）`);
        InvoiceStorage.save(oppositeType);

        // 第2步：更新 UI 顯示（使用統一邏輯）
        currentContainer.classList.remove("hidden");
        currentSummary.classList.remove("hidden");
        currentControls.classList.remove('hidden');
        oppositeContainer.classList.add("hidden");
        oppositeSummary.classList.add("hidden");
        oppositeControls.classList.add('hidden');

        // 第3步：還原即將進入的類型數據
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

        newRow.querySelectorAll('input:not([readonly])').forEach(input => {
            if (input.placeholder) adjustInputWidth(input);
        });

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
                const totalValue = row.querySelector('.total-2').value;
                if (!totalValue) continue;

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
                const salesValue = row.querySelector('.sales-3').value;
                if (!salesValue) continue;

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
    };

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

        if (target.classList.contains('data-invoice-no')) {
            // 發票號碼驗證：2英文 + 8數字
            target.value = target.value.toUpperCase();

            // 驗證格式
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

    // 發票號碼自動遞增功能
    window.incrementInvoiceNumber = function(type) {
        const body = type === 2 ? twoPartBody : threePartBody;
        if (!body || body.rows.length === 0) {
            alert('沒有發票列可以參考');
            return;
        }

        // 找到倒數第二列（上一列）的發票號碼
        const lastRowIndex = body.rows.length - 1;
        if (lastRowIndex === 0) {
            alert('上一列為空值，無效操作');
            return;
        }

        const prevRow = body.rows[lastRowIndex - 1];
        const prevInvoiceInput = prevRow.querySelector('.data-invoice-no');

        if (!prevInvoiceInput || !prevInvoiceInput.value) {
            alert('上一列為空值，無效操作');
            return;
        }

        const prevValue = prevInvoiceInput.value.trim();

        // 驗證上一列格式
        if (!/^[A-Z]{2}\d{8}$/.test(prevValue)) {
            alert('上一列為空值，無效操作');
            return;
        }

        // 提取英文和數字部分
        const prefix = prevValue.substring(0, 2);
        let numPart = parseInt(prevValue.substring(2), 10);

        // 遞增數字部分
        numPart++;

        // 如果超過8位數，重置為00000000
        if (numPart > 99999999) {
            numPart = 0;
        }

        // 格式化為8位數字（補零）
        const newNumber = String(numPart).padStart(8, '0');
        const newInvoiceNo = prefix + newNumber;

        // 將新發票號碼填入最後一列
        const lastRow = body.rows[lastRowIndex];
        const lastInvoiceInput = lastRow.querySelector('.data-invoice-no');
        if (lastInvoiceInput) {
            lastInvoiceInput.value = newInvoiceNo;
            lastInvoiceInput.classList.remove('invoice-error');
            adjustInputWidth(lastInvoiceInput);
            lastInvoiceInput.focus();
        }
    };

    // 初始化發票狀態 UI 同步
    document.addEventListener('DOMContentLoaded', () => {
        invoiceState.syncVatButtonUI();
    });
}
