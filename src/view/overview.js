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
export const AXIS = {
  OK: 'ok',
  EMPTY: 'empty',
  UNAVAILABLE: 'unavailable',
  // 아직 안 읽었다. **못 읽은 것과 다르다.**
  //
  // 이 자리에서 실제로 겪었다 — 배포 주소를 처음 열면 요약 카드가 잠깐
  // `확인 불가 · 정상값이 아직 없다` 라고 말했다. 파일은 멀쩡했고 그저 아직
  // 안 온 것이었다. `없다`와 `모른다`를 가르려고 만든 파일이 정작
  // `아직 모른다`를 `못 읽었다`로 뭉갠 셈이다.
  LOADING: 'loading',
};

/** 얼마나 하나 — 대표 게임의 동시접속자. 이미 계산된 board 에서 집어 온다. */
export function playingAxis(board, { loading = false } = {}) {
  const reading = board?.reading;
  if (!reading) {
    // 네 축 중 이 축만 런타임에 fetch 해서 온다. 나머지 셋은 빌드 때 들어온
    // 스냅샷이라 읽는 중이라는 상태가 아예 없다.
    return loading
      ? { state: AXIS.LOADING, reason: '기록 파일을 읽는 중' }
      : { state: AXIS.UNAVAILABLE, reason: '정상값이 아직 없다' };
  }
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
 * 이름을 명사로 둔다 — 그 축이 무엇을 재는지를 그대로 적는다.
 *
 *   playing   Steam 동시접속자 수        →  동시접속
 *   selling   Steam 이 공개한 매출 순위   →  매출 순위
 *   deals     무료 배포와 할인           →  할인·무료
 *   watching  치지직·Twitch 시청자 순위  →  시청 순위
 *
 * 이 파일은 앞서 두 번 다르게 적혀 있었다. 처음에는 명사형이었다가
 * `페이지 제목이 질문이니 나브도 질문이어야 한다` 는 이유로 질문형으로 갔고
 * (`뭐가 팔리나`), 그 뒤 구어 축약을 걷어내 `무엇이 팔리나` 로 다듬었다.
 *
 * **다시 명사로 돌린다.** 질문형을 버리는 이유는 이렇다. 이 이름은 나브와
 * 요약 카드 라벨 두 곳에 동시에 들어가는데, 나브에서는 길의 이름이라 질문일
 * 이유가 없다. 페이지 제목(`무엇이 지금 팔리고 있을까`)이 이미 질문을 하고
 * 있으므로 나브까지 질문이면 같은 말을 두 번 하는 것이다.
 *
 * `할인·무료` 에 무료를 같이 적은 것은 남겨 둔다. deals 는 할인만이 아니라
 * 무료 배포도 세고, 카드가 실제로 `무료 1 · 할인 18` 을 띄운다.
 * 이름이 내용보다 좁으면 안 된다.
 *
 * 필드 이름도 `question` 에서 `label` 로 바꿨다. 명사를 question 이라는
 * 이름에 담아 두면 다음 사람이 이 표를 잘못 읽는다.
 */
// `href` 와 `detailHref` 를 가른 이유.
//
// `href` 는 상단 나브가 쓰는 **그 축이 사는 곳**이다. 동시접속은 이 페이지 자체이므로
// `#sec-now` 가 맞고, 나브는 그 값으로 지금 보고 있는 곳을 표시한다.
//
// 그런데 첫 화면 요약 카드의 `상세 보기` 가 같은 주소를 쓰고 있었다. 그 카드는
// `#sec-now`(=<main>) 바로 아래에 있어서, **누르면 56px 위로 올라가 방금 누른 카드를
// 다시 보게 됐다.** 나머지 세 축은 실제로 다른 페이지로 가는데 하나만 제자리였다.
// 띠 머리글이 `계산 근거와 상세 구역으로 이동합니다` 라고 약속한 자리다.
//
// 그래서 카드가 쓸 주소를 따로 둔다. 없으면 `href` 를 쓴다 — 다른 페이지로 가는
// 세 축은 둘이 같아도 되기 때문이다.
export const SERVICE_AXES = [
  { id: 'playing', label: '동시접속', href: '#sec-now', detailHref: '#sec-focus', navClass: 'play-nav-link' },
  { id: 'selling', label: '매출 순위', href: '#/charts', navClass: 'sales-chart-nav-link' },
  { id: 'deals', label: '할인·무료', href: '#/sales', navClass: 'sales-nav-link' },
  { id: 'watching', label: '시청 순위', href: '#/streaming', navClass: 'stream-nav-link' },
];

/** 첫 화면 요약 네 칸. 순서는 하는 것 → 사는 것 → 공짜 → 보는 것. */
export function overview(sources = {}) {
  const byId = {
    playing: () => playingAxis(sources.board, { loading: sources.loading === true }),
    selling: () => sellingAxis(sources.salesCharts),
    deals: () => dealsAxis(sources),
    watching: () => watchingAxis(sources.streaming),
  };
  return SERVICE_AXES.map((axis) => ({ detailHref: axis.href, ...axis, ...byId[axis.id]() }));
}
