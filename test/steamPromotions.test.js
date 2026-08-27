import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDiscountEndFromHtml, parseFreeToKeepResults, parseMostPlayedHtml,
} from '../src/source/steamPromotions.js';

test('Steam Top 100 HTML에서 순위와 동시접속자를 읽는다', () => {
  const rows = Array.from({ length: 100 }, (_, index) => (
    `\\\\\\"nRank\\\\\\":${index + 1},\\\\\\"itemKey\\\\\\":{\\\\\\"appid\\\\\\":${1000 + index}},\\\\\\"nConcurrentInGame\\\\\\":${5000 - index},\\\\\\"nPeakInGame\\\\\\":${6000 - index}`
  )).join(',');
  const parsed = parseMostPlayedHtml(rows);
  assert.equal(parsed.length, 100);
  assert.deepEqual(parsed[0], { rank: 1, appid: 1000, currentPlayers: 5000, peakToday: 6000 });
});

test('Steam 무료 소장 검색의 정상 빈 결과를 허용한다', () => {
  assert.deepEqual(parseFreeToKeepResults({ success: 1, total_count: 0, results_html: '' }), []);
});

test('상시 무료가 아닌 100% 할인만 무료 소장으로 읽는다', () => {
  const html = `<a href="https://store.steampowered.com/app/42/test/" class="search_result_row" data-ds-appid="42">
    <img src="https://cdn.example/42.jpg"><span class="title">테스트 &amp; 게임</span>
    <div class="discount_pct">-100%</div><div class="discount_original_price">₩ 27,000</div></a>`;
  const [item] = parseFreeToKeepResults({ success: 1, total_count: 1, results_html: html }, new Date('2026-08-28T00:00:00Z'));
  assert.equal(item.title, '테스트 & 게임');
  assert.equal(item.originalWon, 27000);
});

test('상점 페이지의 할인 종료 epoch를 ISO 시각으로 바꾼다', () => {
  assert.equal(parseDiscountEndFromHtml('<div data-discount-expiration="1788451200">'), '2026-09-03T16:00:00.000Z');
  assert.equal(parseDiscountEndFromHtml('<html>없음</html>'), null);
});
