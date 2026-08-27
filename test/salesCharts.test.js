import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { rankMovement, validateSalesChartSnapshot } from '../src/source/salesCharts.js';
import {
  buildReleaseCalendar, monthKeysKst, parsePublicReleaseLabel, parseReleaseSearchResults,
} from '../src/source/releaseCalendar.js';

test('주간 순위 상승·하락·신규를 구분한다', () => {
  assert.deepEqual(rankMovement({ rank: 3, previousRank: 8 }), { kind: 'up', label: '▲ 5' });
  assert.deepEqual(rankMovement({ rank: 9, previousRank: 4 }), { kind: 'down', label: '▼ 5' });
  assert.deepEqual(rankMovement({ rank: 1, previousRank: null, firstTop100: true }), { kind: 'new', label: 'NEW' });
});

test('저장된 판매 차트는 현재·주간 Top 20과 월간 신작을 갖는다', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../data/sales-charts.json', import.meta.url), 'utf8'));
  assert.equal(validateSalesChartSnapshot(snapshot), true);
  assert.equal(snapshot.live.korea.length, 20);
  assert.equal(snapshot.live.global.length, 20);
  assert.equal(snapshot.weekly.items.length, 20);
  assert.ok(Array.isArray(snapshot.releaseCalendar.current));
  assert.ok(Array.isArray(snapshot.releaseCalendar.upcoming));
  assert.ok(snapshot.monthly.items.length > 0);
  assert.equal(snapshot.source.metric, 'revenue_rank');
  assert.equal(snapshot.source.valuesPublished, false);
});

test('Steam이 공개한 일·월 단위 출시일을 과도한 정밀도 없이 읽는다', () => {
  assert.deepEqual(parsePublicReleaseLabel('2026년 9월 3일'), {
    releaseLabel: '2026년 9월 3일', releaseMonth: '2026-09', releaseDate: '2026-09-03', precision: 'day',
  });
  assert.deepEqual(parsePublicReleaseLabel('2026년 9월'), {
    releaseLabel: '2026년 9월', releaseMonth: '2026-09', releaseDate: null, precision: 'month',
  });
  assert.equal(parsePublicReleaseLabel('출시 예정'), null);
});

test('KST 기준 이번 달과 다음 달을 연말에도 계산한다', () => {
  assert.deepEqual(monthKeysKst(new Date('2026-12-15T00:00:00Z')), { current: '2026-12', next: '2027-01' });
});

test('Steam 검색 카드에서 이미지·공개 출시일·한국 가격을 읽는다', () => {
  const html = `<a href="https://store.steampowered.com/app/42/test/?snr=x" class="search_result_row" data-ds-appid="42" data-ds-descids="[]">
    <img src="https://cdn.example/42.jpg"><span class="title">테스트 &amp; 게임</span>
    <div class="search_released">2026년 9월 3일</div><div class="discount_pct">-20%</div>
    <div class="discount_original_price">₩ 30,000</div><div class="discount_final_price">₩ 24,000</div></a>`;
  const [item] = parseReleaseSearchResults({ success: 1, total_count: 1, results_html: html });
  assert.equal(item.name, '테스트 & 게임');
  assert.equal(item.releaseDate, '2026-09-03');
  assert.equal(item.imageUrl, 'https://cdn.example/42.jpg');
  assert.equal(item.initialMinor, 3000000);
  assert.equal(item.finalMinor, 2400000);
  assert.equal(item.discountPercent, 20);
});

test('달력 범위에 맞는 인기 신작과 출시 예정작만 고른다', () => {
  const row = (appid, title, date) => `<a href="https://store.steampowered.com/app/${appid}/" class="search_result_row" data-ds-appid="${appid}" data-ds-descids="[]">
    <span class="title">${title}</span><div class="search_released">${date}</div></a>`;
  const body = (html) => ({ success: 1, total_count: 2, results_html: html });
  const calendar = buildReleaseCalendar(
    body(row(1, '이번 달', '2026년 8월 20일') + row(2, '지난 달', '2026년 7월 20일')),
    body(row(3, '다음 달 말', '2026년 9월 20일') + row(4, '다음 달 초', '2026년 9월 2일')),
    new Date('2026-08-28T00:00:00Z'),
  );
  assert.deepEqual(calendar.current.map((item) => item.appid), [1]);
  assert.deepEqual(calendar.upcoming.map((item) => item.appid), [4, 3]);
});

test('출시 캘린더 원본에서 성인 분류 필드가 사라지면 중단한다', () => {
  const row = (appid, date) => `<a href="https://store.steampowered.com/app/${appid}/" class="search_result_row" data-ds-appid="${appid}">
    <span class="title">게임 ${appid}</span><div class="search_released">${date}</div></a>`;
  const body = (html) => ({ success: 1, total_count: 1, results_html: html });
  assert.throws(
    () => buildReleaseCalendar(
      body(row(1, '2026년 8월 20일')), body(row(2, '2026년 9월 2일')),
      new Date('2026-08-28T00:00:00Z'),
    ),
    /성인 분류/,
  );
});

test('출시 검색의 정상 빈 결과는 스키마 오류로 만들지 않는다', () => {
  const empty = { success: 1, total_count: 0, results_html: '' };
  const calendar = buildReleaseCalendar(empty, empty, new Date('2026-08-28T00:00:00Z'));
  assert.deepEqual(calendar.current, []);
  assert.deepEqual(calendar.upcoming, []);
});
