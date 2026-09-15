// ===================================================================
// 防止欄位值被誤改
//
// number / date 等欄位在聚焦狀態下，滑鼠滾輪與鍵盤上下鍵都會直接增減
// 數值，常導致使用者在捲動頁面或移動游標時誤改已填好的資料。
//
// 本檔案處理兩種誤觸來源：
//   1. 滑鼠滾輪 — 讓欄位失焦。失焦後瀏覽器不會改值，而因為沒有呼叫
//      preventDefault()，頁面仍可正常捲動。
//      （若用 preventDefault() 雖然也擋得住，但游標停在欄位上時整頁
//        就捲不動了 — 像銷項發票那種整片都是數字欄位的表格會很難用。）
//   2. 鍵盤上下鍵 — 於 number 欄位阻擋其預設的增減行為。
//      實測僅 ArrowUp / ArrowDown 會改值，PageUp / PageDown 不會。
//
// 注意：select 的上下鍵「不」阻擋。那是鍵盤操作下拉選單的唯一方式，
// 擋掉會讓只用鍵盤的使用者無法選取選項。
//
// 以 document 層級委派，動態新增的欄位（例如發票列）也一併涵蓋。
// ===================================================================

(function () {
    'use strict';

    // 這些控制項在聚焦時會被滾輪改值
    const WHEEL_SENSITIVE = 'input[type="number"], input[type="date"], input[type="datetime-local"], input[type="month"], input[type="week"], input[type="time"], input[type="range"], select';

    // 上下鍵只在 number 欄位阻擋（select 需保留鍵盤操作能力）
    const KEY_SENSITIVE = 'input[type="number"]';

    document.addEventListener('wheel', function (event) {
        const el = event.target;
        if (!el || typeof el.matches !== 'function') return;
        if (!el.matches(WHEEL_SENSITIVE)) return;

        // 未聚焦的欄位本來就不會被滾輪改值，不必處理
        if (document.activeElement !== el) return;

        el.blur();
    }, { capture: true, passive: true });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

        const el = event.target;
        if (!el || typeof el.matches !== 'function') return;
        if (!el.matches(KEY_SENSITIVE)) return;

        event.preventDefault();
    }, { capture: true });
})();
