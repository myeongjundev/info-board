// 같은 게임을 하루 중 다른 시각에 재서, 시각이 값을 얼마나 흔드는지 남긴다.
//
// 왜 필요한가.
//
// 동시접속자는 순간값이고, 우리는 매일 10:10 KST (01:10 UTC) 에 한 번 잰다.
// 그 시각은 지역별로 이렇다.
//
//   01:10 UTC  =  한국·일본 아침 10시 · 유럽 새벽 3시 · 미국 동부 전날 저녁 9시
//
// 그래서 우리 숫자는 "이 게임을 몇 명이 하는가" 가 아니라 **"그 순간 접속해 있던
// 사람이 몇 명인가"** 다. 게임마다 주 이용자 지역이 달라 이 시각이 어떤 게임에는
// 한창때이고 어떤 게임에는 바닥이다.
//
// 이 스크립트는 **그 사실을 재서 보여주기 위한 것**이지 하루치 기록이 아니다.
//
//   · data/records.json 을 건드리지 않는다. 카드 4 의 날짜별 기록과 완전히 별개다.
//   · data/timeprobe.json 에 표본을 **덧붙이기만** 한다. 지우거나 덮어쓰지 않는다.
//   · 같은 표본을 연달아 쌓지 않게 20분 안에 다시 돌리면 거절한다.
//
// 사용법:
//   node scripts/probe-hours.mjs
//
// 여러 시각에 돌릴수록 곡선이 촘촘해진다. 한 번도 안 돌린 시각은 영영 모른다 —
// 순간값이라 과거를 되짚을 수 없기 때문이다.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GAMES } from '../src/source/definition.js';
import { fetchReading, FetchFault } from '../src/source/fetchReading.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'data/timeprobe.json');

const GAP_MS = 200;
const MIN_APART_MS = 20 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let file = { schemaVersion: 1, note: '', samples: [] };
  try {
    file = JSON.parse(await readFile(FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    console.log('표본 파일이 없다. 새로 만든다.');
  }

  const last = file.samples.at(-1);
  if (last) {
    const apart = Date.now() - Date.parse(last.at);
    if (apart < MIN_APART_MS) {
      console.error(`거부 — 마지막 표본이 ${Math.round(apart / 60000)}분 전이다.`);
      console.error('시각이 값을 흔드는 것을 보려면 표본이 서로 떨어져 있어야 한다.');
      return 1;
    }
  }

  const at = new Date().toISOString();
  console.log(`지금 (UTC)  ${at}`);
  console.log(`재는 게임   ${GAMES.length}개\n`);

  const values = {};
  let failed = 0;

  for (const g of GAMES) {
    try {
      const reading = await fetchReading(g.appid);
      // 실패는 넣지 않는다. 0 으로 채우지 않는다.
      values[g.appid] = reading.value;
    } catch (err) {
      if (!(err instanceof FetchFault)) throw err;
      failed += 1;
      console.error(`  실패  ${g.name} — [${err.fault}]`);
    }
    await sleep(GAP_MS);
  }

  const got = Object.keys(values).length;
  if (got === 0) {
    console.error('하나도 못 가져왔다. 표본을 남기지 않는다.');
    return 1;
  }

  file.schemaVersion = 1;
  file.note = '하루 중 여러 시각에 잰 표본. 날짜별 기록(data/records.json)과 별개이며 카드 4 와 무관하다.';
  file.samples.push({ at, values });

  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(file, null, 2)}\n`, 'utf8');

  console.log(`\n표본 ${got}개 값 추가${failed ? ` · 실패 ${failed}개는 뺐다` : ''} — 총 표본 ${file.samples.length}회`);
  for (const s of file.samples) console.log(`  ${s.at}  (${Object.keys(s.values).length}개)`);
  return 0;
}

process.exitCode = await main();
