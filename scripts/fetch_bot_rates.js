#!/usr/bin/env node
/**
 * 台灣銀行牌告匯率擷取器
 *
 * 台銀 rate.bot.com.tw 全站採用 Akamai Bot Manager 防護（sec_cpt cookie），
 * 任何一般 HTTP 請求都只會拿到 "Challenge Validation" 頁面。
 * 唯一可行方式是用真實瀏覽器執行挑戰的 JS proof-of-work。
 *
 * 實測重點：
 *   - 必須使用 channel: 'chromium'（新版 headless），舊的 headless shell 過不了
 *   - 挑戰約需 50 秒才會自動通過，要有耐心
 *   - session 一旦建立，後續請求不再遇到挑戰，可連續抓多天
 *
 * 用法：
 *   node scripts/fetch_bot_rates.js                        # 抓今天
 *   node scripts/fetch_bot_rates.js 2026-09-11             # 抓指定日期
 *   node scripts/fetch_bot_rates.js --backfill 90          # 回補最近 90 天
 *   node scripts/fetch_bot_rates.js --from 2025-01-01 --to 2025-03-31
 *   node scripts/fetch_bot_rates.js --backfill 30 --force  # 覆寫已存在的檔案
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'data', 'rates');
const INDEX_FILE = path.join(OUT_DIR, 'index.json');
const BASE = 'https://rate.bot.com.tw';

// 台銀歷史資料僅保留約 2025 年初之後，更早的日期查不到
const EARLIEST = '2025-01-01';

const CHALLENGE_TIMEOUT_MS = 150000; // 挑戰最長等待（機房 IP 可能比住宅 IP 慢）
const SESSION_RETRIES = 3;

function log(...a) { console.log(...a); }

function todayInTaipei() {
  // GitHub Actions 跑在 UTC，必須換算成台北時間才會拿到正確的「今天」
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const opts = { dates: [], force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') opts.force = true;
    else if (a === '--backfill') opts.backfill = parseInt(argv[++i], 10);
    else if (a === '--from') opts.from = argv[++i];
    else if (a === '--to') opts.to = argv[++i];
    else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) opts.dates.push(a);
    else if (a.startsWith('-')) { console.error('未知參數: ' + a); process.exit(1); }
  }
  return opts;
}

function dateRange(from, to) {
  const out = [];
  const d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(iso); // 跳過週末，台銀不掛牌
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function resolveDates(opts) {
  let dates;
  if (opts.from || opts.to) {
    dates = dateRange(opts.from || EARLIEST, opts.to || todayInTaipei());
  } else if (opts.backfill) {
    const end = new Date(todayInTaipei() + 'T00:00:00Z');
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - opts.backfill + 1);
    dates = dateRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
  } else if (opts.dates.length) {
    dates = opts.dates;
  } else {
    dates = [todayInTaipei()];
  }
  // 過濾掉台銀查不到的過舊日期與未來日期
  const today = todayInTaipei();
  return dates.filter(d => d >= EARLIEST && d <= today);
}

/** 建立一個已通過 Akamai 挑戰的瀏覽器 session */
async function createSession() {
  for (let attempt = 1; attempt <= SESSION_RETRIES; attempt++) {
    const browser = await chromium.launch({
      headless: true,
      channel: 'chromium', // 關鍵：新版 headless，舊 headless shell 過不了挑戰
      args: ['--disable-blink-features=AutomationControlled'],
    });
    const ctx = await browser.newContext({
      locale: 'zh-TW',
      timezoneId: 'Asia/Taipei',
      viewport: { width: 1366, height: 900 },
    });
    const page = await ctx.newPage();

    log('[session] 嘗試 ' + attempt + '/' + SESSION_RETRIES + ' — 開啟 ' + BASE + '/xrt');
    try {
      await page.goto(BASE + '/xrt', { waitUntil: 'domcontentloaded', timeout: 60000 });
      const started = Date.now();
      while (Date.now() - started < CHALLENGE_TIMEOUT_MS) {
        const title = await page.title().catch(() => '');
        if (title && !/Challenge/i.test(title)) {
          log('[session] OK 挑戰通過，耗時 ' + Math.round((Date.now() - started) / 1000) + 's (title: ' + title + ')');
          return { browser, page };
        }
        await page.waitForTimeout(3000);
      }
      log('[session] 挑戰逾時');
    } catch (e) {
      log('[session] 錯誤: ' + e.message);
    }
    await browser.close().catch(() => {});
    if (attempt < SESSION_RETRIES) {
      log('[session] 15 秒後重試...');
      await new Promise(r => setTimeout(r, 15000));
    }
  }
  throw new Error('無法建立通過驗證的 session — Akamai 挑戰未能通過');
}

