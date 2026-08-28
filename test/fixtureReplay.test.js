import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { resetReplayState, runFixture } from '../src/state/fixtureReplay.js';

const ROOT = new URL('../assets/t04-real-information-board-public-v1/fixtures/', import.meta.url);
const load = async (name) => JSON.parse(await readFile(new URL(name, ROOT), 'utf8'));

async function baseline() {
  let state = resetReplayState();
  state = runFixture(state, await load('normal-d1-a.json'));
  const firstId = state.records[0].recordId;
  state = runFixture(state, await load('normal-d1-b.json'));
  return { state, firstId };
}

test('같은 합성 날짜의 두 성공은 같은 행을 값 105로 갱신한다', async () => {
  const { state, firstId } = await baseline();
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].value, 105);
  assert.equal(state.records[0].recordId, firstId);
  assert.equal(state.mutation, 'updated');
  assert.deepEqual([state.freshness, state.errorCode], ['fresh', 'none']);
});

test('다음 합성 날짜 성공은 행 하나와 변화 +15를 만든다', async () => {
  let { state } = await baseline();
  state = runFixture(state, await load('normal-d2.json'));
  assert.equal(state.records.length, 2);
  assert.equal(state.records.filter((row) => row.date === '2026-08-25').length, 1);
  assert.equal(state.lastGood.value, 120);
  assert.equal(state.delta, 15);
});

test('다섯 실패는 상태를 구분하고 마지막 정상값 105와 행 1건을 보존한다', async () => {
  const cases = [
    ['timeout.json', 'timeout'], ['auth-401.json', 'auth'], ['rate-429.json', 'rate_limit'],
    ['offline.json', 'offline'], ['schema-break.json', 'schema_error'],
  ];
  for (const [file, errorCode] of cases) {
    let { state } = await baseline();
    state = runFixture(state, await load(file));
    assert.deepEqual([state.freshness, state.errorCode], ['stale', errorCode]);
    assert.equal(state.records.length, 1);
    assert.equal(state.lastGood.value, 105);
  }
});

test('C19 timeout 뒤 RECOVER-D2는 fresh/none, 행 2건, 신규 날짜 1건, 값 120이다', async () => {
  let { state } = await baseline();
  state = runFixture(state, await load('timeout.json'));
  assert.deepEqual([state.freshness, state.errorCode, state.records.length, state.lastGood.value], ['stale', 'timeout', 1, 105]);

  state = runFixture(state, await load('recover-d2.json'));
  assert.deepEqual([state.freshness, state.errorCode, state.records.length, state.lastGood.value], ['fresh', 'none', 2, 120]);
  assert.equal(state.records.filter((row) => row.date === '2026-08-25').length, 1);
  assert.equal(state.delta, 15);
});

test('fixture expected 서술은 실행 입력으로 사용하지 않는다', async () => {
  let { state } = await baseline();
  const fixture = await load('recover-d2.json');
  fixture.expected = { ...fixture.expected, stored_value: 999, row_count: 99 };
  state = runFixture(state, fixture);
  assert.equal(state.lastGood.value, 120);
  assert.equal(state.records.length, 2);
});

test('정규화 스키마 밖 필드는 schema_error로 중단하고 마지막 정상값을 지킨다', async () => {
  let { state } = await baseline();
  const fixture = await load('recover-d2.json');
  fixture.payload.unlisted = true;
  state = runFixture(state, fixture);
  assert.deepEqual([state.freshness, state.errorCode, state.records.length, state.lastGood.value], ['stale', 'schema_error', 1, 105]);
});
