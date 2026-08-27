import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SOURCE, GAMES, HERO_APPID, gameOf, buildUrl,
  todayLocal, assertMeasurableNow, parse, SchemaError, GENRES,
} from '../src/source/definition.js';

// 2026-08-27 01:00 UTC = 2026-08-27 10:00 KST
const KST_MORNING = new Date('2026-08-27T01:00:00Z');
// 2026-08-26 16:00 UTC = 2026-08-27 01:00 KST — UTC 로는 어제, KST 로는 오늘
const KST_JUST_PAST_MIDNIGHT = new Date('2026-08-26T16:00:00Z');

test('게임 표에 appid 중복이 없다', () => {
  const ids = GAMES.map((g) => g.appid);
  assert.equal(new Set(ids).size, ids.length);
});

test('게임 표의 모든 항목에 이름과 연도가 있다', () => {
  for (const g of GAMES) {
    assert.ok(Number.isInteger(g.appid) && g.appid > 0, `appid: ${g.appid}`);
    assert.ok(typeof g.name === 'string' && g.name.length > 0, `name: ${g.name}`);
    assert.ok(Number.isInteger(g.year), `year: ${g.year}`);
    assert.ok(['active', 'legacy'].includes(g.tier), `tier: ${g.tier}`);
  }
});

test('대표 게임이 표 안에 있다', () => {
  assert.ok(gameOf(HERO_APPID), `${HERO_APPID} 가 GAMES 에 없다`);
});

test('출처 주소는 appid 를 그대로 담는다', () => {
  assert.equal(
    buildUrl(730),
    'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=730',
  );
});

test('todayLocal 은 KST 날짜를 준다 — UTC 자정을 넘긴 뒤에도', () => {
  assert.equal(todayLocal(KST_MORNING), '2026-08-27');
  // UTC 로는 26일이지만 KST 로는 이미 27일이다. 이걸 틀리면 날짜가 하루씩 밀린다.
  assert.equal(todayLocal(KST_JUST_PAST_MIDNIGHT), '2026-08-27');
});

test('오늘은 잴 수 있다', () => {
  assert.doesNotThrow(() => assertMeasurableNow('2026-08-27', KST_MORNING));
});

test('어제는 잴 수 없다 — 순간값은 과거를 되짚을 수 없다', () => {
  assert.throws(() => assertMeasurableNow('2026-08-26', KST_MORNING), RangeError);
});

test('내일도 잴 수 없다', () => {
  assert.throws(() => assertMeasurableNow('2026-08-28', KST_MORNING), RangeError);
});

test('날짜 형식이 아니면 거부한다', () => {
  for (const bad of ['2026-8-27', '20260827', 'tomorrow', '', '2026-02-31']) {
    assert.throws(() => assertMeasurableNow(bad, KST_MORNING), RangeError, `통과해버림: ${bad}`);
  }
});

test('정상 응답에서 값을 꺼낸다', () => {
  assert.equal(parse({ response: { player_count: 551673, result: 1 } }), 551673);
});

test('0 명은 정상값이다 — 아무도 안 하는 게임은 진짜로 0 이다', () => {
  assert.equal(parse({ response: { player_count: 0, result: 1 } }), 0);
});

test('형식이 어긋나면 던진다. 0 으로 대체하지 않는다', () => {
  const bad = [
    null,
    'not an object',
    {},                                              // response 없음
    { response: null },
    { response: { result: 42 } },                    // 없는 appid
    { response: { result: 1 } },                     // player_count 없음
    { response: { player_count: '551673', result: 1 } },
    { response: { player_count: -1, result: 1 } },
    { response: { player_count: NaN, result: 1 } },
  ];
  for (const b of bad) {
    assert.throws(() => parse(b), SchemaError, `통과해버림: ${JSON.stringify(b)}`);
  }
});

test('출처 정의에 단위와 기준 시간대가 있다', () => {
  assert.equal(SOURCE.unit, '명');
  assert.equal(SOURCE.timezone, 'Asia/Seoul');
  assert.ok(SOURCE.measuredAtLocal, '매일 재는 시각이 없다');
});

test('GAMES 의 모든 장르가 GENRES 에 있다 — 표가 갈라지지 않게', () => {
  for (const g of GAMES) {
    assert.ok(GENRES.includes(g.genre), `${g.name} 의 장르 '${g.genre}' 가 GENRES 에 없다`);
  }
});

test('GENRES 에 아무 게임도 없는 장르를 두지 않는다', () => {
  for (const name of GENRES) {
    assert.ok(GAMES.some((g) => g.genre === name), `장르 '${name}' 에 게임이 하나도 없다`);
  }
});

test('모든 게임에 장르가 붙어 있다', () => {
  for (const g of GAMES) assert.equal(typeof g.genre, 'string', `${g.name} 에 장르가 없다`);
});

// 표를 늘리다 생기는 사고를 막는다. appid·이름·연도는 전부 우리가 적은 주장이고,
// 원자료가 안 주므로 틀려도 API 가 알려주지 않는다. 형식만이라도 기계가 본다.

test('appid 가 겹치지 않는다', () => {
  const ids = GAMES.map((g) => g.appid);
  assert.equal(new Set(ids).size, ids.length, '같은 appid 를 두 번 넣었다');
});

test('appid 는 양의 정수다', () => {
  for (const g of GAMES) {
    assert.ok(Number.isInteger(g.appid) && g.appid > 0, `${g.name} 의 appid 가 이상하다`);
  }
});

test('이름이 비어 있지 않다', () => {
  for (const g of GAMES) {
    assert.equal(typeof g.name, 'string');
    assert.ok(g.name.trim().length > 0, `appid ${g.appid} 에 이름이 없다`);
  }
});

test('이름이 겹치지 않는다 — 붙여넣다 같은 줄을 두 번 넣으면 잡힌다', () => {
  const names = GAMES.map((g) => g.name);
  assert.equal(new Set(names).size, names.length);
});

test('연도가 Steam 이 있던 기간 안이다', () => {
  const thisYear = new Date().getUTCFullYear();
  for (const g of GAMES) {
    assert.ok(Number.isInteger(g.year), `${g.name} 의 연도가 정수가 아니다`);
    // Steam 은 2003 년에 나왔지만 그 전에 낸 게임(Counter-Strike 2000)도 올라와 있다.
    assert.ok(g.year >= 1998 && g.year <= thisYear, `${g.name} 의 연도 ${g.year} 가 범위 밖이다`);
  }
});

test('tier 는 둘 중 하나다', () => {
  for (const g of GAMES) {
    assert.ok(['active', 'legacy'].includes(g.tier), `${g.name} 의 tier 가 이상하다: ${g.tier}`);
  }
});

test('대표값 게임이 표 안에 있다', () => {
  assert.ok(GAMES.some((g) => g.appid === HERO_APPID));
});
