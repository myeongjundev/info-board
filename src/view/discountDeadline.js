// 이 할인이 **언제까지인가** 를 화면에 나갈 한 마디로 만든다.
//
// `releaseTiming` 과 나란한 자리다. 여기에도 날짜 경계 판단이 있고, 하루 차이로
// `오늘 끝` 과 `내일 끝` 이 갈린다. 브라우저를 띄워야만 볼 수 있는 곳에 두면
// 그 경계를 검증할 수 없어서 `view` 에 둔다.
//
// **밤 수로 센다.** 남은 시각을 24로 나누지 않는다. Steam 은 할인을 한국 시각으로
// 새벽 2시쯤 끝내는데, 밤 11시에 보는 사람에게 "3시간 남음" 은 맞는 말이지만
// **"오늘 끝난다"** 가 그 사람이 실제로 쓰는 말이다. 달력이 며칠 넘어가는지를 센다.

function calendarDay(timeZone, at) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(at);
}

const DAY_MS = 86_400_000;

/**
 * @param {string|null|undefined} endsAt  ISO. 없으면 모른다는 뜻이다
 * @returns {{ label: string|null, days: number|null, urgent: boolean, known: boolean }}
 */
export function discountDeadline(endsAt, { now = new Date(), timeZone = 'Asia/Seoul' } = {}) {
  const unknown = { label: null, days: null, urgent: false, known: false };
  if (typeof endsAt !== 'string' || endsAt === '') return unknown;

  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) return unknown;

  const endDay = calendarDay(timeZone, new Date(end));
  const today = calendarDay(timeZone, now);
  const days = Math.round(
    (Date.parse(`${endDay}T00:00:00+09:00`) - Date.parse(`${today}T00:00:00+09:00`)) / DAY_MS,
  );
  if (!Number.isFinite(days)) return unknown;

  // 이미 지난 것을 `D+2` 로 만들지 않는다. 우리 스냅샷이 낡았다는 뜻이므로 그렇게 적는다.
  if (days < 0) return { label: '종료된 할인', days, urgent: false, known: true };
  if (days === 0) return { label: '오늘 끝', days, urgent: true, known: true };
  if (days === 1) return { label: '내일 끝', days, urgent: true, known: true };
  return { label: `${days}일 남음`, days, urgent: days <= 3, known: true };
}

/** 종료 시각 자체를 한국 시각으로 적는다. 남은 날짜와 달리 이것은 사실 그대로다. */
export function formatDeadline(endsAt, { timeZone = 'Asia/Seoul' } = {}) {
  if (typeof endsAt !== 'string' || endsAt === '') return null;
  const at = Date.parse(endsAt);
  if (Number.isNaN(at)) return null;
  return `${new Intl.DateTimeFormat('ko-KR', {
    timeZone, month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(at))} KST`;
}

/**
 * 목록 전체에서 **오늘·내일 끝나는 것**을 앞으로 뽑는다.
 *
 * 할인율로만 줄 세우면 오늘 끝나는 30% 가 9일 남은 90% 뒤로 밀린다. 급한 것은
 * 급하다고 말해야 쓸모가 있다. 다만 순서만 바꾸고 **할인율을 고쳐 부르지 않는다.**
 */
export function endingSoon(readings, { now = new Date(), timeZone = 'Asia/Seoul', withinDays = 1 } = {}) {
  if (!Array.isArray(readings)) return [];
  return readings
    .map((reading) => ({ reading, deadline: discountDeadline(reading?.discountEndsAt, { now, timeZone }) }))
    .filter(({ deadline }) => deadline.known && deadline.days !== null && deadline.days >= 0 && deadline.days <= withinDays)
    .sort((a, b) => a.deadline.days - b.deadline.days
      || (b.reading.discountPercent ?? 0) - (a.reading.discountPercent ?? 0));
}
