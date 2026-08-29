// GAME PULSE 패널의 계산. React 를 import 하지 않는다.
//
// 모두 같은 기록에서 나온다. API 를 더 붙이지 않는다 — 하나의 믿을 수 있는
// 자료에서 여러 이야기를 꺼내는 것이 이 프로젝트의 방식이다.
//
// 중요한 제약 둘.
//  1. 급상승·급하락은 이전 날 기록이 있어야 성립한다. 없으면 만들어내지 않는다.
//  2. "가장 많이 오른 게임" 이 아니라 "**우리가 재는 게임 중** 가장 많이 오른
//     게임" 이다. Steam 전체를 훑지 않았다. 화면에 그렇게 적어야 한다.

import { compare, seriesOf } from '../state/records.js';

// 한 collect 실행은 75개를 수십 초 안에 순서대로 잰다. 실행 ID가 저장돼 있지
// 않으므로 대표 Reading과 5분 이내인 행을 같은 수집 배치로 본다. 이것은 날짜 사이
// 시각 차이를 허용하는 임계가 아니라, 한 실행에 속한 행을 복원하는 운영 경계다.
export const COLLECTION_BATCH_MS = 5 * 60 * 1000;

function sameCollectionBatch(reading, anchor, windowMs = COLLECTION_BATCH_MS) {
  if (!reading?.fetchedAt || !anchor?.fetchedAt) return false;
  return Math.abs(new Date(reading.fetchedAt) - new Date(anchor.fetchedAt)) <= windowMs;
}

/**
 * 그 날짜의 기록을 **언제 잰 것들인가.**
 *
 * 하루가 한 번에 잰 것이라는 보장이 없다. `pendingGamesForDate` 는 그날 빠진
 * 게임만 채우므로, 목록이 늘어난 날이나 일부가 실패한 날은 한 날짜 안에 배치가
 * 둘 이상 생긴다. 실제로 2026-08-27 이 그랬다 — 16개는 09:59 KST, 59개는
 * 20:09 KST 로 **10시간 10분** 차다.
 *
 * ## 여기서 값을 빼지 않는다
 *
 * `movers` 는 다른 배치를 비교에서 뺀다. 그쪽은 **차이를 만드는** 계산이라
 * 시각이 다르면 없는 변화를 만들어 내기 때문이다. 줄세우기·장르 합계·순위 이동은
 * 다르다. 거기 있는 것은 전부 **실제로 잰 값**이고, 빼면 그날 잰 것을 우리가
 * 화면에서 지우는 쪽이 된다.
 *
 * 그래서 값은 그대로 두고 **언제 잰 것인지를 화면이 말하게 한다.** 이 저장소가
 * 여태 고른 쪽과 같다 — 오래된 값을 지우지 않고 오래됐다고 적는 것, 접은 항목의
 * 순위를 지우지 않고 접었다고 적는 것과 같은 자리다.
 *
 * @returns {{measured:number, from:string, to:string, spanMs:number,
 *            anchorAt:string|null, offBatch:number, coherent:boolean}|null}
 */
export function measurementSpread(records, games, date, {
  anchorAppid = games[0]?.appid,
  batchWindowMs = COLLECTION_BATCH_MS,
} = {}) {
  const rows = [];
  for (const g of games) {
    const r = seriesOf(records, g.appid).find((x) => x.date === date);
    if (r && typeof r.fetchedAt === 'string' && Number.isFinite(Date.parse(r.fetchedAt))) rows.push(r);
  }
  if (rows.length === 0) return null;

  const times = rows.map((r) => Date.parse(r.fetchedAt)).sort((a, b) => a - b);
  // 기준은 대표 게임을 잰 시각이다. 대표 게임이 그날 없으면 가장 이른 것을 쓴다.
  const anchor = seriesOf(records, anchorAppid).find((x) => x.date === date)
    ?? rows.find((r) => Date.parse(r.fetchedAt) === times[0]);
  const spanMs = times.at(-1) - times[0];

  return {
    measured: rows.length,
    from: new Date(times[0]).toISOString(),
    to: new Date(times.at(-1)).toISOString(),
    spanMs,
    anchorAt: anchor?.fetchedAt ?? null,
    // 대표 배치에서 벗어난 행 수. 값을 빼지 않으므로 이건 제외 건수가 아니라
    // "다른 시각에 잰 것이 몇 개인가" 다.
    offBatch: rows.filter((r) => !sameCollectionBatch(r, anchor, batchWindowMs)).length,
    coherent: spanMs <= batchWindowMs,
  };
}

