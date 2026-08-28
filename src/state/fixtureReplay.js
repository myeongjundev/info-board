// T04 공개 fixture를 제품의 실제 저장 규칙으로 재생한다.
// expected 필드는 판정에 쓰지 않는다. 입력의 transport·payload만 해석한 결과를
// 공개 기대값과 테스트에서 대조한다.

import { compare, upsertRecord } from './records.js';

export const REPLAY_FILES = {
  normal: 'normal-d2.json',
  timeout: 'timeout.json',
  auth: 'auth-401.json',
  'rate-limit': 'rate-429.json',
  offline: 'offline.json',
  schema: 'schema-break.json',
  recover: 'recover-d2.json',
};

export const REPLAY_BASELINE = ['normal-d1-a.json', 'normal-d1-b.json'];

const NORMALIZED_KEYS = [
  'signal_id', 'normalized_value', 'unit', 'source_name', 'source_url',
  'source_time', 'fetched_at', 'record_timezone', 'record_date',
];

export function resetReplayState() {
  return {
    records: [], freshness: null, errorCode: null, lastGood: null,
    delta: null, fixtureId: null,
  };
}

function validInstant(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function kstDate(instant) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function normalizeFixtureReading(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('payload가 객체가 아니다');
  const keys = Object.keys(payload).sort();
  const expectedKeys = NORMALIZED_KEYS.slice().sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new TypeError('payload 필드가 normalized Reading 스키마와 다르다');
  }
  if (typeof payload.signal_id !== 'string' || payload.signal_id.length > 100
    || !/^[a-z0-9][a-z0-9._-]*$/.test(payload.signal_id)) {
    throw new TypeError('signal_id 형식이 다르다');
  }
  if (typeof payload.normalized_value !== 'number' || !Number.isFinite(payload.normalized_value)) {
    throw new TypeError('normalized_value가 숫자가 아니다');
  }
  if (typeof payload.unit !== 'string' || payload.unit === '' || payload.unit.length > 24) throw new TypeError('unit이 비었다');
  if (typeof payload.source_name !== 'string' || payload.source_name === '' || payload.source_name.length > 120) throw new TypeError('source_name이 비었다');
  let sourceUrl;
  try { sourceUrl = new URL(payload.source_url); } catch { throw new TypeError('source_url이 절대 URL이 아니다'); }
  if (sourceUrl.protocol !== 'https:') {
    throw new TypeError('source_url이 HTTPS가 아니다');
  }
  if (payload.source_time !== null && !validInstant(payload.source_time)) throw new TypeError('source_time 형식이 다르다');
  if (!validInstant(payload.fetched_at)) throw new TypeError('fetched_at 형식이 다르다');
  if (payload.record_timezone !== 'Asia/Seoul') throw new TypeError('record_timezone이 다르다');
  // 공개 참조 adapter도 record_date를 fetched_at의 KST 날짜와 대조한다. 스키마의
  // 문자열 형식 검사보다 의도적으로 엄격하다. 한 Reading이 서로 다른 두 날짜를
  // 주장한 채 일별 행에 들어가는 것을 막으며, 공개 불변 fixture는 모두 이 계약을 따른다.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.record_date)
    || payload.record_date !== kstDate(payload.fetched_at)) throw new TypeError('record_date 형식이 다르다');

  return {
    recordId: `${payload.signal_id}|${payload.record_date}`,
    signalId: payload.signal_id,
    value: payload.normalized_value,
    unit: payload.unit,
    date: payload.record_date,
    sourceUrl: payload.source_url,
    sourceLabel: payload.source_name,
    sourceTime: payload.source_time,
    timezone: payload.record_timezone,
    fetchedAt: payload.fetched_at,
  };
}

export function applySuccessfulReading(state, payload, fixtureId = null) {
  const reading = normalizeFixtureReading(payload);
  const out = upsertRecord(state.records, reading);
  const diff = compare(out.records, reading.signalId, reading.date);
  return {
    records: out.records,
    freshness: 'fresh',
    errorCode: 'none',
    lastGood: reading,
    delta: diff?.delta ?? null,
    fixtureId,
    mutation: out.kind,
  };
}

export function applyReplayError(state, errorCode, fixtureId = null) {
  return {
    ...state,
    freshness: 'stale',
    errorCode,
    delta: null,
    fixtureId,
    mutation: 'preserved',
  };
}

export function runFixture(state, fixture) {
  const fixtureId = fixture?.fixture_id ?? null;
  const transport = fixture?.transport;
  if (!transport || typeof transport !== 'object') return applyReplayError(state, 'schema_error', fixtureId);
  if (transport.mode === 'timeout' || transport.delay_ms > transport.deadline_ms) {
    return applyReplayError(state, 'timeout', fixtureId);
  }
  if (transport.mode === 'offline') return applyReplayError(state, 'offline', fixtureId);
  if (transport.status === 401 || transport.status === 403) return applyReplayError(state, 'auth', fixtureId);
  if (transport.status === 429) return applyReplayError(state, 'rate_limit', fixtureId);
  if (transport.mode !== 'http' || transport.status < 200 || transport.status >= 300) {
    return applyReplayError(state, 'schema_error', fixtureId);
  }
  try {
    return applySuccessfulReading(state, fixture.payload, fixtureId);
  } catch {
    return applyReplayError(state, 'schema_error', fixtureId);
  }
}
