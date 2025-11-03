// ===================================================================
// 全域配置文件 - 所有可配置項目集中管理
// ===================================================================

const APP_CONFIG = {
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
        // 政府稅籍資料 API
        TAX_ID_LOOKUP: 'https://data.gov.tw/api/v2/rest/dataset/9D17AE0D-09B5-4732-A8F4-81ADED04B679',

        // CORS 代理（用於繞過瀏覽器跨域限制）
        CORS_PROXY: 'https://api.allorigins.win/get?url=',

        // g0v 公司資料備用 API
        G0V_COMPANY_API: 'https://company.g0v.ronny.tw/api/show/',

        // Replit 喚醒端點（保持服務器活躍，防止休眠）
        // 注意：這個 URL 應該從環境變數或配置文件讀取，而不是硬編碼
        REPLIT_WAKEUP: 'https://2b5b8e82-ebaa-47ce-a19d-9ea694ad9054-00-1224m4kz7kkf2.sisko.replit.dev'
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

// 為了向後兼容，保留原有的 CONFIG 變數
// 未來應該逐步遷移到 APP_CONFIG
const CONFIG = {
    ROC_TO_AD_OFFSET: APP_CONFIG.ROC_TO_AD_OFFSET,
    LABOR_INSURANCE_RATE: APP_CONFIG.LABOR_INSURANCE_RATE,
    HEALTH_INSURANCE_RATE: APP_CONFIG.HEALTH_INSURANCE_RATE,
    VAT_RATE: APP_CONFIG.VAT_RATE,
    VAT_MULTIPLIER: APP_CONFIG.VAT_MULTIPLIER,
    MIN_ROC_YEAR: APP_CONFIG.MIN_ROC_YEAR,
    MAX_ROC_YEAR: APP_CONFIG.MAX_ROC_YEAR
};
