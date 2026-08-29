// 할인 기간을 붙이는 한 걸음. 두 수집기(추적 목록 · 인기 Top 100)가 같이 쓴다.
//
// 부르는 횟수가 적다. appid 100개를 한 번에 묻기 때문에 할인이 몇 개든
// **요청 한두 번**이면 끝난다. 가격을 하나씩 묻는 기존 200번에 얹는 값이 2번이다.
//
// 여기서 나는 실패는 **가격 수집을 무르지 않는다.** 기간은 있으면 좋은 것이고
// 가격은 이 파일의 본체다. 기간을 못 받으면 그 줄에 `periodKnown: false` 가 남고
// 화면은 종료 시각 자리에 아무 말도 하지 않는다 — 모르는 것을 모른다고 두는 쪽이,
// 없는 시각을 지어내는 것보다 언제나 낫다.

import {
  attachPeriod, buildPeriodUrl, parsePeriodResponse, PERIOD_BATCH,
} from '../../src/source/discountPeriod.js';

const TIMEOUT_MS = 12_000;
const GAP_MS = 300;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 할인 Reading 목록에 종료 시각·종류를 붙여 새 목록으로 돌려준다.
 *
 * @returns {{ readings: object[], counts: object, failures: object[] }}
 */
export async function withPeriods(readings, { log = () => {} } = {}) {
  const counts = { asked: readings.length, known: 0, endsAtKnown: 0, disagreed: 0, batchFailed: 0 };
  const failures = [];
  if (readings.length === 0) return { readings, counts, failures };

  const periods = new Map();
  for (let i = 0; i < readings.length; i += PERIOD_BATCH) {
    const slice = readings.slice(i, i + PERIOD_BATCH).map((r) => r.appid);
    try {
      for (const [appid, period] of parsePeriodResponse(await getJson(buildPeriodUrl(slice)), new Date())) {
        periods.set(appid, period);
      }
    } catch (error) {
      counts.batchFailed += 1;
      failures.push({ appids: slice.length, reason: error.message });
      log(`  기간 조회 실패 — ${error.message} (가격은 그대로 남긴다)`);
    }
    if (i + PERIOD_BATCH < readings.length) await sleep(GAP_MS);
  }

  const next = readings.map((reading) => attachPeriod(reading, periods.get(reading.appid)));
  for (const reading of next) {
    if (reading.periodKnown) counts.known += 1;
    if (reading.discountEndsAt) counts.endsAtKnown += 1;
    if (reading.periodPercentDisagrees !== undefined) {
      counts.disagreed += 1;
      log(`  할인율 불일치  ${reading.name} — 가격 ${reading.discountPercent}% · 기간 ${reading.periodPercentDisagrees}%`);
    }
  }
  return { readings: next, counts, failures };
}
