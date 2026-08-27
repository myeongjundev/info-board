// 한국 Steam 상점 가격 수집.
//
// 중요: 이 경로는 Valve가 공개 문서로 보장한 Web API가 아니다. 2026-08-27 사용자가
// 할인 페이지 실험을 위해 명시적으로 허용했다. 제출 전 유지 여부를 다시 판단한다.

export const DISCOUNT_SOURCE = {
  id: 'steam-store-appdetails-unofficial',
  label: 'Steam Store · 비공식 appdetails',
  country: 'KR',
  currency: 'KRW',
  language: 'koreana',
  warning: '문서화되지 않은 Steam Store 응답이며 예고 없이 바뀔 수 있다.',
};

export function buildDiscountUrl(appid) {
  return `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=KR&l=koreana`;
}

export function krwFromMinor(value) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError('KRW 최소단위는 0 이상의 정수여야 한다');
  return value / 100;
}

export class DiscountSchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DiscountSchemaError';
  }
}

/**
 * 응답 하나를 가격 상태로 바꾼다.
 * 가격이 없거나 할인하지 않는 게임을 0원·0% Reading으로 만들지 않는다.
 */
export function parseDiscountResponse(body, game, now = new Date()) {
  const item = body?.[String(game.appid)];
  if (!item || item.success !== true || !item.data || typeof item.data !== 'object') {
    throw new DiscountSchemaError(`appid ${game.appid} 응답을 읽을 수 없다`);
  }

  if (item.data.is_free === true) return { kind: 'free', reading: null };

  const price = item.data.price_overview;
  if (price == null) return { kind: 'unpriced', reading: null };
  if (typeof price !== 'object') throw new DiscountSchemaError('price_overview가 객체가 아니다');

  const { currency, initial: initialMinor, final: finalMinor, discount_percent: discountPercent } = price;
  if (currency !== DISCOUNT_SOURCE.currency) {
    throw new DiscountSchemaError(`통화가 KRW가 아니다: ${String(currency)}`);
  }
  if (![initialMinor, finalMinor, discountPercent].every(Number.isInteger)) {
    throw new DiscountSchemaError('가격 또는 할인율이 정수가 아니다');
  }
  if (initialMinor < 0 || finalMinor < 0 || finalMinor > initialMinor || discountPercent < 0 || discountPercent > 100) {
    throw new DiscountSchemaError('가격 또는 할인율 범위가 잘못됐다');
  }
  if (discountPercent === 0 || finalMinor === initialMinor) return { kind: 'regular', reading: null };

  return {
    kind: 'discount',
    reading: {
      appid: game.appid,
      name: game.name,
      year: game.year,
      genre: game.genre,
      // Store API는 KRW도 1원의 1/100 단위 정수로 준다. 이름으로 단위를 숨기지 않는다.
      initialMinor,
      finalMinor,
      discountPercent,
      currency,
      country: DISCOUNT_SOURCE.country,
      fetchedAt: now.toISOString(),
      sourceUrl: buildDiscountUrl(game.appid),
      sourceLabel: DISCOUNT_SOURCE.label,
      storeUrl: `https://store.steampowered.com/app/${game.appid}/`,
    },
  };
}

export function validateDiscountSnapshot(data) {
  if (
    !data || data.schemaVersion !== 1 || !Array.isArray(data.discounts)
    || !data.counts || !Number.isInteger(data.counts.checked) || !Number.isInteger(data.counts.failed)
    || typeof data.completedAt !== 'string' || Number.isNaN(Date.parse(data.completedAt))
  ) return false;
  return data.discounts.every((reading) => (
    Number.isInteger(reading.appid)
    && typeof reading.name === 'string'
    && Number.isInteger(reading.initialMinor)
    && Number.isInteger(reading.finalMinor)
    && Number.isInteger(reading.discountPercent)
    && reading.initialMinor >= reading.finalMinor
    && reading.finalMinor >= 0
    && reading.discountPercent > 0
    && reading.discountPercent <= 100
    && reading.currency === 'KRW'
    && reading.country === 'KR'
    && typeof reading.fetchedAt === 'string'
    && typeof reading.sourceUrl === 'string'
    && typeof reading.sourceLabel === 'string'
  ));
}
