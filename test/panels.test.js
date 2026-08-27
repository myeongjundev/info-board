import { test } from 'node:test';
import assert from 'node:assert/strict';

import { movers, graveyard, leaderboard, dayStrip, byGenre, withGenres, timeBias, rankMovement, aliveLabel, ageOf, ALIVE_RULE } from '../src/view/panels.js';

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

// ── 장르로 묶기 ───────────────────────────────────────────

const GG = [
  { appid: 730, name: 'Counter-Strike 2', year: 2012, tier: 'active', genre: '슈터' },
  { appid: 578080, name: 'PUBG', year: 2017, tier: 'active', genre: '슈터' },
  { appid: 570, name: 'Dota 2', year: 2013, tier: 'active', genre: 'MOBA' },
  { appid: 72850, name: 'Skyrim', year: 2011, tier: 'legacy', genre: 'RPG' },
];

test('장르마다 분류한 개수와 실제로 잰 개수를 따로 준다', () => {
  // 슈터 2개를 분류했는데 오늘 잰 것은 1개다.
  const records = [rec('2026-08-27', 730, 500000), rec('2026-08-27', 570, 400000)];
  const b = byGenre(records, GG, '2026-08-27');
  const fps = b.genres.find((g) => g.genre === '슈터');
  assert.equal(fps.listed, 2);
  assert.equal(fps.measured, 1);
  assert.equal(fps.total, 500000);
});

test('한 개짜리 장르도 1등을 주되 measured 로 그 사실을 알 수 있다', () => {
  const records = [rec('2026-08-27', 730, 500000), rec('2026-08-27', 570, 400000)];
  const b = byGenre(records, GG, '2026-08-27');
  const moba = b.genres.find((g) => g.genre === 'MOBA');
  assert.equal(moba.leader.name, 'Dota 2');
  assert.equal(moba.measured, 1);   // 1등이 아니라 그냥 하나뿐이다
});

test('못 가져온 게임은 장르 합계에 0 으로 안 들어간다', () => {
  const records = [rec('2026-08-27', 730, 500000)];
  const b = byGenre(records, GG, '2026-08-27');
  assert.equal(b.genres.length, 1);
  assert.equal(b.genres[0].genre, '슈터');
  assert.equal(b.total, 500000);
});

test('장르 합계 비중의 분모는 잰 것의 합이다', () => {
  const records = [
    rec('2026-08-27', 730, 600000), rec('2026-08-27', 578080, 150000),  // 슈터 750000
    rec('2026-08-27', 570, 250000),                                      // MOBA 250000
  ];
  const b = byGenre(records, GG, '2026-08-27');
  assert.equal(b.total, 1000000);
  assert.equal(b.genres[0].genre, '슈터');
  assert.equal(b.genres[0].shareOfMeasured, 75);
  assert.equal(b.genres[1].shareOfMeasured, 25);
});

test('어제 대비는 양쪽 날에 다 있는 게임만 더한다', () => {
  const records = [
    rec('2026-08-26', 730, 500000), rec('2026-08-27', 730, 550000),   // 짝 맞음
    rec('2026-08-27', 578080, 900000),                                 // 어제가 없다
  ];
  const b = byGenre(records, GG, '2026-08-27');
  const fps = b.genres.find((g) => g.genre === '슈터');
  assert.equal(fps.total, 1450000);          // 오늘 합계는 둘 다 센다
  assert.equal(fps.measured, 2);
  assert.equal(fps.paired, 1);               // 견줄 수 있는 것은 하나뿐
  assert.equal(fps.delta, 50000);            // 900000 을 증가로 세지 않는다
  assert.equal(fps.percent, 10);
  assert.equal(fps.pairedPrevTotal, 500000);
});

test('이전 날이 없으면 변화를 만들지 않는다', () => {
  const records = [rec('2026-08-27', 730, 500000)];
  const b = byGenre(records, GG, '2026-08-27');
  assert.equal(b.previousDate, null);
  assert.equal(b.genres[0].delta, null);
  assert.equal(b.genres[0].percent, null);
  assert.equal(b.genres[0].paired, 0);
});

