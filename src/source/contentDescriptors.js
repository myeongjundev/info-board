// Steam 이 성인 콘텐츠로 분류한 항목을 가려내는 하나의 판별.
//
// 왜 접는가.
//
// Steam 은 이 항목들의 상점 페이지를 비로그인 방문자에게 보여주지 않는다. 열면
// `login/?redir=agecheck/app/<id>/` 로 넘어간다. 그런데 우리 차트는 제목과 표지를
// 아무 확인 없이 띄우고 있었다 — **원본보다 더 많이 보여주고 있었다.** 접는 것은
// 검열이 아니라 Steam 자신의 표시 정책에 맞추는 것이다.
//
// 무엇을 접지 않는가.
//
// 순위·가격·할인율은 그대로 둔다. 숫자는 하나도 움직이지 않는다. 공개된 순위를
// 손대면 그게 진짜 조작이다. 이 규칙이 다루는 것은 **표시**이지 값이 아니다.
// `artwork.js` 예외가 "그림은 값이 아니다" 라고 쓴 것과 같은 자리다.
//
// 판별 근거 (2026-08-28 실측).
//
//   4924510  [1,3,4,5]  Lust Share House      → Steam 이 agecheck 로 막는다
//   3718190  [1,3,4,5]  Stripjong             → Steam 이 agecheck 로 막는다
//   3308670  [1,5]      GIRLS' FRONTLINE 2    → Steam 이 막지 않는다
//   730      [2,5]      Counter-Strike 2      → Steam 이 막지 않는다
//
// 3 또는 4 가 있을 때만 접으면 Steam 의 자체 게이트와 정확히 일치한다. 1 이나 2 로
// 넓히면 정상 게임까지 접혀 우리가 자료를 가리는 쪽이 된다.

export const ADULT_DESCRIPTOR_IDS = [3, 4];

/**
 * descriptor 목록에 성인 분류가 있는가.
 *
 * 모르면 false 다. 필드가 없다고 접으면, 스키마가 바뀐 날 화면이 통째로 접혀
 * "자료가 안 온 것" 처럼 보인다. 필드 자체가 사라지는 경우는 수집기의
 * `assertDescriptorsPresent` 가 따로 잡는다 — 그쪽이 맞는 자리다.
 */
export function hasAdultDescriptor(ids) {
  if (!Array.isArray(ids)) return false;
  return ids.some((id) => ADULT_DESCRIPTOR_IDS.includes(Number(id)));
}

/**
 * 출처마다 descriptor 를 담는 모양이 다르다. 읽는 곳은 셋인데 판별은 하나여야 한다.
 *
 *   판매 차트       item.content_descriptorids        [3,4]
 *   출시 캘린더     data-ds-descids="[3,4]"           문자열
 *   인기 100 할인   data.content_descriptors.ids      [3,4]
 */
export function toDescriptorIds(raw) {
  if (Array.isArray(raw)) return raw.map(Number).filter(Number.isInteger);
  if (Array.isArray(raw?.ids)) return raw.ids.map(Number).filter(Number.isInteger);
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isInteger) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * 원본 응답에 descriptor 필드가 실제로 있었고, 우리가 아는 형식인가.
 *
 * 빈 배열은 "분류 없음"이라는 정상 값이다. 반대로 undefined, 필드 없는 객체,
 * 깨진 JSON 문자열은 스키마가 바뀐 것일 수 있으므로 정상 값으로 세지 않는다.
 */
export function hasDescriptorSource(raw) {
  if (Array.isArray(raw)) return true;
  if (raw && typeof raw === 'object') return Array.isArray(raw.ids);
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      return Array.isArray(JSON.parse(raw));
    } catch {
      return false;
    }
  }
  return false;
}

/** 출처가 무엇이든 한 줄로 쓴다. */
export function isAdultItem(raw) {
  return hasAdultDescriptor(toDescriptorIds(raw));
}

/**
 * descriptor 를 단 하나도 못 읽었으면 스키마가 바뀐 것이다.
 *
 * 그대로 두면 성인 항목이 조용히 펼쳐진 채 배포된다. 규칙 5-4 의 "필수 Top 20 이
 * 빠지면 덮지 않는다" 와 같은 이유로, 여기서도 기존 스냅샷을 지킨다.
 */
export function assertDescriptorsPresent(items, where) {
  // 정상 빈 결과에는 검사할 행 자체가 없다. 응답이 한 건이라도 왔을 때만
  // descriptor 필드가 함께 왔는지 확인한다.
  if (items.length === 0) return;
  const seen = items.filter((item) => item?.descriptorAvailable === true).length;
  if (seen === 0) {
    throw new TypeError(
      `${where}: 성인 분류(content descriptor)를 한 건도 읽지 못했다. `
      + '응답 형식이 바뀐 것으로 보고 기존 스냅샷을 덮지 않는다.',
    );
  }
}
