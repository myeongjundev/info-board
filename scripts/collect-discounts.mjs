// 추적 중인 게임의 한국 가격을 확인하고, 현재 할인 중인 것만 별도 스냅샷으로 남긴다.
// 비공식 Steam Store appdetails 경로를 쓰므로 CLAUDE.md 5-1과 DECISIONS.md를 먼저 본다.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GAMES } from '../src/source/definition.js';
import {
  DISCOUNT_SOURCE, buildDiscountUrl, parseDiscountResponse,
} from '../src/source/discounts.js';
import { PERIOD_SOURCE } from '../src/source/discountPeriod.js';
import { withPeriods } from './lib/discountPeriods.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'data/discounts.json');
const GAP_MS = 220;
const MIN_SUCCESS_RATIO = 0.8;
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function fetchOne(game) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(buildDiscountUrl(game.appid), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseDiscountResponse(await response.json(), game, new Date());
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  if (process.argv[2]) {
    console.error(`거부 — 인자를 받지 않는다: ${process.argv[2]}`);
    return 1;
  }

  const startedAt = new Date().toISOString();
  const discounts = [];
  const failures = [];
  const counts = { checked: 0, discount: 0, regular: 0, free: 0, unpriced: 0, failed: 0 };

  console.log(`한국 가격 확인  ${GAMES.length}개 · ${DISCOUNT_SOURCE.warning}`);
  for (const game of GAMES) {
    try {
      const result = await fetchOne(game);
      counts.checked += 1;
      counts[result.kind] += 1;
      if (result.reading) {
        discounts.push(result.reading);
        console.log(`  -${String(result.reading.discountPercent).padStart(2)}%  ${game.name}`);
      }
    } catch (error) {
      counts.failed += 1;
      failures.push({ appid: game.appid, name: game.name, reason: error.message });
      console.error(`  실패  ${game.name} — ${error.message}`);
    }
    await sleep(GAP_MS);
  }

  if (counts.checked / GAMES.length < MIN_SUCCESS_RATIO) {
    console.error(`성공 ${counts.checked}/${GAMES.length} — 80% 미만이라 기존 스냅샷을 덮지 않는다.`);
    return 1;
  }

  // 가격을 다 모은 뒤에 기간을 한 번에 붙인다. 여기서 실패해도 가격은 그대로 남는다.
  const period = await withPeriods(discounts, { log: (line) => console.log(line) });
  counts.periodKnown = period.counts.known;
  counts.periodEndsAtKnown = period.counts.endsAtKnown;
  counts.periodDisagreed = period.counts.disagreed;
  discounts.length = 0;
  discounts.push(...period.readings);

  discounts.sort((a, b) => b.discountPercent - a.discountPercent || a.finalMinor - b.finalMinor || a.appid - b.appid);
  const snapshot = {
    schemaVersion: 1,
    scope: `추적 게임 ${GAMES.length}개 가운데 한국 상점에서 현재 할인 중인 게임`,
    source: DISCOUNT_SOURCE,
    startedAt,
    completedAt: new Date().toISOString(),
    counts,
    discounts,
    failures,
    periodSource: PERIOD_SOURCE,
    periodFailures: period.failures,
  };

  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`할인 ${discounts.length}개 · 종료 시각 ${period.counts.endsAtKnown}개 · 정가 ${counts.regular}개 · 무료 ${counts.free}개 · 실패 ${counts.failed}개`);
  return 0;
}

process.exitCode = await main();
