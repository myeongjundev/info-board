import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDiscountUrl, krwFromMinor, parseDiscountResponse, DiscountSchemaError, validateDiscountSnapshot,
} from '../src/source/discounts.js';

const game = { appid: 620, name: 'Portal 2', year: 2011, genre: '퍼즐' };
const now = new Date('2026-08-27T12:00:00.000Z');

test('한국 상점 주소를 만든다', () => {
  assert.equal(
    buildDiscountUrl(620),
    'https://store.steampowered.com/api/appdetails?appids=620&cc=KR&l=koreana',
  );
});

test('Store 내부 최소단위를 한국 원 단위로 바꾼다', () => {
  assert.equal(krwFromMinor(6000000), 60000);
  assert.equal(krwFromMinor(900000), 9000);
  assert.throws(() => krwFromMinor(-1), TypeError);
});

test('할인값과 출처와 조회시각을 Reading 하나로 묶는다', () => {
  const out = parseDiscountResponse({
    620: { success: true, data: { is_free: false, price_overview: {
      currency: 'KRW', initial: 10500, final: 2100, discount_percent: 80,
    } } },
  }, game, now);
  assert.equal(out.kind, 'discount');
  assert.deepEqual(out.reading, {
    appid: 620, name: 'Portal 2', year: 2011, genre: '퍼즐',
    initialMinor: 10500, finalMinor: 2100, discountPercent: 80,
    currency: 'KRW', country: 'KR', fetchedAt: now.toISOString(),
    sourceUrl: buildDiscountUrl(620),
    sourceLabel: 'Steam Store · 비공식 appdetails',
    storeUrl: 'https://store.steampowered.com/app/620/',
  });
});

test('무료·정가·가격 없음은 할인 Reading을 만들지 않는다', () => {
  assert.equal(parseDiscountResponse({ 620: { success: true, data: { is_free: true } } }, game, now).kind, 'free');
  assert.equal(parseDiscountResponse({ 620: { success: true, data: {} } }, game, now).kind, 'unpriced');
  assert.equal(parseDiscountResponse({
    620: { success: true, data: { price_overview: {
      currency: 'KRW', initial: 10500, final: 10500, discount_percent: 0,
    } } },
  }, game, now).kind, 'regular');
});

test('실패와 잘못된 통화를 0으로 바꾸지 않고 거부한다', () => {
  assert.throws(() => parseDiscountResponse({ 620: { success: false } }, game, now), DiscountSchemaError);
  assert.throws(() => parseDiscountResponse({
    620: { success: true, data: { price_overview: {
      currency: 'USD', initial: 10, final: 5, discount_percent: 50,
    } } },
  }, game, now), DiscountSchemaError);
});

test('할인 스냅샷의 필수 필드를 검사한다', () => {
  const reading = parseDiscountResponse({
    620: { success: true, data: { price_overview: {
      currency: 'KRW', initial: 10500, final: 2100, discount_percent: 80,
    } } },
  }, game, now).reading;
  const snapshot = {
    schemaVersion: 1,
    completedAt: now.toISOString(),
    counts: { checked: 75, failed: 0 },
    discounts: [reading],
  };
  assert.equal(validateDiscountSnapshot(snapshot), true);
  assert.equal(validateDiscountSnapshot({ ...snapshot, discounts: [{ ...reading, finalMinor: null }] }), false);
});
