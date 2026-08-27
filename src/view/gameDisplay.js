// 성인 분류 항목을 화면에 어떻게 내보낼지.
//
// 순위·가격·할인율은 손대지 않는다. 바뀌는 것은 제목 글자와 표지 그림뿐이다.
// 공개된 순위를 지우면 그게 조작이고, 표시를 고르는 것은 조작이 아니다.
//
// 펼치기 버튼을 두지 않는 이유.
//
// 우리가 나이 확인을 흉내 낼 방법이 없다. 대신 상점 링크는 그대로 두므로, 보려는
// 사람은 Steam 으로 가고 거기서 Steam 이 확인을 받는다. 원래 그 확인을 하는 쪽이
// 하게 두는 것이 맞다. 링크를 감싼 `<a>` 안에 버튼을 넣지 않아도 되는 것은 덤이다.

export const ADULT_LABEL = '성인 콘텐츠 (Steam 분류)';

/** 제목 자리에 쓸 글자. 성인 분류면 이름 대신 라벨. */
export function displayName(item) {
  if (item?.adult) return ADULT_LABEL;
  return item?.name ?? '';
}

/** 표지 자리에 쓸 주소. 성인 분류면 없음 — GameArt 가 조용히 비운다. */
export function displayArt(item) {
  if (item?.adult) return null;
  return item?.imageUrl ?? null;
}

/** 목록 안에 접힌 항목이 몇 개인지. 근거 문구가 쓴다. */
export function countAdult(items) {
  if (!Array.isArray(items)) return 0;
  return items.filter((item) => item?.adult === true).length;
}
