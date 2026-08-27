import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  appendStreamingHistory,
  crossPlatformGames,
  formatViewerCount,
  previousStreamingReading,
  rankGameBroadcasts,
  streamingRankTrend,
  validateStreamingHistory,
  validateStreamingSnapshot,
} from '../src/source/streaming.js';

test('streaming snapshot은 두 플랫폼의 연결 상태를 보존한다', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../data/streaming.json', import.meta.url)));
  assert.equal(validateStreamingSnapshot(snapshot), true);
  assert.deepEqual(snapshot.platforms.map((item) => item.id), ['chzzk', 'twitch']);
});

test('수집 실패를 빈 정상 스냅샷으로 가장하지 않는다', () => {
  const invalid = {
    schemaVersion: 1,
    methodology: { description: 'test' },
    platforms: [
      { id: 'chzzk', status: 'ok', fetchedAt: null, rankings: [] },
      { id: 'twitch', status: 'credentials_required', rankings: [] },
    ],
  };
  assert.equal(validateStreamingSnapshot(invalid), false);
});

test('시청자 수는 한국어 숫자로 표시한다', () => {
  assert.equal(formatViewerCount(123456), '123,456');
});

test('방송 표본을 게임별로 합산해 Top 10을 만든다', () => {
  const broadcasts = [
    { gameId: 'a', gameName: '게임 A', viewerCount: 100 },
    { gameId: 'b', gameName: '게임 B', viewerCount: 80 },
    { gameId: 'a', gameName: '게임 A', viewerCount: 30 },
    ...Array.from({ length: 10 }, (_, index) => ({
      gameId: `extra-${index}`,
      gameName: `게임 ${index}`,
      viewerCount: 10 - index,
    })),
  ];
  const ranked = rankGameBroadcasts(broadcasts);
  assert.equal(ranked.length, 10);
  assert.deepEqual(ranked[0], {
    rank: 1, gameId: 'a', gameName: '게임 A', viewerCount: 130, broadcastCount: 2,
    categoryUrl: null, imageUrl: null,
  });
  assert.equal(ranked[1].gameName, '게임 B');
  assert.deepEqual(ranked.map((item) => item.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('플랫폼별 기록을 쌓고 바로 전 정상 표본을 찾는다', () => {
  const platform = {
    id: 'chzzk', status: 'ok', fetchedAt: '2026-08-28T01:00:00.000Z',
    rankings: [{ rank: 1, gameName: '게임 A', viewerCount: 100 }],
  };
  const first = appendStreamingHistory({ schemaVersion: 1, readings: [] }, [platform]);
  const second = appendStreamingHistory(first, [{
    ...platform, fetchedAt: '2026-08-28T02:00:00.000Z',
    rankings: [{ rank: 1, gameName: '게임 A', viewerCount: 120 }],
  }]);
  assert.equal(validateStreamingHistory(second), true);
  assert.equal(previousStreamingReading(second, 'chzzk', '2026-08-28T02:00:00.000Z').fetchedAt, platform.fetchedAt);
});

test('이전 표본에서 순위와 시청자 변화를 계산한다', () => {
  const previous = {
    rankings: [
      { rank: 3, gameId: 'a', gameName: '게임 A', viewerCount: 100 },
      { rank: 1, gameId: 'b', gameName: '게임 B', viewerCount: 200 },
    ],
  };
  assert.deepEqual(
    streamingRankTrend({ rank: 1, gameId: 'a', gameName: '게임 A', viewerCount: 140 }, previous),
    { kind: 'up', label: '▲ 2', rankDelta: 2, viewerDelta: 40 },
  );
  assert.equal(streamingRankTrend({ rank: 2, gameId: 'c', gameName: '게임 C', viewerCount: 50 }, previous).kind, 'new');
});

test('한글·영문 이름이 다른 공통 게임도 두 플랫폼에서 찾는다', () => {
  const snapshot = {
    platforms: [
      { id: 'chzzk', status: 'ok', rankings: [{ rank: 2, gameName: '리그 오브 레전드', viewerCount: 100 }] },
      { id: 'twitch', status: 'ok', rankings: [{ rank: 4, gameName: 'League of Legends', viewerCount: 200 }] },
    ],
  };
  const shared = crossPlatformGames(snapshot);
  assert.equal(shared.length, 1);
  assert.equal(shared[0].chzzk.rank, 2);
  assert.equal(shared[0].twitch.rank, 4);
});
