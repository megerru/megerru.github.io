function autoTab(currentElement, nextElementId) { if (currentElement.value.length === currentElement.maxLength) { document.getElementById(nextElementId).focus(); } }

function showCalculator() {
    document.getElementById('welcome-section').classList.add('hidden');
    document.getElementById('calculator-section').classList.remove('hidden');
}

// *** 新增功能：顯示歡迎畫面並清空表單 ***
function showWelcome() {
    document.getElementById('calculator-section').classList.add('hidden');
    document.getElementById('welcome-section').classList.remove('hidden');
    resetForm(); // 返回時自動呼叫重置函式
}

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

function resetForm() {
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

function getProratedMonthValueForStart(day) {
    if (day >= 1 && day <= 10) return 1;
    if (day >= 11 && day <= 20) return 0.5;
    return 0;
}
function getProratedMonthValueForEnd(day) {
    if (day >= 21) return 1;
    if (day >= 11) return 0.5;
    return 0;
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
        const firstAdYear = startDate.getFullYear();
        const secondAdYear = endDate.getFullYear();
        if (firstAdYear === secondAdYear || secondAdYear - firstAdYear > 1) {
            alert("目前僅支援橫跨兩個連續年度的計算。");
            return;
        }
        let monthsInFirstYear = 0;
        monthsInFirstYear += getProratedMonthValueForStart(startDate.getDate());
        monthsInFirstYear += (11 - startDate.getMonth());
        let monthsInSecondYear = 0;
        monthsInSecondYear += endDate.getMonth();
        monthsInSecondYear += getProratedMonthValueForEnd(endDate.getDate());
        const totalEffectiveMonths = monthsInFirstYear + monthsInSecondYear;
        if (totalEffectiveMonths <= 0) {
            alert("根據您的規則，計算出的有效總月份為0，無法計算費用。");
            return;
        }
        const premiumPerEffectiveMonth = totalPremium / totalEffectiveMonths;
        const premiumForFirstYear = Math.round(premiumPerEffectiveMonth * monthsInFirstYear);
        const premiumForSecondYear = Math.round(totalPremium - premiumForFirstYear);
        const firstMinguoYear = firstAdYear - 1911;
        const secondMinguoYear = secondAdYear - 1911;
        document.getElementById('periodSummary').innerText = `有效月數：${firstMinguoYear}年 (${monthsInFirstYear.toFixed(1)}個月) / ${secondMinguoYear}年 (${monthsInSecondYear.toFixed(1)}個月)`;
        document.getElementById('resultYear1').innerHTML = `<h3>${firstMinguoYear}年應分攤保費</h3><p>NT$ ${premiumForFirstYear}</p>`;
        document.getElementById('resultYear2').innerHTML = `<h3>${secondMinguoYear}年應分攤保費</h3><p>NT$ ${premiumForSecondYear}</p>`;
        document.getElementById('result').className = 'result-visible';
    } catch (error) {
        console.error("計算過程中發生預期外的錯誤:", error);
        alert("計算失敗！請檢查輸入的日期是否有效，或按 F12 查看錯誤日誌。");
    }
}