// 출시 캘린더의 `D-3` · `오늘 출시` 를 정한다.
//
// `ui` 안에 있던 것을 옮겼다. 여기에는 뺄셈과 나눗셈이 둘 다 있고, 무엇보다
// **날짜 경계 판단**이 있다 — 하루 차이로 `D-1` 과 `오늘 출시` 가 갈린다.
// 브라우저를 띄워야만 확인할 수 있는 자리에 두면 그 경계를 검증할 수 없다.

/** 오늘이 며칠인가. 시간대를 넘겨받아 그 달력의 오늘을 쓴다. */
function todayIn(timeZone, now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/**
 * @param {{releaseDate?: string|null}} item
 * @param {boolean} upcoming  다음 달 목록인가
 * @returns {string} 화면에 그대로 나가는 글자
 */
export function releaseTiming(item, upcoming, { now = new Date(), timeZone = 'Asia/Seoul' } = {}) {
  // 개발사가 날짜를 안 밝힌 것에 날짜를 붙이지 않는다. CLAUDE.md 5-4 가 못박은 자리다.
  if (!item?.releaseDate) return upcoming ? '날짜 미정' : '이번 달 출시';
  if (!upcoming) return 'NEW RELEASE';

  const today = todayIn(timeZone, now);
  const day = 86_400_000;
  const days = Math.round(
    (Date.parse(`${item.releaseDate}T00:00:00+09:00`) - Date.parse(`${today}T00:00:00+09:00`)) / day,
  );
  if (!Number.isFinite(days)) return '일정 확인';
  if (days > 0) return `D-${days}`;
  if (days === 0) return '오늘 출시';
  // 지난 날짜가 `다음 달 출시 예정` 목록에 남아 있는 것은 우리가 설명할 수 없다.
  // 억지로 `D+3` 을 만들지 않고 확인하라고 말한다.
  return '일정 확인';
}
