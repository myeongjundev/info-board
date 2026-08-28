import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateRecord, loadRecords, upsertRecord,
  seriesOf, compare, movingAverage, datesOf, serialize, keyOf, keepDate,
} from '../src/state/records.js';

const rec = (date, appid, value, extra = {}) => ({
  value, unit: '명', appid, date,
  sourceUrl: `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`,
  sourceLabel: 'Steam · 동시접속자',
  sourceTime: null,
  timezone: 'Asia/Seoul',
  fetchedAt: `${date}T01:10:00.000Z`,
  ...extra,
});

test('열쇠는 날짜와 appid 둘 다다', () => {
  assert.equal(keyOf(rec('2026-08-27', 730, 1)), '2026-08-27|730');
  assert.notEqual(keyOf(rec('2026-08-27', 730, 1)), keyOf(rec('2026-08-27', 570, 1)));
});

test('성한 기록은 통과한다', () => {
  assert.equal(validateRecord(rec('2026-08-27', 730, 551673)), null);
});

test('깨진 기록은 이유를 돌려준다', () => {
  const cases = [
    [null, '객체가 아니다'],
    [rec('2026-8-27', 730, 1), 'date'],
    [rec('2026-02-31', 730, 1), '달력'],
    [{ ...rec('2026-08-27', 730, 1), appid: 0 }, 'appid'],
    [{ ...rec('2026-08-27', 730, 1), appid: '730' }, 'appid'],
    [{ ...rec('2026-08-27', 730, 1), value: '551673' }, 'value'],
    [{ ...rec('2026-08-27', 730, 1), value: -1 }, '음수'],
    [{ ...rec('2026-08-27', 730, 1), unit: '' }, 'unit'],
    [{ ...rec('2026-08-27', 730, 1), sourceTime: undefined }, 'sourceTime'],
    [{ ...rec('2026-08-27', 730, 1), sourceTime: 'nope' }, 'sourceTime'],
    [{ ...rec('2026-08-27', 730, 1), fetchedAt: 'nope' }, 'fetchedAt'],
  ];
  for (const [input, hint] of cases) {
    const reason = validateRecord(input);
    assert.ok(reason, `통과해버림: ${JSON.stringify(input)}`);
    assert.ok(reason.includes(hint), `이유가 다르다: ${reason}`);
  }
});

test('0 명은 저장할 수 있다 — 값이 없는 것과 다르다', () => {
  assert.equal(validateRecord(rec('2026-08-27', 730, 0)), null);
});

test('공개 fixture 열쇠는 날짜와 signalId 둘 다다', () => {
  assert.equal(keyOf({ date: '2026-08-24', signalId: 'aleph-demo-index' }), '2026-08-24|aleph-demo-index');
});

test('v2의 빠진 출처 시각만 null로 올리고 v3 누락은 격리한다', () => {
  const legacy = rec('2026-08-27', 730, 1);
  delete legacy.sourceTime;
  const migrated = loadRecords({ schemaVersion: 2, records: [legacy] });
  assert.equal(migrated.records[0].sourceTime, null);
  assert.equal(migrated.quarantined.length, 0);

  const broken = loadRecords({ schemaVersion: 3, records: [legacy] });
  assert.equal(broken.records.length, 0);
  assert.match(broken.quarantined[0].reason, /sourceTime/);
});

test('깨진 항목만 격리하고 성한 항목은 살린다', () => {
  const raw = JSON.stringify({
    records: [
      rec('2026-08-27', 730, 551673),
      { garbage: true },
      rec('2026-08-27', 570, 405221),
      rec('bad-date', 10, 5),
    ],
  });
  const { records, quarantined } = loadRecords(raw);
  assert.equal(records.length, 2);
  assert.equal(quarantined.length, 2);
});

test('파일이 JSON 이 아니면 전부 격리하되 던지지 않는다', () => {
  const { records, quarantined } = loadRecords('{{{ not json');
  assert.equal(records.length, 0);
  assert.equal(quarantined.length, 1);
});

test('같은 날 같은 게임이 두 번 있으면 뒤엣것을 격리한다', () => {
  const raw = JSON.stringify({ records: [rec('2026-08-27', 730, 1), rec('2026-08-27', 730, 2)] });
  const { records, quarantined } = loadRecords(raw);
  assert.equal(records.length, 1);
  assert.equal(records[0].value, 1);
  assert.equal(quarantined.length, 1);
});

test('같은 날 다른 게임은 둘 다 남는다', () => {
  const raw = JSON.stringify({ records: [rec('2026-08-27', 730, 1), rec('2026-08-27', 570, 2)] });
  assert.equal(loadRecords(raw).records.length, 2);
});

test('새 칸은 추가된다', () => {
  const out = upsertRecord([], rec('2026-08-27', 730, 551673));
  assert.equal(out.kind, 'added');
  assert.equal(out.changed, true);
});

test('같은 날 Reading 전체가 같으면 파일을 건드리지 않는다', () => {
  const base = [rec('2026-08-27', 730, 551673)];
  const out = upsertRecord(base, rec('2026-08-27', 730, 551673));
  assert.equal(out.changed, false);
  assert.equal(out.kind, 'unchanged');
});

test('Reading 필드 순서만 달라도 같은 행으로 본다', () => {
  const reading = rec('2026-08-27', 730, 551673);
  const reordered = Object.fromEntries(Object.entries(reading).reverse());
  const out = upsertRecord([reading], reordered);
  assert.equal(out.kind, 'unchanged');
  assert.equal(out.changed, false);
});

