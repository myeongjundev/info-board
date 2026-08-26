// 날짜별 기록. 진실의 원천은 저장소 안 data/records.json 이다.
//
// localStorage 가 아닌 이유: 카드 4·5 의 통과 기준이 "공개 주소에서 보인다" 이다.
// 브라우저에 저장하면 심사자 화면에는 기록이 0건이다. 저장소에 커밋하면 누가 열어도
// 같은 기록을 보고, git 이력이 그대로 "실제로 매일 돌았다" 는 증거가 된다.

export const SCHEMA_VERSION = 1;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 기록 한 건이 쓸 만한지. 아니면 이유를 돌려준다. */
export function validateRecord(r) {
  if (r === null || typeof r !== 'object') return '객체가 아니다';
  if (!DATE_RE.test(r.date)) return `date 형식이 아니다: ${JSON.stringify(r.date)}`;
  if (Number.isNaN(Date.parse(r.date))) return `달력에 없는 날짜다: ${r.date}`;
  if (typeof r.value !== 'number' || !Number.isFinite(r.value)) return `value 가 숫자가 아니다: ${JSON.stringify(r.value)}`;
  if (r.value < 0) return `value 가 음수다: ${r.value}`;
  if (typeof r.unit !== 'string' || r.unit === '') return 'unit 이 비었다';
  if (typeof r.fetchedAt !== 'string' || Number.isNaN(Date.parse(r.fetchedAt))) return `fetchedAt 이 시각이 아니다: ${JSON.stringify(r.fetchedAt)}`;
  return null;
}

/**
 * 저장 파일을 읽는다. 깨진 항목은 격리하고 성한 항목은 살린다.
 * 파일 하나가 상하면 전부 버리는 구조는 T03 에서 이미 한 번 피했다.
 */
export function loadRecords(raw) {
  const quarantined = [];
  let parsed;

  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    return { records: [], quarantined: [{ reason: `파일이 JSON 이 아니다: ${err.message}`, raw }] };
  }

  const list = Array.isArray(parsed?.records) ? parsed.records : [];
  const seen = new Map();

  for (const r of list) {
    const reason = validateRecord(r);
    if (reason) { quarantined.push({ reason, raw: r }); continue; }
    if (seen.has(r.date)) {
      quarantined.push({ reason: `같은 날짜가 두 번 있다: ${r.date}`, raw: r });
      continue;
    }
    seen.set(r.date, r);
  }

  const records = [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { records, quarantined };
}

/**
 * 하루 한 건. 같은 날짜가 이미 있으면 새로 넣지 않는다.
 * 같은 날 몇 번을 돌려도 기록이 늘지 않아야 한다.
 */
export function upsertRecord(records, next) {
  const reason = validateRecord(next);
  if (reason) throw new Error(`기록을 넣을 수 없다: ${reason}`);

  const idx = records.findIndex((r) => r.date === next.date);
  if (idx === -1) {
    return { records: [...records, next].sort((a, b) => a.date.localeCompare(b.date)), changed: true, kind: 'added' };
  }

  // 이미 있는 날짜다. 값이 같으면 아무것도 하지 않는다.
  if (records[idx].value === next.value) {
    return { records, changed: false, kind: 'unchanged' };
  }

  // 값이 달라졌다 = 원자료가 정정됐다. 덮어쓰되 처음 본 값을 남긴다.
  const prior = records[idx];
  const revised = {
    ...next,
    revisedFrom: prior.revisedFrom ?? prior.value,
    firstFetchedAt: prior.firstFetchedAt ?? prior.fetchedAt,
  };
  const copy = records.slice();
  copy[idx] = revised;
  return { records: copy, changed: true, kind: 'revised' };
}

/** 이전 기록 대비 변화. 비교할 게 없으면 만들어내지 않는다. */
export function compare(records, date) {
  const i = records.findIndex((r) => r.date === date);
  if (i <= 0) return null;
  const cur = records[i];
  const prev = records[i - 1];
  if (cur.unit !== prev.unit) return null;      // 단위가 다르면 비교하지 않는다
  const delta = cur.value - prev.value;
  return {
    previous: prev,
    current: cur,
    delta,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    percent: prev.value === 0 ? null : (delta / prev.value) * 100,
    unit: cur.unit,
  };
}

/** 값이 작아 일간 변동이 크다. 추세는 따로 본다. */
export function movingAverage(records, date, window = 7) {
  const i = records.findIndex((r) => r.date === date);
  if (i === -1) return null;
  const slice = records.slice(Math.max(0, i - window + 1), i + 1);
  if (slice.length < window) return null;       // 자료가 모자라면 표시하지 않는다
  const sum = slice.reduce((s, r) => s + r.value, 0);
  return { window, value: sum / slice.length, from: slice[0].date, to: slice.at(-1).date };
}

export function serialize(records, meta) {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...meta, records }, null, 2) + '\n';
}
