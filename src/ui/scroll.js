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

/**
 * 화면 위 고정 띠에 가려지지 않을 만큼의 여백. **CSS 에서 읽어 온다.**
 *
 * `html { scroll-padding-top: 56px }` 이 이미 그 값을 들고 있다. 여기 56 을 또
 * 적으면 둘 중 하나만 바뀌는 날이 오고, 그날 구획 하나가 띠 밑에 숨는다.
 * 못 읽으면 0 이다 — 어긋난 위치보다 맨 위가 낫다.
 */
export function headerOffset(el) {
  try {
    // `el = document.documentElement` 을 기본값에 두지 않는다. 기본값은 아래
    // try 밖에서 계산되어, document 가 없는 곳(테스트)에서 그대로 던진다.
    const node = el ?? document.documentElement;
    const raw = getComputedStyle(node).scrollPaddingTop;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** 그 구획이 서야 할 문서 좌표. */
export function targetTop(rectTop, scrollY, offset) {
  const top = rectTop + scrollY - offset;
  return top > 0 ? top : 0;
}

/**
 * 더 내려갈 수 있는 끝. 문서가 화면보다 짧으면 0 이다.
 *
 * **마지막 구획은 화면 맨 위에 못 온다.** 문서 끝까지 내려가도 그 아래에 남은
 * 내용이 없기 때문이다. 실제로 이것 때문에 한참 헤맸다 — 스트리밍 페이지에서
 * `공통 게임` 이 늘 392px 자리에 섰다. 문서 2,327px, 화면 1,000px 이라 스크롤은
 * 1,327 이 끝인데 그 구획을 맨 위로 올리려면 1,663 이 필요했다.
 *
 * 코드가 고장 난 것이 아니라 **닿을 수 없는 곳을 목표로 삼고 있었다.** 이걸
 * 모르면 도착 판정이 영원히 거짓이 되어 계속 고쳐 앉히려 든다.
 */
export function maxScroll(documentHeight, viewportHeight) {
  const max = documentHeight - viewportHeight;
  return max > 0 ? max : 0;
}

/** 실제로 갈 수 있는 자리. 원하는 곳이 문서 끝을 넘으면 문서 끝이다. */
export function reachableTop(want, limit) {
  if (want < 0) return 0;
  return want > limit ? limit : want;
}

/**
 * 구획 하나로 보낸다. 맨 위로 갈 때와 같은 이유로 **도착했는지 본다.**
 *
 * 앵커(`href="#id"`)에 맡기지 않는 이유가 하나 더 있다. 이 앱은 주소의 해시로
 * 페이지를 고른다(`#/sales`, `#/charts`). 하위 페이지에서 앵커가 해시를
 * `#sec-live` 로 바꾸면 **그 페이지가 아니라 첫 화면으로 튕긴다.** 구획으로
 * 가려다 페이지를 떠나는 셈이다. 그래서 해시를 건드리지 않고 우리가 옮긴다.
 *
 * ## 애니메이션을 지켜보지 않는다 — 한 번 만들었다가 걷어냈다
 *
 * 처음에는 맨 위로와 똑같이 100ms 마다 진행을 재서 `멈췄으면 앉힌다` 로 썼다.
 * 그런데 구획으로 가는 것은 맨 위로 가는 것과 다르다. 목표가 0 이 아니라서,
 * **아직 움직이는 중인지 끊긴 것인지**를 진행량만으로 가르기 어렵다. 실제로
 * 이동 중에 앉히기가 겹쳐 엉뚱한 자리에 서는 것을 봤다.
 *
 * 그래서 지켜보기를 그만두고 **한 번만 확인한다.** 매끄럽게 보내 놓고, 이동이
 * 끝났을 만한 때에 딱 한 번 본다. 구획이 제자리에 없으면 애니메이션을 세우고
 * 그 자리에 앉힌다. 움직이는 것과 경쟁하지 않으니 겹칠 일이 없다.
 */
export function scrollToElement(el, { settleMs = 600, tolerance = 2 } = {}) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return;

  /** 이 구획 때문에 페이지가 서 있어야 할 자리. 갈 수 없으면 갈 수 있는 데까지. */
  const place = () => reachableTop(
    targetTop(el.getBoundingClientRect().top, window.scrollY, headerOffset()),
    maxScroll(document.documentElement.scrollHeight, window.innerHeight),
  );

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });

  setTimeout(() => {
    const want = place();
    if (Math.abs(want - window.scrollY) <= tolerance) return; // 도착했다

    // 아직 남았으면 매끄러운 이동이 끊긴 것이다. **먼저 세운 다음 앉힌다** —
    // 안 세우면 우리가 앉힌 뒤에 남은 애니메이션이 이어서 움직인다.
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    window.scrollTo({ top: place(), behavior: 'instant' });
  }, settleMs);
}
