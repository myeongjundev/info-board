// 화면에 넣기 직전의 계산. React 를 import 하지 않는다.
//
// 여기서 다 계산하고 src/ui 는 받아서 그리기만 한다. 그래야 브라우저 없이
// 테스트할 수 있고, 카드 5 의 손계산 대조를 할 자리가 생긴다.

import { compare, seriesOf, datesOf, movingAverage } from '../state/records.js';

/** 화면 전체의 상태. 값이 없으면 숫자 자리에 넣을 것이 없다. */
export const STATE = {
  FRESH: 'FRESH',   // 오늘 잰 값이 있다
  STALE: 'STALE',   // 마지막 정상값은 있는데 오늘 것이 아니다
  EMPTY: 'EMPTY',   // 정상값이 한 번도 없다
};

export function formatNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('ko-KR') : '—';
}

/** '2026-08-27 10:10' — 그 시간대의 벽시계 시각. */
export function formatInstant(iso, timeZone) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(t)).reduce((o, x) => (o[x.type] = x.value, o), {});
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/**
 * 두 시각 사이의 길이. `10시간 10분` · `20초`.
 *
 * `elapsedSince` 와 다르다. 저건 지금까지 얼마나 지났는가이고 이건 두 측정
 * 사이가 얼마나 벌어졌는가다. 방문자 시계가 끼어들지 않는다.
 */
export function formatSpan(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return null;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}초`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h}시간` : `${h}시간 ${rest}분`;
}

/**
 * 두 기록을 **하루 중 어느 시각에** 쟀는가. 날짜 차이가 아니라 시각 차이다.
 *
 * CLAUDE.md 3-1 이 "매일 같은 시각에 잰다" 를 못박은 이유가 이것이다. 동시접속자는
 * 부르는 순간의 값이라, 어제 10:39 값과 오늘 12:00 값을 견주면 그 차이에는 하루의
 * 변화와 **81분이라는 시각 차이**가 함께 들어 있다. 실측으로 같은 날 01:00 → 07:30
 * 사이에 PUBG 는 +214%, HELLDIVERS 2 는 -44% 였다.
 *
 * `measurementSpread` 가 하루 **안**의 차이를 재는 것과 짝이다. 이쪽은 날짜 **사이**다.
 *
 * 자정을 사이에 둔 두 시각(23:50 과 00:10)은 20분 차이지 1,420분 차이가 아니다.
 * 시계는 둥글게 돈다.
 *
 * @returns {{previousClock:string, currentClock:string, minutes:number, aligned:boolean}|null}
 */
export const SAME_HOUR_TOLERANCE_MIN = 5;

export function timeOfDayDrift(previousIso, currentIso, timeZone, {
  toleranceMin = SAME_HOUR_TOLERANCE_MIN,
} = {}) {
  const clock = (iso) => {
    const text = formatInstant(iso, timeZone);
    return text === '—' ? null : text.slice(11);
  };
  const previousClock = clock(previousIso);
  const currentClock = clock(currentIso);
  if (!previousClock || !currentClock) return null;

  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const raw = Math.abs(toMinutes(currentClock) - toMinutes(previousClock));
  const minutes = Math.min(raw, 1440 - raw);

  return { previousClock, currentClock, minutes, aligned: minutes <= toleranceMin };
}

/** 이만큼까지는 시계가 조금 어긋난 것으로 본다. */
export const SKEW_TOLERANCE_MS = 60_000;

/**
 * 그 시각 이후로 얼마나 지났는가. 오래된 값에 지금 시각을 붙이지 않기 위해 쓴다.
 *
 * 경과 시간은 **방문자의 시계**로 센다. 그 시계가 틀려 있으면 우리가 알 수 없는
 * 것을 아는 척하게 된다. 기록이 방문자 기준으로 미래에 있으면 — 즉 방문자 시계가
 * 뒤처져 있으면 — 21시간 전 기록도 "방금" 이 된다. 그래서 그럴 땐 세지 않고
 * 세지 못한다고 말한다.
 */
export function elapsedSince(iso, now = new Date()) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const ms = now.getTime() - t;
  if (ms < -SKEW_TOLERANCE_MS) {
    return { ms, text: '이 브라우저 시계로는 셀 수 없다', skewed: true };
  }
  if (ms < 0) return { ms, text: '방금' };
  const min = Math.floor(ms / 60000);
  if (min < 1) return { ms, text: '방금' };
  if (min < 60) return { ms, text: `${min}분 전` };
  const h = Math.floor(min / 60);
  if (h < 24) return { ms, text: `${h}시간 ${min % 60}분 전` };
  return { ms, text: `${Math.floor(h / 24)}일 ${h % 24}시간 전` };
}

