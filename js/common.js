/**
 * 共用工具函數模組
 * 用於所有 Excel 處理工具頁面
 */

// ===================================================================
// Excel 資料處理函數
// ===================================================================

/**
 * 檢查一行資料是否有效（非空行）
 * @param {Object} row - Excel 的一行資料
 * @returns {boolean} - 是否為有效行
 */
function isValidRow(row) {
    if (!row || Object.keys(row).length === 0) return false;
    return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
}

/**
 * 讀取 Excel 工作表資料並過濾空行
 * @param {Object} worksheet - XLSX worksheet 物件
 * @returns {Array} - 過濾後的資料陣列
 */
function readSheetData(worksheet) {
    if (!worksheet || !worksheet['!ref']) return [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false, range: range });
    return jsonData.filter(isValidRow);
}

/**
 * 修剪並壓縮空白字元（將多個連續空白變成單一空格）
 * @param {*} value - 儲存格值
 * @returns {string} - 處理後的字串
 */
function trimAndCollapseWhitespace(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().replace(/\s+/g, ' ');
}

// 向後兼容：保留舊函數名稱
const normalizeValue = trimAndCollapseWhitespace;

// ===================================================================
// UI 進度與狀態顯示函數
// ===================================================================

/**
 * 更新進度條顯示
 * @param {number} current - 當前進度
 * @param {number} total - 總數
 * @param {string} message - 顯示訊息
 * @param {string} statusElementId - 狀態元素的 ID
 */
function updateProgress(current, total, message = '處理中', statusElementId = 'status') {
    const percent = Math.round((current / total) * 100);
    const statusElement = document.getElementById(statusElementId);

    if (!statusElement) return;

    statusElement.innerHTML = `
        <div class="progress-container">
            <div class="progress-bar" style="width: ${percent}%"></div>
            <div class="progress-text">
                ${message}: ${current} / ${total} (${percent}%)
            </div>
        </div>
    `;
}

/**
 * 顯示完成訊息
 * @param {string} message - 主要訊息
 * @param {string} details - 詳細說明（可選）
 * @param {string} statusElementId - 狀態元素的 ID
 */
function showCompleteMessage(message, details = '', statusElementId = 'status') {
    const statusElement = document.getElementById(statusElementId);

    if (!statusElement) return;

    statusElement.innerHTML = `
        <div class="progress-complete">
            ✓ ${message}
            ${details ? `<br><small>${details}</small>` : ''}
        </div>
    `;
}

/**
 * 顯示錯誤訊息
 * @param {string} message - 錯誤訊息
 * @param {string} statusElementId - 狀態元素的 ID
 */
function showErrorMessage(message, statusElementId = 'status') {
    const statusElement = document.getElementById(statusElementId);

    if (!statusElement) return;

    statusElement.innerHTML = `
        <div class="progress-error">
            ✗ ${message}
        </div>
    `;
}

/**
 * 清除狀態訊息
 * @param {string} statusElementId - 狀態元素的 ID
 */
function clearStatus(statusElementId = 'status') {
    const statusElement = document.getElementById(statusElementId);
    if (statusElement) {
        statusElement.innerHTML = '';
    }
}

// ===================================================================
// 檔案處理函數
// ===================================================================

/**
 * 設置拖放區域的事件監聽器
 * @param {HTMLElement} dropZone - 拖放區域元素
 * @param {HTMLInputElement} fileInput - 文件輸入元素
 * @param {Function} onFilesSelected - 文件選擇後的回調函數
 */
function setupDropZone(dropZone, fileInput, onFilesSelected) {
    if (!dropZone || !fileInput) return;

    // 點擊觸發文件選擇
    dropZone.addEventListener('click', () => fileInput.click());

    // 拖放事件處理
    ['dragover', 'dragenter'].forEach(ev => {
        dropZone.addEventListener(ev, (e) => {
            e.preventDefault();
            dropZone.classList.add('hover');
        });
    });

    ['dragleave', 'drop'].forEach(ev => {
        dropZone.addEventListener(ev, (e) => {
            e.preventDefault();
            dropZone.classList.remove('hover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            if (onFilesSelected) {
                onFilesSelected(e.dataTransfer.files);
            }
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0 && onFilesSelected) {
            onFilesSelected(e.target.files);
        }
    });
}

/**
 * 讀取多個 Excel 文件
 * @param {FileList} files - 文件列表
 * @returns {Promise<Array>} - 返回 {name, workbook} 物件陣列
 */
async function readExcelFiles(files) {
    const readPromises = Array.from(files).map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                resolve({
                    name: file.name,
                    workbook: XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
                });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error(`讀取檔案 ${file.name} 失敗`));
        reader.readAsArrayBuffer(file);
    }));

    return await Promise.all(readPromises);
}

