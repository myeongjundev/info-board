// 날짜별 기록. 진실의 원천은 저장소 안 data/records.json 이다.
//
// localStorage 가 아닌 이유: 카드 4·5 의 통과 기준이 "공개 주소에서 보인다" 이다.
// 브라우저에 저장하면 심사자 화면에는 기록이 0건이다. 저장소에 커밋하면 누가 열어도
// 같은 기록을 보고, git 이력이 그대로 "실제로 매일 돌았다" 는 증거가 된다.
//
// 열쇠는 날짜 하나가 아니라 (날짜, appid) 다. 게임을 여러 개 재기 때문이다.
// 카드 4 가 막는 것은 "같은 날 같은 항목이 두 번 들어가는 것" 이므로 이 열쇠가 맞다.

export const SCHEMA_VERSION = 2;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 기록 한 건의 열쇠. 이게 같으면 같은 칸이다. */
export function keyOf(r) {
  return `${r.date}|${r.appid}`;
}

/** 기록 한 건이 쓸 만한지. 아니면 이유를 돌려준다. */
export function validateRecord(r) {
  if (r === null || typeof r !== 'object') return '객체가 아니다';
  if (!DATE_RE.test(r.date)) return `date 형식이 아니다: ${JSON.stringify(r.date)}`;
  // Date.parse('2026-02-31') 은 NaN 이 아니라 3월 3일로 굴러간다. 그래서 파싱만으로는
  // 달력에 없는 날을 못 잡는다. 되돌려 찍어서 같은 글자가 나오는지 본다.
  if (new Date(`${r.date}T00:00:00Z`).toISOString().slice(0, 10) !== r.date) {
    return `달력에 없는 날짜다: ${r.date}`;
  }
  if (!Number.isInteger(r.appid) || r.appid <= 0) return `appid 가 양의 정수가 아니다: ${JSON.stringify(r.appid)}`;
  if (typeof r.value !== 'number' || !Number.isFinite(r.value)) return `value 가 숫자가 아니다: ${JSON.stringify(r.value)}`;
  if (r.value < 0) return `value 가 음수다: ${r.value}`;
  if (typeof r.unit !== 'string' || r.unit === '') return 'unit 이 비었다';
  if (typeof r.fetchedAt !== 'string' || Number.isNaN(Date.parse(r.fetchedAt))) return `fetchedAt 이 시각이 아니다: ${JSON.stringify(r.fetchedAt)}`;
  return null;
}

function sortRecords(list) {
  return list.slice().sort((a, b) => a.date.localeCompare(b.date) || a.appid - b.appid);
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
    const k = keyOf(r);
    if (seen.has(k)) {
      quarantined.push({ reason: `같은 날 같은 게임이 두 번 있다: ${k}`, raw: r });
      continue;
    }
    seen.set(k, r);
  }

  return { records: sortRecords([...seen.values()]), quarantined };
}

/**
 * 하루 한 건. 같은 (날짜, appid) 가 이미 있으면 새로 넣지 않는다.
 * 같은 날 몇 번을 돌려도 기록이 늘지 않아야 한다.
 */
export function upsertRecord(records, next) {
  const reason = validateRecord(next);
  if (reason) throw new Error(`기록을 넣을 수 없다: ${reason}`);

  const k = keyOf(next);
  const idx = records.findIndex((r) => keyOf(r) === k);
  if (idx === -1) {
    return { records: sortRecords([...records, next]), changed: true, kind: 'added' };
  }

  // 이미 있는 칸이다. 값이 같으면 아무것도 하지 않는다.
  if (records[idx].value === next.value) {
    return { records, changed: false, kind: 'unchanged' };
  }

  // 값이 달라졌다. 같은 날 두 번째로 잰 것이다.
  //
  // 동시접속자는 순간값이라 같은 날에도 부를 때마다 다른 값이 나온다. 그때마다
  // 덮어쓰면 "하루 한 번" 이 아니라 "마지막에 부른 값" 이 되어 매일 같은 시각에
  // 잰다는 약속이 깨진다. 그래서 첫 값을 지키고 나중 값은 버린다.
  return { records, changed: false, kind: 'kept-first' };
}

/**
 * 한 게임의 기록만 날짜순으로.
 *
 * 여기서 한 번 더 정렬한다. compare 와 movingAverage 가 "앞엣것이 이전 날" 이라는
 * 전제로 인접 항목을 집기 때문에, 정렬되지 않은 배열이 들어오면 엉뚱한 날과
 * 비교하고도 조용히 성공한다. 부르는 쪽을 믿지 않는다.
 */
export function seriesOf(records, appid) {
  return records.filter((r) => r.appid === appid).sort((a, b) => a.date.localeCompare(b.date));
}

/** 이전 기록 대비 변화. 비교할 게 없으면 만들어내지 않는다. */
export function compare(records, appid, date) {
  const series = seriesOf(records, appid);
  const i = series.findIndex((r) => r.date === date);
  if (i <= 0) return null;
  const cur = series[i];
  const prev = series[i - 1];
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

/** 요일 차이가 커서 추세는 따로 본다. 자료가 모자라면 표시하지 않는다. */
export function movingAverage(records, appid, date, window = 7) {
  const series = seriesOf(records, appid);
  const i = series.findIndex((r) => r.date === date);
  if (i === -1) return null;
  const slice = series.slice(Math.max(0, i - window + 1), i + 1);
  if (slice.length < window) return null;
  const sum = slice.reduce((s, r) => s + r.value, 0);
  return { window, value: sum / slice.length, from: slice[0].date, to: slice.at(-1).date };
}

/** 그 날짜에 기록이 있는 날들. 화면의 기록 목록이 쓴다. */
export function datesOf(records) {
  return [...new Set(records.map((r) => r.date))].sort();
}

export function serialize(records, meta) {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...meta, records: sortRecords(records) }, null, 2) + '\n';
}
