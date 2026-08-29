// 어두운 화면과 밝은 화면 중 무엇을 쓸 것인가.
//
// **어두운 쪽이 기본이다.** 이 판은 숫자를 크게 띄우는 화면이고 여태 어두운
// 바탕에서 대비를 맞춰 왔다. 밝은 쪽은 고를 수 있는 것이지 되돌린 것이 아니다.
//
// 판단은 한 곳에서만 한다. CSS 는 `:root[data-theme="light"]` 하나만 보고,
// 시스템 설정을 읽는 것도 여기서만 한다 — 두 곳에서 같은 판단을 하면 갈라진다.

const KEY = 'game-pulse-theme';
export const THEMES = ['dark', 'light'];

/** 저장된 선택. 고른 적이 없으면 null — 시스템 설정을 따른다는 뜻이다. */
export function storedTheme() {
  try {
    const raw = localStorage.getItem(KEY);
    return THEMES.includes(raw) ? raw : null;
  } catch {
    // 사생활 보호 모드처럼 저장이 막힌 브라우저가 있다. 화면이 안 뜰 이유는 아니다.
    return null;
  }
}

/** 시스템이 밝은 화면을 쓰고 있는가. 못 물어보면 어두운 쪽으로 본다. */
export function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** 지금 쓸 테마. 고른 것이 있으면 그것이 이기고, 없으면 시스템을 따른다. */
export function resolveTheme() {
  return storedTheme() ?? systemTheme();
}

/** 문서에 붙인다. CSS 가 보는 것은 이 속성 하나뿐이다. */
export function applyTheme(theme) {
  const next = THEMES.includes(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  return next;
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // 저장이 막혀도 이번 방문에는 적용된다. 다음에 다시 고르면 된다.
  }
}
