import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDiscountUrl } from '../src/source/discounts.js';
import {
  MOST_PLAYED_URL, parseMostPlayedHtml, parsePopularPriceResponse,
} from '../src/source/steamPromotions.js';
import { assertDescriptorsPresent } from '../src/source/contentDescriptors.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'data/popular-discounts.json');
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function get(url, type) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: type === 'json' ? 'application/json' : 'text/html' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return type === 'json' ? response.json() : response.text();
  } finally { clearTimeout(timer); }
}

async function main() {
  if (process.argv[2]) return 1;
  const startedAt = new Date().toISOString();
  const chart = parseMostPlayedHtml(await get(MOST_PLAYED_URL, 'html'));
  const counts = { ranked: chart.length, checked: 0, discount: 0, regular: 0, permanent_free: 0, unpriced: 0, failed: 0 };
  const discounts = [];
  const failures = [];
  const descriptorChecks = [];

  for (const row of chart) {
    try {
      const result = parsePopularPriceResponse(await get(buildDiscountUrl(row.appid), 'json'), row, new Date());
      counts.checked += 1;
      counts[result.kind] += 1;
      descriptorChecks.push({ descriptorAvailable: result.descriptorAvailable });
      if (result.reading) discounts.push(result.reading);
    } catch (error) {
      counts.failed += 1;
      failures.push({ rank: row.rank, appid: row.appid, reason: error.message });
    }
    await sleep(220);
  }
  if (counts.checked < 80) throw new Error(`가격 성공 ${counts.checked}/100 — 기존 스냅샷을 덮지 않는다`);
  assertDescriptorsPresent(descriptorChecks, 'Steam 인기 Top 100 appdetails');
  discounts.sort((a, b) => a.rank - b.rank);
  const snapshot = {
    schemaVersion: 1,
    scope: '수집 당시 Steam 동시접속 상위 100개 가운데 한국에서 할인 중인 게임',
    source: { chartUrl: MOST_PLAYED_URL, priceSource: 'Steam Store 비공식 appdetails', country: 'KR' },
    startedAt, completedAt: new Date().toISOString(), counts, discounts, failures,
  };
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`인기 Top 100 가격 ${counts.checked}개 확인 · 할인 ${discounts.length}개 · 실패 ${counts.failed}개`);
  return 0;
}

main().then((code) => { process.exitCode = code; }).catch((error) => {
  console.error(`인기 Top 100 할인 수집 실패 — ${error.message}`);
  process.exitCode = 1;
});
