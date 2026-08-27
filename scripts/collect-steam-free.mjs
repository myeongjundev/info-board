import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FREE_TO_KEEP_URL, parseDiscountEndFromHtml, parseFreeWeekendStorePage,
  parseSteamFreeSearchResults,
} from '../src/source/steamPromotions.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'data/steam-free.json');

async function main() {
  const response = await fetch(FREE_TO_KEEP_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const now = new Date();
  const { giveaways, weekendCandidates } = parseSteamFreeSearchResults(await response.json(), now);
  for (const item of giveaways) {
    try {
      const storeResponse = await fetch(item.storeUrl);
      if (storeResponse.ok) item.endAt = parseDiscountEndFromHtml(await storeResponse.text());
    } catch {
      // 종료 시각 하나를 못 읽었다고 무료 소장 자체를 지우지는 않는다.
    }
  }
  const freeWeekends = [];
  for (const candidate of weekendCandidates) {
    try {
      const storeResponse = await fetch(candidate.storeUrl);
      if (!storeResponse.ok) continue;
      const reading = parseFreeWeekendStorePage(await storeResponse.text(), candidate);
      if (reading) freeWeekends.push(reading);
    } catch {
      // 후보 하나의 확인 실패가 전체 무료 이벤트 스냅샷을 막지는 않는다.
    }
  }
  const snapshot = {
    schemaVersion: 2,
    scope: '한국 Steam 상점의 상시 무료 제외 무료 소장 및 무료 플레이 주말 게임',
    source: { label: 'Steam Store 검색 결과', url: FREE_TO_KEEP_URL, warning: '문서화된 공개 API가 아닌 상점 검색 응답이다.' },
    completedAt: now.toISOString(), giveaways, freeWeekends,
  };
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Steam 무료 소장 ${giveaways.length}개 · 무료 플레이 주말 ${freeWeekends.length}개`);
}

main().catch((error) => {
  console.error(`Steam 무료 이벤트 수집 실패 — 기존 스냅샷을 덮지 않는다: ${error.message}`);
  process.exitCode = 1;
});