function dateInTimezone(instant, timeZone = 'Asia/Seoul') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * 그 날짜에 이전 기록 대비 오른 게임과 내린 게임.
 *
 * 이전 기록이 하나도 없으면 `null` 을 준다. 화면은 그때 숫자 대신 안내를 띄운다.
 *
 * @returns {{risers:Array, fallers:Array, compared:number, skipped:number}|null}
 */
export function movers(records, games, date, {
  limit = 3,
  anchorAppid = games[0]?.appid,
  batchWindowMs = COLLECTION_BATCH_MS,
} = {}) {
  const rows = [];
  let skipped = 0;
  let batchExcluded = 0;

  const anchors = seriesOf(records, anchorAppid);
  const currentAnchor = anchors.find((reading) => reading.date === date);
  const previousAnchor = anchors.filter((reading) => reading.date < date).at(-1);
  if (!currentAnchor || !previousAnchor) return null;

  for (const g of games) {
    const diff = compare(records, g.appid, date);
    if (!diff) { skipped += 1; continue; }
    if (diff.previous.date !== previousAnchor.date
      || !sameCollectionBatch(diff.previous, previousAnchor, batchWindowMs)
      || !sameCollectionBatch(diff.current, currentAnchor, batchWindowMs)) {
      batchExcluded += 1;
      continue;
    }
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
    batchExcluded,
    // 무엇과 견줬는지. 화면에 적어야 "어제 대비" 가 거짓말이 되지 않는다.
    previousDate: rows[0].previousDate,
    previousAt: previousAnchor.fetchedAt,
    currentAt: currentAnchor.fetchedAt,
  };
}

/**
 * 오래된 게임이 지금도 사람을 모으고 있는가.
 *
 * 이전 기록이 필요 없다. 그날 값 하나로 성립하므로 **첫날부터 보인다.**
 */
