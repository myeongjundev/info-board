import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateRecord, loadRecords, upsertRecord,
  seriesOf, compare, movingAverage, datesOf, serialize, keyOf,
} from '../src/state/records.js';

const rec = (date, appid, value, extra = {}) => ({
  value, unit: '명', appid, date,
  sourceUrl: `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`,
  sourceLabel: 'Steam · 동시접속자',
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

test('같은 날 같은 값이면 파일을 건드리지 않는다', () => {
  const base = [rec('2026-08-27', 730, 551673)];
  const out = upsertRecord(base, rec('2026-08-27', 730, 551673));
  assert.equal(out.changed, false);
  assert.equal(out.kind, 'unchanged');
});

test('같은 날 두 번째로 잰 값은 버린다 — 매일 같은 시각 약속을 지킨다', () => {
  const base = [rec('2026-08-27', 730, 551673)];
  const out = upsertRecord(base, rec('2026-08-27', 730, 480000));
  assert.equal(out.changed, false);
  assert.equal(out.kind, 'kept-first');
  assert.equal(out.records[0].value, 551673, '첫 값이 지켜져야 한다');
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
