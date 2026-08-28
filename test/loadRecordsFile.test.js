import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadRecordsFile, faultFromSearch, FAULT, FAULT_COPY, FAULT_BY_PARAM, FetchFault,
} from '../src/source/loadRecordsFile.js';

const rec = (date, appid, value) => ({
  value, unit: '명', appid, date,
  sourceUrl: `https://api.steampowered.com/x?appid=${appid}`,
  sourceLabel: 'Steam · 동시접속자',
  sourceTime: null,
  timezone: 'Asia/Seoul',
  fetchedAt: `${date}T01:10:00.000Z`,
});

const respond = (status, body, { json = true } = {}) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => { if (!json) throw new SyntaxError('bad'); return body; },
});

const throws = (err) => async () => { throw err; };
const named = (name) => Object.assign(new Error(name), { name });

async function faultOf(opts) {
  try {
    await loadRecordsFile({ url: '/data/records.json', ...opts });
  } catch (err) {
    assert.ok(err instanceof FetchFault, `FetchFault 가 아니다: ${err}`);
    return err.fault;
  }
  assert.fail('던지지 않았다');
}

test('주소창에서 재현할 장애를 읽는다', () => {
  assert.equal(faultFromSearch('?fault=timeout'), FAULT.TIMEOUT);
  assert.equal(faultFromSearch('?fault=RATE-LIMIT'), FAULT.RATE_LIMIT);
  assert.equal(faultFromSearch('?fault=offline'), FAULT.OFFLINE);
  assert.equal(faultFromSearch(''), null);
  assert.equal(faultFromSearch('?fault=nonsense'), null, '모르는 이름을 통과시켰다');
});

test('재현 스위치가 5종을 모두 덮는다', () => {
  const five = [FAULT.TIMEOUT, FAULT.AUTH, FAULT.RATE_LIMIT, FAULT.OFFLINE, FAULT.SCHEMA];
  assert.deepEqual(new Set(Object.values(FAULT_BY_PARAM)), new Set(five));
});

test('장애마다 다른 문구가 있다 — 같은 말로 뭉뚱그리지 않는다', () => {
  const titles = Object.values(FAULT).map((f) => FAULT_COPY[f]?.title);
  assert.ok(titles.every(Boolean), '문구가 없는 장애가 있다');
  assert.equal(new Set(titles).size, titles.length, '같은 문구를 쓰는 장애가 있다');
});

test('재현 모드는 실제로 부르지 않는다', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; };
  await assert.rejects(() => loadRecordsFile({ url: '/x', simulate: FAULT.TIMEOUT, fetchImpl }));
  assert.equal(called, false, '재현인데 진짜로 불렀다');
});

test('재현한 장애가 그대로 나온다', async () => {
  for (const f of Object.values(FAULT_BY_PARAM)) {
    assert.equal(await faultOf({ simulate: f, fetchImpl: respond(200, {}) }), f);
  }
});

test('정상 파일은 읽힌다', async () => {
  const body = { schemaVersion: 3, records: [rec('2026-08-27', 730, 551673)], source: { heroAppid: 730 } };
  const { data, quarantined } = await loadRecordsFile({ url: '/x', fetchImpl: respond(200, body) });
  assert.equal(data.records.length, 1);
  assert.equal(data.source.heroAppid, 730);
  assert.equal(quarantined.length, 0);
});

test('깨진 항목만 격리하고 성한 항목은 살린다', async () => {
  const body = { schemaVersion: 3, records: [rec('2026-08-27', 730, 551673), { junk: 1 }], source: {} };
  const { data, quarantined } = await loadRecordsFile({ url: '/x', fetchImpl: respond(200, body) });
  assert.equal(data.records.length, 1);
  assert.equal(quarantined.length, 1);
});

test('기록이 있는데 하나도 못 읽으면 SCHEMA', async () => {
  const body = { records: [{ junk: 1 }, { junk: 2 }], source: {} };
  assert.equal(await faultOf({ fetchImpl: respond(200, body) }), FAULT.SCHEMA);
});

test('빈 기록 파일은 오류가 아니다 — 아직 아무것도 안 쌓인 것뿐이다', async () => {
  const { data } = await loadRecordsFile({ url: '/x', fetchImpl: respond(200, { records: [], source: {} }) });
  assert.equal(data.records.length, 0);
});

test('실패 5종이 서로 다른 상태로 온다', async () => {
  assert.equal(await faultOf({ fetchImpl: throws(named('AbortError')) }), FAULT.TIMEOUT);
  assert.equal(await faultOf({ fetchImpl: throws(new TypeError('fetch failed')) }), FAULT.OFFLINE);
  assert.equal(await faultOf({ fetchImpl: respond(403, {}) }), FAULT.AUTH);
  assert.equal(await faultOf({ fetchImpl: respond(429, {}) }), FAULT.RATE_LIMIT);
  assert.equal(await faultOf({ fetchImpl: respond(200, null, { json: false }) }), FAULT.SCHEMA);
});

test('그 밖의 오류는 UNKNOWN 으로 남긴다', async () => {
  assert.equal(await faultOf({ fetchImpl: respond(500, {}) }), FAULT.UNKNOWN);
});
