import test from 'node:test';
import assert from 'node:assert/strict';

import {
  headerOffset, isStuck, maxScroll, reachableTop, targetTop,
} from '../src/ui/scroll.js';

test('목표에 닿았으면 멈춘 것이 아니다', () => {
  assert.equal(isStuck(0, 0), false);
  assert.equal(isStuck(120, 1), false);
});

test('나아가고 있으면 멈춘 것이 아니다', () => {
  assert.equal(isStuck(3000, 2400), false);
  assert.equal(isStuck(600, 120), false);
});

test('목표가 아닌데 제자리면 멈춘 것이다', () => {
  assert.equal(isStuck(1740, 1740), true);
  assert.equal(isStuck(1740, 1740.5), true);
});

test('목표는 바꿀 수 있다', () => {
  assert.equal(isStuck(56, 56, { target: 56 }), false);
});

test('구획이 서야 할 자리는 띠 높이만큼 위로 당긴다', () => {
  // 화면 위 300px 에 보이고 현재 1000px 내려와 있다면 문서상 1300px.
  // 고정 띠 56px 만큼 덜 내려가야 띠에 안 가린다.
  assert.equal(targetTop(300, 1000, 56), 1244);
});

test('맨 위 구획을 음수로 보내지 않는다', () => {
  // 문서 맨 앞의 구획은 56 을 빼면 음수가 된다. 0 이 맞다.
  assert.equal(targetTop(10, 0, 56), 0);
  assert.equal(targetTop(0, 0, 56), 0);
});

test('띠 높이는 CSS 에서 읽고, 못 읽으면 0 이다', () => {
  // 이 값을 코드에 또 적으면 CSS 와 갈라진다. 읽을 수 없는 환경에서는
  // 어긋난 위치보다 맨 위가 낫다.
  assert.equal(headerOffset(null), 0);
  assert.equal(headerOffset(undefined), 0);
});


test('문서가 화면보다 짧으면 더 내려갈 곳이 없다', () => {
  assert.equal(maxScroll(800, 1000), 0);
  assert.equal(maxScroll(1000, 1000), 0);
});

test('내려갈 수 있는 끝은 문서 높이에서 화면 높이를 뺀 만큼', () => {
  assert.equal(maxScroll(2327, 1000), 1327);
});

test('마지막 구획은 화면 맨 위에 못 온다 — 갈 수 있는 데까지만 간다', () => {
  // 스트리밍 페이지에서 실제로 겪은 값이다. 1,663 이 필요했지만 끝이 1,327 이었다.
  assert.equal(reachableTop(1663, 1327), 1327);
});

test('닿을 수 있는 목표는 그대로 둔다', () => {
  assert.equal(reachableTop(347, 1327), 347);
  assert.equal(reachableTop(0, 1327), 0);
});

test('음수 목표는 맨 위다', () => {
  assert.equal(reachableTop(-40, 1327), 0);
});
