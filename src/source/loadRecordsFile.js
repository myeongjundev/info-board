// 화면이 기록 파일을 읽는 길.
//
// Steam 은 CORS 를 열어 주지 않아 브라우저가 직접 못 부른다. 그래서 Actions 가
// 하루 한 번 받아 data/records.json 에 커밋하고, 화면은 그 파일을 읽는다.
// 여기서 실패하는 것은 Steam 이 아니라 우리 파일을 가져오는 길이다 — 화면에
// 그렇게 적어야 한다.
//
// 장애 5종은 과제 요구대로 모의실험한다. 원문이 "모의실험한다" 로 명시했다.
// 재현 스위치가 켜져 있으면 화면에 '재현 모드' 라고 반드시 표시한다.

import { FAULT, FetchFault } from './fetchReading.js';
import { loadRecords } from '../state/records.js';

export { FAULT, FetchFault };

/** 주소창에서 쓰는 이름 → 장애 종류. `?fault=timeout` */
export const FAULT_BY_PARAM = {
  timeout: FAULT.TIMEOUT,
  auth: FAULT.AUTH,
  'rate-limit': FAULT.RATE_LIMIT,
  offline: FAULT.OFFLINE,
  schema: FAULT.SCHEMA,
};

export const FAULT_COPY = {
  [FAULT.TIMEOUT]: {
    title: '응답이 오지 않았다',
    body: '기록 파일을 정해진 시간 안에 받지 못했다.',
  },
  [FAULT.AUTH]: {
    title: '접근이 거부됐다',
    body: '기록 파일을 읽을 권한이 없다는 응답을 받았다.',
  },
  [FAULT.RATE_LIMIT]: {
    title: '호출 제한에 걸렸다',
    body: '너무 자주 요청했다. 잠시 뒤 다시 시도한다.',
  },
  [FAULT.OFFLINE]: {
    title: '연결이 끊겼다',
    body: '이 브라우저에서 네트워크에 닿지 못한다.',
  },
  [FAULT.SCHEMA]: {
    title: '응답 형식이 달라졌다',
    body: '기록 파일이 예상한 모양이 아니다. 값을 읽지 않는다.',
  },
  [FAULT.UNKNOWN]: {
    title: '알 수 없는 오류',
    body: '분류하지 못한 실패다. 아는 척하지 않는다.',
  },
};

/** 주소창 질의문자열에서 재현할 장애를 읽는다. 없으면 null. */
export function faultFromSearch(search) {
  const raw = new URLSearchParams(search).get('fault');
  if (!raw) return null;
  return FAULT_BY_PARAM[raw.toLowerCase()] ?? null;
}

/**
 * 기록 파일을 읽는다. 성공하면 { data, quarantined }, 실패하면 FetchFault 를 던진다.
 *
 * @param {object} p
 * @param {string}  p.url
 * @param {string?} p.simulate  재현할 장애. 있으면 실제로 부르지 않는다
 */
export async function loadRecordsFile({
  url,
  simulate = null,
  timeoutMs = 8000,
  fetchImpl = fetch,
} = {}) {
  if (simulate) {
    // 부르지 않고 그 상태를 그대로 만든다. 실제 파일은 멀쩡하다.
    throw new FetchFault(simulate, `재현 모드 — ${FAULT_COPY[simulate]?.title ?? simulate}`, url);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetchImpl(url, { signal: controller.signal, cache: 'no-store' });
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      throw new FetchFault(FAULT.TIMEOUT, `${timeoutMs}ms 안에 응답이 오지 않았다`, url);
    }
    throw new FetchFault(FAULT.OFFLINE, '기록 파일에 닿지 못했다', String(err && err.message));
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) {
    throw new FetchFault(FAULT.AUTH, `접근이 거부됐다 (HTTP ${res.status})`, url);
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

  // 깨진 항목은 격리하고 성한 항목은 살린다. 파일 하나가 상해도 전부 버리지 않는다.
  const { records, quarantined } = loadRecords(body);

  // 성한 기록이 하나도 없는데 파일에는 뭔가 들어 있었다면 형식이 달라진 것이다.
  if (records.length === 0 && Array.isArray(body?.records) && body.records.length > 0) {
    throw new FetchFault(FAULT.SCHEMA, '기록을 하나도 읽지 못했다', url);
  }

  return {
    data: { ...body, records },
    quarantined,
  };
}
