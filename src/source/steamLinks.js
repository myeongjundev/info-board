// Steam 상점으로 이동하는 공개 페이지 주소.
// 값을 가져오는 API가 아니다. 화면의 숫자·날짜·순위는 이 주소에 의존하지 않는다.

export function steamStoreUrl(appid) {
  return `https://store.steampowered.com/app/${appid}/`;
}

// Valve가 공식 문서로 제공하는 상점 위젯. 가격 숫자를 우리 쪽으로 복사하지 않고
// iframe 안에서 Steam이 직접 현재 구매 옵션·가격·할인을 표시한다.
export function steamWidgetUrl(appid) {
  return `https://store.steampowered.com/widget/${appid}/?cc=KR&l=koreana`;
}
