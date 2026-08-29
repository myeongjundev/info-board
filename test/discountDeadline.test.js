import test from 'node:test';
import assert from 'node:assert/strict';

import {
  discountDeadline, endingSoon, endingSoonAcross, formatDeadline,
} from '../src/view/discountDeadline.js';

// 한국 시각 2026-08-30 09:00
const NOW = new Date('2026-08-30T00:00:00.000Z');

test('모르는 것은 모른다고 한다 — 0일로 만들지 않는다', () => {
  for (const bad of [null, undefined, '', 'not-a-date']) {
    const out = discountDeadline(bad, { now: NOW });
    assert.equal(out.known, false);
    assert.equal(out.label, null);
    assert.equal(out.days, null);
  }
});

test('한국 달력으로 오늘 끝나면 오늘 끝이다', () => {
  // 2026-08-30 23:00 KST
  assert.equal(discountDeadline('2026-08-30T14:00:00.000Z', { now: NOW }).label, '오늘 끝');
});

test('밤 수로 센다 — 남은 시간이 세 시간이어도 넘어가면 내일이다', () => {
  // 2026-08-31 02:00 KST. 한국 시각으로 9시에 보면 17시간 뒤지만 달력은 하루 넘어간다.
  const out = discountDeadline('2026-08-30T17:00:00.000Z', { now: NOW });
  assert.equal(out.label, '내일 끝');
  assert.equal(out.days, 1);
  assert.equal(out.urgent, true);
});

test('사흘까지는 급한 것으로 본다', () => {
  // 17:00Z 는 다음 날 02:00 KST 다. 09-01T17:00Z → 09-02 KST → 사흘 뒤.
  assert.equal(discountDeadline('2026-09-01T17:00:00.000Z', { now: NOW }).days, 3);
  assert.equal(discountDeadline('2026-09-01T17:00:00.000Z', { now: NOW }).urgent, true);
  assert.equal(discountDeadline('2026-09-02T17:00:00.000Z', { now: NOW }).days, 4);
  assert.equal(discountDeadline('2026-09-02T17:00:00.000Z', { now: NOW }).urgent, false);
});

test('지난 할인을 D+ 로 만들지 않는다', () => {
  const out = discountDeadline('2026-08-27T17:00:00.000Z', { now: NOW });
  assert.equal(out.label, '종료된 할인');
  assert.equal(out.urgent, false);
});

test('종료 시각은 한국 시각으로 적는다', () => {
  assert.match(formatDeadline('2026-08-30T17:00:00.000Z'), /8월 31일.*KST/);
  assert.equal(formatDeadline(null), null);
});

test('급한 것을 앞으로 뽑되 할인율을 고쳐 부르지 않는다', () => {
  const rows = [
    { name: '느긋한 90%', discountPercent: 90, discountEndsAt: '2026-09-08T17:00:00.000Z' },
    { name: '오늘 끝 30%', discountPercent: 30, discountEndsAt: '2026-08-30T14:00:00.000Z' },
    { name: '내일 끝 70%', discountPercent: 70, discountEndsAt: '2026-08-30T17:00:00.000Z' },
    { name: '기간 모름', discountPercent: 99, discountEndsAt: null },
  ];
  const soon = endingSoon(rows, { now: NOW });
  assert.deepEqual(soon.map((s) => s.reading.name), ['오늘 끝 30%', '내일 끝 70%']);
  assert.equal(soon[0].reading.discountPercent, 30);
});

test('목록이 아니면 빈 목록이다', () => {
  assert.deepEqual(endingSoon(null), []);
  assert.deepEqual(endingSoon([]), []);
});

test('두 목록을 합칠 때 같은 게임을 두 번 세지 않는다', () => {
  const tracked = [{ appid: 1, name: 'A', discountPercent: 50, discountEndsAt: '2026-08-30T14:00:00.000Z' }];
  const popular = [{ appid: 1, name: 'A', discountPercent: 50, discountEndsAt: '2026-08-30T14:00:00.000Z' }];
  const out = endingSoonAcross([tracked, popular], { now: NOW });
  assert.equal(out.rows.length, 1);
  assert.equal(out.totalCount, 1);
});

test('겹치면 종료 시각을 아는 쪽을 남긴다', () => {
  const a = [{ appid: 2, name: 'B', discountPercent: 50, discountEndsAt: null }];
  const b = [{ appid: 2, name: 'B', discountPercent: 50, discountEndsAt: '2026-08-30T14:00:00.000Z' }];
  assert.equal(endingSoonAcross([a, b], { now: NOW }).rows.length, 1);
  assert.equal(endingSoonAcross([b, a], { now: NOW }).rows.length, 1);
});

test('오늘·내일 것이 있으면 넓히지 않는다', () => {
  const out = endingSoonAcross([[
    { appid: 3, name: 'C', discountPercent: 50, discountEndsAt: '2026-08-30T14:00:00.000Z' },
    { appid: 4, name: 'D', discountPercent: 90, discountEndsAt: '2026-09-05T17:00:00.000Z' },
  ]], { now: NOW });
  assert.equal(out.widened, false);
  assert.deepEqual(out.rows.map((r) => r.reading.name), ['C']);
});

test('오늘·내일 것이 없으면 넓히고, 넓혔다고 말한다', () => {
  const out = endingSoonAcross([[
    { appid: 5, name: 'E', discountPercent: 50, discountEndsAt: '2026-09-02T17:00:00.000Z' },
  ]], { now: NOW });
  assert.equal(out.widened, true);
  assert.equal(out.withinDays, 7);
  assert.equal(out.rows.length, 1);
});

test('종료 시각을 아는 수와 전체 수를 따로 센다', () => {
  const out = endingSoonAcross([[
    { appid: 6, name: 'F', discountPercent: 50, discountEndsAt: '2026-08-30T14:00:00.000Z' },
    { appid: 7, name: 'G', discountPercent: 50, discountEndsAt: null },
  ]], { now: NOW });
  assert.equal(out.knownCount, 1);
  assert.equal(out.totalCount, 2);
});

test('아무것도 없으면 빈 목록이다 — 만들어 내지 않는다', () => {
  const out = endingSoonAcross(null, { now: NOW });
  assert.deepEqual(out.rows, []);
  assert.equal(out.totalCount, 0);
});
