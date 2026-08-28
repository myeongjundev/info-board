// 2026-08-28 공개 주소에 붉은사막이 `-20% ₩70 → ₩56` 으로 떠 있었다.
// 실제 한국 가격은 ₩79,800 → ₩63,840 이고, 저장값 6999/5599 는 USD 센트였다.
// 아래 표본은 그날 실제 응답에서 가져온 것이다.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertPriceTextPresent, currencyFromFormatted, isAllKrw, readChartPrice,
} from '../src/source/chartPrice.js';
import { priceMarksOnScreen } from '../src/view/gameDisplay.js';

const KRW = {
  final_price_in_cents: '6384000',
  original_price_in_cents: '7980000',
  formatted_final_price: '₩ 63,840',
  formatted_original_price: '₩ 79,800',
  discount_pct: 20,
};

// Actions(미국 러너)에서 같은 게임을 수집했을 때 온 모양.
const USD = {
  final_price_in_cents: '5599',
  original_price_in_cents: '6999',
  formatted_final_price: '$55.99',
  formatted_original_price: '$69.99',
  discount_pct: 20,
};

test('원화 표기는 KRW 로 읽는다', () => {
  assert.equal(currencyFromFormatted('₩ 63,840'), 'KRW');
});

test('모르는 통화에 이름을 붙이지 않는다', () => {
  assert.equal(currencyFromFormatted('$55.99'), null);
  assert.equal(currencyFromFormatted(''), null);
  assert.equal(currencyFromFormatted(undefined), null);
});

test('가격 글자를 원자료 그대로 옮긴다 — 나눗셈을 하지 않는다', () => {
  const price = readChartPrice(KRW);
  assert.equal(price.priceText, '₩ 63,840');
  assert.equal(price.priceTextInitial, '₩ 79,800');
  assert.equal(price.currency, 'KRW');
  assert.equal(price.finalMinor, 6384000);
});

test('달러로 와도 원화 기호를 붙이지 않는다', () => {
  const price = readChartPrice(USD);
  assert.equal(price.priceText, '$55.99');
  assert.equal(price.currency, null);
  // 숫자는 보존하되 그 단위가 원이라고 주장하지 않는다.
  assert.equal(price.finalMinor, 5599);
});

test('할인이 없으면 원가 표기가 현재가와 같다', () => {
  const price = readChartPrice({ final_price_in_cents: '840000', formatted_final_price: '₩ 8,400' });
  assert.equal(price.priceTextInitial, '₩ 8,400');
  assert.equal(price.discountPercent, 0);
});

test('가격이 붙었는데 표기를 하나도 못 읽으면 스냅샷을 덮지 않는다', () => {
  const broken = [{ isFree: false, finalMinor: 6384000, priceText: null }];
  assert.throws(() => assertPriceTextPresent(broken, '테스트'), /가격 표기/);
});

test('무료와 가격 없음은 형식 변경이 아니다', () => {
  assert.doesNotThrow(() => assertPriceTextPresent([{ isFree: true, finalMinor: null }], '테스트'));
  assert.doesNotThrow(() => assertPriceTextPresent([], '테스트'));
});

test('한국 가격이라고 부를 수 있는지는 전부 KRW 일 때만이다', () => {
  const krw = { isFree: false, priceText: '₩ 63,840', currency: 'KRW' };
  const usd = { isFree: false, priceText: '$55.99', currency: null };
  assert.equal(isAllKrw([krw, krw]), true);
  assert.equal(isAllKrw([krw, usd]), false);
  assert.equal(isAllKrw([]), false);
});

test('화면이 어떤 표기가 떠 있는지 스스로 센다', () => {
  assert.equal(priceMarksOnScreen([{ priceText: '₩ 63,840' }, { priceText: '₩ 8,400' }]), '₩');
  // 섞이면 섞였다고 적는다.
  assert.equal(priceMarksOnScreen([{ priceText: '₩ 63,840' }, { priceText: '$55.99' }]), '$ · ₩');
  assert.equal(priceMarksOnScreen([{ isFree: true, priceText: '무료' }]), null);
  assert.equal(priceMarksOnScreen([]), null);
});