/** 在已驗證的 session 內抓取並解析指定日期的匯率 */
async function fetchDate(page, date) {
  return await page.evaluate(async (d) => {
    const res = await fetch('https://rate.bot.com.tw/xrt/all/' + d, { credentials: 'include' });
    const html = await res.text();
    if (/Challenge Validation/.test(html)) return { challenged: true };

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rates = [];
    doc.querySelectorAll('table tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 5) return;
      const m = cells[0].textContent.trim().match(/\(([A-Z]{3})\)/);
      if (!m) return;
      const vals = [1, 2, 3, 4].map(i => cells[i].textContent.trim());
      // 四個價格全空代表該列不是有效牌價
      if (vals.every(v => !v || v === '-')) return;
      rates.push([m[1]].concat(vals));
    });

    // 取頁面實際顯示的掛牌日期，用來確認回傳的確實是所查日期
    const dm = doc.body.textContent.match(/(\d{4}\/\d{2}\/\d{2})/);
    return { challenged: false, rates, shownDate: dm ? dm[1].replace(/\//g, '-') : null };
  }, date);
}

/**
 * 解析「本行營業時間牌告匯率」即時頁。
 *
 * /xrt/all/{date} 只收錄已收盤的日期，當天盤中查會回空，
 * 因此今天的資料必須改從這個即時頁取得（欄位結構與歷史頁相同）。
 */
async function fetchLiveBoard(page) {
  await page.goto(BASE + '/xrt', { waitUntil: 'domcontentloaded', timeout: 60000 });
  return await page.evaluate(() => {
    if (/Challenge Validation/.test(document.title)) return { challenged: true };
    const rates = [];
    document.querySelectorAll('table tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 5) return;
      const m = cells[0].textContent.trim().match(/\(([A-Z]{3})\)/);
      if (!m) return;
      const vals = [1, 2, 3, 4].map(i => cells[i].textContent.trim());
      if (vals.every(v => !v || v === '-')) return;
      rates.push([m[1]].concat(vals));
    });
    const txt = document.body.textContent.replace(/\s+/g, ' ');
    const dm = txt.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    const tm = txt.match(/\d{4}\/\d{2}\/\d{2}\s+(\d{2}:\d{2})/);
    return {
      challenged: false,
      rates,
      shownDate: dm ? dm[1] + '-' + dm[2] + '-' + dm[3] : null,
      timeLabel: tm ? tm[1] : null,
    };
  });
}

function writeRates(date, rates, extra) {
  const payload = Object.assign({
    bankName: '台灣銀行',
    date,
    headers: ['幣別', '現金買入', '現金賣出', '即期買入', '即期賣出'],
    rates,
    fetchedAt: new Date().toISOString(),
    source: BASE + '/xrt/all/' + date,
  }, extra || {});
  // 每筆匯率壓成單行，檔案約可縮小一半且仍保持可讀
  const json = JSON.stringify(payload, null, 2)
    .replace(/\[\n\s+("(?:[^"]|\\")*"(?:,\n\s+"(?:[^"]|\\")*")*)\n\s+\]/g,
      (m, inner) => '[' + inner.replace(/,\n\s+/g, ', ') + ']');
  fs.writeFileSync(path.join(OUT_DIR, date + '.json'), json + '\n', 'utf8');
}

