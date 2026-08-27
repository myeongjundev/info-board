import { validateReleaseCalendar } from './releaseCalendar.js';
import { assertDescriptorsPresent, isAdultItem, toDescriptorIds } from './contentDescriptors.js';

export const SALES_CHART_URLS = {
  korea: 'https://store.steampowered.com/charts/topselling/KR?cc=KR&l=koreana',
  global: 'https://store.steampowered.com/charts/topselling/global?cc=KR&l=koreana',
  overview: 'https://store.steampowered.com/charts/?cc=KR&l=koreana',
};

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new TypeError(`Steam 차트에서 ${startMarker}를 찾지 못했다`);
  const contentStart = start + startMarker.length;
  const end = source.indexOf(endMarker, contentStart);
  if (end < 0) throw new TypeError(`Steam 차트에서 ${endMarker}를 찾지 못했다`);
  return source.slice(contentStart, end);
}

export function parseSsrChartDocument(html) {
  if (typeof html !== 'string') throw new TypeError('Steam 차트 HTML이 문자열이 아니다');
  const loaderRaw = between(html, 'window.SSR.loaderData = ', ';window.SSR');
  const loaderData = JSON.parse(loaderRaw).map((item) => JSON.parse(item));
  const contextExpression = between(html, 'window.SSR.renderContext=JSON.parse(', ');');
  const renderContext = JSON.parse(JSON.parse(contextExpression));
  const queries = JSON.parse(renderContext.queryData).queries;
  return { loaderData, queries };
}

function storeItems(queries) {
  const map = new Map();
  for (const query of queries) {
    if (query.queryKey?.[0] !== 'StoreItem') continue;
    const appid = Number(String(query.queryKey[1]).replace('app_', ''));
    if (!appid) continue;
    const item = map.get(appid) ?? { appid };
    const kind = query.queryKey[2];
    if (kind === 'default_info') Object.assign(item, query.state.data);
    if (kind === 'include_assets') item.assets = query.state.data;
    map.set(appid, item);
  }
  return map;
}

function imageFromAssets(assets) {
  if (!assets?.asset_url_format || !assets.header) return null;
  const path = assets.asset_url_format.replace('${FILENAME}', assets.header);
  return `https://shared.fastly.steamstatic.com/store_item_assets/${path}`;
}

function itemReading(appid, rank, items) {
  const item = items.get(appid);
  if (!item?.name) return null;
  const price = item.best_purchase_option;
  const finalMinor = Number(price?.final_price_in_cents);
  const initialMinor = Number(price?.original_price_in_cents ?? price?.final_price_in_cents);
  const discountPercent = Number(price?.discount_pct ?? 0);
  const descriptorIds = toDescriptorIds(item.content_descriptorids);
  return {
    appid, rank, name: item.name,
    // Steam 이 나이 확인 뒤에 두는 항목이다. 순위·가격은 그대로 두고 표시만 접는다.
    adult: isAdultItem(descriptorIds),
    descriptorIds,
    imageUrl: imageFromAssets(item.assets),
    storeUrl: `https://store.steampowered.com/${item.store_url_path ?? `app/${appid}/`}?cc=KR&l=koreana`,
    isFree: item.is_free === true,
    initialMinor: Number.isInteger(initialMinor) ? initialMinor : null,
    finalMinor: Number.isInteger(finalMinor) ? finalMinor : null,
    discountPercent: Number.isInteger(discountPercent) ? discountPercent : 0,
  };
}

function liveTop20(document, sort) {
  const query = document.queries.find((item) => (
    item.queryKey?.[0] === 'StoreQuery' && item.queryKey?.[1]?.sort === sort
    && item.queryKey?.[1]?.start === 0
  ));
  const ids = query?.state?.data?.rgItemIDs?.map((item) => item.appid).slice(0, 20);
  if (!ids || ids.length !== 20) throw new TypeError(`Steam 현재 매출 Top 20(${sort})을 읽지 못했다`);
  const items = storeItems(document.queries);
  return ids.map((appid, index) => itemReading(appid, index + 1, items)).filter(Boolean);
}

