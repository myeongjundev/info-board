import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseEpicFreeResponse, remainingLabel, validateEpicFreeSnapshot,
} from '../src/source/epicFree.js';

const element = {
  id: 'offer-1', title: '테스트 게임', productSlug: 'test-game/home',
  keyImages: [{ type: 'OfferImageWide', url: 'https://cdn.example/wide.jpg' }],
  price: { totalPrice: { originalPrice: 27000, discountPrice: 0, currencyCode: 'KRW' } },
  promotions: { promotionalOffers: [{ promotionalOffers: [{
    startDate: '2026-08-27T15:00:00.000Z', endDate: '2026-09-03T15:00:00.000Z',
    discountSetting: { discountPercentage: 0 },
  }] }] },
};

test('현재 기간 한정 무료 배포를 한국 상점 Reading으로 만든다', () => {
  const body = { data: { Catalog: { searchStore: { elements: [element] } } } };
  const [reading] = parseEpicFreeResponse(body, new Date('2026-08-28T00:00:00.000Z'));
  assert.equal(reading.title, '테스트 게임');
  assert.equal(reading.originalPrice, 27000);
  assert.equal(reading.storeUrl, 'https://store.epicgames.com/ko/p/test-game');
});

test('상시 무료와 아직 시작하지 않은 배포는 제외한다', () => {
  const future = structuredClone(element);
  future.promotions.promotionalOffers[0].promotionalOffers[0].startDate = '2026-09-04T00:00:00.000Z';
  const alwaysFree = { ...element, id: 'free', promotions: null };
  const body = { data: { Catalog: { searchStore: { elements: [future, alwaysFree] } } } };
  assert.deepEqual(parseEpicFreeResponse(body, new Date('2026-08-28T00:00:00.000Z')), []);
});

test('남은 시간을 일·시간 단위로 표시한다', () => {
  assert.equal(remainingLabel('2026-08-30T03:30:00.000Z', Date.parse('2026-08-28T00:00:00.000Z')), '2일 3시간 남음');
  assert.equal(remainingLabel('2026-08-27T00:00:00.000Z', Date.parse('2026-08-28T00:00:00.000Z')), '배포 종료');
});

test('Epic 스냅샷 필수 필드를 검사한다', () => {
  const now = '2026-08-28T00:00:00.000Z';
  const giveaway = parseEpicFreeResponse(
    { data: { Catalog: { searchStore: { elements: [element] } } } }, new Date(now),
  )[0];
  assert.equal(validateEpicFreeSnapshot({
    schemaVersion: 1, completedAt: now,
    source: { id: 'epic-store-free-games-promotions-unofficial' }, giveaways: [giveaway],
  }), true);
});
