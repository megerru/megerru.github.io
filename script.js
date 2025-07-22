// ===================================================================
// I. 頁面導覽與通用函式
// ===================================================================
function showWelcome(){document.getElementById("insurance-calculator-section").classList.add("hidden");document.getElementById("invoice-section").classList.add("hidden");document.getElementById("welcome-section").classList.remove("hidden")}
function showInsuranceCalculator(){document.getElementById("welcome-section").classList.add("hidden");document.getElementById("invoice-section").classList.add("hidden");document.getElementById("insurance-calculator-section").classList.remove("hidden")}
function showInvoiceCalculator(){document.getElementById("welcome-section").classList.add("hidden");document.getElementById("insurance-calculator-section").classList.add("hidden");document.getElementById("invoice-section").classList.remove("hidden");switchInvoiceType()}
function autoTab(currentElement,nextElementId){if(currentElement.value.length===currentElement.maxLength){document.getElementById(nextElementId).focus()}}

// ===================================================================
// II. 保險費計算機
// ===================================================================
function toggleInputMode(e){const t=document.getElementById(`${e}Date`),n=document.getElementById(`${e}DateManualContainer`),o=document.querySelector(`#${e}-date-group .toggle-button`);t.classList.toggle("hidden")?(n.classList.remove("hidden"),o.textContent="使用日曆",t.value&&(()=>{const n=new Date(t.value);document.getElementById(`${e}DateManualYear`).value=n.getFullYear()-1911,document.getElementById(`${e}DateManualMonth`).value=(n.getMonth()+1).toString().padStart(2,"0"),document.getElementById(`${e}DateManualDay`).value=n.getDate().toString().padStart(2,"0")})()):(n.classList.add("hidden"),o.textContent="手動輸入",updatePickerFromManual(e))}
function updatePickerFromManual(e){const t=document.getElementById(`${e}DateManualYear`),n=document.getElementById(`${e}DateManualMonth`),o=document.getElementById(`${e}DateManualDay`),l=document.getElementById(`${e}Date`);const a=t.value.trim(),d=n.value.trim(),c=o.value.trim();if(a&&d&&c){const t=`${a}/${d}/${c}`;const n=/(\d{2,3})[年\/](\d{1,2})[月\/](\d{1,2})日?/.exec(t);if(n){const t=parseInt(n[1],10)+1911,o=n[2].padStart(2,"0"),a=n[3].padStart(2,"0");const d=`${t}-${o}-${a}`;const c=new Date(d);c instanceof Date&&!isNaN(c)&&c.getFullYear()===t?l.value=d:l.value=""}else l.value=""}else l.value=""}
function resetInsuranceForm(){["start","end"].forEach(e=>{document.getElementById(`${e}Date`).value="",document.getElementById(`${e}DateManualYear`).value="",document.getElementById(`${e}DateManualMonth`).value="",document.getElementById(`${e}DateManualDay`).value=""});document.getElementById("totalPremium").value="";const e=document.getElementById("result");e.classList.add("result-hidden"),e.classList.remove("result-visible"),document.getElementById("startDateManualContainer").classList.contains("hidden")||document.getElementById("startDateManualYear").focus()}
function getProratedMonthValueForStart(e){return e>=1&&e<=10?1:e>=11&&e<=20?.5:0}
function getProratedMonthValueForEnd(e){return e>=21?1:e>=11?.5:0}
function calculatePremium(){try{updatePickerFromManual("start"),updatePickerFromManual("end");const e=document.getElementById("startDate").value,t=document.getElementById("endDate").value,n=parseFloat(document.getElementById("totalPremium").value);if(!e||!t||isNaN(n)||n<=0)return void alert("請確保所有欄位都已正確填寫！");const o=new Date(e),l=new Date(t);if(o.setUTCHours(12,0,0,0),l.setUTCHours(12,0,0,0),l<=o)return void alert("結束日期必須晚於起始日期！");const a=o.getFullYear(),d=l.getFullYear();if(a===d||d-a>1)return void alert("目前僅支援橫跨兩個連續年度的計算。");let c=0;c+=getProratedMonthValueForStart(o.getDate()),c+=11-o.getMonth();let r=0;r+=l.getMonth(),r+=getProratedMonthValueForEnd(l.getDate());const s=c+r;if(s<=0)return void alert("根據您的規則，計算出的有效總月份為0，無法計算費用。");const i=n/s,u=Math.round(i*c),m=Math.round(n-u);const g=a-1911,p=d-1911;document.getElementById("periodSummary").innerText=`有效月數：${g}年 (${c.toFixed(1)}個月) / ${p}年 (${r.toFixed(1)}個月)`,document.getElementById("resultYear1").innerHTML=`<h3>${g}年應分攤保費</h3><p>NT$ ${u}</p>`,document.getElementById("resultYear2").innerHTML=`<h3>${p}年應分攤保費</h3><p>NT$ ${m}</p>`,document.getElementById("result").className="result-visible"}catch(e){console.error("計算過程中發生預期外的錯誤:",e),alert("計算失敗！請檢查輸入的日期是否有效，或按 F12 查看錯誤日誌。")}}

