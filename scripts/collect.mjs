// 하루 한 번 값을 재서 data/records.json 에 남긴다.
//
// GitHub Actions 가 이 스크립트를 돌리고, 파일이 바뀌었을 때만 커밋한다.
// 같은 날 몇 번을 돌려도 기록이 늘지 않는다 (upsertRecord 가 막는다).
//
// 사용법:
//   node scripts/collect.mjs              어제(UTC) 값을 잰다
//   node scripts/collect.mjs 2026-08-25   그 날짜를 잰다 (빈 날 메우기)
//
// process.exit() 을 쓰지 않는다. 열린 소켓을 끊으면서 libuv 가 죽어 종료 코드가
// 엉키고, 그러면 "바뀐 게 없는 날" 에 CI 가 빨간불이 된다. exitCode 만 세우고
// 자연스럽게 끝낸다.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SOURCE, latestSettledDate, assertSettled } from '../src/source/definition.js';
import { fetchReading, FetchFault } from '../src/source/fetchReading.js';
import { loadRecords, upsertRecord, compare, serialize } from '../src/state/records.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'data/records.json');

async function main() {
  const date = process.argv[2] ?? latestSettledDate();

  console.log(`대상 날짜   ${date} (${SOURCE.timezone} 기준)`);
  console.log(`출처        ${SOURCE.label}`);

  try {
    assertSettled(date);
  } catch (err) {
    console.error(`거부 — ${err.message}`);
    return 1;
  }

  let reading;
  try {
    reading = await fetchReading(date);
  } catch (err) {
    if (!(err instanceof FetchFault)) throw err;
    // 실패했을 때 0 을 저장하지 않는다. 값이 없는 것과 값이 0 인 것은 다르다.
    console.error(`실패 [${err.fault}] ${err.message}`);
    console.error('기록을 남기지 않고 끝낸다. 다음 실행에서 다시 시도한다.');
    return 1;
  }

  console.log(`관측값      ${reading.value.toLocaleString()} ${reading.unit}`);
  console.log(`조회 시각   ${reading.fetchedAt}`);

  let raw = null;
  try {
    raw = await readFile(FILE, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    console.log('기록 파일이 없다. 새로 만든다.');
  }

  const { records: existing, quarantined } = loadRecords(raw);
  if (quarantined.length) {
    console.warn(`격리한 항목 ${quarantined.length}건 — 성한 기록 ${existing.length}건은 살린다`);
    for (const q of quarantined) console.warn(`  · ${q.reason}`);
  }

  const { records, changed, kind } = upsertRecord(existing, reading);

  if (!changed) {
    console.log(`${date} 기록이 이미 같은 값으로 있다. 파일을 건드리지 않는다.`);
    return 0;
  }

  if (kind === 'revised') {
    const r = records.find((x) => x.date === date);
    console.log(`원자료가 정정됐다: ${r.revisedFrom.toLocaleString()} → ${r.value.toLocaleString()} ${r.unit}`);
  }

  const diff = compare(records, date);
  if (diff) {
    const sign = diff.delta > 0 ? '+' : '';
    console.log(`이전 기록 대비 ${sign}${diff.delta.toLocaleString()} ${diff.unit} (${diff.previous.date} → ${diff.current.date})`);
  } else {
    console.log('비교할 이전 기록이 없다. 변화값을 만들지 않는다.');
  }

  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, serialize(records, {
    source: {
      id: SOURCE.id,
      label: SOURCE.label,
      publisher: SOURCE.publisher,
      docsUrl: SOURCE.docsUrl,
      unit: SOURCE.unit,
      timezone: SOURCE.timezone,
    },
  }), 'utf8');

  console.log(`${kind === 'added' ? '기록 추가' : '기록 갱신'} — 총 ${records.length}건`);
  return 0;
}

process.exitCode = await main();
