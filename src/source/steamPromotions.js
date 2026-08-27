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
  if (data.is_free === true) return { kind: 'permanent_free', reading: null };
  if (!data.price_overview) return { kind: 'unpriced', reading: null };
  const price = data.price_overview;
  if (
    price.currency !== 'KRW' || !Number.isInteger(price.initial) || !Number.isInteger(price.final)
    || !Number.isInteger(price.discount_percent) || price.final > price.initial
  ) throw new TypeError(`appid ${chartRow.appid} 한국 가격 형식이 잘못됐다`);
  if (price.discount_percent <= 0 || price.final === price.initial) return { kind: 'regular', reading: null };
  return {
    kind: 'discount',
    reading: {
      ...chartRow,
      name: data.name,
      imageUrl: typeof data.header_image === 'string' ? data.header_image : null,
      initialMinor: price.initial,
      finalMinor: price.final,
      discountPercent: price.discount_percent,
      currency: 'KRW',
      country: 'KR',
      fetchedAt: now.toISOString(),
      storeUrl: `https://store.steampowered.com/app/${chartRow.appid}/?cc=KR&l=koreana`,
    },
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

export function parseFreeToKeepResults(body, now = new Date()) {
  if (!body || body.success !== 1 || typeof body.results_html !== 'string' || !Number.isInteger(body.total_count)) {
    throw new TypeError('Steam 무료 소장 검색 응답을 읽을 수 없다');
  }
  if (body.total_count === 0) return [];
  const rows = body.results_html.match(/<a\b[^>]*class="[^"]*search_result_row[^"]*"[\s\S]*?<\/a>/g) ?? [];
  const readings = [];
  for (const row of rows) {
    const appid = Number(row.match(/data-ds-appid="(\d+)"/)?.[1]);
    const href = decodeHtml(row.match(/href="([^"]+)"/)?.[1] ?? '');
    const discountText = textOf(row, 'discount_pct');
    const title = textOf(row, 'title');
    const originalText = textOf(row, 'discount_original_price');
    const imageUrl = decodeHtml(row.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? '');
    if (!appid || discountText !== '-100%' || !title || !href || !originalText) continue;
    const originalWon = Number(originalText.replace(/[^0-9]/g, ''));
    if (!Number.isInteger(originalWon) || originalWon <= 0) continue;
    readings.push({
      appid, title, originalWon, currency: 'KRW', imageUrl: imageUrl || null,
      storeUrl: href.replace(/^http:/, 'https:'), fetchedAt: now.toISOString(), endAt: null,
    });
  }
  if (body.total_count > 0 && readings.length === 0) {
    throw new TypeError(`무료 소장 후보 ${body.total_count}개가 있지만 100% 할인 항목을 해석하지 못했다`);
  }
  return readings;
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
    data && data.schemaVersion === 1 && Number.isFinite(Date.parse(data.completedAt))
    && Array.isArray(data.giveaways)
    && data.giveaways.every((item) => Number.isInteger(item.appid) && item.originalWon > 0
      && item.currency === 'KRW' && typeof item.storeUrl === 'string'),
  );
}
