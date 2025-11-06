#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自動修復 Bug 的腳本
"""

import re

def fix_index_html():
    """修復 index.html"""
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # 修復拼寫錯誤
    content = content.replace('<title>calculater</title>', '<title>calculator</title>')
    content = content.replace('content="calculater"', 'content="calculator"')

    # 簡化 navigateTo 函式
    old_navigate = '''function navigateTo(url) {
            requestAnimationFrame(() => {
                window.location.href = url;
            });
        }'''
    new_navigate = '''function navigateTo(url) {
            window.location.href = url;
        }'''
    content = content.replace(old_navigate, new_navigate)

    # 簡化動畫邏輯
    old_animation = '''if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.classList.add('with-animation');
            });
        } else {
            document.body.classList.add('with-animation');
        }'''
    new_animation = '''document.body.classList.add('with-animation');'''
    content = content.replace(old_animation, new_animation)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print("✓ index.html 修復完成")

def fix_script_js():
    """修復 script.js"""
    with open('script.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 在開頭插入配置常數
    config_const = '''// ===================================================================
// 配置常數 - 所有業務邏輯的數值都定義在這裡
// ===================================================================

const CONFIG = {
    // 日期轉換
    ROC_TO_AD_OFFSET: 1911,      // 民國年轉西元年的偏差值

    // 勞健保計算比例
    LABOR_INSURANCE_RATE: 0.7,   // 勞保費率 70%
    HEALTH_INSURANCE_RATE: 0.6,  // 健保費率 60%

    // 營業稅
    VAT_RATE: 0.05,              // 營業稅率 5%
    VAT_MULTIPLIER: 1.05,        // 含稅乘數 (1 + 5%)

    // 驗證限制
    MIN_ROC_YEAR: 1,             // 最小民國年（民國元年）
    MAX_ROC_YEAR: 200,           // 最大民國年（西元 2111 年）
};

'''

    lines.insert(0, config_const)

    # 修復勞健保比例
    for i in range(len(lines)):
        if 'laborTotal * 0.7' in lines[i]:
            lines[i] = lines[i].replace('laborTotal * 0.7', 'laborTotal * CONFIG.LABOR_INSURANCE_RATE')
        if 'healthTotal * 0.6' in lines[i]:
            lines[i] = lines[i].replace('healthTotal * 0.6', 'healthTotal * CONFIG.HEALTH_INSURANCE_RATE')

        # 修復民國年轉換
        if ' + 1911' in lines[i]:
            lines[i] = lines[i].replace(' + 1911', ' + CONFIG.ROC_TO_AD_OFFSET')
        if ' - 1911' in lines[i]:
            lines[i] = lines[i].replace(' - 1911', ' - CONFIG.ROC_TO_AD_OFFSET')

        # 修復營業稅
        if 'total / 1.05' in lines[i]:
            lines[i] = lines[i].replace('total / 1.05', 'total / CONFIG.VAT_MULTIPLIER')
        if 'sales * 0.05' in lines[i]:
            lines[i] = lines[i].replace('sales * 0.05', 'sales * CONFIG.VAT_RATE')

        # 修復 Yoda 條件
        if '"two-part" === invoiceTypeSelect.value' in lines[i]:
            lines[i] = lines[i].replace('"two-part" === invoiceTypeSelect.value', 'invoiceTypeSelect.value === "two-part"')

        # 修復閏年計算錯誤（第190行附近）
        if 'days: 365, daysForCalc: 365' in lines[i] and 'for (let year' in lines[i-1]:
            lines[i] = lines[i].replace(
                '{ minguoYear: year - CONFIG.ROC_TO_AD_OFFSET, days: 365, daysForCalc: 365 }',
                '{ minguoYear: year - CONFIG.ROC_TO_AD_OFFSET, days: getDaysInYear(year), daysForCalc: getDaysInYear(year) }'
            )

    # 修復民國年驗證
    for i in range(len(lines)):
        if 'if (year && month && day) {' in lines[i]:
            # 在下一行插入驗證邏輯
            indent = '        '
            validation = f'''{indent}const rocYear = parseInt(year, 10);

{indent}// 驗證民國年範圍
{indent}if (rocYear < CONFIG.MIN_ROC_YEAR || rocYear > CONFIG.MAX_ROC_YEAR) {{
{indent}    picker.value = '';
{indent}    return;
{indent}}}

{indent}const adYear = rocYear + CONFIG.ROC_TO_AD_OFFSET;
'''
            # 移除舊的 adYear 定義行
            if i+1 < len(lines) and 'const adYear' in lines[i+1]:
                lines[i+1] = validation
            break

    # 移除無用的 readonly 設置（第358-359行附近）
    for i in range(len(lines)):
        if 'const allTaxInputs = document.querySelectorAll' in lines[i] and 'resetInvoiceForm' in ''.join(lines[max(0,i-20):i]):
            # 標記為註解
            if i+1 < len(lines):
                lines[i] = '    // ' + lines[i].lstrip()
                lines[i+1] = '    // ' + lines[i+1].lstrip()

    # 修復 company-3 readonly (第326行附近)
    for i in range(len(lines)):
        if 'company-3" readonly' in lines[i]:
            lines[i] = lines[i].replace(' readonly', '')

    with open('script.js', 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print("✓ script.js 修復完成")

def main():
    print("開始自動修復...")
    print()

    try:
        fix_index_html()
        fix_script_js()
        print()
        print("="*50)
        print("所有修復已完成！")
        print("="*50)
        print()
        print("請檢查以下文件：")
        print("- index.html")
        print("- script.js")
        print()
        print("建議測試：")
        print("1. 保險費計算（跨閏年）")
        print("2. 勞健保計算")
        print("3. 發票營業稅計算")
        print("4. 統編查詢失敗後手動輸入")
        print("5. 民國年超出範圍測試")
    except Exception as e:
        print(f"錯誤：{e}")
        raise

if __name__ == '__main__':
    main()
