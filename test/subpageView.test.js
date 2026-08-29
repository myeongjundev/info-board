// 하위 세 페이지의 계산. 전에는 컴포넌트 안에 있어서 브라우저 없이는 못 봤다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { discountSpread } from '../src/view/dealsOverview.js';
import { releaseTiming } from '../src/view/releaseTiming.js';
import { sampleViewerTotal } from '../src/view/streamingTotals.js';
import { isSnapshotStale } from '../src/view/board.js';

// ── 할인율 ────────────────────────────────────────────────────────────────

test('최대와 평균 할인율을 낸다', () => {
  const s = discountSpread([{ discountPercent: 20 }, { discountPercent: 60 }, { discountPercent: 31 }]);
  assert.equal(s.count, 3);
  assert.equal(s.max, 60);
  assert.equal(s.average, 37);          // (20+60+31)/3 = 37
});

test('할인이 0건이면 평균을 0%로 만들지 않는다', () => {
  const s = discountSpread([]);
  assert.equal(s.count, 0);
  assert.equal(s.max, null);
  assert.equal(s.average, null);        // "전부 정가" 와 "할인이 없다" 는 다르다
});

test('할인율이 숫자가 아닌 줄은 평균에 넣지 않는다', () => {
  const s = discountSpread([{ discountPercent: 50 }, { discountPercent: null }, {}]);
  assert.equal(s.count, 1);
  assert.equal(s.average, 50);
});

// ── 출시까지 며칠 ──────────────────────────────────────────────────────────

const at = (iso) => new Date(iso);

test('다음 달 목록은 남은 날을 센다', () => {
  const label = releaseTiming({ releaseDate: '2026-09-03' }, true, { now: at('2026-08-29T03:00:00Z') });
  assert.equal(label, 'D-5');
});

test('오늘 출시와 D-1 은 하루 차이로 갈린다', () => {
  const now = at('2026-08-29T03:00:00Z');                       // KST 8/29 12:00
  assert.equal(releaseTiming({ releaseDate: '2026-08-29' }, true, { now }), '오늘 출시');
  assert.equal(releaseTiming({ releaseDate: '2026-08-30' }, true, { now }), 'D-1');
});

test('KST 자정 직후에도 그날은 오늘이다', () => {
  // UTC 로는 아직 8/28 이지만 KST 로는 8/29 다. 시간대를 잘못 쓰면 D-1 이 된다.
  const now = at('2026-08-28T15:30:00Z');
  assert.equal(releaseTiming({ releaseDate: '2026-08-29' }, true, { now }), '오늘 출시');
});

test('지난 날짜에 D+ 를 만들지 않는다', () => {
  const label = releaseTiming({ releaseDate: '2026-08-20' }, true, { now: at('2026-08-29T03:00:00Z') });
  assert.equal(label, '일정 확인');
});

test('날짜를 안 밝힌 것에 날짜를 붙이지 않는다', () => {
  assert.equal(releaseTiming({ releaseDate: null }, true), '날짜 미정');
  assert.equal(releaseTiming({ releaseDate: null }, false), '이번 달 출시');
  assert.equal(releaseTiming({ releaseDate: '2026-08-20' }, false), 'NEW RELEASE');
});

// ── 표본 시청자 합계 ───────────────────────────────────────────────────────

test('그 플랫폼 표본만 더한다', () => {
  const chzzk = { id: 'chzzk', rankings: [{ viewerCount: 11003 }, { viewerCount: 4200 }] };
  assert.equal(sampleViewerTotal(chzzk), 15203);
});

test('표본이 없으면 0 이 아니라 null 이다', () => {
  assert.equal(sampleViewerTotal({ id: 'chzzk', rankings: [] }), null);
  assert.equal(sampleViewerTotal(null), null);
  assert.equal(sampleViewerTotal({ id: 'chzzk' }), null);
});

test('플랫폼 하나만 받는다 — 배열을 넘겨도 합쳐지지 않는다', () => {
  // 규칙 5-5. 두 플랫폼을 더할 수 있는 서명이면 언젠가 더하게 된다.
  const two = [{ rankings: [{ viewerCount: 10 }] }, { rankings: [{ viewerCount: 20 }] }];
  assert.equal(sampleViewerTotal(two), null);
});

// ── 스냅샷이 오래됐는가 ────────────────────────────────────────────────────

test('매시간 갱신되는 파일이 하루 반을 넘기면 오래된 것이다', () => {
  const now = at('2026-08-29T12:00:00Z');
  assert.equal(isSnapshotStale('2026-08-27T23:00:00Z', { now }), true);    // 37시간
  assert.equal(isSnapshotStale('2026-08-28T01:00:00Z', { now }), false);   // 35시간
});

test('시각을 못 읽으면 오래됐다고 단정하지 않는다', () => {
  assert.equal(isSnapshotStale('언제', { now: at('2026-08-29T12:00:00Z') }), false);
  assert.equal(isSnapshotStale(null), false);
});
