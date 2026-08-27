// Epic Games Store의 현재 기간 한정 무료 배포만 별도 스냅샷으로 남긴다.
// 문서화되지 않은 공개 프로모션 응답을 쓰므로 CLAUDE.md 5-2와 DECISIONS.md를 먼저 본다.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EPIC_FREE_PAGE, EPIC_FREE_SOURCE, EPIC_FREE_URL, parseEpicFreeResponse,
} from '../src/source/epicFree.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'data/epic-free.json');

async function main() {
  if (process.argv[2]) {
    console.error(`거부 — 인자를 받지 않는다: ${process.argv[2]}`);
    return 1;
  }

  const startedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(EPIC_FREE_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const now = new Date();
    const giveaways = parseEpicFreeResponse(await response.json(), now);
    const snapshot = {
      schemaVersion: 1,
      scope: '한국 Epic Games Store의 현재 기간 한정 무료 배포',
      source: { ...EPIC_FREE_SOURCE, pageUrl: EPIC_FREE_PAGE, responseUrl: EPIC_FREE_URL },
      startedAt,
      completedAt: now.toISOString(),
      giveaways,
    };
    await mkdir(dirname(FILE), { recursive: true });
    await writeFile(FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(`Epic 기간 한정 무료 배포 ${giveaways.length}개`);
    return 0;
  } catch (error) {
    console.error(`Epic 무료 배포 수집 실패 — 기존 스냅샷을 덮지 않는다: ${error.message}`);
    return 1;
  } finally {
    clearTimeout(timer);
  }
}

process.exitCode = await main();
