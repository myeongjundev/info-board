import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fetchReading, FetchFault, FAULT } from '../src/source/fetchReading.js';

const NOW = new Date('2026-08-27T01:10:00Z');   // = 2026-08-27 10:10 KST

/** 응답 하나를 돌려주는 가짜 fetch. */
const respond = (status, body, { json = true } = {}) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (!json) throw new SyntaxError('Unexpected token');
    return body;
  },
});

const throws = (err) => async () => { throw err; };

const named = (name) => Object.assign(new Error(name), { name });

async function faultOf(fetchImpl) {
  try {
    await fetchReading(730, { fetchImpl, now: NOW });
  } catch (err) {
    assert.ok(err instanceof FetchFault, `FetchFault 가 아니다: ${err}`);
    return err.fault;
  }
  assert.fail('던지지 않았다');
}

test('정상 응답은 Reading 하나로 온다', async () => {
  const r = await fetchReading(730, {
    fetchImpl: respond(200, { response: { player_count: 551673, result: 1 } }),
    now: NOW,
  });
  assert.equal(r.value, 551673);
  assert.equal(r.unit, '명');
  assert.equal(r.appid, 730);
  assert.equal(r.date, '2026-08-27');
  assert.equal(r.timezone, 'Asia/Seoul');
  assert.equal(r.sourceTime, null);
  assert.equal(r.signalId, 'steam-concurrent-players.730');
  assert.equal(r.fetchedAt, '2026-08-27T01:10:00.000Z');
  assert.match(r.sourceUrl, /appid=730/);
});

test('잰 날과 잰 시각을 따로 담는다', async () => {
  const r = await fetchReading(730, {
    fetchImpl: respond(200, { response: { player_count: 1, result: 1 } }),
    now: NOW,
  });
  // 하나에서 둘 다 나와야 "값은 새 것인데 시각은 옛 것" 이 불가능해진다
  assert.notEqual(r.date, r.fetchedAt);
  assert.ok(r.fetchedAt.startsWith(r.date), '같은 순간을 가리켜야 한다');
});

test('응답이 늦으면 TIMEOUT', async () => {
  assert.equal(await faultOf(throws(named('AbortError'))), FAULT.TIMEOUT);
});

test('닿지 못하면 OFFLINE — 늦은 것과 다른 뜻이다', async () => {
  assert.equal(await faultOf(throws(new TypeError('fetch failed'))), FAULT.OFFLINE);
});

test('401·403 은 AUTH', async () => {
  assert.equal(await faultOf(respond(401, {})), FAULT.AUTH);
  assert.equal(await faultOf(respond(403, {})), FAULT.AUTH);
});

test('429 는 RATE_LIMIT', async () => {
  assert.equal(await faultOf(respond(429, {})), FAULT.RATE_LIMIT);
});

test('JSON 이 아니면 SCHEMA', async () => {
  assert.equal(await faultOf(respond(200, null, { json: false })), FAULT.SCHEMA);
});

test('형식이 달라지면 SCHEMA — 0 으로 대체하지 않는다', async () => {
  assert.equal(await faultOf(respond(200, { response: { result: 1 } })), FAULT.SCHEMA);
  assert.equal(await faultOf(respond(200, { players: 551673 })), FAULT.SCHEMA);
});

test('없는 appid 는 SCHEMA — result 가 1 이 아니다', async () => {
  assert.equal(await faultOf(respond(200, { response: { result: 42 } })), FAULT.SCHEMA);
});

test('그 밖의 오류는 UNKNOWN 으로 남긴다 — 아는 척하지 않는다', async () => {
  assert.equal(await faultOf(respond(500, {})), FAULT.UNKNOWN);
});

test('장애 5종이 서로 다른 값이다', () => {
  const five = [FAULT.TIMEOUT, FAULT.AUTH, FAULT.RATE_LIMIT, FAULT.OFFLINE, FAULT.SCHEMA];
  assert.equal(new Set(five).size, 5);
});

test('실패하면 값을 돌려주지 않는다', async () => {
  await assert.rejects(
    () => fetchReading(730, { fetchImpl: respond(429, {}), now: NOW }),
    (err) => err instanceof FetchFault && err.fault === FAULT.RATE_LIMIT,
  );
});