test('같은 날짜의 두 번째 성공은 새 행 없이 같은 행을 갱신한다', () => {
  const base = [rec('2026-08-27', 730, 551673)];
  const out = upsertRecord(base, rec('2026-08-27', 730, 480000));
  assert.equal(out.changed, true);
  assert.equal(out.kind, 'updated');
  assert.equal(out.records.length, 1);
  assert.equal(out.records[0].value, 480000);
});

test('깨진 기록은 넣을 수 없다', () => {
  assert.throws(() => upsertRecord([], { nope: true }), /기록을 넣을 수 없다/);
});

test('한 게임의 기록만 날짜순으로 꺼낸다', () => {
  const records = [
    rec('2026-08-28', 730, 3), rec('2026-08-27', 570, 9), rec('2026-08-27', 730, 1),
  ];
  const s = seriesOf(records, 730);
  assert.deepEqual(s.map((r) => r.date), ['2026-08-27', '2026-08-28']);
});

test('이전 기록이 없으면 비교값을 만들지 않는다', () => {
  const records = [rec('2026-08-27', 730, 551673)];
  assert.equal(compare(records, 730, '2026-08-27'), null);
});

test('차이·방향·단위를 함께 준다', () => {
  const records = [rec('2026-08-27', 730, 500000), rec('2026-08-28', 730, 551673)];
  const d = compare(records, 730, '2026-08-28');
  assert.equal(d.delta, 51673);
  assert.equal(d.direction, 'up');
  assert.equal(d.unit, '명');
  assert.ok(Math.abs(d.percent - 10.3346) < 0.001, `percent=${d.percent}`);
});

test('줄어들면 방향이 down 이다', () => {
  const records = [rec('2026-08-27', 730, 500000), rec('2026-08-28', 730, 450000)];
  assert.equal(compare(records, 730, '2026-08-28').direction, 'down');
});

test('다른 게임의 기록은 비교에 끼어들지 않는다', () => {
  const records = [
    rec('2026-08-27', 570, 999999),   // 다른 게임. 날짜는 더 이르다
    rec('2026-08-28', 730, 551673),
  ];
  assert.equal(compare(records, 730, '2026-08-28'), null, '남의 값과 비교했다');
});

test('단위가 다르면 비교하지 않는다', () => {
  const records = [
    { ...rec('2026-08-27', 730, 500), unit: '천 명' },
    rec('2026-08-28', 730, 551673),
  ];
  assert.equal(compare(records, 730, '2026-08-28'), null);
});

test('7일이 안 차면 이동평균을 표시하지 않는다', () => {
  const records = Array.from({ length: 6 }, (_, i) => rec(`2026-08-2${i + 2}`, 730, 100));
  assert.equal(movingAverage(records, 730, '2026-08-27'), null);
});

test('7일이 차면 이동평균을 준다', () => {
  const records = Array.from({ length: 7 }, (_, i) => rec(`2026-08-2${i + 1}`, 730, (i + 1) * 100));
  const ma = movingAverage(records, 730, '2026-08-27');
  assert.equal(ma.window, 7);
  assert.equal(ma.value, 400);   // (100+...+700)/7
});

test('기록이 있는 날짜 목록을 중복 없이 준다', () => {
  const records = [rec('2026-08-27', 730, 1), rec('2026-08-27', 570, 2), rec('2026-08-28', 730, 3)];
  assert.deepEqual(datesOf(records), ['2026-08-27', '2026-08-28']);
});

test('직렬화하면 다시 읽을 수 있다', () => {
  const records = [rec('2026-08-27', 730, 551673)];
  const { records: back, quarantined } = loadRecords(serialize(records, { source: { unit: '명' } }));
  assert.equal(quarantined.length, 0);
  assert.deepEqual(back, records);
});

test('자정을 걸치면 약속한 날짜의 것만 남긴다', () => {
  const readings = [
    rec('2026-08-27', 730, 551673),
    rec('2026-08-27', 570, 405221),
    rec('2026-08-28', 10, 5884),      // 자정을 넘겨 버린 것
  ];
  const { kept, spilled } = keepDate(readings, '2026-08-27');
  assert.equal(kept.length, 2);
  assert.equal(spilled.length, 1);
  assert.equal(spilled[0].appid, 10);
});

test('자정을 안 걸치면 전부 남는다', () => {
  const readings = [rec('2026-08-27', 730, 1), rec('2026-08-27', 570, 2)];
  const { kept, spilled } = keepDate(readings, '2026-08-27');
  assert.equal(kept.length, 2);
  assert.equal(spilled.length, 0);
});

test('넘어간 값은 다음 날 정규 실행 전에 저장하지 않는다', () => {
  // 이걸 막지 않으면: 자정 00:00 값이 8/28 칸에 먼저 들어가고,
  // 8/28 정규 실행 전에 잘못된 시각의 일별 행이 공개된다.
  const midnight = rec('2026-08-28', 730, 480000);
  const { kept } = keepDate([midnight], '2026-08-27');
  assert.equal(kept.length, 0, '자정 값이 다음 날 칸에 들어갔다');

  // 다음 날 제 시각 값이 정상 행으로 들어가야 한다
  const proper = rec('2026-08-28', 730, 551673);
  const out = upsertRecord([], proper);
  assert.equal(out.kind, 'added');
  assert.equal(out.records[0].value, 551673);
});
