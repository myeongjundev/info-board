import test from 'node:test';
import assert from 'node:assert/strict';

import { isStuck } from '../src/ui/scrollToTop.js';

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
