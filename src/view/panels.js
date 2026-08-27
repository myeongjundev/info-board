// GAME PULSE 패널의 계산. React 를 import 하지 않는다.
//
// 모두 같은 기록에서 나온다. API 를 더 붙이지 않는다 — 하나의 믿을 수 있는
// 자료에서 여러 이야기를 꺼내는 것이 이 프로젝트의 방식이다.
//
// 중요한 제약 둘.
//  1. 급상승·급하락은 이전 날 기록이 있어야 성립한다. 없으면 만들어내지 않는다.
//  2. "가장 많이 오른 게임" 이 아니라 "**우리가 재는 16개 중** 가장 많이 오른
//     게임" 이다. Steam 전체를 훑지 않았다. 화면에 그렇게 적어야 한다.

import { compare, seriesOf } from '../state/records.js';

/**
 * 그 날짜에 이전 기록 대비 오른 게임과 내린 게임.
 *
 * 이전 기록이 하나도 없으면 `null` 을 준다. 화면은 그때 숫자 대신 안내를 띄운다.
 *
 * @returns {{risers:Array, fallers:Array, compared:number, skipped:number}|null}
 */
export function movers(records, games, date, { limit = 3 } = {}) {
  const rows = [];
  let skipped = 0;

  for (const g of games) {
    const diff = compare(records, g.appid, date);
    if (!diff) { skipped += 1; continue; }
    // 이전 값이 0 이면 변화율을 만들 수 없다. 0 에서 늘어난 것은 ∞ 다.
    if (diff.percent === null) { skipped += 1; continue; }
    rows.push({
      appid: g.appid,
      name: g.name,
      year: g.year,
      tier: g.tier,
      previous: diff.previous.value,
      current: diff.current.value,
      previousDate: diff.previous.date,
      delta: diff.delta,
      percent: diff.percent,
      direction: diff.direction,
      unit: diff.unit,
    });
  }

  if (rows.length === 0) return null;

  const up = rows.filter((r) => r.delta > 0).sort((a, b) => b.percent - a.percent);
  const down = rows.filter((r) => r.delta < 0).sort((a, b) => a.percent - b.percent);

  return {
    risers: up.slice(0, limit),
    fallers: down.slice(0, limit),
    compared: rows.length,
    skipped,
    // 무엇과 견줬는지. 화면에 적어야 "어제 대비" 가 거짓말이 되지 않는다.
    previousDate: rows[0].previousDate,
  };
}

/**
 * 오래된 게임이 지금도 사람을 모으고 있는가.
 *
 * 이전 기록이 필요 없다. 그날 값 하나로 성립하므로 **첫날부터 보인다.**
 */
export function graveyard(records, games, date, { limit = Infinity } = {}) {
  const rows = games
    .filter((g) => g.tier === 'legacy')
    .map((g) => {
      const r = seriesOf(records, g.appid).find((x) => x.date === date);
      return r ? { appid: g.appid, name: g.name, year: g.year, value: r.value, unit: r.unit } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.year - b.year);   // 오래된 것부터

  // 기본값이 무제한인 이유. 6개로 자르면 오래된 순 정렬 탓에 사람이 가장 적은
  // 게임들(Skyrim 998명, Portal 2 1,198명)이 잘려 나간다. 그런데 "아직 살아
  // 있는가" 라는 물음에 가장 답이 되는 것이 바로 그 줄들이다. 자르면 남는 것은
  // 살아 있는 게임뿐이라 물음 자체가 사라진다.
  return rows.length ? rows.slice(0, limit) : null;
}

/**
 * 사람 수를 사람이 읽을 수 있는 말로 바꾼다.
 *
 * **이것은 원자료가 아니라 우리가 정한 분류다.** 기준을 화면에 그대로 적는다.
 * 무작위로 붙이지 않는다 — 경계는 아래 표가 전부이고 손으로 확인할 수 있다.
 */
export const ALIVE_RULE = [
  { min: 10000, label: '아직 붐빈다' },
  { min: 1000, label: '살아 있다' },
  { min: 100, label: '드물다' },
  { min: 0, label: '거의 비었다' },
];

export function aliveLabel(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return ALIVE_RULE.find((r) => value >= r.min).label;
}

/** 그 게임이 몇 년 됐는가. 화면의 `26년째` 가 여기서 나온다. */
export function ageOf(year, date) {
  const y = Number(String(date).slice(0, 4));
  if (!Number.isInteger(year) || !Number.isInteger(y)) return null;
  const age = y - year;
  return age >= 0 ? age : null;
}

/**
 * 그 날짜에 잰 게임을 사람 수 순으로 줄 세운다.
 *
 * **이전 기록이 필요 없다.** 그날 값만으로 성립하므로 기록이 하루뿐인 첫날에도
 * 보인다 — movers 가 꺼져 있는 날 화면을 채우는 것이 이 패널이다.
 *
 * `shareOfMeasured` 는 이름 그대로 **우리가 잰 것 안에서의 비중**이다. Steam
 * 전체에서의 비중이 아니다. 전체 동시접속자는 이 엔드포인트가 주지 않으므로
 * 알 수 없고, 모르는 것을 비율의 분모로 쓰지 않는다. 화면에도 그렇게 적는다.
 *
 * 못 가져온 게임은 행을 만들지 않는다. 0 으로 채우면 "아무도 안 한다" 와
 * "못 쟀다" 가 같은 모양이 된다.
 *
 * @returns {{rows:Array, total:number, measured:number, missing:number, unit:string}|null}
 */
export function leaderboard(records, games, date) {
  const rows = [];
  let missing = 0;

  for (const g of games) {
    const r = seriesOf(records, g.appid).find((x) => x.date === date);
    if (!r) { missing += 1; continue; }
    rows.push({
      appid: g.appid,
      name: g.name,
      year: g.year,
      tier: g.tier,
      value: r.value,
      unit: r.unit,
    });
  }

  if (rows.length === 0) return null;

  rows.sort((a, b) => b.value - a.value || a.appid - b.appid);

  const total = rows.reduce((sum, r) => sum + r.value, 0);
  for (const [i, r] of rows.entries()) {
    r.rank = i + 1;
    // 분모가 0 이면 비율을 만들지 않는다. null 은 화면에서 막대를 안 그린다.
    r.shareOfMeasured = total > 0 ? (r.value / total) * 100 : null;
    // 1등 대비 길이. 막대가 눈으로 견주는 대상은 합계가 아니라 1등이다.
    r.relative = rows[0].value > 0 ? (r.value / rows[0].value) * 100 : null;
  }

  return { rows, total, measured: rows.length, missing, unit: rows[0].unit };
}
