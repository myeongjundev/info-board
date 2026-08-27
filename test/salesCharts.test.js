import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { rankMovement, validateSalesChartSnapshot } from '../src/source/salesCharts.js';

test('주간 순위 상승·하락·신규를 구분한다', () => {
  assert.deepEqual(rankMovement({ rank: 3, previousRank: 8 }), { kind: 'up', label: '▲ 5' });
  assert.deepEqual(rankMovement({ rank: 9, previousRank: 4 }), { kind: 'down', label: '▼ 5' });
  assert.deepEqual(rankMovement({ rank: 1, previousRank: null, firstTop100: true }), { kind: 'new', label: 'NEW' });
});

test('저장된 판매 차트는 현재·주간 Top 20과 월간 신작을 갖는다', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../data/sales-charts.json', import.meta.url), 'utf8'));
  assert.equal(validateSalesChartSnapshot(snapshot), true);
  assert.equal(snapshot.live.korea.length, 20);
  assert.equal(snapshot.live.global.length, 20);
  assert.equal(snapshot.weekly.items.length, 20);
  assert.ok(snapshot.monthly.items.length > 0);
  assert.equal(snapshot.source.metric, 'revenue_rank');
  assert.equal(snapshot.source.valuesPublished, false);
});