/**
 * 저장 파일 + 지금 시각 → 화면이 필요한 전부.
 *
 * @param {object} p
 * @param {{records:Array, source:object, games:Array}} p.data  loadRecords 를 통과한 것
 * @param {string} p.today  오늘 날짜 (KST). definition.todayLocal() 이 준다
 * @param {Date}   p.now
 */
/**
 * `appid` 를 주면 그 게임을 대표값 자리에 놓는다. 안 주면 기본 대표값이다.
 *
 * 고른 게임에 기록이 없으면 **기본값으로 되돌아가지 않는다.** EMPTY 를 준다.
 * 되돌아가면 화면은 CS2 를 보여주면서 고른 것은 Skyrim 인 상태가 되고, 값과
 * 이름이 어긋난다 — 이 정보판이 막으려는 바로 그 거짓말이다.
 */
export function buildBoard({ data, today, now = new Date(), appid = null }) {
  const records = data?.records ?? [];
  const source = data?.source ?? {};
  const games = data?.games ?? [];
  const heroAppid = appid ?? source.heroAppid;

  const series = seriesOf(records, heroAppid);
  const latest = series.at(-1) ?? null;

  if (!latest) {
    // 정상값이 한 번도 없으면 숫자를 만들어내지 않는다.
    return {
      state: STATE.EMPTY, reading: null, comparison: null, dates: [], source, elapsed: null,
      // 이름은 기록이 없어도 안다. 화면이 "무엇을 고른 상태인지" 를 말할 수 있어야 한다.
      game: games.find((g) => g.appid === heroAppid) ?? null,
      selectedAppid: heroAppid,
    };
  }

  const state = latest.date === today ? STATE.FRESH : STATE.STALE;
  const comparison = compare(records, heroAppid, latest.date);
  const staleDays = state === STATE.STALE ? daysBetween(latest.date, today) : 0;

  return {
    state,
    reading: latest,
    game: games.find((g) => g.appid === heroAppid) ?? null,
    comparison,
    // 요일 차이가 커서 추세는 따로 본다. 7일이 안 차면 null 이라 화면에 안 나온다.
    average: movingAverage(records, heroAppid, latest.date),
    dates: datesOf(records),
    source,
    // 잰 시각 기준 경과. 화면의 '조회 시각' 옆에 붙는다.
    elapsed: elapsedSince(latest.fetchedAt, now),
    // STALE 이면 며칠치가 비었는지
    staleDays,
    // 기록 날짜가 방문자의 오늘보다 뒤라면 방문자 시계가 뒤처진 것이다.
    // 그러면 staleDays 가 음수가 되어 화면에 "-1일 밀림" 같은 말이 나온다.
    // 밀린 것이 아니라 셀 수 없는 것이므로 따로 알린다.
    clockSkew: staleDays < 0,
    // 지금 대표값 자리에 있는 게임. 기본값과 다를 수 있다.
    selectedAppid: heroAppid,
  };
}

function daysBetween(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/**
 * 카드 5 가 쓰는 대조표 한 줄. 손계산과 맞춰 볼 수 있게 숫자를 그대로 노출한다.
 * 비교할 게 없으면 만들어내지 않는다.
 */
export function crosscheckRows(comparison) {
  if (!comparison) return null;
  const { previous, current, delta, direction, percent, unit } = comparison;
  return {
    previous: { date: previous.date, value: previous.value, sourceUrl: previous.sourceUrl, fetchedAt: previous.fetchedAt },
    current: { date: current.date, value: current.value, sourceUrl: current.sourceUrl, fetchedAt: current.fetchedAt },
    hand: `${current.value} − ${previous.value} = ${delta}`,
    delta,
    direction,
    arrow: direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—',
    percent,
    unit,
  };
}

/** 한 날짜의 게임별 기록. 기록 목록 화면이 쓴다. */
export function rowsForDate(records, games, date) {
  return records
    .filter((r) => r.date === date)
    .map((r) => ({ ...r, name: games.find((g) => g.appid === r.appid)?.name ?? `appid ${r.appid}` }))
    .sort((a, b) => b.value - a.value);
}