test('바로 앞에 기록이 있는 날을 이전 날로 삼는다 — 달력상 어제가 아니어도', () => {
  const records = [rec('2026-08-24', 730, 400000), rec('2026-08-27', 730, 440000)];
  const b = byGenre(records, GG, '2026-08-27');
  assert.equal(b.previousDate, '2026-08-24');
  assert.equal(b.genres[0].delta, 40000);
});

test('장르를 안 적은 게임은 분류 없음 으로 모인다', () => {
  const games = [{ appid: 730, name: 'CS2', year: 2012, tier: 'active' }];
  const b = byGenre([rec('2026-08-27', 730, 100)], games, '2026-08-27');
  assert.equal(b.genres[0].genre, '분류 없음');
});

test('그 날짜에 잰 것이 없으면 null 이다', () => {
  assert.equal(byGenre([rec('2026-08-26', 730, 1)], GG, '2026-08-27'), null);
});

test('이전 합이 0 이면 변화율을 만들지 않는다', () => {
  const records = [rec('2026-08-26', 730, 0), rec('2026-08-27', 730, 500)];
  const b = byGenre(records, GG, '2026-08-27');
  assert.equal(b.genres[0].delta, 500);
  assert.equal(b.genres[0].percent, null);
});

test('기록 파일에 장르가 없어도 코드 표에서 얹어 준다', () => {
  const file = [{ appid: 730, name: 'Counter-Strike 2', year: 2012, tier: 'active' }];
  const out = withGenres(file, [{ appid: 730, name: 'CS2', year: 2012, tier: 'active', genre: '슈터' }]);
  assert.equal(out[0].genre, '슈터');
});

test('값과 이어지는 이름·연도는 파일 것을 지킨다', () => {
  const file = [{ appid: 730, name: '그날의 이름', year: 2012, tier: 'active' }];
  const out = withGenres(file, [{ appid: 730, name: '바뀐 이름', year: 1999, tier: 'active', genre: '슈터' }]);
  assert.equal(out[0].name, '그날의 이름');
  assert.equal(out[0].year, 2012);
});

test('코드 표에 없는 게임도 지우지 않는다 — 그날 잰 값이 사라지면 안 된다', () => {
  const file = [{ appid: 111, name: '뺀 게임', year: 2020, tier: 'active' }];
  const out = withGenres(file, []);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, '뺀 게임');
  assert.equal(out[0].genre, undefined);
});

test('빈 입력에도 터지지 않는다', () => {
  assert.deepEqual(withGenres(null, null), []);
});

test('장르 안 막대 길이는 그 장르 1위 대비다 — 전체 1위가 아니다', () => {
  const records = [
    rec('2026-08-27', 730, 800000), rec('2026-08-27', 578080, 200000),  // 슈터: 1위 800000
    rec('2026-08-27', 570, 1000), rec('2026-08-27', 72850, 500),        // MOBA 1000 · RPG 500
  ];
  const b = byGenre(records, GG, '2026-08-27');
  const fps = b.genres.find((g) => g.genre === '슈터');
  assert.equal(fps.rows[0].relativeInGenre, 100);
  assert.equal(fps.rows[1].relativeInGenre, 25);   // 200000 / 800000

  // 작은 장르도 자기 1위가 100 이다. 전체 1위(800000)에 맞추면 0.1% 라 안 보인다.
  const moba = b.genres.find((g) => g.genre === 'MOBA');
  assert.equal(moba.rows[0].relativeInGenre, 100);
});

test('장르 안이 전부 0 이면 막대를 그리지 않는다', () => {
  const records = [rec('2026-08-27', 730, 0), rec('2026-08-27', 578080, 0)];
  const b = byGenre(records, GG, '2026-08-27');
  assert.equal(b.genres[0].rows[0].relativeInGenre, null);
});

