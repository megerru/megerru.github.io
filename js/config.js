// ===================================================================
// 全域配置文件 - 所有可配置項目集中管理
// ===================================================================

const CONFIG = {
    // ============ 日期轉換常數 ============
    ROC_TO_AD_OFFSET: 1911,      // 民國年轉西元年的偏差值
    MIN_ROC_YEAR: 1,             // 最小民國年（民國元年）
    MAX_ROC_YEAR: 200,           // 最大民國年（西元 2111 年）

    // ============ 勞健保計算比例 ============
    LABOR_INSURANCE_RATE: 0.7,   // 勞保費率 70%
    HEALTH_INSURANCE_RATE: 0.6,  // 健保費率 60%

    // ============ 營業稅 ============
    VAT_RATE: 0.05,              // 營業稅率 5%
    VAT_MULTIPLIER: 1.05,        // 含稅乘數 (1 + 5%)

    // ============ API 端點配置 ============
    API: {
        // g0v 公司資料 API（統編查公司名稱；有 CORS 標頭，可由瀏覽器直接呼叫）
        G0V_COMPANY_API: 'https://company.g0v.ronny.tw/api/show/',

        // 統編查詢逾時（毫秒）
        LOOKUP_TIMEOUT_MS: 5000

        // 註：原本的 TAX_ID_LOOKUP（政府資料 API）與 CORS_PROXY（allorigins）
        // 已於 2026-09-15 移除 — allorigins 服務已無法連線，該路徑不再可用。
    },

    // ============ UI 動畫時長 ============
    ANIMATION: {
        FADE_DURATION: 250,       // 淡入淡出動畫時長（毫秒）
        SECTION_TRANSITION: 250   // 區塊切換動畫時長（毫秒）
    },

    // ============ CSS Class 名稱 ============
    CSS_CLASSES: {
        HIDDEN: 'hidden',
        FADE_IN: 'section-fade-in',
        RESULT_VISIBLE: 'result-visible',
        RESULT_HIDDEN: 'result-hidden',
        ACTIVE: 'active'
    },

    // ============ 驗證規則 ============
    VALIDATION: {
        TAX_ID_LENGTH: 8,         // 統一編號長度
        ROC_DATE_YEAR_LENGTH: 3,  // 民國年輸入長度
        ROC_DATE_FULL_LENGTH: 7   // 完整民國日期長度（1140629）
    }
};

// ===================================================================
// 發票類型配置 - 消除 type checking 分支
// ===================================================================

const INVOICE_TYPE_CONFIG = {
    'two-part': {
        // DOM 元素 ID
        tableBodyId: 'invoice-table-body-two-part',
        tableId: 'invoice-table-two-part',
        summaryId: 'invoice-summary-two-part',
        controlsId: 'optional-controls-two-part',

        // 判斷有效行的必填欄位
        requiredFieldClass: 'total-2',

        // 欄位配置
        fields: {
            sales: { class: 'sales-2', readonly: true },
            tax: { class: 'tax-2', vatControlled: true },
            total: { class: 'total-2', required: true }
        },

        // 統計元素 ID
        stats: {
            count: 'invoice-count-two',
            sales: 'sales-sum-two',
            tax: 'tax-sum-two',
            total: 'total-sum-two'
        }
    },

    'three-part': {
        // DOM 元素 ID
        tableBodyId: 'invoice-table-body-three-part',
        tableId: 'invoice-table-three-part',
        summaryId: 'invoice-summary-three-part',
        controlsId: 'optional-controls-three-part',

        // 判斷有效行的必填欄位
        requiredFieldClass: 'sales-3',

        // 欄位配置
        fields: {
            sales: { class: 'sales-3', required: true },
            tax: { class: 'tax-3', vatControlled: true },
            total: { class: 'total-3', readonly: true }
        },

        // 統計元素 ID
        stats: {
            count: 'invoice-count-three',
            sales: 'sales-sum-three',
            tax: 'tax-sum-three',
            total: 'total-sum-three'
        }
    }
};