export function graveyard(records, games, date, {
  limit = Infinity,
  anchorAppid = games[0]?.appid,
  batchWindowMs = COLLECTION_BATCH_MS,
} = {}) {
  const anchor = seriesOf(records, anchorAppid).find((x) => x.date === date);
  const rows = games
    .filter((g) => g.tier === 'legacy')
    .map((g) => {
      const r = seriesOf(records, g.appid).find((x) => x.date === date);
      return r ? {
        appid: g.appid, name: g.name, year: g.year, value: r.value, unit: r.unit,
        fetchedAt: r.fetchedAt,
        offBatch: anchor ? !sameCollectionBatch(r, anchor, batchWindowMs) : false,
      } : null;
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
export function leaderboard(records, games, date, {
  anchorAppid = games[0]?.appid,
  batchWindowMs = COLLECTION_BATCH_MS,
} = {}) {
  const rows = [];
  let missing = 0;

  const anchor = seriesOf(records, anchorAppid).find((x) => x.date === date);

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
      // 이 줄을 잰 시각. 순위는 값으로 매기지만 값의 뜻은 시각에 달렸다.
      fetchedAt: r.fetchedAt,
      // 대표 배치와 다른 시각에 잰 줄인가. 빼지 않고 표시만 한다.
      offBatch: anchor ? !sameCollectionBatch(r, anchor, batchWindowMs) : false,
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

  return {
    rows,
    total,
    measured: rows.length,
    missing,
    unit: rows[0].unit,
    // 이 순위가 한 번에 잰 것인지. 아니면 화면이 그 사실을 적는다.
    spread: measurementSpread(records, games, date, { anchorAppid, batchWindowMs }),
  };
}

/**
 * 날짜 카드 줄. MSN 날씨의 `26 어제 · 27 오늘 · 28 금` 가로 스트립에 대응한다.
 *
 * **그 참고 화면과 결정적으로 다른 점이 하나 있다.** 날씨는 앞날을 예보로 채우지만
 * 우리는 **미래 칸을 만들지 않는다.** 동시접속자는 부르는 순간의 값이라 예보가
 * 없고, 빈 칸을 그려 두면 "곧 채워질 값" 이 아니라 "우리가 아는 척하는 값" 이 된다.
 *
 * 지나간 빈 날도 만들지 않는다. 수집이 빠진 날은 영영 빈칸이고, 카드를 그리면
 * 그날 값을 잰 것처럼 보인다. **기록이 있는 날짜만 카드가 된다.**
 *
 * @returns {{cards:Array, gaps:number}|null}
 */
export function dayStrip(records, appid, today, { limit = 14 } = {}) {
  const series = seriesOf(records, appid);
  if (series.length === 0) return null;

  const recent = series.slice(-limit);

  const cards = recent.map((r, i) => {
    const prev = i > 0 ? recent[i - 1] : null;
    return {
      date: r.date,
      value: r.value,
      unit: r.unit,
      isToday: r.date === today,
      // 바로 앞 카드 대비. 카드끼리 눈으로 견주는 값이라 series 순서를 따른다.
      delta: prev ? r.value - prev.value : null,
      // 앞 카드가 달력상 하루 전이 아니면 사이에 빈 날이 있다는 뜻이다.
      gapBefore: prev ? daysApart(prev.date, r.date) - 1 : 0,
    };
  });

  return { cards, gaps: cards.reduce((n, c) => n + (c.gapBefore > 0 ? 1 : 0), 0) };
}

function daysApart(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.round((b - a) / 86400000);
}

/**
 * 장르별로 묶어서 본다.
 *
 * **장르는 원자료가 주지 않는다.** GAMES 표에 우리가 적은 것이다. 그래서 이 패널은
 * "Steam 의 장르 판도" 가 아니라 **"우리가 고른 게임을 우리 기준으로 묶은 것"**
 * 이고, 화면이 그렇게 말해야 한다.
 *
 * 장르마다 `listed`(그 장르로 분류한 게임 수)를 함께 준다. 1개짜리 장르의 1등은
 * 순위가 아니라 그냥 그 게임 하나다 — 화면이 왕관을 씌우지 않도록 개수를 넘긴다.
 *
 * 어제 대비는 **양쪽 날에 다 있는 게임만** 더해서 낸다. 한쪽에만 있는 것을 섞으면
 * 서로 다른 바구니를 견주게 되어, 게임 하나를 못 가져온 것이 장르가 줄어든 것처럼
 * 보인다. 짝이 안 맞으면 `paired` 가 `measured` 보다 작아지고 화면이 그 사실을 적는다.
 *
 * @returns {{genres:Array, total:number, previousDate:string|null, unit:string}|null}
 */
export function byGenre(records, games, date, {
  previousDate = null,
  anchorAppid = games[0]?.appid,
  batchWindowMs = COLLECTION_BATCH_MS,
} = {}) {
  const prevDate = previousDate ?? previousDateOf(records, date);
  const buckets = new Map();

  for (const g of games) {
    const key = g.genre ?? '분류 없음';
    if (!buckets.has(key)) {
      buckets.set(key, {
        genre: key, listed: 0, rows: [], total: 0,
        paired: 0, pairedTotal: 0, pairedPrevTotal: 0,
      });
    }
    const b = buckets.get(key);
    b.listed += 1;

    const series = seriesOf(records, g.appid);
    const today = series.find((x) => x.date === date);
    if (!today) continue;                    // 못 잰 게임은 더하지 않는다. 0 으로 채우지 않는다.

    b.rows.push({ appid: g.appid, name: g.name, year: g.year, value: today.value, unit: today.unit });
    b.total += today.value;

    // 어제 대비는 양쪽 날에 다 있는 게임만 더한다.
    const before = prevDate ? series.find((x) => x.date === prevDate) : null;
    if (before) {
      b.paired += 1;
      b.pairedTotal += today.value;
      b.pairedPrevTotal += before.value;
    }
  }

  const genres = [...buckets.values()]
    .filter((b) => b.rows.length > 0)
    .map((b) => {
      b.rows.sort((x, y) => y.value - x.value || x.appid - y.appid);

      // 펼쳤을 때 그리는 막대 길이. **그 장르 안 1위 대비**다.
      //
      // 전체 1위에 맞추면 작은 장르는 전부 실선이 되어 서로 견줄 수가 없다.
      // 대신 기준이 장르마다 달라지므로 화면이 그 사실을 적어야 한다.
      // 여기서 내는 이유는 ui 가 나눗셈을 하면 손계산 대조를 못 하기 때문이다.
      const top = b.rows[0].value;
      for (const r of b.rows) {
        r.relativeInGenre = top > 0 ? (r.value / top) * 100 : null;
      }

      const delta = b.paired > 0 ? b.pairedTotal - b.pairedPrevTotal : null;
      return {
        genre: b.genre,
        listed: b.listed,
        measured: b.rows.length,
        rows: b.rows,
        total: b.total,
        // 1위. 다만 measured 가 1 이면 "1등" 이 아니라 그냥 그 게임 하나다.
        leader: b.rows[0],
        // 짝이 맞는 것만으로 낸 변화. 없으면 만들지 않는다.
        paired: b.paired,
        delta,
        percent: delta !== null && b.pairedPrevTotal > 0
          ? (delta / b.pairedPrevTotal) * 100
          : null,
        pairedPrevTotal: b.paired > 0 ? b.pairedPrevTotal : null,
      };
    })
    .sort((a, b) => b.total - a.total || a.genre.localeCompare(b.genre));

  if (genres.length === 0) return null;

  const total = genres.reduce((sum, g) => sum + g.total, 0);
  for (const g of genres) {
    g.shareOfMeasured = total > 0 ? (g.total / total) * 100 : null;
    g.relative = genres[0].total > 0 ? (g.total / genres[0].total) * 100 : null;
  }

  return {
    genres,
    total,
    previousDate: prevDate,
    unit: genres[0].rows[0].unit,
    // 장르 합계는 서로 다른 시각의 값을 더한 것일 수 있다. 더하기를 멈추지 않고
    // 무엇을 더한 것인지 적는다.
    spread: measurementSpread(records, games, date, { anchorAppid, batchWindowMs }),
  };
}

/** 그 날짜 바로 앞에 기록이 있는 날. 없으면 null. */
function previousDateOf(records, date) {
  const dates = [...new Set(records.map((r) => r.date))].sort();
  const i = dates.indexOf(date);
  return i > 0 ? dates[i - 1] : null;
}

/**
 * 기록 파일의 게임 표에 지금 코드의 분류를 얹는다.
 *
 * 기록 파일은 **잰 것**을 담는다. 장르·tier 는 잰 것이 아니라 우리가 붙인 이름이라
 * 코드 쪽 표가 최신이다. 나중에 분류를 고치면 지난 기록도 새 분류로 보이는데,
 * 그게 맞다 — 분류를 바꾼 것이지 그날 잰 값이 바뀐 것이 아니다.
 *
 * 반대로 **값과 이어지는 것(appid·name·year)은 파일 것을 그대로 둔다.** 그날
 * 그 이름으로 쟀다는 사실은 기록이다.
 *
 * 코드 표에 없는 게임(뒤에 목록에서 뺀 게임)은 파일 것을 그대로 살린다. 지우면
 * 그날 잰 값이 화면에서 사라진다.
 */
export function withGenres(fileGames, catalog) {
  const byId = new Map((catalog ?? []).map((g) => [g.appid, g]));
  return (fileGames ?? []).map((g) => {
    const known = byId.get(g.appid);
    return known ? { ...g, genre: known.genre, tier: known.tier ?? g.tier } : { ...g };
  });
}

/**
 * 같은 게임을 하루 중 다른 시각에 잰 값과 견준다.
 *
 * **이것은 어제와 오늘의 비교가 아니다.** 같은 날 안에서 시각만 다른 두 측정이다.
 * 동시접속자는 순간값이라 "몇 명이 하는 게임인가" 가 아니라 "그 순간 접속해
 * 있던 사람이 몇 명인가" 를 재는데, 그 순간이 지역별로 아침·저녁·새벽이라
 * 게임마다 결과가 반대로 나온다.
 *
 * 정규 기록(10:10 KST)과 표본은 **둘 다 진짜 측정이고 각자 잰 시각을 갖는다.**
 * 어느 쪽도 "진짜 값" 이 아니다 — 둘 다 그 순간의 값일 뿐이고, 그 사실이 이
 * 패널이 말하려는 전부다.
 *
 * @returns {{rows:Array, recordAt:string, probeAt:string, measured:number}|null}
 */
export function timeBias(records, probe, games, date, {
  anchorAppid = games[0]?.appid,
  batchWindowMs = COLLECTION_BATCH_MS,
} = {}) {
  const sample = probe?.samples?.at(-1);
  if (!sample) return null;

  const anchor = seriesOf(records, anchorAppid).find((reading) => reading.date === date);
  if (!anchor || dateInTimezone(sample.at, anchor.timezone) !== date) return null;

  const rows = [];
  let batchExcluded = 0;

  for (const g of games) {
    const r = seriesOf(records, g.appid).find((x) => x.date === date);
    if (!r) continue;
    const later = sample.values?.[g.appid];
    if (typeof later !== 'number' || !Number.isFinite(later)) continue;
    if (!sameCollectionBatch(r, anchor, batchWindowMs)
      || new Date(sample.at) <= new Date(r.fetchedAt)) {
      batchExcluded += 1;
      continue;
    }

    const delta = later - r.value;
    rows.push({
      appid: g.appid,
      name: g.name,
      genre: g.genre,
      atRecord: r.value,
      atProbe: later,
      recordFetchedAt: r.fetchedAt,
      delta,
      // 이전 값이 0 이면 변화율을 만들 수 없다.
      percent: r.value > 0 ? (delta / r.value) * 100 : null,
      unit: r.unit,
    });
  }

  if (rows.length === 0) return null;

  // 많이 오른 것부터. 비율을 못 낸 것은 맨 뒤로 보낸다 — 0 인 척하지 않는다.
  rows.sort((a, b) => {
    if (a.percent === null) return 1;
    if (b.percent === null) return -1;
    return b.percent - a.percent;
  });

  return {
    rows,
    recordAt: anchor.fetchedAt,
    probeAt: sample.at,
    measured: rows.length,
    batchExcluded,
  };
}

/**
 * 어제와 오늘의 순위 이동.
 *
 * **양쪽 날에 다 있는 게임만으로 양쪽 순위를 다시 매긴다.** 이게 이 함수의 전부다.
 *
 * 그냥 그날의 전체 순위끼리 견주면 안 된다. 재는 게임을 16개에서 75개로 늘린
 * 다음 날, 어제 16개 중 3위였던 게임이 오늘 75개 중 20위가 된다. 이건 하락이
 * 아니라 **분모가 바뀐 것**인데 화면에는 `▼17` 로 나온다. 값은 멀쩡한데 화면이
 * 거짓말을 하는, 이 정보판이 잡아내려는 바로 그 종류다.
 *
 * 그래서 교집합 안에서만 순위를 매기고, 그 개수(`basis`)를 화면이 적는다.
 * 순위 매기는 규칙은 leaderboard 와 같다 — 사람 수 내림차순, 같으면 appid.
 *
 * `movement` 는 **양수가 올라간 것**이다. 순위는 숫자가 작아지는 것이 상승이라
 * `previousRank - currentRank` 로 낸다.
 *
 * @returns {{rows:Array, basis:number, previousDate:string, excludedToday:number, excludedBefore:number}|null}
 */
export function rankMovement(records, games, date, {
  previousDate = null,
  anchorAppid = games[0]?.appid,
  batchWindowMs = COLLECTION_BATCH_MS,
} = {}) {
  const prevDate = previousDate ?? previousDateOf(records, date);
  if (!prevDate) return null;

  const both = [];
  let excludedToday = 0;
  let excludedBefore = 0;

  for (const g of games) {
    const series = seriesOf(records, g.appid);
    const now = series.find((x) => x.date === date);
    const before = series.find((x) => x.date === prevDate);
    if (now && before) {
      both.push({ appid: g.appid, name: g.name, genre: g.genre, now, before, unit: now.unit });
    } else if (now) {
      excludedToday += 1;      // 오늘은 있는데 어제가 없다 — 순위 이동을 낼 수 없다
    } else if (before) {
      excludedBefore += 1;     // 어제는 있는데 오늘이 없다
    }
  }

  if (both.length === 0) return null;

  const rankOf = (key) => {
    const sorted = [...both].sort((a, b) => b[key].value - a[key].value || a.appid - b.appid);
    const map = new Map();
    sorted.forEach((r, i) => map.set(r.appid, i + 1));
    return map;
  };

  const nowRank = rankOf('now');
  const beforeRank = rankOf('before');

  const currentAnchor = seriesOf(records, anchorAppid).find((x) => x.date === date);
  const previousAnchor = seriesOf(records, anchorAppid).find((x) => x.date === prevDate);

  const rows = both.map((r) => {
    const currentRank = nowRank.get(r.appid);
    const previousRank = beforeRank.get(r.appid);
    return {
      appid: r.appid,
      name: r.name,
      genre: r.genre,
      unit: r.unit,
      currentRank,
      previousRank,
      // 이 줄의 두 값을 각각 언제 쟀는가. 한쪽이라도 그날 대표 배치에서 벗어나
      // 있으면 이 줄의 이동에는 하루의 변화가 아닌 시각 차이가 섞여 있다.
      currentAt: r.now.fetchedAt,
      previousAt: r.before.fetchedAt,
      crossBatch: !sameCollectionBatch(r.now, currentAnchor, batchWindowMs)
        || !sameCollectionBatch(r.before, previousAnchor, batchWindowMs),
      // 양수가 올라간 것이다. 순위는 숫자가 작아지는 쪽이 상승이다.
      movement: previousRank - currentRank,
      currentValue: r.now.value,
      previousValue: r.before.value,
      delta: r.now.value - r.before.value,
    };
  });

  rows.sort((a, b) => a.currentRank - b.currentRank);

  return {
    rows,
    basis: both.length,
    previousDate: prevDate,
    excludedToday,
    excludedBefore,
    // 두 날짜를 각각 언제 잰 것인가. 순위 이동은 두 날의 값으로 내므로 양쪽이
    // 다 필요하다 — 어제가 저녁, 오늘이 아침이면 이동의 일부는 시각 차이다.
    spread: measurementSpread(records, games, date, { anchorAppid, batchWindowMs }),
    previousSpread: measurementSpread(records, games, prevDate, { anchorAppid, batchWindowMs }),
  };
}
