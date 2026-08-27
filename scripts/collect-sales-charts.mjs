import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSalesChartSnapshot, SALES_CHART_URLS } from '../src/source/salesCharts.js';
import { buildReleaseCalendar, RELEASE_CALENDAR_URLS } from '../src/source/releaseCalendar.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'data/sales-charts.json');

async function get(url) {
  const response = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const [kr, global, overview, weekly, recentResponse, upcomingResponse] = await Promise.all([
    get(SALES_CHART_URLS.korea), get(SALES_CHART_URLS.global), get(SALES_CHART_URLS.overview),
    get(SALES_CHART_URLS.weekly),
    fetch(RELEASE_CALENDAR_URLS.recent, { headers: { Accept: 'application/json' } }),
    fetch(RELEASE_CALENDAR_URLS.upcoming, { headers: { Accept: 'application/json' } }),
  ]);
  if (!recentResponse.ok || !upcomingResponse.ok) {
    throw new Error(`출시 캘린더 HTTP ${recentResponse.status}/${upcomingResponse.status}`);
  }
  const now = new Date();
  const snapshot = buildSalesChartSnapshot(kr, global, overview, weekly, now);
  snapshot.source.releaseCalendar = RELEASE_CALENDAR_URLS;
  snapshot.releaseCalendar = buildReleaseCalendar(
    await recentResponse.json(), await upcomingResponse.json(), now,
  );
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`판매 차트 한국 ${snapshot.live.korea.length} · 글로벌 ${snapshot.live.global.length} · 주간 ${snapshot.weekly.items.length} · 이번 달 신작 ${snapshot.releaseCalendar.current.length} · 다음 달 예정 ${snapshot.releaseCalendar.upcoming.length} · 월간 인기 ${snapshot.monthly.items.length}`);
}

main().catch((error) => {
  console.error(`Steam 판매 차트 수집 실패 — 기존 스냅샷을 덮지 않는다: ${error.message}`);
  process.exitCode = 1;
});
