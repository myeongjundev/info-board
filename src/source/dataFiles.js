// 화면이 저장소의 data/*.json 을 진짜로 fetch 해서 읽는다. 그 파일 목록과 "이
// 요청에 원문 JSON 을 내줘도 되는가" 의 판단을 여기 둔다.
//
// 판단이 vite.config.js 안에 있었을 때 결함 17번이 났다. 개발 서버 미들웨어는
// 브라우저 없이 못 돌리고, 못 돌리는 자리에 있는 판단은 아무도 안 본다.
// 목록과 판단을 여기로 내리면 node --test 가 본다.

export const DATA_FILES = [
  { path: 'data/records.json', required: true },
  // 하루 중 다른 시각 표본이다. **없어도 된다** — 화면의 값·단위·날짜·비교는
  // records.json 에서만 오고, 표본이 없으면 그 패널만 안 나온다.
  { path: 'data/timeprobe.json', required: false },
  { path: 'data/discounts.json', required: true },
  { path: 'data/streaming.json', required: true },
  { path: 'data/streaming-history.json', required: true },
  { path: 'data/epic-free.json', required: true },
  { path: 'data/popular-discounts.json', required: true },
  { path: 'data/steam-free.json', required: true },
  { path: 'data/sales-charts.json', required: true },
];

// 원문 JSON 을 내줄 요청인가.
//
// 내주는 것: 화면이 fetch 하는 질의 없는 주소 하나. `/data/records.json`
// 안 내주는 것:
//   - 질의가 붙은 것. `?import` 는 같은 파일을 ESM 으로 들여오는 요청이고,
//     Vite 가 모듈로 바꿔 줘야 한다. 여기서 가로채면 모듈의 MIME 이
//     application/json 이 되어 그 모듈을 부른 화면이 통째로 안 뜬다.
//   - 경로가 정확히 같지 않은 것. `startsWith` 는 `/data/records.json.bak` 도
//     records.json 으로 만든다.
export function matchDataFile(url, files = DATA_FILES) {
  if (typeof url !== 'string' || url === '') return null;
  const [path, query] = url.split('?');
  if (query !== undefined) return null;
  return files.find((f) => path === `/${f.path}`) ?? null;
}
