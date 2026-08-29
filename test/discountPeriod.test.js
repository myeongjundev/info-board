import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attachPeriod, buildPeriodUrl, discountKindLabel, parsePeriodResponse, PERIOD_BATCH,
} from '../src/source/discountPeriod.js';

const NOW = new Date('2026-08-29T12:00:00.000Z');

function body(items) {
  return { response: { store_items: items } };
}

test('한 번에 묻는 수를 넘기지 않는다', () => {
  assert.throws(() => buildPeriodUrl([]), TypeError);
  assert.throws(() => buildPeriodUrl(new Array(PERIOD_BATCH + 1).fill(1)), TypeError);
  assert.throws(() => buildPeriodUrl(['570']), TypeError);
  assert.ok(buildPeriodUrl([570]).startsWith('https://api.steampowered.com/IStoreBrowseService/'));
});

test('묻는 나라와 언어가 주소에 실제로 들어간다', () => {
  const url = buildPeriodUrl([570]);
  const input = JSON.parse(decodeURIComponent(url.split('input_json=')[1]));
  assert.equal(input.context.country_code, 'KR');
  assert.equal(input.ids[0].appid, 570);
});

test('할인 중인 것에서 종료 시각과 종류를 읽는다', () => {
  const periods = parsePeriodResponse(body([{
    appid: 990080,
    best_purchase_option: {
      discount_pct: 90,
      final_price_in_cents: '798000',
      active_discounts: [{ discount_description: '#discount_desc_preset_special', discount_end_date: 1788454800 }],
    },
  }]), NOW);
  const hit = periods.get(990080);
  assert.equal(hit.endsAt, new Date(1788454800 * 1000).toISOString());
  assert.equal(hit.kindLabel, '특별 할인');
  assert.equal(hit.percentHere, 90);
  assert.equal(hit.finalMinorHere, 798000);
});

test('무료·정가·못 파는 것은 목록에 넣지 않는다', () => {
  const periods = parsePeriodResponse(body([
    { appid: 570, is_free: true },                                   // 무료
    { appid: 271590 },                                               // 살 수 없음
    { appid: 2246340, best_purchase_option: { final_price_in_cents: '4580000' } }, // 정가
  ]), NOW);
  assert.equal(periods.size, 0);
});

test('종료 시각을 못 받으면 비워 둔다 — 지어내지 않는다', () => {
  const periods = parsePeriodResponse(body([{
    appid: 1,
    best_purchase_option: { discount_pct: 50, active_discounts: [{ discount_description: null }] },
  }]), NOW);
  assert.equal(periods.get(1).endsAt, null);
  assert.equal(periods.get(1).kindLabel, null);
});

test('모르는 종류는 지어내지 않고 원문을 남긴다', () => {
  assert.equal(discountKindLabel('#discount_desc_preset_special'), '특별 할인');
  assert.equal(discountKindLabel('#discount_desc_preset_unknown_2099'), null);
  assert.equal(discountKindLabel(''), null);

  const periods = parsePeriodResponse(body([{
    appid: 7,
    best_purchase_option: { discount_pct: 30, active_discounts: [{ discount_description: '#brand_new_preset', discount_end_date: 1788454800 }] },
  }]), NOW);
  const attached = attachPeriod({ appid: 7, discountPercent: 30 }, periods.get(7));
  assert.equal(attached.discountKind, '#brand_new_preset');
});

test('응답 형태가 아니면 던진다 — 빈 결과로 바꾸지 않는다', () => {
  assert.throws(() => parsePeriodResponse({}, NOW), TypeError);
  assert.throws(() => parsePeriodResponse({ response: {} }, NOW), TypeError);
});

test('기간을 못 받은 줄은 못 받았다고 적는다', () => {
  const attached = attachPeriod({ appid: 9, discountPercent: 20 }, undefined);
  assert.equal(attached.periodKnown, false);
  assert.equal(attached.discountEndsAt, null);
});

test('두 출처의 할인율이 다르면 감추지 않고 적는다', () => {
  const period = { appid: 5, endsAt: null, kindLabel: null, kindRaw: null, percentHere: 75, fetchedAt: NOW.toISOString(), sourceLabel: 'x' };
  const same = attachPeriod({ appid: 5, discountPercent: 75 }, period);
  assert.equal(same.periodPercentDisagrees, undefined);

  const differs = attachPeriod({ appid: 5, discountPercent: 60 }, period);
  assert.equal(differs.periodPercentDisagrees, 75);
  assert.equal(differs.discountPercent, 60, '화면이 쓰는 할인율은 여전히 가격 출처 것이다');
});
