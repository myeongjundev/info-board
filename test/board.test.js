import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STATE, buildBoard, formatNumber, formatInstant,
  elapsedSince, crosscheckRows, rowsForDate,
} from '../src/view/board.js';

const rec = (date, appid, value, hhmm = '01:10') => ({
  value, unit: '명', appid, date,
  sourceUrl: `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`,
  sourceLabel: 'Steam · 동시접속자',
  timezone: 'Asia/Seoul',
  fetchedAt: `${date}T${hhmm}:00.000Z`,
});

const data = (records) => ({
  records,
  source: { heroAppid: 730, unit: '명', timezone: 'Asia/Seoul', label: 'Steam · 동시접속자' },
  games: [
    { appid: 730, name: 'Counter-Strike 2', year: 2012, tier: 'active' },
    { appid: 570, name: 'Dota 2', year: 2013, tier: 'active' },
  ],
});

const NOW = new Date('2026-08-27T04:10:00Z');   // 잰 지 3시간 뒤

test('기록이 없으면 EMPTY — 숫자를 만들어내지 않는다', () => {
  const b = buildBoard({ data: data([]), today: '2026-08-27', now: NOW });
  assert.equal(b.state, STATE.EMPTY);
  assert.equal(b.reading, null);
  assert.equal(b.comparison, null);
});

test('대표 게임 기록이 없으면 EMPTY — 남의 값으로 채우지 않는다', () => {
  const b = buildBoard({ data: data([rec('2026-08-27', 570, 405221)]), today: '2026-08-27', now: NOW });
  assert.equal(b.state, STATE.EMPTY, 'Dota 2 값으로 CS2 자리를 채웠다');
});

test('오늘 잰 값이 있으면 FRESH', () => {
  const b = buildBoard({ data: data([rec('2026-08-27', 730, 551673)]), today: '2026-08-27', now: NOW });
  assert.equal(b.state, STATE.FRESH);
  assert.equal(b.reading.value, 551673);
  assert.equal(b.game.name, 'Counter-Strike 2');
});

test('오늘 것이 아니면 STALE — 마지막 정상값은 지킨다', () => {
  const b = buildBoard({ data: data([rec('2026-08-25', 730, 551673)]), today: '2026-08-27', now: NOW });
  assert.equal(b.state, STATE.STALE);
  assert.equal(b.reading.value, 551673, '오래됐다고 값을 버리면 안 된다');
  assert.equal(b.staleDays, 2);
});

test('STALE 이어도 잰 시각을 지금으로 갱신하지 않는다', () => {
  const r = rec('2026-08-25', 730, 551673);
  const b = buildBoard({ data: data([r]), today: '2026-08-27', now: NOW });
  assert.equal(b.reading.fetchedAt, r.fetchedAt, '오래된 값에 지금 시각을 붙였다');
});

test('기록이 하나뿐이면 비교값을 만들지 않는다', () => {
  const b = buildBoard({ data: data([rec('2026-08-27', 730, 551673)]), today: '2026-08-27', now: NOW });
  assert.equal(b.comparison, null);
});

test('이틀이 모이면 차이·방향·단위를 준다', () => {
  const b = buildBoard({
    data: data([rec('2026-08-27', 730, 500000), rec('2026-08-28', 730, 551673)]),
    today: '2026-08-28',
    now: new Date('2026-08-28T04:10:00Z'),
  });
  assert.equal(b.comparison.delta, 51673);
  assert.equal(b.comparison.direction, 'up');
  assert.equal(b.comparison.unit, '명');
});

test('숫자는 자릿수를 끊어 보여주고, 값이 없으면 — 를 준다', () => {
  assert.equal(formatNumber(551673), '551,673');
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(null), '—');
  assert.equal(formatNumber(NaN), '—');
});

test('시각은 그 시간대의 벽시계로 보여준다', () => {
  // 01:10 UTC = 10:10 KST
  assert.equal(formatInstant('2026-08-27T01:10:00.000Z', 'Asia/Seoul'), '2026-08-27 10:10');
  // UTC 로는 26일 16:00 이지만 KST 로는 27일 01:00 이다
  assert.equal(formatInstant('2026-08-26T16:00:00.000Z', 'Asia/Seoul'), '2026-08-27 01:00');
  assert.equal(formatInstant('nope', 'Asia/Seoul'), '—');
});

test('경과 시간을 읽을 수 있게 준다', () => {
  const t = '2026-08-27T01:10:00.000Z';
  assert.equal(elapsedSince(t, new Date('2026-08-27T01:10:30Z')).text, '방금');
  assert.equal(elapsedSince(t, new Date('2026-08-27T01:45:00Z')).text, '35분 전');
  assert.equal(elapsedSince(t, new Date('2026-08-27T04:22:00Z')).text, '3시간 12분 전');
  assert.equal(elapsedSince(t, new Date('2026-08-29T03:10:00Z')).text, '2일 2시간 전');
});

