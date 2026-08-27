export const EPIC_FREE_SOURCE = {
  id: 'epic-store-free-games-promotions-unofficial',
  label: 'Epic Games Store · 공개 프로모션 응답',
  country: 'KR',
  locale: 'ko',
  warning: '문서화된 공개 API가 아니며 예고 없이 형식이 바뀔 수 있다.',
};

export const EPIC_FREE_URL = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=ko&country=KR&allowCountries=KR';
export const EPIC_FREE_PAGE = 'https://store.epicgames.com/free-games?lang=ko';

function currentFreePromotion(element, nowMs) {
  return element.promotions?.promotionalOffers
    ?.flatMap((group) => group.promotionalOffers ?? [])
    .find((promotion) => (
      promotion.discountSetting?.discountPercentage === 0
      && Date.parse(promotion.startDate) <= nowMs
      && nowMs < Date.parse(promotion.endDate)
    ));
}

function pickImage(element) {
  const preferred = ['OfferImageWide', 'DieselStoreFrontWide', 'VaultClosed'];
  for (const type of preferred) {
    const hit = element.keyImages?.find((image) => image.type === type && image.url);
    if (hit) return hit.url;
  }
  return element.keyImages?.find((image) => image.url)?.url ?? null;
}

function storePath(element) {
  const raw = element.productSlug || element.catalogNs?.mappings?.[0]?.pageSlug;
  if (!raw || typeof raw !== 'string') return null;
  return raw.replace(/^\/+|\/home\/?$/g, '');
}

export function parseEpicFreeResponse(body, now = new Date()) {
  const elements = body?.data?.Catalog?.searchStore?.elements;
  if (!Array.isArray(elements) || elements.length === 0) {
    throw new TypeError('Epic 프로모션 목록을 읽을 수 없다');
  }

  const fetchedAt = now.toISOString();
  const giveaways = [];
  for (const element of elements) {
    const promotion = currentFreePromotion(element, now.getTime());
    if (!promotion) continue;
    const price = element.price?.totalPrice;
    const path = storePath(element);
    if (
      !element.id || !element.title || !price || !path
      || !Number.isInteger(price.originalPrice) || price.originalPrice <= 0
      || price.discountPrice !== 0 || price.currencyCode !== 'KRW'
      || !Number.isFinite(Date.parse(promotion.startDate))
      || !Number.isFinite(Date.parse(promotion.endDate))
    ) continue;

    giveaways.push({
      id: element.id,
      title: element.title,
      originalPrice: price.originalPrice,
      currency: price.currencyCode,
      startAt: promotion.startDate,
      endAt: promotion.endDate,
      imageUrl: pickImage(element),
      storeUrl: `https://store.epicgames.com/ko/p/${path}`,
      fetchedAt,
    });
  }
  giveaways.sort((a, b) => Date.parse(a.endAt) - Date.parse(b.endAt) || a.title.localeCompare(b.title, 'ko'));
  return giveaways;
}

export function validateEpicFreeSnapshot(data) {
  if (
    !data || data.schemaVersion !== 1 || !Array.isArray(data.giveaways)
    || !Number.isFinite(Date.parse(data.completedAt)) || data.source?.id !== EPIC_FREE_SOURCE.id
  ) return false;
  return data.giveaways.every((item) => (
    typeof item.id === 'string' && typeof item.title === 'string'
    && Number.isInteger(item.originalPrice) && item.originalPrice > 0
    && item.currency === 'KRW'
    && Number.isFinite(Date.parse(item.startAt)) && Number.isFinite(Date.parse(item.endAt))
    && Date.parse(item.endAt) > Date.parse(item.startAt)
    && (item.imageUrl === null || typeof item.imageUrl === 'string')
    && typeof item.storeUrl === 'string' && typeof item.fetchedAt === 'string'
  ));
}

export function remainingLabel(endAt, nowMs = Date.now()) {
  const remaining = Date.parse(endAt) - nowMs;
  if (!Number.isFinite(remaining) || remaining <= 0) return '배포 종료';
  const minutes = Math.ceil(remaining / 60_000);
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const mins = minutes % 60;
  if (days) return `${days}일 ${hours}시간 남음`;
  if (hours) return `${hours}시간 ${mins}분 남음`;
  return `${mins}분 남음`;
}
