import { test } from 'node:test';
import assert from 'node:assert/strict';

import { movers, graveyard, leaderboard, dayStrip, aliveLabel, ageOf, ALIVE_RULE } from '../src/view/panels.js';

const rec = (date, appid, value) => ({
  value, unit: '명', appid, date,
  sourceUrl: `https://x?appid=${appid}`, sourceLabel: 'Steam · 동시접속자',
  timezone: 'Asia/Seoul', fetchedAt: `${date}T01:10:00.000Z`,
});

const GAMES = [
  { appid: 730, name: 'Counter-Strike 2', year: 2012, tier: 'active' },
  { appid: 570, name: 'Dota 2', year: 2013, tier: 'active' },
  { appid: 550, name: 'Left 4 Dead 2', year: 2009, tier: 'legacy' },
  { appid: 10, name: 'Counter-Strike', year: 2000, tier: 'legacy' },
  { appid: 72850, name: 'Skyrim', year: 2011, tier: 'legacy' },
];

test('이전 기록이 없으면 급상승·급하락을 만들지 않는다', () => {
  const records = GAMES.map((g) => rec('2026-08-27', g.appid, 1000));
  assert.equal(movers(records, GAMES, '2026-08-27'), null);
});

test('이틀이 모이면 오른 게임과 내린 게임을 나눈다', () => {
  const records = [
    rec('2026-08-27', 730, 500000), rec('2026-08-28', 730, 550000),   // +10%
    rec('2026-08-27', 570, 400000), rec('2026-08-28', 570, 380000),   // -5%
    rec('2026-08-27', 550, 20000), rec('2026-08-28', 550, 30000),     // +50%
  ];
  const m = movers(records, GAMES, '2026-08-28');
  assert.deepEqual(m.risers.map((r) => r.name), ['Left 4 Dead 2', 'Counter-Strike 2']);
  assert.deepEqual(m.fallers.map((r) => r.name), ['Dota 2']);
  assert.equal(m.compared, 3);
  assert.equal(m.previousDate, '2026-08-27');
});

test('변화율이 큰 순으로 세운다 — 절대량이 아니다', () => {
  const records = [
    rec('2026-08-27', 730, 500000), rec('2026-08-28', 730, 550000),   // +50,000 · +10%
    rec('2026-08-27', 550, 1000), rec('2026-08-28', 550, 2000),       // +1,000 · +100%
  ];
  const m = movers(records, GAMES, '2026-08-28');
  assert.equal(m.risers[0].name, 'Left 4 Dead 2', '절대량으로 세웠다');
  assert.equal(m.risers[0].percent, 100);
});

test('이전 값이 0 이면 변화율을 만들지 않고 건너뛴다', () => {
  const records = [
    rec('2026-08-27', 550, 0), rec('2026-08-28', 550, 500),
    rec('2026-08-27', 730, 100), rec('2026-08-28', 730, 200),
  ];
  const m = movers(records, GAMES, '2026-08-28');
  assert.equal(m.compared, 1, '0 에서 늘어난 것을 변화율로 만들었다');
  assert.equal(m.skipped >= 1, true);
});

test('변화 없는 게임은 양쪽 어디에도 넣지 않는다', () => {
  const records = [rec('2026-08-27', 730, 500), rec('2026-08-28', 730, 500)];
  const m = movers(records, GAMES, '2026-08-28');
  assert.equal(m.risers.length, 0);
  assert.equal(m.fallers.length, 0);
  assert.equal(m.compared, 1);
});

test('무엇과 견줬는지 날짜를 함께 준다', () => {
  const records = [rec('2026-08-25', 730, 100), rec('2026-08-28', 730, 200)];
  // 사흘 건너뛴 기록이라도 '어제' 라고 하면 거짓말이 된다
  assert.equal(movers(records, GAMES, '2026-08-28').previousDate, '2026-08-25');
});

test('오래된 게임은 첫날부터 보인다 — 이전 기록이 필요 없다', () => {
  const records = [
    rec('2026-08-27', 550, 25947), rec('2026-08-27', 10, 5884),
    rec('2026-08-27', 72850, 998), rec('2026-08-27', 730, 551673),
  ];
  const g = graveyard(records, GAMES, '2026-08-27');
  assert.equal(g.length, 3, '현역 게임이 섞였다');
  assert.deepEqual(g.map((x) => x.year), [2000, 2009, 2011], '오래된 순이 아니다');
});

