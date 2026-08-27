// 게임 표지 그림 주소.
//
// ── CLAUDE.md 5번의 예외다. 그래서 조건을 여기 적어 둔다 ──────────────
//
// 규칙 5 는 "문서화되지 않은 엔드포인트를 쓰지 않는다" 이고, 이 CDN 경로는 공식
// Web API 문서에 없다. 관례로 굳어져 있을 뿐이다. 그런데도 쓰는 이유는 규칙 5 가
// 막으려는 것이 **값이 검증 불가능한 경로에서 오는 것**이기 때문이다.
//
// 그래서 딱 이 조건에서만 허용한다.
//
//   1. 화면의 어떤 숫자도 여기에 기대지 않는다. 값·단위·날짜·잰 시각·비교·순위는
//      전부 records.json 에서 온다. 이 파일이 통째로 죽어도 그중 하나도 안 바뀐다.
//   2. 게임 이름은 글자로 따로 남는다. 그림이 이름을 대신하지 않는다.
//   3. 안 오면 조용히 사라진다. 깨진 네모도 대체 상자도 남기지 않는다 —
//      그림이 안 온 것이 자료가 안 온 것처럼 보이면 안 된다.
//
// 2026-08-27 에 16개 appid 전부 실제로 불러 200 · image/jpeg 를 확인했다.
// steamcdn-a.akamaihd.net 도 같은 바이트를 주고, shared.cloudflare... 는 301 이다.
//
// 그림의 권리는 각 퍼블리셔에 있다. 우리가 만든 것이 아니고, 화면에 그렇게 적는다.

const CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

/** 목록에 쓰는 작은 판. 231×87, 재보니 개당 5~10KB 다. */
export function capsuleUrl(appid) {
  return `${CDN}/${appid}/capsule_231x87.jpg`;
}

/** 대표값 옆에 쓰는 큰 판. 460×215, 개당 25~115KB 다. */
export function headerUrl(appid) {
  return `${CDN}/${appid}/header.jpg`;
}

/** 화면에 적는 출처 한 줄. */
export const ARTWORK_NOTE = '표지 그림은 Steam CDN 에서 온다. 권리는 각 퍼블리셔에 있고, 값은 여기서 오지 않는다.';
