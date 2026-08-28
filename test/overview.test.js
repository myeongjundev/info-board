// 요약 칸이 지켜야 하는 것은 하나다 — "없다" 와 "모른다" 를 섞지 않는 것.
//
// 무료 배포가 이번 주에 없는 것은 정상이고, 파일을 못 읽은 것은 장애다. 둘을
// 같은 `—` 로 뭉개면 이 판이 잡으려는 거짓말을 요약에서 우리가 저지르게 된다.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AXIS, dealsAxis, overview, playingAxis, sellingAxis, watchingAxis,
} from '../src/view/overview.js';

const board = {
  reading: { value: 545528, unit: '명' },
  game: { name: 'Counter-Strike 2' },
  comparison: { delta: -6145, percent: -1.1139 },
  state: 'FRESH',
};

test('하는 축은 이미 계산된 board 에서 집어 온다 — 새로 계산하지 않는다', () => {
  const a = playingAxis(board);
  assert.equal(a.state, AXIS.OK);
  assert.equal(a.value, 545528);
  assert.equal(a.unit, '명');
  assert.equal(a.delta, -6145);
});

test('정상값이 없으면 숫자를 만들지 않는다', () => {
  assert.equal(playingAxis({ reading: null }).state, AXIS.UNAVAILABLE);
  assert.equal(playingAxis(undefined).state, AXIS.UNAVAILABLE);
});

test('마지막 정상값을 쓰는 장애 상태를 요약 축까지 전달한다', () => {
  assert.equal(playingAxis({ ...board, state: 'STALE' }).stale, true);
});

test('파는 축은 한국 매출 1위를 그대로 옮긴다', () => {
  const a = sellingAxis({ live: { korea: [{ name: '붉은사막', adult: false, isFree: false, priceText: '$55.99', discountPercent: 20 }] } });
  assert.equal(a.state, AXIS.OK);
  assert.equal(a.subject, '붉은사막');
  // 통화를 우리가 붙이지 않는다. Steam 이 준 글자 그대로다.
  assert.equal(a.priceText, '$55.99');
});

test('1위가 성인 분류면 제목 대신 라벨이 나간다', () => {
  const a = sellingAxis({ live: { korea: [{ name: '실제 제목', adult: true, isFree: false, priceText: '₩ 1,000' }] } });
  assert.equal(a.subject, '성인 콘텐츠 (Steam 분류)');
  assert.equal(a.adult, true);
});

test('판매 차트를 못 읽으면 모른다고 한다', () => {
  assert.equal(sellingAxis(null).state, AXIS.UNAVAILABLE);
  assert.equal(sellingAxis({ live: { korea: [] } }).state, AXIS.UNAVAILABLE);
});

test('무료 배포 0건은 장애가 아니라 정상적인 없음이다', () => {
  const a = dealsAxis({
    epicFree: { giveaways: [] },
    steamFree: { giveaways: [], freeWeekends: [] },
    discounts: { counts: { discount: 0 } },
    popularDiscounts: { counts: { discount: 0 } },
  });
  assert.equal(a.state, AXIS.EMPTY);
  assert.equal(a.freeNow, 0);
});

test('할인 자료를 하나도 못 읽은 것은 없음과 다르다', () => {
  const a = dealsAxis({});
  assert.equal(a.state, AXIS.UNAVAILABLE);
});

test('일부만 읽혔으면 세되 일부라고 밝힌다', () => {
  const a = dealsAxis({ epicFree: { giveaways: [{}] }, discounts: { counts: { discount: 8 } } });
  assert.equal(a.state, AXIS.OK);
  assert.equal(a.freeNow, 1);
  assert.equal(a.onSale, 8);
  assert.equal(a.partial, true);
});

test('두 할인 목록에 같은 게임이 있으면 appid 합집합으로 한 번만 센다', () => {
  const a = dealsAxis({
    discounts: { discounts: [{ appid: 10 }, { appid: 20 }] },
    popularDiscounts: { discounts: [{ appid: 20 }, { appid: 30 }] },
  });
  assert.equal(a.onSale, 3);
});

test('보는 축은 두 플랫폼 시청자를 더하지 않는다', () => {
  const a = watchingAxis({
    platforms: [
      { id: 'chzzk', status: 'ok', rankings: [{ gameName: '림월드', viewerCount: 9875 }] },
      { id: 'twitch', status: 'ok', rankings: [{ gameName: 'GTA V', viewerCount: 12000 }] },
    ],
  });
  assert.equal(a.state, AXIS.OK);
  // 9875 + 12000 = 21875 가 아니다. 더 많은 쪽 하나를 그대로 든다.
  assert.equal(a.viewerCount, 12000);
  assert.equal(a.platformId, 'twitch');
  assert.equal(a.platformCount, 2);
});

test('플랫폼이 연결됐는데 집계된 방송이 없는 것과 연결 실패는 다르다', () => {
  assert.equal(watchingAxis({ platforms: [{ id: 'chzzk', status: 'ok', rankings: [] }] }).state, AXIS.EMPTY);
  assert.equal(watchingAxis({ platforms: [{ id: 'chzzk', status: 'auth' }] }).state, AXIS.UNAVAILABLE);
  assert.equal(watchingAxis(null).state, AXIS.UNAVAILABLE);
});

test('요약은 네 칸이고 순서가 고정이다', () => {
  const rows = overview({ board });
  assert.deepEqual(rows.map((r) => r.id), ['playing', 'selling', 'deals', 'watching']);
  assert.deepEqual(rows.map((r) => r.question), ['몇 명이 하나', '무엇이 팔리나', '얼마나 싸나', '몇 명이 보나']);
  // 자료가 board 뿐이어도 나머지 셋이 사라지지 않는다. 모른다고 말한다.
  assert.equal(rows[0].state, AXIS.OK);
  assert.equal(rows[1].state, AXIS.UNAVAILABLE);
});