// ── 시각이 값을 흔든다 ────────────────────────────────────

const probeOf = (at, values) => ({ schemaVersion: 1, samples: [{ at, values }] });

test('정규 기록과 다른 시각 표본을 견준다', () => {
  const records = [rec('2026-08-27', 730, 500000), rec('2026-08-27', 570, 400000)];
  const probe = probeOf('2026-08-27T07:30:00.000Z', { 730: 600000, 570: 380000 });
  const t = timeBias(records, probe, GAMES, '2026-08-27');
  assert.equal(t.measured, 2);
  assert.equal(t.rows[0].name, 'Counter-Strike 2');
  assert.equal(t.rows[0].delta, 100000);
  assert.equal(t.rows[0].percent, 20);
  assert.equal(t.rows[1].delta, -20000);
  assert.equal(t.probeAt, '2026-08-27T07:30:00.000Z');
});

test('많이 오른 것부터 세운다', () => {
  const records = [rec('2026-08-27', 730, 100), rec('2026-08-27', 570, 100), rec('2026-08-27', 550, 100)];
  const probe = probeOf('2026-08-27T07:30:00.000Z', { 730: 110, 570: 300, 550: 50 });
  const t = timeBias(records, probe, GAMES, '2026-08-27');
  assert.deepEqual(t.rows.map((r) => r.percent), [200, 10, -50]);
});

test('표본에 없는 게임은 행을 만들지 않는다', () => {
  const records = [rec('2026-08-27', 730, 100), rec('2026-08-27', 570, 100)];
  const probe = probeOf('2026-08-27T07:30:00.000Z', { 730: 110 });
  const t = timeBias(records, probe, GAMES, '2026-08-27');
  assert.equal(t.measured, 1);
});

test('표본이 없으면 만들지 않는다', () => {
  const records = [rec('2026-08-27', 730, 100)];
  assert.equal(timeBias(records, null, GAMES, '2026-08-27'), null);
  assert.equal(timeBias(records, { samples: [] }, GAMES, '2026-08-27'), null);
});

test('가장 최근 표본을 쓴다', () => {
  const records = [rec('2026-08-27', 730, 100)];
  const probe = { schemaVersion: 1, samples: [
    { at: '2026-08-27T03:00:00.000Z', values: { 730: 200 } },
    { at: '2026-08-27T09:00:00.000Z', values: { 730: 300 } },
  ] };
  const t = timeBias(records, probe, GAMES, '2026-08-27');
  assert.equal(t.probeAt, '2026-08-27T09:00:00.000Z');
  assert.equal(t.rows[0].atProbe, 300);
});

test('정규 기록이 0 이면 변화율을 만들지 않고 맨 뒤로 보낸다', () => {
  const records = [rec('2026-08-27', 730, 0), rec('2026-08-27', 570, 100)];
  const probe = probeOf('2026-08-27T07:30:00.000Z', { 730: 50, 570: 110 });
  const t = timeBias(records, probe, GAMES, '2026-08-27');
  assert.equal(t.rows.at(-1).appid, 730);
  assert.equal(t.rows.at(-1).percent, null);
  assert.equal(t.rows.at(-1).delta, 50);
});

test('그 날짜 기록이 없으면 만들지 않는다', () => {
  const records = [rec('2026-08-26', 730, 100)];
  const probe = probeOf('2026-08-27T07:30:00.000Z', { 730: 110 });
  assert.equal(timeBias(records, probe, GAMES, '2026-08-27'), null);
});

// ── 순위 이동 ─────────────────────────────────────────────

