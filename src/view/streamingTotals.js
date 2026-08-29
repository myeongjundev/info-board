// 표본 시청자 합계.
//
// **플랫폼 하나만 받는다.** 두 플랫폼을 더하지 않는 것이 CLAUDE.md 5-5 이고,
// 그 규칙을 주석이 아니라 **함수 서명**에 담는다 — 배열을 받으면 언젠가 둘을
// 넘기게 되고, 그때 규칙은 조용히 깨진다.

/**
 * 그 플랫폼 표본의 시청자 합계.
 *
 * 이것은 플랫폼 전체 시청자가 아니라 **우리가 읽은 상위 방송 표본의 합**이다.
 * 화면도 `표본 시청자` 라고 적는다.
 *
 * @param {{rankings?: Array<{viewerCount:number}>}|null} platform
 * @returns {number|null} 표본이 없으면 null — 0 이 아니다
 */
export function sampleViewerTotal(platform) {
  const rows = platform?.rankings;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const counts = rows
    .map((r) => r?.viewerCount)
    .filter((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0);
  if (counts.length === 0) return null;
  return counts.reduce((sum, n) => sum + n, 0);
}
