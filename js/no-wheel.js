// ===================================================================
// 停用滑鼠滾輪改動欄位值
//
// number / date 欄位與 select 在「聚焦狀態下」被滾輪捲動時，瀏覽器會
// 直接增減數值或切換選項，常導致使用者在捲動頁面時誤改已填好的資料。
//
// 作法：滾輪事件於捕獲階段讓該欄位失焦。欄位一旦失焦，瀏覽器就不會
// 再改值，而我們沒有呼叫 preventDefault()，所以頁面照常捲動。
// （若改用 preventDefault() 雖然也能擋住改值，但游標停在欄位上時
// 整頁就捲不動了 — 像銷項發票那種整片都是數字欄位的表格會很難用。）
//
// 以 document 層級委派，動態新增的欄位（例如發票列）也一併涵蓋。
// ===================================================================

(function () {
    'use strict';

    // 這些控制項在聚焦時會被滾輪改值
    const WHEEL_SENSITIVE = 'input[type="number"], input[type="date"], input[type="datetime-local"], input[type="month"], input[type="week"], input[type="time"], input[type="range"], select';

    document.addEventListener('wheel', function (event) {
        const el = event.target;
        if (!el || typeof el.matches !== 'function') return;
        if (!el.matches(WHEEL_SENSITIVE)) return;

        // 未聚焦的欄位本來就不會被滾輪改值，不必處理
        if (document.activeElement !== el) return;

        el.blur();
    }, { capture: true, passive: true });
})();