test('그날 기록이 없는 게임은 빼고, 하나도 없으면 null', () => {
  assert.equal(graveyard([], GAMES, '2026-08-27'), null);
  const one = graveyard([rec('2026-08-27', 10, 5884)], GAMES, '2026-08-27');
  assert.equal(one.length, 1);
});

test('생존 분류는 정해진 경계만 쓴다 — 무작위가 아니다', () => {
  assert.equal(aliveLabel(551673), '아직 붐빈다');
  assert.equal(aliveLabel(10000), '아직 붐빈다');
  assert.equal(aliveLabel(9999), '살아 있다');
  assert.equal(aliveLabel(1000), '살아 있다');
  assert.equal(aliveLabel(999), '드물다');
  assert.equal(aliveLabel(100), '드물다');
  assert.equal(aliveLabel(99), '거의 비었다');
  assert.equal(aliveLabel(0), '거의 비었다');
});

test('값이 없으면 분류하지 않는다', () => {
  for (const bad of [null, undefined, NaN, -1, '1000']) {
    assert.equal(aliveLabel(bad), null, `분류해버림: ${bad}`);
  }
});

test('분류 경계가 내림차순이라 첫 일치가 곧 정답이다', () => {
  const mins = ALIVE_RULE.map((r) => r.min);
  assert.deepEqual(mins, [...mins].sort((a, b) => b - a));
  assert.equal(mins.at(-1), 0, '0 을 받아 줄 칸이 없다');
});

test('게임 나이를 센다', () => {
  assert.equal(ageOf(2000, '2026-08-27'), 26);
  assert.equal(ageOf(2026, '2026-08-27'), 0);
  assert.equal(ageOf(2030, '2026-08-27'), null, '미래 게임을 음수로 셌다');
  assert.equal(ageOf('2000', '2026-08-27'), null);
});

test('오래된 게임을 기본으로 자르지 않는다 — 사람 적은 줄이 곧 답이다', () => {
  const legacy = GAMES.filter((g) => g.tier === 'legacy');
  const records = legacy.map((g) => rec('2026-08-27', g.appid, 100));
  assert.equal(graveyard(records, GAMES, '2026-08-27').length, legacy.length);
});

test('원하면 자를 수 있다', () => {
  const legacy = GAMES.filter((g) => g.tier === 'legacy');
  const records = legacy.map((g) => rec('2026-08-27', g.appid, 100));
  assert.equal(graveyard(records, GAMES, '2026-08-27', { limit: 2 }).length, 2);
});

// ── 줄세우기 ──────────────────────────────────────────────

test('첫날에도 줄세우기는 성립한다 — 이전 기록이 필요 없다', () => {
  const records = [
    rec('2026-08-27', 730, 500000),
    rec('2026-08-27', 570, 300000),
    rec('2026-08-27', 550, 200000),
  ];
  const b = leaderboard(records, GAMES, '2026-08-27');
  assert.deepEqual(b.rows.map((r) => r.name), ['Counter-Strike 2', 'Dota 2', 'Left 4 Dead 2']);
  assert.equal(b.total, 1000000);
  assert.equal(b.measured, 3);
});

test('못 가져온 게임은 행을 만들지 않는다 — 0 으로 채우지 않는다', () => {
  const records = [rec('2026-08-27', 730, 500000), rec('2026-08-27', 570, 300000)];
  const b = leaderboard(records, GAMES, '2026-08-27');
  assert.equal(b.measured, 2);
  assert.equal(b.missing, 3);
  assert.equal(b.rows.some((r) => r.value === 0), false);
});

test('비중의 분모는 잰 것의 합이다 — 손으로 맞아떨어진다', () => {
  const records = [
    rec('2026-08-27', 730, 750000),
    rec('2026-08-27', 570, 250000),
  ];
  const b = leaderboard(records, GAMES, '2026-08-27');
  assert.equal(b.total, 1000000);
  assert.equal(b.rows[0].shareOfMeasured, 75);
  assert.equal(b.rows[1].shareOfMeasured, 25);
  assert.equal(b.rows[0].relative, 100);
  // 부동소수 나눗셈이라 자릿수 끝은 안 맞는다. 화면이 쓰는 자리까지만 견준다.
  assert.equal(b.rows[1].relative.toFixed(4), (100 / 3).toFixed(4));
});

test('진짜 0 명인 게임은 행을 만들되 비중이 0 이다', () => {
  const records = [rec('2026-08-27', 730, 100), rec('2026-08-27', 72850, 0)];
  const b = leaderboard(records, GAMES, '2026-08-27');
  assert.equal(b.measured, 2);
  const dead = b.rows.find((r) => r.appid === 72850);
  assert.equal(dead.value, 0);
  assert.equal(dead.shareOfMeasured, 0);
  assert.equal(dead.rank, 2);
});

