// 첫 화면 요약 — 이 판이 무엇을 보여주는 곳인지 15초 안에 알게 한다.
//
// 왜 필요한가.
//
// 지금 구성은 **출처별**로 나뉘어 있다. 동시접속 API 는 첫 화면, Store 응답은
// 할인 페이지, 차트 응답은 판매 페이지, 방송 API 는 스트리밍 페이지. 그래서
// 처음 온 사람이 첫 화면에서 보는 것은 값 하나뿐이고, 나머지 세 축은 상단의
// 작은 링크로만 존재한다. **15초 뒤의 결론이 "CS2 접속자 세는 사이트" 가 된다.**
//
// 각 페이지의 제목은 이미 질문형이다 — `무엇이 지금 팔리고 있을까`,
// `지금, 어디서 어떤 게임을 볼까`. 묶는 축도 출처가 아니라 그 질문이어야 한다.
//
// 무엇을 계산하지 않는가.
//
// **새 값을 만들지 않는다.** 각 축의 대표 한 줄은 이미 그 페이지가 보여주는 값을
// 그대로 집어 온다. 요약이 원본과 다른 숫자를 말하면 그 순간 요약이 아니라 거짓말이다.

import { displayName } from './gameDisplay.js';

/**
 * 요약 한 칸의 상태. 셋을 구분하는 것이 이 파일의 핵심이다.
 *
 *   OK          값이 있다
 *   EMPTY       정상인데 지금 해당하는 것이 없다 (무료 배포가 이번 주에 없는 것)
 *   UNAVAILABLE 자료를 못 읽었다 (파일이 없거나 형식이 다르다)
 *
 * `EMPTY` 와 `UNAVAILABLE` 을 같은 `—` 로 뭉개면, 이 판이 잡으려는 거짓말을
 * 요약 칸에서 우리가 저지르게 된다. "없다" 와 "모른다" 는 다른 말이다.
 */
export const AXIS = { OK: 'ok', EMPTY: 'empty', UNAVAILABLE: 'unavailable' };

/** 얼마나 하나 — 대표 게임의 동시접속자. 이미 계산된 board 에서 집어 온다. */
export function playingAxis(board) {
  const reading = board?.reading;
  if (!reading) return { state: AXIS.UNAVAILABLE, reason: '정상값이 아직 없다' };
  return {
    state: AXIS.OK,
    value: reading.value,
    unit: reading.unit,
    subject: board.game?.name ?? null,
    delta: board.comparison?.delta ?? null,
    percent: board.comparison?.percent ?? null,
    stale: board.state !== 'FRESH' ? true : false,
  };
}

/** 뭐가 팔리나 — 한국 매출 1위. 성인 분류면 제목 대신 라벨이 온다. */
export function sellingAxis(salesCharts) {
  const top = salesCharts?.live?.korea?.[0];
  if (!top) return { state: AXIS.UNAVAILABLE, reason: '판매 차트를 읽지 못했다' };
  return {
    state: AXIS.OK,
    subject: displayName(top),
    adult: top.adult === true,
    // 가격 표기는 Steam 이 준 글자 그대로다 (chartPrice.js). 통화를 우리가 붙이지 않는다.
    priceText: top.isFree ? null : (top.priceText ?? null),
    isFree: top.isFree === true,
    discountPercent: top.discountPercent || 0,
  };
}

/**
 * 뭐가 싸나 — 지금 공짜인 것과 할인 중인 것.
 *
 * 무료 배포가 0건인 것은 **정상**이다. 매주 있는 것이 아니다. 그래서 파일을 못
 * 읽은 것과 다르게 센다.
 */
export function dealsAxis({ epicFree, steamFree, discounts, popularDiscounts } = {}) {
  const readable = [epicFree, steamFree, discounts, popularDiscounts].filter(Boolean).length;
  if (readable === 0) return { state: AXIS.UNAVAILABLE, reason: '할인 자료를 하나도 읽지 못했다' };

  const freeNow = (epicFree?.giveaways?.length ?? 0)
    + (steamFree?.giveaways?.length ?? 0)
    + (steamFree?.freeWeekends?.length ?? 0);
  const discountRows = [
    ...(discounts?.discounts ?? []),
    ...(popularDiscounts?.discounts ?? []),
  ];
  const discountIds = new Set(
    discountRows.map((row) => row?.appid).filter((appid) => Number.isInteger(appid)),
  );
  // 실제 스냅샷은 appid 합집합으로 센다. 작은 테스트 fixture처럼 행이 없고 counts만
  // 있으면 그 파일의 명시 집계를 쓴다.
  const onSale = discountRows.length > 0
    ? discountIds.size
    : (discounts?.counts?.discount ?? 0) + (popularDiscounts?.counts?.discount ?? 0);

  if (freeNow === 0 && onSale === 0) {
    return { state: AXIS.EMPTY, freeNow: 0, onSale: 0, reason: '지금 공짜도 할인도 없다' };
  }
  return { state: AXIS.OK, freeNow, onSale, partial: readable < 4 };
}

