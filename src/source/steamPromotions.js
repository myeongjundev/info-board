import { hasDescriptorSource, isAdultItem, toDescriptorIds } from './contentDescriptors.js';
export const MOST_PLAYED_URL = 'https://store.steampowered.com/charts/mostplayed/?cc=KR&l=koreana';
export const FREE_TO_KEEP_URL = 'https://store.steampowered.com/search/results/?query&start=0&count=50&dynamic_data=&sort_by=_ASC&maxprice=free&specials=1&hidef2p=1&category1=998&infinite=1&cc=KR&l=koreana';

export function parseMostPlayedHtml(html) {
  if (typeof html !== 'string') throw new TypeError('Steam Top 100 HTML이 문자열이 아니다');
  const pattern = /\\{3}"nRank\\{3}":(\d+),\\{3}"itemKey\\{3}":\{\\{3}"appid\\{3}":(\d+)\},\\{3}"nConcurrentInGame\\{3}":(\d+),\\{3}"nPeakInGame\\{3}":(\d+)/g;
  const rows = [...html.matchAll(pattern)].map((match) => ({
    rank: Number(match[1]), appid: Number(match[2]),
    currentPlayers: Number(match[3]), peakToday: Number(match[4]),
  }));
  if (rows.length !== 100 || rows.some((row, index) => row.rank !== index + 1)) {
    throw new TypeError(`Steam Top 100 순위를 온전히 읽지 못했다: ${rows.length}개`);
  }
  return rows;
}

export function parsePopularPriceResponse(body, chartRow, now = new Date()) {
  const item = body?.[String(chartRow.appid)];
  if (!item || item.success !== true || !item.data || typeof item.data !== 'object') {
    throw new TypeError(`appid ${chartRow.appid} 가격 응답을 읽을 수 없다`);
  }
  const data = item.data;
  const descriptorRaw = data.content_descriptors;
  const descriptorAvailable = hasDescriptorSource(descriptorRaw);
  if (data.is_free === true) return { kind: 'permanent_free', reading: null, descriptorAvailable };
  if (!data.price_overview) return { kind: 'unpriced', reading: null, descriptorAvailable };
  const price = data.price_overview;
  if (
    price.currency !== 'KRW' || !Number.isInteger(price.initial) || !Number.isInteger(price.final)
    || !Number.isInteger(price.discount_percent) || price.final > price.initial
  ) throw new TypeError(`appid ${chartRow.appid} 한국 가격 형식이 잘못됐다`);
  if (price.discount_percent <= 0 || price.final === price.initial) {
    return { kind: 'regular', reading: null, descriptorAvailable };
  }
  const descriptorIds = toDescriptorIds(descriptorRaw);
  return {
    kind: 'discount',
    reading: {
      ...chartRow,
      name: data.name,
      // Steam 이 나이 확인 뒤에 두는 항목. 순위·가격은 그대로, 표시만 접는다.
      adult: isAdultItem(descriptorIds),
      descriptorIds,
      descriptorAvailable,
      imageUrl: typeof data.header_image === 'string' ? data.header_image : null,
      initialMinor: price.initial,
      finalMinor: price.final,
      discountPercent: price.discount_percent,
      currency: 'KRW',
      country: 'KR',
      fetchedAt: now.toISOString(),
      storeUrl: `https://store.steampowered.com/app/${chartRow.appid}/?cc=KR&l=koreana`,
    },
    descriptorAvailable,
  };
}