test('대조표는 손계산 식을 그대로 담는다', () => {
  const b = buildBoard({
    data: data([rec('2026-08-27', 730, 500000), rec('2026-08-28', 730, 551673)]),
    today: '2026-08-28',
    now: new Date('2026-08-28T04:10:00Z'),
  });
  const x = crosscheckRows(b.comparison);
  assert.equal(x.hand, '551673 − 500000 = 51673');
  assert.equal(x.arrow, '▲');
  assert.equal(x.previous.date, '2026-08-27');
  assert.equal(x.current.date, '2026-08-28');
  assert.ok(x.previous.sourceUrl.includes('appid=730'));
});

test('비교할 게 없으면 대조표도 만들지 않는다', () => {
  assert.equal(crosscheckRows(null), null);
});

test('줄어들면 화살표가 아래를 향한다', () => {
  const b = buildBoard({
    data: data([rec('2026-08-27', 730, 551673), rec('2026-08-28', 730, 500000)]),
    today: '2026-08-28',
    now: new Date('2026-08-28T04:10:00Z'),
  });
  assert.equal(crosscheckRows(b.comparison).arrow, '▼');
});

test('그 날짜의 게임별 기록을 값 큰 순으로 준다', () => {
  const d = data([rec('2026-08-27', 570, 405221), rec('2026-08-27', 730, 551673)]);
  const rows = rowsForDate(d.records, d.games, '2026-08-27');
  assert.deepEqual(rows.map((r) => r.name), ['Counter-Strike 2', 'Dota 2']);
});

test('표에 없는 appid 도 버리지 않고 appid 로 보여준다', () => {
  const d = data([rec('2026-08-27', 99999, 5)]);
  assert.equal(rowsForDate(d.records, d.games, '2026-08-27')[0].name, 'appid 99999');
});

test('방문자 시계가 뒤처지면 경과를 세지 않고 셀 수 없다고 말한다', () => {
  const fetched = '2026-08-27T00:59:17.522Z';
  const slow = new Date('2026-08-26T04:00:00Z');   // 하루 느린 시계
  const e = elapsedSince(fetched, slow);
  assert.equal(e.skewed, true);
  assert.notEqual(e.text, '방금', '21시간 뒤 기록을 방금이라고 했다');
});

test('시계가 조금 어긋난 정도는 방금으로 둔다', () => {
  const fetched = '2026-08-27T00:59:17.522Z';
  const t = Date.parse(fetched);
  assert.equal(elapsedSince(fetched, new Date(t - 30_000)).text, '방금');
  assert.equal(elapsedSince(fetched, new Date(t - 30_000)).skewed, undefined);
});

test('기록이 방문자의 오늘보다 뒤면 밀린 것이 아니라 시계가 어긋난 것이다', () => {
  const b = buildBoard({
    data: data([rec('2026-08-27', 730, 551673)]),
    today: '2026-08-26',
    now: new Date('2026-08-26T04:00:00Z'),
  });
  assert.equal(b.clockSkew, true);
  assert.ok(b.staleDays < 0, '음수가 아니면 이 상황이 아니다');
});

test('정상일 때는 시계 어긋남이 아니다', () => {
  const b = buildBoard({ data: data([rec('2026-08-27', 730, 1)]), today: '2026-08-27', now: NOW });
  assert.equal(b.clockSkew, false);
});

test('진짜로 밀린 것은 시계 어긋남이 아니다', () => {
  const b = buildBoard({
    data: data([rec('2026-08-25', 730, 1)]), today: '2026-08-27',
    now: new Date('2026-08-27T04:00:00Z'),
  });
  assert.equal(b.clockSkew, false);
  assert.equal(b.staleDays, 2);
});

test('7일이 안 차면 평균을 주지 않는다', () => {
  const b = buildBoard({ data: data([rec('2026-08-27', 730, 1)]), today: '2026-08-27', now: NOW });
  assert.equal(b.average, null);
});

test('7일이 차면 평균을 준다 — 요일 차이를 전일 대비로만 읽지 않게', () => {
  const records = Array.from({ length: 7 }, (_, i) => rec(`2026-08-2${i + 1}`, 730, (i + 1) * 100));
  const b = buildBoard({ data: data(records), today: '2026-08-27', now: NOW });
  assert.equal(b.average.window, 7);
  assert.equal(b.average.value, 400);
  assert.equal(b.average.from, '2026-08-21');
  assert.equal(b.average.to, '2026-08-27');
});