function weeklyTop20(document) {
  const query = document.queries.find((item) => (
    item.queryKey?.[0] === 'ChartsWeeklyTopSellers' && item.queryKey?.[1] === 'KR'
    && item.queryKey?.[2] === 'latest' && item.queryKey?.[3] === 20 && item.queryKey?.[4] === true
  ));
  const rows = query?.state?.data?.rgRanks;
  if (!rows || rows.length !== 20) throw new TypeError('Steam 주간 매출 Top 20을 읽지 못했다');
  const items = storeItems(document.queries);
  return {
    weekStart: new Date(query.state.data.rtWeekStart * 1000).toISOString(),
    items: rows.map((row) => {
      const reading = itemReading(row.itemKey.appid, row.nRank, items);
      if (!reading) return null;
      return {
        ...reading,
        previousRank: row.nRankLastWeek || null,
        consecutiveWeeks: row.nConsecutiveWeeks,
        firstTop100: row.bFirstTop100 === true,
      };
    }).filter(Boolean),
  };
}

function monthlyReleases(document) {
  const monthly = document.loaderData.find((item) => item.monthly)?.monthly;
  if (!monthly?.rgAppIDs?.length) throw new TypeError('Steam 월간 인기 신작을 읽지 못했다');
  const items = storeItems(document.queries);
  return {
    monthAt: new Date(monthly.rtMonth * 1000).toISOString(),
    saleName: monthly.strSaleName,
    items: monthly.rgAppIDs.map((appid) => itemReading(appid, null, items)).filter(Boolean),
  };
}

export function buildSalesChartSnapshot(krHtml, globalHtml, overviewHtml, now = new Date()) {
  const kr = parseSsrChartDocument(krHtml);
  const global = parseSsrChartDocument(globalHtml);
  const overview = parseSsrChartDocument(overviewHtml);
  const snapshot = {
    schemaVersion: 1,
    completedAt: now.toISOString(),
    source: { ...SALES_CHART_URLS, metric: 'revenue_rank', valuesPublished: false },
    live: { korea: liveTop20(kr, 10), global: liveTop20(global, 11) },
    weekly: weeklyTop20(overview),
    monthly: monthlyReleases(overview),
  };
  if (snapshot.live.korea.length !== 20 || snapshot.live.global.length !== 20 || snapshot.weekly.items.length !== 20) {
    throw new TypeError('Steam 판매 차트 필수 20개가 빠졌다');
  }
  // 성인 분류를 한 건도 못 읽었으면 응답 형식이 바뀐 것이다. 그대로 두면 접혀야 할
  // 항목이 조용히 펼쳐진 채 배포된다.
  assertDescriptorsPresent(
    [...snapshot.live.korea, ...snapshot.live.global, ...snapshot.weekly.items, ...snapshot.monthly.items],
    'Steam 판매 차트',
  );
  return snapshot;
}

export function validateSalesChartSnapshot(data) {
  const validItem = (item) => Number.isInteger(item.appid) && typeof item.name === 'string'
    && typeof item.storeUrl === 'string' && (item.rank === null || Number.isInteger(item.rank));
  return Boolean(
    data && data.schemaVersion === 1 && Number.isFinite(Date.parse(data.completedAt))
    && data.live?.korea?.length === 20 && data.live?.global?.length === 20
    && data.weekly?.items?.length === 20 && data.monthly?.items?.length > 0
    && validateReleaseCalendar(data.releaseCalendar)
    && [...data.live.korea, ...data.live.global, ...data.weekly.items, ...data.monthly.items].every(validItem),
  );
}

export function rankMovement(item) {
  if (item.firstTop100 || item.previousRank == null) return { kind: 'new', label: 'NEW' };
  const delta = item.previousRank - item.rank;
  if (delta > 0) return { kind: 'up', label: `▲ ${delta}` };
  if (delta < 0) return { kind: 'down', label: `▼ ${Math.abs(delta)}` };
  return { kind: 'same', label: '—' };
}
