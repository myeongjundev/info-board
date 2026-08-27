import { isAdultItem, toDescriptorIds } from './contentDescriptors.js';

export const RELEASE_CALENDAR_URLS = {
  recent: 'https://store.steampowered.com/search/results/?query&start=0&count=100&dynamic_data=&sort_by=Released_DESC&filter=popularnew&category1=998&infinite=1&cc=KR&l=koreana',
  upcoming: 'https://store.steampowered.com/search/results/?query&start=0&count=100&dynamic_data=&sort_by=Released_ASC&filter=popularcomingsoon&category1=998&infinite=1&cc=KR&l=koreana',
};

const ENGLISH_MONTHS = new Map([
  ['jan', 1], ['feb', 2], ['mar', 3], ['apr', 4], ['may', 5], ['jun', 6],
  ['jul', 7], ['aug', 8], ['sep', 9], ['oct', 10], ['nov', 11], ['dec', 12],
]);

function decodeHtml(text) {
  return text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

function textOf(fragment, className) {
  const match = fragment.match(new RegExp(`<[^>]+class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`));
  return match ? decodeHtml(match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()) : null;
}

function minorFromWon(text) {
  if (typeof text !== 'string' || !/[0-9]/.test(text)) return null;
  const won = Number(text.replace(/[^0-9]/g, ''));
  return Number.isInteger(won) && won > 0 ? won * 100 : null;
}

export function parsePublicReleaseLabel(label) {
  if (typeof label !== 'string') return null;
  const normalized = label.replace(/\s+/g, ' ').trim();
  const korean = normalized.match(/(\d{4})년\s*(\d{1,2})월(?:\s*(\d{1,2})일)?/);
  if (korean) {
    const year = Number(korean[1]);
    const month = Number(korean[2]);
    const day = korean[3] ? Number(korean[3]) : null;
    if (month < 1 || month > 12 || (day !== null && (day < 1 || day > 31))) return null;
    return {
      releaseLabel: normalized,
      releaseMonth: `${year}-${String(month).padStart(2, '0')}`,
      releaseDate: day === null ? null : `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      precision: day === null ? 'month' : 'day',
    };
  }
  const english = normalized.match(/([A-Za-z]{3,9})\s+(?:(\d{1,2}),\s*)?(\d{4})/);
  const month = english ? ENGLISH_MONTHS.get(english[1].slice(0, 3).toLowerCase()) : null;
  if (!english || !month) return null;
  const day = english[2] ? Number(english[2]) : null;
  return {
    releaseLabel: normalized,
    releaseMonth: `${english[3]}-${String(month).padStart(2, '0')}`,
    releaseDate: day === null ? null : `${english[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    precision: day === null ? 'month' : 'day',
  };
}

export function parseReleaseSearchResults(body) {
  if (!body || body.success !== 1 || typeof body.results_html !== 'string' || !Number.isInteger(body.total_count)) {
    throw new TypeError('Steam 출시작 검색 응답을 읽을 수 없다');
  }
  if (body.total_count === 0) return [];
  const rows = body.results_html.match(/<a\b[^>]*class="[^"]*search_result_row[^"]*"[\s\S]*?<\/a>/g) ?? [];
  const items = [];
  for (const row of rows) {
    const appid = Number(row.match(/data-ds-appid="(\d+)"/)?.[1]);
    const title = textOf(row, 'title');
    const release = parsePublicReleaseLabel(textOf(row, 'search_released'));
    const href = decodeHtml(row.match(/href="([^"]+)"/)?.[1] ?? '');
    if (!appid || !title || !release || !href) continue;
    const imageUrl = decodeHtml(row.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? '');
    const originalText = textOf(row, 'discount_original_price');
    const finalText = textOf(row, 'discount_final_price');
    const finalMinor = minorFromWon(finalText);
    const initialMinor = minorFromWon(originalText) ?? finalMinor;
    const discountPercent = Number(textOf(row, 'discount_pct')?.replace(/[^0-9]/g, '')) || 0;
    // 이 검색 응답은 비로그인 기본 설정에서 성인 항목을 이미 걸러 내보내는 것으로
    // 보인다 (2026-08-28 실측: 100건 중 3·4 를 가진 항목 0건). 그래도 같은 가드를
    // 단다 — "지금 안 온다" 는 "앞으로도 안 온다" 가 아니다.
    const descriptorIds = toDescriptorIds(row.match(/data-ds-descids="([^"]+)"/)?.[1]);
    items.push({
      appid, name: title, imageUrl: imageUrl || null,
      adult: isAdultItem(descriptorIds),
      descriptorIds,
      storeUrl: `${href.split('?')[0]}?cc=KR&l=koreana`,
      ...release,
      isFree: /무료|free/i.test(finalText ?? ''),
      initialMinor, finalMinor, discountPercent,
    });
  }
  if (body.total_count > 0 && items.length === 0) {
    throw new TypeError(`Steam 출시작 후보 ${body.total_count}개를 해석하지 못했다`);
  }
  return items;
}

export function monthKeysKst(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year').value);
  const month = Number(parts.find((part) => part.type === 'month').value);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return {
    current: `${year}-${String(month).padStart(2, '0')}`,
    next: `${next.year}-${String(next.month).padStart(2, '0')}`,
  };
}

export function buildReleaseCalendar(recentBody, upcomingBody, now = new Date()) {
  const months = monthKeysKst(now);
  const recent = parseReleaseSearchResults(recentBody);
  const upcoming = parseReleaseSearchResults(upcomingBody);
  return {
    currentMonth: months.current,
    nextMonth: months.next,
    current: recent.filter((item) => item.releaseMonth === months.current).slice(0, 20),
    upcoming: upcoming.filter((item) => item.releaseMonth === months.next)
      .sort((a, b) => (a.releaseDate ?? '9999-99-99').localeCompare(b.releaseDate ?? '9999-99-99'))
      .slice(0, 20),
  };
}

export function validateReleaseCalendar(calendar) {
  const monthPattern = /^\d{4}-\d{2}$/;
  const validItem = (item) => Number.isInteger(item.appid) && typeof item.name === 'string'
    && typeof item.storeUrl === 'string' && monthPattern.test(item.releaseMonth)
    && typeof item.releaseLabel === 'string'
    && (item.releaseDate === null || /^\d{4}-\d{2}-\d{2}$/.test(item.releaseDate));
  return Boolean(
    calendar && monthPattern.test(calendar.currentMonth) && monthPattern.test(calendar.nextMonth)
    && Array.isArray(calendar.current) && Array.isArray(calendar.upcoming)
    && calendar.current.length <= 20 && calendar.upcoming.length <= 20
    && [...calendar.current, ...calendar.upcoming].every(validItem),
  );
}