// ===================================================================
// III. 銷項發票計算機
// ===================================================================
const twoPartBody = document.getElementById('invoice-table-body-two-part');
const threePartBody = document.getElementById('invoice-table-body-three-part');
const invoiceTypeSelect = document.getElementById('invoice-type-select');
function switchInvoiceType() { /* ... */ }
function getCurrentInvoiceBody() { /* ... */ }
function addInvoiceRow() { /* ... */ }
function updateInvoiceSummary() { /* ... */ }
document.getElementById('invoice-section').addEventListener('input', function(e) { /* ... */ });
document.getElementById('invoice-section').addEventListener('keydown', function(e) { /* ... */ });
function resetInvoiceForm() { /* ... */ }
// (為簡潔，省略內部程式碼)
function switchInvoiceType(){const e=invoiceTypeSelect.value;"two-part"===e?(document.getElementById("invoice-table-two-part").classList.remove("hidden"),document.getElementById("invoice-summary-two-part").classList.remove("hidden"),document.getElementById("invoice-table-three-part").classList.add("hidden"),document.getElementById("invoice-summary-three-part").classList.add("hidden")):(document.getElementById("invoice-table-three-part").classList.remove("hidden"),document.getElementById("invoice-summary-three-part").classList.remove("hidden"),document.getElementById("invoice-table-two-part").classList.add("hidden"),document.getElementById("invoice-summary-two-part").classList.add("hidden")),resetInvoiceForm()}
function getCurrentInvoiceBody(){return"two-part"===invoiceTypeSelect.value?twoPartBody:threePartBody}
function addInvoiceRow(){const e=getCurrentInvoiceBody(),t=e.insertRow(),n=e.rows.length-1;"two-part"===invoiceTypeSelect.value?t.innerHTML=`\n            <td>${n}</td>\n            <td><input type="number" class="total-2" placeholder="總計金額"></td>\n            <td><input type="number" class="sales-2" readonly></td>\n            <td><input type="number" class="tax-2" readonly></td>`:t.innerHTML=`\n            <td>${n}</td>\n            <td><input type="number" class="sales-3" placeholder="未稅銷售額"></td>\n            <td><input type="number" class="tax-3"></td>\n            <td><input type="number" class="total-3" readonly></td>\n            <td><input type="text" class="tax-id-3" maxlength="8"></td>\n            <td><input type="text" class="company-3" readonly></td>`,t.querySelector("input:not([readonly])").focus()}
function updateInvoiceSummary(){let e=0,t=0,n=0,o=0;if("two-part"===invoiceTypeSelect.value){const l=twoPartBody.rows;o=l.length;for(const a of l)e+=parseFloat(a.querySelector(".total-2").value)||0,t+=parseFloat(a.querySelector(".sales-2").value)||0,n+=parseFloat(a.querySelector(".tax-2").value)||0;document.getElementById("invoice-count-two").textContent=o,document.getElementById("total-sum-two").textContent=e.toLocaleString(),document.getElementById("sales-sum-two").textContent=t.toLocaleString(),document.getElementById("tax-sum-two").textContent=n.toLocaleString()}else{const l=threePartBody.rows;o=l.length;for(const a of l)t+=parseFloat(a.querySelector(".sales-3").value)||0,n+=parseFloat(a.querySelector(".tax-3").value)||0,e+=parseFloat(a.querySelector(".total-3").value)||0;document.getElementById("invoice-count-three").textContent=o,document.getElementById("sales-sum-three").textContent=t.toLocaleString(),document.getElementById("tax-sum-three").textContent=n.toLocaleString(),document.getElementById("total-sum-three").textContent=e.toLocaleString()}}