function rebuildIndex() {
  const dates = fs.readdirSync(OUT_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map(f => f.slice(0, 10))
    .sort();
  const index = {
    dates,
    latest: dates.length ? dates[dates.length - 1] : null,
    earliest: dates.length ? dates[0] : null,
    count: dates.length,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n', 'utf8');
  return index;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const opts = parseArgs(process.argv.slice(2));
  let targets = resolveDates(opts);

  if (!opts.force) {
    // 今天的牌價盤中會變動，一律重抓；歷史日期已收盤不會變，已存在就略過
    const today = todayInTaipei();
    const before = targets.length;
    targets = targets.filter(d => d === today || !fs.existsSync(path.join(OUT_DIR, d + '.json')));
    const skipped = before - targets.length;
    if (skipped) log('已存在 ' + skipped + ' 天的歷史資料，略過（要覆寫請加 --force）');
  }

  if (!targets.length) {
    log('沒有需要抓取的日期，結束。');
    rebuildIndex();
    return;
  }

  log('準備抓取 ' + targets.length + ' 個日期: ' + targets[0] + ' ~ ' + targets[targets.length - 1] + '\n');

  let session = await createSession();
  let saved = 0, empty = 0, failed = 0;

  try {
    let first = true;
    for (const date of targets) {
      // 回補大量日期時放慢節奏，避免對台銀造成密集請求
      if (!first) await new Promise(r => setTimeout(r, 400));
      first = false;

      let result;
      try {
        result = await fetchDate(session.page, date);
      } catch (e) {
        log('  ' + date + '  例外: ' + e.message);
        failed++;
        continue;
      }

      // session 被 Akamai 作廢時重新建立一次，再重試同一天
      if (result && result.challenged) {
        log('  ' + date + '  session 失效，重新建立...');
        await session.browser.close().catch(() => {});
        session = await createSession();
        try {
          result = await fetchDate(session.page, date);
        } catch (e) {
          log('  ' + date + '  重試失敗: ' + e.message);
          failed++;
          continue;
        }
        if (result && result.challenged) {
          log('  ' + date + '  重試後仍被挑戰，跳過');
          failed++;
          continue;
        }
      }

      // 當天盤中 /xrt/all/ 還沒有資料，改抓即時牌告頁
      let liveTime = null;
      if ((!result.rates || result.rates.length === 0) && date === todayInTaipei()) {
        log('  ' + date + '  歷史頁尚無今日資料，改抓即時牌告頁...');
        try {
          const live = await fetchLiveBoard(session.page);
          if (!live.challenged && live.rates.length && live.shownDate === date) {
            result = live;
            liveTime = live.timeLabel;
          } else if (live.shownDate && live.shownDate !== date) {
            log('  ' + date + '  即時頁掛牌日為 ' + live.shownDate + '，今日尚未開牌');
          }
        } catch (e) {
          log('  ' + date + '  即時頁擷取失敗: ' + e.message);
        }
      }

      if (!result.rates || result.rates.length === 0) {
        log('  ' + date + '  —  查無資料（假日或非營業日）');
        empty++;
        continue;
      }

      // 防呆：若台銀回傳的掛牌日與所查日期不符，不要存錯資料
      if (result.shownDate && result.shownDate !== date) {
        log('  ' + date + '  掛牌日不符（回傳 ' + result.shownDate + '），跳過');
        failed++;
        continue;
      }

      writeRates(date, result.rates, liveTime
        ? { quoteTime: liveTime, source: BASE + '/xrt' }
        : null);
      log('  ' + date + '  OK  ' + result.rates.length + ' 種貨幣' + (liveTime ? '（即時牌告 ' + liveTime + '）' : ''));
      saved++;
    }
  } finally {
    await session.browser.close().catch(() => {});
  }

  const index = rebuildIndex();
  log('\n完成 — 新增 ' + saved + ' 天 / 無資料 ' + empty + ' 天 / 失敗 ' + failed + ' 天');
  log('索引: 共 ' + index.count + ' 天，' + index.earliest + ' ~ ' + index.latest);

  // 只要有抓到任何一天、或確認是假日，就算成功；全部失敗才讓 workflow 紅燈
  if (saved === 0 && empty === 0) process.exit(1);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
