import test from 'node:test';
import assert from 'node:assert/strict';

import { discountDeadline, endingSoon, formatDeadline } from '../src/view/discountDeadline.js';

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
