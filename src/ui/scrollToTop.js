// 맨 위로 — **끝까지 보낸다.**
//
// 전에는 두 자리(SymbolRail 의 ↑, 구획 나브의 `현재`)에서 각자
// `window.scrollTo({ top: 0, behavior: 'smooth' })` 를 불렀다. 그런데 브라우저가
// 하는 매끄러운 이동은 **중간에 끊긴다.** 끊는 것이 여럿이다 —
//
//   - 사람이 휠을 조금이라도 굴리면 크롬은 그 자리에서 애니메이션을 버린다,
//   - 위쪽 내용의 높이가 이동 중에 바뀌면 스크롤 앵커링이 위치를 밀어 놓는다,
//   - 브라우저에 따라 프로그램이 부른 매끄러운 이동을 아예 하지 않는다.
//
// 끊기면 목표에 못 간 채로 멈춘다. 누른 사람이 보는 것은 "맨 위" 가 아니라
// **아무 데도 아닌 자리**다. 단추 이름이 `맨 위로` 인 이상 그것은 거짓말이다.
//
// 그래서 보내 놓고 **도착했는지 본다.** 나아가지 않으면 남은 거리를 즉시 건넌다.
// 매끄러움은 있으면 좋은 것이고, 도착은 약속한 것이다.
//
// 지켜보는 것은 `requestAnimationFrame` 이 아니라 `setTimeout` 이다. 이것도 재서
// 정했다 — 미리보기 창에서 rAF 는 800ms 동안 **한 번도 불리지 않았다.** 화면을
// 그리지 않는 창이나 뒤로 밀린 탭에서 rAF 는 멈춘다. 하필 그런 곳이 매끄러운
// 이동도 안 하는 곳이라, 감시를 rAF 에 걸면 **고장난 자리에서만 감시가 죽는다.**

const INTERVAL_MS = 100;

/** 매끄러운 이동이 멈춰 섰는가 — 아직 목표가 아닌데 더 나아가지도 않았다. */
export function isStuck(previousY, currentY, { target = 0, epsilon = 1 } = {}) {
  if (Math.abs(currentY - target) <= epsilon) return false; // 도착했다
  return Math.abs(currentY - previousY) <= epsilon; // 나아가지 않았다
}

/**
 * 문서의 맨 위로 보낸다. 매끄럽게 가되, 못 가면 즉시 간다.
 *
 * @param {object} [options]
 * @param {number} [options.stallChecks] 몇 번 연속으로 제자리면 끊긴 것으로 볼 것인가
 * @param {number} [options.timeoutMs]   이 시간이 지나면 무조건 앉힌다
 */
export function scrollToTop({ stallChecks = 2, timeoutMs = 1000 } = {}) {
  const land = () => {
    // `behavior: 'instant'` 를 못 알아듣는 브라우저가 있어 속성으로도 앉힌다.
    window.scrollTo({ top: 0, behavior: 'instant' });
    const el = document.scrollingElement ?? document.documentElement;
    if (el.scrollTop !== 0) el.scrollTop = 0;
  };

  window.scrollTo({ top: 0, behavior: 'smooth' });

  const startedAt = Date.now();
  let previousY = window.scrollY;
  let stalled = 0;

  const watch = () => {
    const y = window.scrollY;
    if (y <= 1) return; // 도착했다. 손대지 않는다
    if (Date.now() - startedAt >= timeoutMs) return land();

    stalled = isStuck(previousY, y) ? stalled + 1 : 0;
    if (stalled >= stallChecks) return land();

    previousY = y;
    setTimeout(watch, INTERVAL_MS);
    return undefined;
  };

  setTimeout(watch, INTERVAL_MS);
}

