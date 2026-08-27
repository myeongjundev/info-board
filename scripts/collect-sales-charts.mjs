import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSalesChartSnapshot, SALES_CHART_URLS } from '../src/source/salesCharts.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'data/sales-charts.json');

async function get(url) {
  const response = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const [kr, global, overview] = await Promise.all([
    get(SALES_CHART_URLS.korea), get(SALES_CHART_URLS.global), get(SALES_CHART_URLS.overview),
  ]);
  const snapshot = buildSalesChartSnapshot(kr, global, overview, new Date());
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`판매 차트 한국 ${snapshot.live.korea.length} · 글로벌 ${snapshot.live.global.length} · 주간 ${snapshot.weekly.items.length} · 월간 신작 ${snapshot.monthly.items.length}`);
}

main().catch((error) => {
  console.error(`Steam 판매 차트 수집 실패 — 기존 스냅샷을 덮지 않는다: ${error.message}`);
  process.exitCode = 1;
});