test('합이 0 이면 비율을 만들지 않는다 — 0 으로 나누지 않는다', () => {
  const records = [rec('2026-08-27', 730, 0), rec('2026-08-27', 570, 0)];
  const b = leaderboard(records, GAMES, '2026-08-27');
  assert.equal(b.total, 0);
  assert.equal(b.rows[0].shareOfMeasured, null);
  assert.equal(b.rows[0].relative, null);
});

test('그 날짜에 잰 것이 없으면 null 이다', () => {
  const records = [rec('2026-08-26', 730, 500000)];
  assert.equal(leaderboard(records, GAMES, '2026-08-27'), null);
});

test('다른 날짜 기록이 섞여도 그 날짜만 센다', () => {
  const records = [
    rec('2026-08-26', 730, 900000),
    rec('2026-08-27', 730, 500000),
    rec('2026-08-27', 570, 500000),
  ];
  const b = leaderboard(records, GAMES, '2026-08-27');
  assert.equal(b.total, 1000000);
  assert.equal(b.rows[0].value, 500000);
});

test('값이 같으면 appid 로 갈라 순서가 흔들리지 않는다', () => {
  const records = [rec('2026-08-27', 730, 1000), rec('2026-08-27', 570, 1000)];
  const b = leaderboard(records, GAMES, '2026-08-27');
  assert.deepEqual(b.rows.map((r) => r.appid), [570, 730]);
  assert.deepEqual(b.rows.map((r) => r.rank), [1, 2]);
});

// ── 날짜 카드 줄 ──────────────────────────────────────────

test('기록이 있는 날짜만 카드가 된다 — 미래 칸을 만들지 않는다', () => {
  const records = [rec('2026-08-27', 730, 500000), rec('2026-08-28', 730, 510000)];
  const s = dayStrip(records, 730, '2026-08-28');
  assert.deepEqual(s.cards.map((c) => c.date), ['2026-08-27', '2026-08-28']);
  assert.equal(s.cards.at(-1).isToday, true);
  assert.equal(s.cards[0].isToday, false);
});

test('빠진 날의 카드를 만들지 않고 빈 날이 있었다고만 알린다', () => {
  const records = [
    rec('2026-08-25', 730, 500000),
    rec('2026-08-28', 730, 530000),   // 26·27 이 없다
  ];
  const s = dayStrip(records, 730, '2026-08-28');
  assert.equal(s.cards.length, 2);
  assert.equal(s.cards[1].gapBefore, 2);
  assert.equal(s.gaps, 1);
});

test('이어진 날짜면 빈 날이 없다', () => {
  const records = [rec('2026-08-27', 730, 500000), rec('2026-08-28', 730, 510000)];
  const s = dayStrip(records, 730, '2026-08-28');
  assert.equal(s.cards[1].gapBefore, 0);
  assert.equal(s.gaps, 0);
});

test('첫 카드는 견줄 앞 카드가 없어 차이를 만들지 않는다', () => {
  const records = [rec('2026-08-27', 730, 500000), rec('2026-08-28', 730, 510000)];
  const s = dayStrip(records, 730, '2026-08-28');
  assert.equal(s.cards[0].delta, null);
  assert.equal(s.cards[1].delta, 10000);
});

test('오래된 것부터 잘라 최근 것만 남긴다', () => {
  const records = ['2026-08-24', '2026-08-25', '2026-08-26'].map((d, i) => rec(d, 730, 100 + i));
  const s = dayStrip(records, 730, '2026-08-26', { limit: 2 });
  assert.deepEqual(s.cards.map((c) => c.date), ['2026-08-25', '2026-08-26']);
});

test('그 게임 기록이 없으면 줄을 만들지 않는다', () => {
  const records = [rec('2026-08-27', 730, 500000)];
  assert.equal(dayStrip(records, 570, '2026-08-27'), null);
});

test('다른 게임 기록이 섞여도 고른 게임만 센다', () => {
  const records = [
    rec('2026-08-27', 730, 500000), rec('2026-08-27', 570, 400000),
    rec('2026-08-28', 730, 510000), rec('2026-08-28', 570, 390000),
  ];
  const s = dayStrip(records, 570, '2026-08-28');
  assert.deepEqual(s.cards.map((c) => c.value), [400000, 390000]);
  assert.equal(s.cards[1].delta, -10000);
});
