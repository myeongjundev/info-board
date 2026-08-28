// 하루 한 번 값을 재서 data/records.json 에 남긴다.
//
// GitHub Actions 가 이 스크립트를 돌리고, 파일이 바뀌었을 때만 커밋한다.
// 같은 날 다시 돌면 저장된 게임은 외부 호출 전에 제외한다. replay의 same-day
// update 계약은 지키되, live 순간값이 늦은 실행으로 덮이지 않게 하는 경계다.
//
// 사용법:
//   node scripts/collect.mjs         오늘(KST) 값을 잰다
//
// 날짜 인자를 받지 않는다. 동시접속자는 부르는 순간의 값이라 과거를 잴 수 없다.
//
// process.exit() 을 쓰지 않는다. 열린 소켓을 끊으면서 libuv 가 죽어 종료 코드가
// 엉키고, 그러면 "바뀐 게 없는 날" 에 CI 가 빨간불이 된다. exitCode 만 세우고
// 자연스럽게 끝낸다.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SOURCE, GAMES, HERO_APPID, todayLocal, assertMeasurableNow, gameOf } from '../src/source/definition.js';
import { fetchReading, FetchFault } from '../src/source/fetchReading.js';
import { loadRecords, upsertRecord, compare, serialize, keepDate } from '../src/state/records.js';
import { pendingGamesForDate } from '../src/state/liveCollection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'data/records.json');

/** 출처가 한꺼번에 맞지 않게 조금 띄워 부른다. */
const GAP_MS = 200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 날짜 인자를 조용히 무시하지 않는다.
  //
  // 앞선 소재에서는 `collect.mjs 2026-08-25` 로 빈 날을 메울 수 있었다. 습관이
  // 남아 있으면 같은 명령을 치고는 그 날짜가 채워졌다고 믿게 된다. 실제로는
  // 오늘 값이 들어간다 — 값은 멀쩡한데 사람이 잘못 안다. 그래서 막고 이유를 말한다.
  if (process.argv[2]) {
    console.error(`거부 — 날짜 인자를 받지 않는다: ${process.argv[2]}`);
    console.error('동시접속자는 부르는 순간의 값이라 지나간 날을 잴 수 없다.');
    console.error('인자 없이 다시 실행하면 오늘 값을 잰다.');
    return 1;
  }

  const date = todayLocal();

  try {
    assertMeasurableNow(date);
  } catch (err) {
    console.error(`거부 — ${err.message}`);
    return 1;
  }

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

  const gamesToMeasure = pendingGamesForDate(existing, GAMES, date);
  console.log(`대상 날짜   ${date} (${SOURCE.timezone} 기준)`);
  console.log(`출처        ${SOURCE.label}`);
  console.log(`전체 게임   ${GAMES.length}개`);
  console.log(`이번에 측정 ${gamesToMeasure.length}개\n`);

  if (gamesToMeasure.length === 0) {
    console.log(`${date} 기록이 ${GAMES.length}개 모두 있다. 외부 API를 부르지 않고 기존 Reading을 지킨다.`);
    return 0;
  }

  if (gamesToMeasure.length < GAMES.length) {
    console.log(`이미 저장된 ${GAMES.length - gamesToMeasure.length}개는 다시 재지 않고, 빠진 게임만 채운다.\n`);
  }

  // 하나가 실패해도 나머지는 살린다. 실패한 것은 기록하지 않는다 — 0 을 넣지 않는다.
  const readings = [];
  const faults = [];

  for (const g of gamesToMeasure) {
    try {
      const reading = await fetchReading(g.appid);
      readings.push(reading);
      console.log(`  ${String(reading.value).padStart(8)} ${reading.unit}  ${g.name}`);
    } catch (err) {
      if (!(err instanceof FetchFault)) throw err;
      faults.push({ game: g, fault: err.fault, message: err.message });
      console.error(`  ${'실패'.padStart(8)}     ${g.name} — [${err.fault}] ${err.message}`);
    }
    await sleep(GAP_MS);
  }

  if (readings.length === 0) {
    console.error('\n하나도 못 가져왔다. 기록을 남기지 않고 끝낸다.');
    return 1;
  }
  if (faults.length) {
    console.warn(`\n${faults.length}개 실패 — 그 게임은 오늘 기록에서 빠진다. 0 으로 채우지 않는다.`);
  }

  // 자정을 걸친 실행을 잘라 낸다.
  //
  // fetchReading 은 호출마다 그 순간의 날짜를 스스로 계산한다. 수십 개를 도는 데
  // 5~8초가 걸리므로 23:59:57 에 시작하면 앞뒤가 서로 다른 날짜로 기록된다.
  // 그냥 두면 다음 날 칸에 00:00 값이 먼저 들어가고, 다음 날 10:10 정규 실행이
  // 다음 날 행이 정규 실행 전에 생긴다. 같은 날짜 갱신 규칙이 있더라도 애초에
  // 잘못된 시각의 행을 만들지 않는 편이 측정 약속을 더 정확히 지킨다.
  //
  // 그래서 맨 앞에서 확인받은 날짜와 다른 것은 버린다. 그 게임들은 다음 실행에서
  // 제 시각에 다시 잰다. 잃는 것은 그날 그 게임 한 칸뿐이다.
  const { kept: sameDay, spilled } = keepDate(readings, date);
  if (spilled.length) {
    console.warn(`\n자정을 걸쳤다 — ${spilled.length}개가 ${spilled[0].date} 로 넘어가 버린다.`);
    console.warn('한 실행에 두 날짜를 섞지 않는다. 넘어간 것은 다음 실행에서 제 시각에 다시 잰다.');
    for (const r of spilled) console.warn(`  · appid ${r.appid}`);
  }

  if (sameDay.length === 0) {
    console.error(`\n${date} 로 남길 것이 하나도 없다. 기록하지 않고 끝낸다.`);
    return 1;
  }

  let records = existing;
  let added = 0;

  for (const reading of sameDay) {
    const out = upsertRecord(records, reading);
    if (out.kind !== 'added') {
      throw new Error(`live 수집이 기존 일별 행을 ${out.kind} 하려 했다: ${reading.date}|${reading.appid}`);
    }
    records = out.records;
    added += 1;
  }

  const hero = gameOf(HERO_APPID);
  const diff = compare(records, HERO_APPID, date);
  if (diff) {
    const sign = diff.delta > 0 ? '+' : '';
    const pct = diff.percent === null ? '' : ` (${sign}${diff.percent.toFixed(2)}%)`;
    console.log(`\n대표값 ${hero.name} — 이전 기록 대비 ${sign}${diff.delta.toLocaleString()} ${diff.unit}${pct}`);
    console.log(`  ${diff.previous.date}  ${diff.previous.value.toLocaleString()} → ${diff.current.date}  ${diff.current.value.toLocaleString()}`);
  } else {
    console.log(`\n대표값 ${hero.name} — 비교할 이전 기록이 없다. 변화값을 만들지 않는다.`);
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
      measuredAtLocal: SOURCE.measuredAtLocal,
      heroAppid: HERO_APPID,
    },
    games: GAMES,
  }), 'utf8');

  console.log(`기록 추가 ${added}건 · 기존 일별 행 갱신 0건 — 총 ${records.length}건`);
  return 0;
}

process.exitCode = await main();