/**
 * 뭘 보나 — 연결된 플랫폼 중 시청자가 가장 많은 게임.
 *
 * **두 플랫폼 시청자를 더하지 않는다.** 규칙 5-5 가 못박은 자리다. 어느 플랫폼의
 * 값인지를 함께 들고 나간다.
 */
export function watchingAxis(streaming) {
  const platforms = streaming?.platforms;
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return { state: AXIS.UNAVAILABLE, reason: '방송 자료를 읽지 못했다' };
  }
  const live = platforms.filter((p) => p?.status === 'ok' && Array.isArray(p.rankings) && p.rankings.length > 0);
  if (live.length === 0) {
    const anyOk = platforms.some((p) => p?.status === 'ok');
    return anyOk
      ? { state: AXIS.EMPTY, reason: '집계된 게임 방송이 없다' }
      : { state: AXIS.UNAVAILABLE, reason: '연결된 플랫폼이 없다' };
  }
  let best = null;
  for (const platform of live) {
    const top = platform.rankings[0];
    if (!best || top.viewerCount > best.viewerCount) {
      best = { viewerCount: top.viewerCount, subject: top.gameName, platformId: platform.id };
    }
  }
  return { state: AXIS.OK, ...best, platformCount: live.length };
}

/**
 * 네 축의 정의. **이름을 여기 한 곳에만 둔다.**
 *
 * 전에는 `할인 게임`·`판매 차트`·`스트리밍 순위` 가 네 파일에 흩어져 있었다.
 * 같은 것을 여러 곳에 적으면 언젠가 갈라지고, 그게 이 저장소가 문서에서 이미
 * 한 번 겪은 사고다.
 *
 * 이름이 질문형인 이유. 각 페이지의 제목은 이미 질문이다 —
 * `무엇이 지금 팔리고 있을까`, `지금, 어디서 어떤 게임을 볼까`.
 * **나브만 명사형이라 어긋나 있었다.** 새 말투를 만든 것이 아니라 맞춘 것이다.
 *
 * 질문의 말이 그 축이 실제로 세는 것과 같아야 한다.
 *
 *   playing   동시접속자 **수**        →  몇 명이 하나
 *   selling   매출 순위의 **대상**      →  무엇이 팔리나
 *   deals     무료와 할인의 **정도**    →  얼마나 싸나
 *   watching  시청자 **수**            →  몇 명이 보나
 *
 * 앞의 `뭐가 팔리나 · 뭐가 싸나 · 뭘 보나` 는 구어 축약이었고, 무엇보다
 * `싸나` 가 그 축보다 좁았다. deals 는 할인만이 아니라 무료 배포도 센다 —
 * 카드가 실제로 `무료 1 · 할인 18` 을 띄운다. `얼마나` 로 둘을 다 담는다.
 */
export const SERVICE_AXES = [
  { id: 'playing', question: '몇 명이 하나', href: '#sec-now', navClass: 'play-nav-link' },
  { id: 'selling', question: '무엇이 팔리나', href: '#/charts', navClass: 'sales-chart-nav-link' },
  { id: 'deals', question: '얼마나 싸나', href: '#/sales', navClass: 'sales-nav-link' },
  { id: 'watching', question: '몇 명이 보나', href: '#/streaming', navClass: 'stream-nav-link' },
];

/** 첫 화면 요약 네 칸. 순서는 하는 것 → 사는 것 → 공짜 → 보는 것. */
export function overview(sources = {}) {
  const byId = {
    playing: () => playingAxis(sources.board),
    selling: () => sellingAxis(sources.salesCharts),
    deals: () => dealsAxis(sources),
    watching: () => watchingAxis(sources.streaming),
  };
  return SERVICE_AXES.map((axis) => ({ ...axis, ...byId[axis.id]() }));
}
