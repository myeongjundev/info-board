import assert from 'node:assert/strict';
import test from 'node:test';

import { dealsOverview } from '../src/view/dealsOverview.js';

test('할인 두 목록은 appid 합집합으로 한 번만 센다', () => {
  const result = dealsOverview({
    tracked: [{ appid: 1 }, { appid: 2 }],
    popular: [{ appid: 2 }, { appid: 3 }],
    epic: [], steamKeep: [], steamWeekend: [],
  });
  assert.equal(result.onSale, 3);
});

test('정상 빈 목록은 0건이다', () => {
  assert.deepEqual(dealsOverview({
    tracked: [], popular: [], epic: [], steamKeep: [], steamWeekend: [],
  }), { epicFree: 0, steamKeep: 0, steamWeekend: 0, onSale: 0 });
});

test('읽지 못한 목록은 0건으로 만들지 않는다', () => {
  assert.deepEqual(dealsOverview({
    tracked: null, popular: null, epic: null, steamKeep: null, steamWeekend: null,
  }), { epicFree: null, steamKeep: null, steamWeekend: null, onSale: null });
});