/**
 * 匯出資料為 Excel 文件
 * @param {Array} data - 要匯出的資料陣列
 * @param {string} fileName - 檔案名稱
 * @param {string} sheetName - 工作表名稱
 */
function exportToExcel(data, fileName = 'export.xlsx', sheetName = 'Sheet1') {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
}

// ===================================================================
// 日期時間處理函數
// ===================================================================

/**
 * 格式化日期時間字串
 * @param {*} value - 日期值
 * @returns {string} - 格式化後的日期字串（YYYY/MM/DD 格式）
 */
function formatDate(value) {
    if (!value) return '';

    // 如果已經是合法格式，直接返回
    if (typeof value === 'string' && /^\d{4}\/\d{2}\/\d{2}/.test(value)) {
        return value;
    }

    // Excel 序列號轉換
    if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
            const year = date.y;
            const month = String(date.m).padStart(2, '0');
            const day = String(date.d).padStart(2, '0');
            return `${year}/${month}/${day}`;
        }
    }

    return String(value);
}

// ===================================================================
// 工具函數
// ===================================================================

/**
 * 防抖函數（延遲執行，避免頻繁觸發）
 * @param {Function} func - 要執行的函數
 * @param {number} wait - 等待時間（毫秒）
 * @returns {Function} - 防抖後的函數
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 節流函數（限制執行頻率）
 * @param {Function} func - 要執行的函數
 * @param {number} limit - 時間限制（毫秒）
 * @returns {Function} - 節流後的函數
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 延遲函數（用於 async/await）
 * @param {number} ms - 延遲時間（毫秒）
 * @returns {Promise} - Promise 物件
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===================================================================
// 頁面導航函數（用於 index.html）
// ===================================================================

// 記錄當前顯示的區塊（用於優化效能）
let _currentVisibleSection = null;

/**
 * 通用的區塊顯示函數 - 消除重複的 showWelcome/showInsurance/showInvoice 邏輯
 * 優化：只隱藏當前顯示的區塊，不用遍歷所有區塊（O(n) → O(1)）
 * @param {HTMLElement} targetSection - 要顯示的區塊
 * @param {Array<HTMLElement>} allSections - 所有區塊的陣列（選填，用於向後兼容）
 */
function showSection(targetSection, allSections) {
    if (!targetSection) return;

    // 優化路徑：只隱藏當前顯示的區塊
    if (_currentVisibleSection && _currentVisibleSection !== targetSection) {
        _currentVisibleSection.classList.add(CONFIG.CSS_CLASSES.HIDDEN);
        _currentVisibleSection.classList.remove(CONFIG.CSS_CLASSES.FADE_IN);
    } else if (allSections) {
        // 向後兼容路徑：如果沒有記錄當前區塊，則遍歷所有區塊
        allSections.forEach(section => {
            if (section && section !== targetSection) {
                section.classList.add(CONFIG.CSS_CLASSES.HIDDEN);
                section.classList.remove(CONFIG.CSS_CLASSES.FADE_IN);
            }
        });
    }

    // 顯示目標區塊
    targetSection.classList.remove(CONFIG.CSS_CLASSES.HIDDEN);
    targetSection.classList.add(CONFIG.CSS_CLASSES.FADE_IN);

    // 記錄當前顯示的區塊
    _currentVisibleSection = targetSection;
}

/**
 * 自動跳轉到下一個輸入框（用於日期輸入）
 * @param {HTMLInputElement} currentElement - 當前輸入元素
 * @param {string} nextElementId - 下一個元素的 ID
 */
function autoTab(currentElement, nextElementId) {
    if (!currentElement || !nextElementId) return;

    if (currentElement.value.length === currentElement.maxLength) {
        const nextElement = document.getElementById(nextElementId);
        if (nextElement) nextElement.focus();
    }
}

// ===================================================================
// 日期轉換函數（民國年 ↔ 西元年）
// ===================================================================

/**
 * 驗證民國年是否在合法範圍內
 * @param {number} rocYear - 民國年
 * @returns {boolean} - 是否合法
 */
function isValidROCYear(rocYear) {
    return rocYear >= CONFIG.MIN_ROC_YEAR && rocYear <= CONFIG.MAX_ROC_YEAR;
}

/**
 * 民國年轉西元年
 * @param {number} rocYear - 民國年
 * @returns {number} - 西元年
 */
function rocToAD(rocYear) {
    return rocYear + CONFIG.ROC_TO_AD_OFFSET;
}

/**
 * 西元年轉民國年
 * @param {number} adYear - 西元年
 * @returns {number} - 民國年
 */
function adToROC(adYear) {
    return adYear - CONFIG.ROC_TO_AD_OFFSET;
}

/**
 * 判斷是否為閏年
 * @param {number} year - 西元年
 * @returns {boolean} - 是否為閏年
 */
