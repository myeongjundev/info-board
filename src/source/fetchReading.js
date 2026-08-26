// 값을 한 덩어리로만 다룬다.
//
// 화면에 보이는 값·단위·출처·기준일·조회시각은 전부 이 Reading 하나에서 나온다.
// 따로 전달하지 않기 때문에 "값은 새 것인데 시각은 옛 것" 이 구조적으로 불가능하다.
// 정상값이 없으면 Reading 자체가 없고, 그러면 숫자 자리에 넣을 것도 없다.

import { SOURCE, buildUrl, parse, SchemaError } from './definition.js';

/** 장애를 서로 다른 상태로 구분한다. 같은 문구로 뭉뚱그리지 않는다. */
export const FAULT = {
  TIMEOUT: 'TIMEOUT',
  AUTH: 'AUTH',
  RATE_LIMIT: 'RATE_LIMIT',
  OFFLINE: 'OFFLINE',
  SCHEMA: 'SCHEMA',
  UNKNOWN: 'UNKNOWN',
};

export class FetchFault extends Error {
  constructor(fault, message, detail) {
    super(message);
    this.name = 'FetchFault';
    this.fault = fault;
    this.detail = detail;
  }
}

/**
 * 한 날짜의 값을 가져온다.
 * 성공하면 Reading, 실패하면 FAULT 가 붙은 FetchFault 를 던진다.
 *
 * @param {string} date 'YYYY-MM-DD' (UTC 기준)
 */
export async function fetchReading(date, { timeoutMs = 8000, fetchImpl = fetch } = {}) {
  const url = buildUrl(date);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetchImpl(url, { signal: controller.signal });
  } catch (err) {
    // AbortError 와 네트워크 실패는 사용자에게 다른 뜻이다.
    // 앞은 "출처가 느리다", 뒤는 "여기서 인터넷이 안 된다".
    if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      throw new FetchFault(FAULT.TIMEOUT, `${timeoutMs}ms 안에 응답이 오지 않았다`, url);
    }
    throw new FetchFault(FAULT.OFFLINE, '출처에 닿지 못했다', String(err && err.message));
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) {
    throw new FetchFault(FAULT.AUTH, `인증이 거부됐다 (HTTP ${res.status})`, url);
  }
  if (res.status === 429) {
    throw new FetchFault(FAULT.RATE_LIMIT, '호출 제한에 걸렸다 (HTTP 429)', url);
  }
  if (!res.ok) {
    throw new FetchFault(FAULT.UNKNOWN, `HTTP ${res.status}`, url);
  }

  let body;
  try {
    body = await res.json();
  } catch (err) {
    throw new FetchFault(FAULT.SCHEMA, 'JSON 으로 읽히지 않는다', String(err && err.message));
  }

  // Stack Exchange 는 오류도 200 으로 주는 경우가 있어 본문을 봐야 한다.
  if (body && typeof body.error_id === 'number') {
    const fault = body.error_id === 502 ? FAULT.RATE_LIMIT : FAULT.AUTH;
    throw new FetchFault(fault, `출처가 오류를 반환했다: ${body.error_message}`, body.error_name);
  }

  let value;
  try {
    value = parse(body);
  } catch (err) {
    if (err instanceof SchemaError) {
      throw new FetchFault(FAULT.SCHEMA, `응답 형식이 달라졌다: ${err.message}`, url);
    }
    throw err;
  }

  return {
    value,
    unit: SOURCE.unit,
    date,                                  // 이 값이 가리키는 날 (UTC)
    sourceUrl: url,                        // 누르면 이 응답이 그대로 열린다
    sourceLabel: SOURCE.label,
    timezone: SOURCE.timezone,
    fetchedAt: new Date().toISOString(),   // 내가 조회한 시각. 절대 date 와 섞지 않는다
  };
}
