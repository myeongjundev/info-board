import test from 'node:test';
import assert from 'node:assert/strict';

import { pendingGamesForDate } from '../src/state/liveCollection.js';

const games = [{ appid: 10 }, { appid: 20 }, { appid: 30 }];
const record = (date, appid) => ({ date, appid });

test('오늘 게임이 전부 저장됐으면 live 재호출 대상이 0개다', () => {
  const records = games.map((game) => record('2026-08-28', game.appid));
  assert.deepEqual(pendingGamesForDate(records, games, '2026-08-28'), []);
});

test('오늘 빠진 게임만 다시 재고 기존 행은 건드리지 않는다', () => {
  const records = [record('2026-08-28', 10), record('2026-08-28', 30)];
  assert.deepEqual(pendingGamesForDate(records, games, '2026-08-28'), [{ appid: 20 }]);
});

test('이전 날짜 기록은 오늘 수집을 막지 않는다', () => {
  const records = games.map((game) => record('2026-08-27', game.appid));
  assert.deepEqual(pendingGamesForDate(records, games, '2026-08-28'), games);
});

test('fixture signalId 행은 live appid 완료 여부로 세지 않는다', () => {
  const records = [{ date: '2026-08-28', signalId: 'aleph-demo-index' }];
  assert.deepEqual(pendingGamesForDate(records, games, '2026-08-28'), games);
});