function decodeHtml(text) {
  return text
    .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

function textOf(fragment, className) {
  const match = fragment.match(new RegExp(`<[^>]+class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`));
  return match ? decodeHtml(match[1].replace(/<[^>]+>/g, '').trim()) : null;
}

function wonValue(text) {
  if (typeof text !== 'string') return null;
  const value = Number(text.replace(/[^0-9]/g, ''));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function parseSteamFreeSearchResults(body, now = new Date()) {
  if (!body || body.success !== 1 || typeof body.results_html !== 'string' || !Number.isInteger(body.total_count)) {
    throw new TypeError('Steam 무료 이벤트 검색 응답을 읽을 수 없다');
  }
  if (body.total_count === 0) return { giveaways: [], weekendCandidates: [] };
  const rows = body.results_html.match(/<a\b[^>]*class="[^"]*search_result_row[^"]*"[\s\S]*?<\/a>/g) ?? [];
  const giveaways = [];
  const weekendCandidates = [];
  for (const row of rows) {
    const appid = Number(row.match(/data-ds-appid="(\d+)"/)?.[1]);
    const href = decodeHtml(row.match(/href="([^"]+)"/)?.[1] ?? '');
    const discountText = textOf(row, 'discount_pct');
    const title = textOf(row, 'title');
    const originalText = textOf(row, 'discount_original_price');
    const finalText = textOf(row, 'discount_final_price');
    const imageUrl = decodeHtml(row.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? '');
    const originalWon = wonValue(originalText);
    if (!appid || !title || !href || !originalWon) continue;
    const common = {
      appid, title, currency: 'KRW', imageUrl: imageUrl || null,
      storeUrl: href.replace(/^http:/, 'https:'), fetchedAt: now.toISOString(), endAt: null,
    };
    if (discountText === '-100%') {
      giveaways.push({ ...common, originalWon });
      continue;
    }
    const discountPercent = Number(discountText?.replace(/[^0-9]/g, '')) || 0;
    const finalWon = wonValue(finalText);
    weekendCandidates.push({
      ...common, originalWon, finalWon, discountPercent,
    });
  }
  if (body.total_count > 0 && giveaways.length === 0 && weekendCandidates.length === 0) {
    throw new TypeError(`무료 이벤트 후보 ${body.total_count}개를 해석하지 못했다`);
  }
  return { giveaways, weekendCandidates };
}

export function parseFreeToKeepResults(body, now = new Date()) {
  return parseSteamFreeSearchResults(body, now).giveaways;
}

export function parseFreeWeekendStorePage(html, candidate) {
  if (typeof html !== 'string' || !candidate || typeof candidate !== 'object') return null;
  const plain = decodeHtml(html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  const explicitWeekend = /free\s+weekend|무료\s*주말/i.test(plain);
  const temporaryPlay = /play\s+(?:the\s+game\s+)?for\s+free|무료로\s*(?:플레이|체험)|무료\s*(?:플레이|체험)/i.test(plain);
  if (!explicitWeekend && !temporaryPlay) return null;

  // 구매 할인 종료 시각과 무료 플레이 종료 시각은 다를 수 있다. 전용 키만 신뢰한다.
  const epoch = Number(html.match(/(?:free[_-]?weekend|free[_-]?(?:play|license))[_-]?(?:end|expiration)[^0-9]{0,40}(\d{10})/i)?.[1]);
  return {
    ...candidate,
    endAt: Number.isInteger(epoch) && epoch > 0 ? new Date(epoch * 1000).toISOString() : null,
  };
}

export function parseDiscountEndFromHtml(html) {
  if (typeof html !== 'string') return null;
  const epoch = Number(html.match(/data-discount-expiration="(\d{10})"/)?.[1]
    ?? html.match(/discount_expiration[^0-9]{0,20}(\d{10})/)?.[1]);
  return Number.isInteger(epoch) && epoch > 0 ? new Date(epoch * 1000).toISOString() : null;
}

export function validatePopularDiscountSnapshot(data) {
  return Boolean(
    data && data.schemaVersion === 1 && Number.isFinite(Date.parse(data.completedAt))
    && data.counts?.ranked === 100 && Array.isArray(data.discounts)
    && data.discounts.every((item) => Number.isInteger(item.rank) && Number.isInteger(item.appid)
      && item.discountPercent > 0 && item.currency === 'KRW'
      && (item.imageUrl === null || typeof item.imageUrl === 'string')),
  );
}

export function validateFreeToKeepSnapshot(data) {
  return Boolean(
    data && (data.schemaVersion === 1 || data.schemaVersion === 2) && Number.isFinite(Date.parse(data.completedAt))
    && Array.isArray(data.giveaways)
    && data.giveaways.every((item) => Number.isInteger(item.appid) && item.originalWon > 0
      && item.currency === 'KRW' && typeof item.storeUrl === 'string')
    && (data.schemaVersion === 1 || (Array.isArray(data.freeWeekends)
      && data.freeWeekends.every((item) => Number.isInteger(item.appid) && item.originalWon > 0
        && (item.finalWon === null || (Number.isInteger(item.finalWon) && item.finalWon > 0))
        && Number.isInteger(item.discountPercent) && item.discountPercent >= 0
        && item.currency === 'KRW'
        && typeof item.storeUrl === 'string'))),
  );
}
