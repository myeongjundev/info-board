// 화면에 넣기 직전의 계산. React 를 import 하지 않는다.
//
// 여기서 다 계산하고 src/ui 는 받아서 그리기만 한다. 그래야 브라우저 없이
// 테스트할 수 있고, 카드 5 의 손계산 대조를 할 자리가 생긴다.

import { compare, seriesOf, datesOf } from '../state/records.js';

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

/** 그 시각 이후로 얼마나 지났는가. 오래된 값에 지금 시각을 붙이지 않기 위해 쓴다. */
export function elapsedSince(iso, now = new Date()) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const ms = now.getTime() - t;
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
export function buildBoard({ data, today, now = new Date() }) {
  const records = data?.records ?? [];
  const source = data?.source ?? {};
  const games = data?.games ?? [];
  const heroAppid = source.heroAppid;

  const series = seriesOf(records, heroAppid);
  const latest = series.at(-1) ?? null;

  if (!latest) {
    // 정상값이 한 번도 없으면 숫자를 만들어내지 않는다.
    return { state: STATE.EMPTY, reading: null, game: null, comparison: null, dates: [], source, elapsed: null };
  }

  const state = latest.date === today ? STATE.FRESH : STATE.STALE;
  const comparison = compare(records, heroAppid, latest.date);

  return {
    state,
    reading: latest,
    game: games.find((g) => g.appid === heroAppid) ?? null,
    comparison,
    dates: datesOf(records),
    source,
    // 잰 시각 기준 경과. 화면의 '조회 시각' 옆에 붙는다.
    elapsed: elapsedSince(latest.fetchedAt, now),
    // STALE 이면 며칠치가 비었는지
    staleDays: state === STATE.STALE ? daysBetween(latest.date, today) : 0,
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
