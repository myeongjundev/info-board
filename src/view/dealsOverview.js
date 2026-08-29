function count(items) {
  return Array.isArray(items) ? items.length : null;
}

export function dealsOverview({ tracked, popular, epic, steamKeep, steamWeekend }) {
  const saleLists = [tracked, popular].filter(Array.isArray);
  const onSale = saleLists.length === 0
    ? null
    : new Set(saleLists.flat().map((item) => item.appid).filter(Number.isInteger)).size;

  return {
    epicFree: count(epic),
    steamKeep: count(steamKeep),
    steamWeekend: count(steamWeekend),
    onSale,
  };
}

/**
 * 지금 화면에 뜬 할인들의 최대·평균 할인율.
 *
 * `ui` 에서 `reduce` 후 나누고 있던 것을 옮겼다. 나눗셈이 컴포넌트 안에 있으면
 * 손계산으로 대조할 자리가 없고, 이 저장소는 그것을 규칙으로 못박아 두었다.
 *
 * **비어 있으면 만들지 않는다.** 할인이 0건인 날의 평균은 0%가 아니라 없는 것이다.
 * 0%로 적으면 "전부 정가" 와 "할인이 없다" 가 같은 모양이 된다.
 *
 * 평균은 **할인율의 평균**이지 값이 아니다 — 가격을 더하지 않는다. 통화가 섞일 수
 * 있고(CLAUDE.md 5-7), 섞인 통화를 더하면 그 순간 뜻 없는 숫자가 된다.
 */
export function discountSpread(discounts) {
  const rates = (discounts ?? [])
    .map((item) => item?.discountPercent)
    .filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (rates.length === 0) return { count: 0, max: null, average: null };
  return {
    count: rates.length,
    max: Math.max(...rates),
    average: Math.round(rates.reduce((sum, n) => sum + n, 0) / rates.length),
  };
}