function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * 取得某年的天數
 * @param {number} year - 西元年
 * @returns {number} - 天數（365 或 366）
 */
function getDaysInYear(year) {
    return isLeapYear(year) ? 366 : 365;
}

/**
 * 取得某日期是該年的第幾天
 * @param {Date} date - 日期物件
 * @returns {number} - 天數（1-366）
 */
function dayOfYear(date) {
    const yearStart = new Date(date.getFullYear(), 0, 0);
    const diff = date - yearStart;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

// ===================================================================
// API 呼叫函數（統一錯誤處理）
// ===================================================================

/**
 * 查詢統一編號對應的公司名稱（多層備用 API）
 * @param {string} taxId - 統一編號（8位數字）
 * @returns {Promise<string>} - 公司名稱或錯誤訊息
 */
async function lookupCompanyName(taxId) {
    // 驗證格式
    if (!/^\d{8}$/.test(taxId)) {
        return '統編格式錯誤';
    }

    // 策略 1：g0v 主 API
    try {
        const g0vUrl = `https://company.g0v.ronny.tw/api/show/${taxId}`;
        const response = await fetch(g0vUrl, { timeout: 5000 });

        if (response.ok) {
            const data = await response.json();
            if (data && data.data) {
                // 優先查找順序：商業名稱 → 財政部營業人名稱 → 其他
                let companyName = data.data['商業名稱'] ||
                                 data.data['公司名稱'] ||
                                 data.data['名稱'];

                // 如果上面沒找到，試試子層級
                if (!companyName && data.data['財政部']) {
                    companyName = data.data['財政部']['營業人名稱'] ||
                                 data.data['財政部']['公司名稱'] ||
                                 data.data['財政部']['名稱'];
                }

                if (!companyName && data.data['經濟部']) {
                    companyName = data.data['經濟部']['公司名稱'] ||
                                 data.data['經濟部']['名稱'];
                }

                if (companyName && typeof companyName === 'string' && companyName.trim()) {
                    return companyName.trim();
                }
            }
        }
    } catch (error) {
        console.warn('g0v 主 API 查詢失敗:', error.message);
    }

    // 策略 2：g0v API 備用端點（https://company.g0v.ronny.tw/api 的替代路由）
    try {
        const g0vAltUrl = `https://company.g0v.ronny.tw/api/search/${taxId}`;
        const response = await fetch(g0vAltUrl, { timeout: 5000 });

        if (response.ok) {
            const data = await response.json();
            if (data) {
                const companyName = data['商業名稱'] ||
                                   data['公司名稱'] ||
                                   data['名稱'] ||
                                   (data.data && data.data['商業名稱']);
                if (companyName && typeof companyName === 'string' && companyName.trim()) {
                    return companyName.trim();
                }
            }
        }
    } catch (error) {
        console.warn('g0v 備用端點查詢失敗:', error.message);
    }

    // 策略 3：NexData 台灣公司資料
    try {
        const nexdataUrl = `https://company.nexdata.com.tw/api/company/${taxId}`;
        const response = await fetch(nexdataUrl, { timeout: 5000 });

        if (response.ok) {
            const data = await response.json();
            if (data && data.company_name) {
                return data.company_name.trim();
            }
        }
    } catch (error) {
        console.warn('NexData 查詢失敗:', error.message);
    }

    // 策略 4：CORS 代理 + 政府資料（備用到最後）
    try {
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const govApiUrl = `https://data.gov.tw/api/v2/rest/dataset/9D17AE0D-09B5-4732-A8F4-81ADED04B679?%24filter=Business_Accounting_NO%20eq%20${taxId}`;
        const response = await fetch(proxyUrl + encodeURIComponent(govApiUrl), { timeout: 8000 });

        if (response.ok) {
            const proxyData = await response.json();
            if (proxyData && proxyData.contents) {
                try {
                    const results = JSON.parse(proxyData.contents);
                    if (results && Array.isArray(results) && results.length > 0) {
                        const companyName = results[0]['營業人名稱'] || results[0]['公司名稱'];
                        if (companyName) {
                            return companyName.trim();
                        }
                    }
                } catch (e) {
                    console.warn('政府 API 回應解析失敗:', e.message);
                }
            }
        }
    } catch (error) {
        console.warn('政府資料 API 查詢失敗:', error.message);
    }

    // 所有 API 都失敗，返回查無資料
    return '查無資料';
}

// ===================================================================
// 表格導航函數（用於發票表格的鍵盤導航）
// ===================================================================

/**
 * 尋找當前行中下一個可見的輸入框
 * @param {HTMLInputElement} currentInput - 當前輸入框
 * @returns {HTMLInputElement|null} - 下一個輸入框或 null
 */
function findNextVisibleInput(currentInput) {
    const row = currentInput.closest('tr');
    if (!row) return null;

    const allVisibleInputs = Array.from(row.querySelectorAll('input:not([readonly])'))
        .filter(el => el.offsetParent !== null);
    const currentIndex = allVisibleInputs.indexOf(currentInput);

    if (currentIndex > -1 && currentIndex < allVisibleInputs.length - 1) {
        return allVisibleInputs[currentIndex + 1];
    }
    return null;
}

/**
 * 根據方向鍵導航到目標儲存格
 * @param {HTMLInputElement} currentInput - 當前輸入框
 * @param {string} direction - 方向（'up', 'down', 'left', 'right'）
 * @returns {HTMLInputElement|null} - 目標輸入框或 null
 */
function navigateTableCell(currentInput, direction) {
    const currentRow = currentInput.closest('tr');
    const currentCell = currentInput.closest('td');
    if (!currentRow || !currentCell) return null;

    const tableBody = currentRow.parentElement;
    const rows = Array.from(tableBody.children);
    const rowIndex = rows.indexOf(currentRow);

    const visibleCellsInCurrentRow = Array.from(currentRow.children)
        .filter(cell => cell.offsetParent !== null);
    const visibleColIndex = visibleCellsInCurrentRow.indexOf(currentCell);

    let targetRow = null;
    let targetCell = null;

    switch (direction) {
        case 'up':
            if (rowIndex > 0) {
                targetRow = rows[rowIndex - 1];
                targetCell = Array.from(targetRow.children)
                    .filter(cell => cell.offsetParent !== null)[visibleColIndex];
            }
            break;

        case 'down':
            if (rowIndex < rows.length - 1) {
                targetRow = rows[rowIndex + 1];
                targetCell = Array.from(targetRow.children)
                    .filter(cell => cell.offsetParent !== null)[visibleColIndex];
            }
            break;

        case 'left':
            if (visibleColIndex > 0) {
                targetCell = visibleCellsInCurrentRow[visibleColIndex - 1];
            }
            break;

        case 'right':
            if (visibleColIndex < visibleCellsInCurrentRow.length - 1) {
                targetCell = visibleCellsInCurrentRow[visibleColIndex + 1];
            }
            break;
    }

    return targetCell ? targetCell.querySelector('input') : null;
}

// ===================================================================
// 模組匯出（如果使用 ES6 模組）
// ===================================================================

// 如果頁面使用 ES6 模組，可以取消以下註解
/*
export {
    // Excel 處理
    isValidRow,
    readSheetData,
    normalizeValue,
    exportToExcel,
    readExcelFiles,

    // UI 狀態
    updateProgress,
    showCompleteMessage,
    showErrorMessage,
    clearStatus,
    setupDropZone,

    // 日期處理
    formatDate,
    isValidROCYear,
    rocToAD,
    adToROC,
    isLeapYear,
    getDaysInYear,
    dayOfYear,

    // 頁面導航
    showSection,
    autoTab,

    // API 呼叫
    lookupCompanyName,

    // 表格導航
    findNextVisibleInput,
    navigateTableCell,

    // 工具函數
    debounce,
    throttle,
    sleep
};
*/

// ===================================================================
// 發票類型配置輔助函數 - 消除 type checking
// ===================================================================

/**
 * 取得發票類型配置
 * @param {string} type - 發票類型 ('two-part' or 'three-part')
 * @returns {Object} - 配置物件
 */
function getInvoiceConfig(type) {
    return INVOICE_TYPE_CONFIG[type];
}

/**
 * 取得表格 tbody 元素
 * @param {string} type - 發票類型
 * @returns {HTMLElement} - tbody 元素
 */
function getTableBody(type) {
    const config = getInvoiceConfig(type);
    return document.getElementById(config.tableBodyId);
}

/**
 * 取得表格元素
 * @param {string} type - 發票類型
 * @returns {HTMLElement} - table 元素
 */
function getTableElement(type) {
    const config = getInvoiceConfig(type);
    return document.getElementById(config.tableId);
}

/**
 * 取得統計區塊元素
 * @param {string} type - 發票類型
 * @returns {HTMLElement} - summary 元素
 */
function getSummaryElement(type) {
    const config = getInvoiceConfig(type);
    return document.getElementById(config.summaryId);
}

/**
 * 取得控制區塊元素
 * @param {string} type - 發票類型
 * @returns {HTMLElement} - controls 元素
 */
function getControlsElement(type) {
    const config = getInvoiceConfig(type);
    return document.getElementById(config.controlsId);
}

/**
 * 取得必填欄位類名
 * @param {string} type - 發票類型
 * @returns {string} - CSS 類名
 */
function getRequiredFieldClass(type) {
    const config = getInvoiceConfig(type);
    return config.requiredFieldClass;
}