// *** 核心升級：雙重查詢引擎 ***
async function lookupCompanyByTaxId(taxId, companyInput) {
    if (!/^\d{8}$/.test(taxId)) {
        companyInput.value = '統編格式錯誤';
        return;
    }
    companyInput.value = '查詢中(1/2)...';
    
    // --- 第一道查詢：稅籍登記 (最即時) ---
    try {
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const taxApiUrl = `https://data.gov.tw/api/v2/rest/dataset/9D17AE0D-09B5-4732-A8F4-81ADED04B679?&\$filter=Business_Accounting_NO eq ${taxId}`;
        const response = await fetch(proxyUrl + encodeURIComponent(taxApiUrl));
        if (response.ok) {
            const data = await response.json();
            const results = JSON.parse(data.contents);
            if (results && results.length > 0 && results[0]['營業人名稱']) {
                companyInput.value = results[0]['營業人名稱'];
                return; // 成功查詢，結束
            }
        }
    } catch (error) {
        console.error('Tax API Error:', error);
        // 第一道查詢失敗，沒關係，繼續往下走到備用查詢
    }

    // --- 第二道查詢：g0v API (備用) ---
    companyInput.value = '查詢中(2/2)...';
    try {
        const g0vApiUrl = `https://company.g0v.ronny.tw/api/show/${taxId}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(g0vApiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data && data.data) {
                companyInput.value = data.data['公司名稱'];
                return; // 成功查詢，結束
            }
        }
        // 如果兩道查詢都失敗
        companyInput.value = '查無資料';

    } catch (error) {
        console.error('g0v API Error:', error);
        companyInput.value = '查詢失敗';
    }
}

document.getElementById('invoice-section').addEventListener('input', function(e) { /* ... */ });
document.getElementById('invoice-section').addEventListener('keydown', function(e) { /* ... */ });
function resetInvoiceForm() { /* ... */ }
// (為簡潔，省略內部程式碼)
document.getElementById("invoice-section").addEventListener("input",function(e){const t=e.target.closest("tr");if(t){if(e.target.classList.contains("total-2")){const n=parseFloat(e.target.value)||0,o=Math.round(n/1.05*.05);t.querySelector(".sales-2").value=n-o,t.querySelector(".tax-2").value=o}if(e.target.classList.contains("sales-3")){const n=parseFloat(e.target.value)||0,o=Math.round(.05*n);t.querySelector(".tax-3").value=o,t.querySelector(".total-3").value=n+o}if(e.target.classList.contains("tax-3")){const n=parseFloat(t.querySelector(".sales-3").value)||0;t.querySelector(".total-3").value=n+(parseFloat(e.target.value)||0)}if(e.target.classList.contains("tax-id-3")){const n=e.target.value;t.querySelector(".company-3");8===n.length?lookupCompanyByTaxId(n,t.querySelector(".company-3")):t.querySelector(".company-3").value=""}updateInvoiceSummary()}});
document.getElementById("invoice-section").addEventListener("keydown",function(e){if("Enter"===e.key){const t=e.target,n=t.closest("tr");if(n){e.preventDefault();const o=Array.from(n.querySelectorAll("input:not([readonly])")),l=o.indexOf(t);l===o.length-1?addInvoiceRow():l>-1&&o[l+1].focus()}}});
function resetInvoiceForm(){twoPartBody.innerHTML="",threePartBody.innerHTML="",getCurrentInvoiceBody().rows.length===0&&addInvoiceRow(),updateInvoiceSummary()}