test('양수가 올라간 것이다 — 순위는 숫자가 작아지는 쪽이 상승이다', () => {
  const records = [
    rec('2026-08-27', 730, 500), rec('2026-08-27', 570, 900),   // 어제: 570 1위, 730 2위
    rec('2026-08-28', 730, 900), rec('2026-08-28', 570, 500),   // 오늘: 730 1위, 570 2위
  ];
  const m = rankMovement(records, GAMES, '2026-08-28');
  const cs = m.rows.find((r) => r.appid === 730);
  assert.equal(cs.previousRank, 2);
  assert.equal(cs.currentRank, 1);
  assert.equal(cs.movement, 1);
  const dota = m.rows.find((r) => r.appid === 570);
  assert.equal(dota.movement, -1);
});

// 이 테스트 하나가 이 함수의 존재 이유다.
test('분모가 바뀐 것을 하락으로 만들지 않는다', () => {
  const records = [
    // 어제는 두 개만 쟀다. 730 이 2위였다.
    rec('2026-08-27', 570, 900), rec('2026-08-27', 730, 500),
    // 오늘은 다섯 개를 쟀고 730 은 여전히 570 다음이다.
    rec('2026-08-28', 570, 900), rec('2026-08-28', 730, 500),
    rec('2026-08-28', 550, 800), rec('2026-08-28', 10, 700), rec('2026-08-28', 72850, 600),
  ];
  const m = rankMovement(records, GAMES, '2026-08-28');
  // 교집합은 둘뿐이다. 그 안에서 730 은 어제도 오늘도 2위다.
  assert.equal(m.basis, 2);
  assert.equal(m.excludedToday, 3);
  const cs = m.rows.find((r) => r.appid === 730);
  assert.equal(cs.previousRank, 2);
  assert.equal(cs.currentRank, 2);
  assert.equal(cs.movement, 0);   // 전체 순위로 보면 2위 → 5위지만 하락이 아니다
});

test('어제만 있는 게임도 세어 둔다', () => {
  const records = [
    rec('2026-08-27', 730, 500), rec('2026-08-27', 570, 400),
    rec('2026-08-28', 730, 500),
  ];
  const m = rankMovement(records, GAMES, '2026-08-28');
  assert.equal(m.basis, 1);
  assert.equal(m.excludedBefore, 1);
  assert.equal(m.excludedToday, 0);
});

test('이전 날이 없으면 만들지 않는다', () => {
  const records = [rec('2026-08-27', 730, 500)];
  assert.equal(rankMovement(records, GAMES, '2026-08-27'), null);
});

test('겹치는 게임이 하나도 없으면 만들지 않는다', () => {
  const records = [rec('2026-08-27', 730, 500), rec('2026-08-28', 570, 400)];
  assert.equal(rankMovement(records, GAMES, '2026-08-28'), null);
});

test('값이 같으면 appid 로 갈라 순위가 흔들리지 않는다', () => {
  const records = [
    rec('2026-08-27', 730, 100), rec('2026-08-27', 570, 100),
    rec('2026-08-28', 730, 100), rec('2026-08-28', 570, 100),
  ];
  const m = rankMovement(records, GAMES, '2026-08-28');
  assert.deepEqual(m.rows.map((r) => r.appid), [570, 730]);
  assert.deepEqual(m.rows.map((r) => r.movement), [0, 0]);
});

test('오늘 순위 차례로 세운다', () => {
  const records = [
    rec('2026-08-27', 730, 100), rec('2026-08-27', 570, 200), rec('2026-08-27', 550, 300),
    rec('2026-08-28', 730, 300), rec('2026-08-28', 570, 200), rec('2026-08-28', 550, 100),
  ];
  const m = rankMovement(records, GAMES, '2026-08-28');
  assert.deepEqual(m.rows.map((r) => r.currentRank), [1, 2, 3]);
  assert.deepEqual(m.rows.map((r) => r.movement), [2, 0, -2]);
});

test('바로 앞에 기록이 있는 날을 이전 날로 삼는다', () => {
  const records = [rec('2026-08-24', 730, 100), rec('2026-08-28', 730, 200)];
  const m = rankMovement(records, GAMES, '2026-08-28');
  assert.equal(m.previousDate, '2026-08-24');
});
