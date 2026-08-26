// 출처 정의 — 이 파일 하나만 바꾸면 다른 데이터로 옮길 수 있게 둔다.
//
// 기준 시간대에 대하여.
// Stack Exchange 는 fromdate/todate 를 UTC 유닉스 초로 받는다. 그래서 이 정보판이
// 말하는 "하루" 는 UTC 하루다. KST 로 환산해서 저장하면 원자료의 창과 화면의 날짜가
// 어긋나므로, 자료의 시간대를 그대로 쓰고 그 사실을 화면에 적는다.

export const SOURCE = {
  id: 'stackoverflow-new-questions',
  label: 'Stack Overflow · 신규 질문',
  publisher: 'Stack Exchange API',
  docsUrl: 'https://api.stackexchange.com/docs/questions',
  unit: '건',
  timezone: 'UTC',
  // 자료가 하루 늦게 확정된다. 오늘 조회하면 어제 하루가 대상이다.
  lagDays: 1,
};

const ENDPOINT = 'https://api.stackexchange.com/2.3/questions';

/** 'YYYY-MM-DD' → 그 날 00:00:00Z 의 유닉스 초 */
export function dayStartUtc(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 1000);
}

/** 그 날짜 하루를 재는 원자료 주소. 화면의 '출처' 링크와 같은 주소여야 한다. */
export function buildUrl(date) {
  const from = dayStartUtc(date);
  const q = new URLSearchParams({
    site: 'stackoverflow',
    fromdate: String(from),
    todate: String(from + 86400),
    filter: 'total',
  });
  return `${ENDPOINT}?${q}`;
}

/** 오늘 기준으로 자료가 확정돼 있는 가장 최근 날짜 (UTC) */
export function latestSettledDate(now = new Date()) {
  const t = now.getTime() - SOURCE.lagDays * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * 아직 끝나지 않은 날은 재지 않는다.
 *
 * 이 API 는 미래 구간을 물어도 오류가 아니라 `{"total": 0}` 을 준다. 그대로 믿으면
 * "그 날 아무도 질문하지 않았다" 로 기록된다. 값이 없는 것과 값이 0 인 것은 다르다 —
 * 이 정보판이 가장 하지 않으려는 거짓말이 그것이므로 호출 전에 막는다.
 */
export function assertSettled(date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new RangeError(`날짜 형식이 아니다: ${date}`);
  }
  const latest = latestSettledDate(now);
  if (date > latest) {
    throw new RangeError(
      `${date} 는 아직 끝나지 않은 날이다. 확정된 가장 최근 날짜는 ${latest} (${SOURCE.timezone}).`,
    );
  }
}

/**
 * 응답 → 값. 형식이 어긋나면 던진다. 0 으로 대체하지 않는다 —
 * "응답 형식 변경" 은 값이 0 인 것과 다른 상태이기 때문이다.
 */
export function parse(body) {
  if (body === null || typeof body !== 'object') {
    throw new SchemaError('응답이 객체가 아니다');
  }
  if (typeof body.total !== 'number' || !Number.isFinite(body.total)) {
    throw new SchemaError(`total 필드가 숫자가 아니다: ${JSON.stringify(body.total)}`);
  }
  if (body.total < 0) {
    throw new SchemaError(`total 이 음수다: ${body.total}`);
  }
  return body.total;
}

export class SchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaError';
  }
}
