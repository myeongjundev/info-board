// 출처 정의 — 이 파일 하나만 바꾸면 다른 데이터로 옮길 수 있게 둔다.
//
// 쓰는 엔드포인트는 하나뿐이다.
//
//   GET https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=<id>
//   → {"response":{"player_count":551673,"result":1}}
//
// 공식 문서가 있고 인증 키를 요구하지 않는다. 게임 이름·출시연도는 원자료가 주지
// 않으므로 아래 표에 우리가 적어 둔 것이고, 원자료와 이어 주는 열쇠는 appid 다.
// 이름을 얻자고 문서화되지 않은 store 경로를 부르지 않는다.
//
// 기준 시간대에 대하여.
// 이 값은 확정된 하루치 집계가 아니라 부르는 순간의 사람 수다. 그래서 "언제 잰
// 값인가" 가 값 자체만큼 중요하다. 매일 같은 시각(KST 10:10, Actions cron)에 재고
// 그 시각의 KST 날짜를 기록의 날짜로 삼는다. 화면에 이 사실을 적어야 한다.

export const SOURCE = {
  id: 'steam-concurrent-players',
  label: 'Steam · 동시접속자',
  publisher: 'Steam Web API',
  docsUrl: 'https://partner.steamgames.com/doc/webapi/ISteamUserStats',
  unit: '명',
  timezone: 'Asia/Seoul',
  // 매일 이 시각에 잰다. Actions cron '10 1 * * *' (01:10 UTC) 와 같은 시각이다.
  measuredAtLocal: '10:10',
};

const ENDPOINT = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/';

/**
 * 재는 게임들.
 *
 * tier 와 genre 는 **우리가 붙인 분류다. 원자료에 없다.**
 *   tier   active — 지금 현역 / legacy — 나온 지 오래된 게임
 *   genre  아래 GENRES 의 값 하나
 *
 * 장르를 손으로 적는 이유는 공식 API 가 장르를 주지 않기 때문이다. 장르를 주는
 * `store.steampowered.com/api/appdetails` 는 문서화되지 않은 경로라 쓰지 않는다
 * (CLAUDE.md 5). 이름·연도를 우리가 적어 둔 것과 같은 취급이고, 화면에도
 * "우리가 붙인 것" 이라고 적는다.
 *
 * 경계가 애매한 것은 애매한 대로 둔다. HELLDIVERS 2 는 3인칭이지만 쏘는 게임이라
 * 슈터에 넣었고, PAYDAY 2 와 Left 4 Dead 2 도 마찬가지다. 이 판단은 우리 것이므로
 * 화면에서 장르별 합계를 낼 때 **어느 게임이 그 장르에 들었는지 함께 보인다.**
 *
 * **appid·이름·연도는 전부 우리가 적은 주장이다.** 이 엔드포인트는 숫자만 주고
 * 이름도 연도도 주지 않는다. 그래서 잘못 짝지으면 화면이 조용히 거짓말을 한다.
 * 2026-08-27 에 36개 전부 두 가지로 확인했다.
 *   · 공식 엔드포인트로 불러 result:1 과 사람 수를 받았다 (appid 가 실존한다)
 *   · 공개 상점 페이지에서 제목과 출시연도를 눈으로 맞췄다 (짝이 맞는다)
 * 두 번째는 **일회성 개발 확인이고 제품 코드에는 없다.** 리뷰 2-1 검사가 그것을
 * 지킨다 — src/ 와 scripts/ 어디에도 store 주소가 나오면 안 된다.
 */
export const GAMES = [
  // ── 슈터 8 ──
  { appid: 730,     name: 'Counter-Strike 2',            year: 2012, tier: 'active', genre: '슈터' },
  { appid: 578080,  name: 'PUBG: BATTLEGROUNDS',         year: 2017, tier: 'active', genre: '슈터' },
  { appid: 1172470, name: 'Apex Legends',                year: 2020, tier: 'active', genre: '슈터' },
  { appid: 553850,  name: 'HELLDIVERS 2',                year: 2024, tier: 'active', genre: '슈터' },
  { appid: 440,     name: 'Team Fortress 2',             year: 2007, tier: 'legacy', genre: '슈터' },
  { appid: 218620,  name: 'PAYDAY 2',                    year: 2013, tier: 'legacy', genre: '슈터' },
  { appid: 550,     name: 'Left 4 Dead 2',               year: 2009, tier: 'legacy', genre: '슈터' },
  { appid: 10,      name: 'Counter-Strike',              year: 2000, tier: 'legacy', genre: '슈터' },

  // ── 생존·제작 8 ──
  { appid: 1623730, name: 'Palworld',                    year: 2024, tier: 'active', genre: '생존·제작' },
  { appid: 252490,  name: 'Rust',                        year: 2018, tier: 'active', genre: '생존·제작' },
  { appid: 892970,  name: 'Valheim',                     year: 2021, tier: 'active', genre: '생존·제작' },
  { appid: 322330,  name: "Don't Starve Together",       year: 2016, tier: 'active', genre: '생존·제작' },
  { appid: 251570,  name: '7 Days to Die',               year: 2024, tier: 'active', genre: '생존·제작' },
  { appid: 105600,  name: 'Terraria',                    year: 2011, tier: 'legacy', genre: '생존·제작' },
  { appid: 108600,  name: 'Project Zomboid',             year: 2013, tier: 'legacy', genre: '생존·제작' },
  { appid: 4000,    name: "Garry's Mod",                 year: 2006, tier: 'legacy', genre: '생존·제작' },

  // ── RPG 6 ──
  { appid: 1245620, name: 'ELDEN RING',                  year: 2022, tier: 'active', genre: 'RPG' },
  { appid: 1086940, name: "Baldur's Gate 3",             year: 2023, tier: 'active', genre: 'RPG' },
  { appid: 1091500, name: 'Cyberpunk 2077',              year: 2020, tier: 'active', genre: 'RPG' },
  { appid: 292030,  name: 'The Witcher 3: Wild Hunt',    year: 2015, tier: 'active', genre: 'RPG' },
  { appid: 377160,  name: 'Fallout 4',                   year: 2015, tier: 'active', genre: 'RPG' },
  { appid: 72850,   name: 'The Elder Scrolls V: Skyrim', year: 2011, tier: 'legacy', genre: 'RPG' },

  // ── 전략 5 ──
  { appid: 289070,  name: "Sid Meier's Civilization VI", year: 2016, tier: 'active', genre: '전략' },
  { appid: 394360,  name: 'Hearts of Iron IV',           year: 2016, tier: 'active', genre: '전략' },
  { appid: 281990,  name: 'Stellaris',                   year: 2016, tier: 'active', genre: '전략' },
  { appid: 236850,  name: 'Europa Universalis IV',       year: 2013, tier: 'legacy', genre: '전략' },
  { appid: 8930,    name: "Sid Meier's Civilization V",  year: 2010, tier: 'legacy', genre: '전략' },

  // ── 오픈월드 3 ──
  { appid: 271590,  name: 'Grand Theft Auto V',          year: 2015, tier: 'active', genre: '오픈월드' },
  { appid: 1174180, name: 'Red Dead Redemption 2',       year: 2019, tier: 'active', genre: '오픈월드' },
  { appid: 1151640, name: 'Horizon Zero Dawn',           year: 2020, tier: 'active', genre: '오픈월드' },

  // ── MOBA 2 ──
  { appid: 570,     name: 'Dota 2',                      year: 2013, tier: 'active', genre: 'MOBA' },
  { appid: 386360,  name: 'SMITE',                       year: 2015, tier: 'active', genre: 'MOBA' },

  // ── 퍼즐 2 ──
  { appid: 620,     name: 'Portal 2',                    year: 2011, tier: 'legacy', genre: '퍼즐' },
  { appid: 400,     name: 'Portal',                      year: 2007, tier: 'legacy', genre: '퍼즐' },

  // ── 시뮬레이션 2 ──
  { appid: 255710,  name: 'Cities: Skylines',            year: 2015, tier: 'active', genre: '시뮬레이션' },
  { appid: 413150,  name: 'Stardew Valley',              year: 2016, tier: 'active', genre: '시뮬레이션' },
];

/** 화면에 나오는 순서. 여기 없는 장르가 GAMES 에 있으면 테스트가 잡는다. */
export const GENRES = ['슈터', '생존·제작', 'RPG', '전략', '오픈월드', 'MOBA', '퍼즐', '시뮬레이션'];

/** 카드 1·5 가 쓰는 대표값. 화면에서 제일 큰 숫자가 이 게임이다. */
export const HERO_APPID = 730;

export function gameOf(appid) {
  return GAMES.find((g) => g.appid === appid) ?? null;
}

/** 그 게임을 재는 원자료 주소. 화면의 '출처' 링크와 같은 주소여야 한다. */
export function buildUrl(appid) {
  return `${ENDPOINT}?appid=${appid}`;
}

/** 지금이 KST 로 몇 년 몇 월 며칠인가. */
export function todayLocal(now = new Date()) {
  // 'en-CA' 는 YYYY-MM-DD 로 준다. 수동 오프셋 계산보다 서머타임 실수가 없다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SOURCE.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/**
 * 순간값은 과거를 다시 잴 수 없다.
 *
 * 앞선 소재(Stack Overflow)는 확정된 하루치라 빈 날을 나중에 메울 수 있었다.
 * 동시접속자는 그렇지 않다. 어제 10:10 에 몇 명이었는지는 그때 재지 않았으면
 * 영영 알 수 없고, 지금 재서 어제 칸에 넣으면 그건 측정이 아니라 조작이다.
 * 그래서 오늘이 아닌 날짜는 호출 전에 막는다.
 */
export function assertMeasurableNow(date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new RangeError(`날짜 형식이 아니다: ${date}`);
  }
  const today = todayLocal(now);
  if (date !== today) {
    throw new RangeError(
      `${date} 는 지금 잴 수 없다. 동시접속자는 부르는 순간의 값이라 과거도 미래도 ` +
      `잴 수 없다. 지금 잴 수 있는 날짜는 ${today} (${SOURCE.timezone}) 뿐이다.`,
    );
  }
}

/**
 * 응답 → 값. 형식이 어긋나면 던진다. 0 으로 대체하지 않는다 —
 * "응답 형식 변경" 은 값이 0 인 것과 다른 상태이기 때문이다.
 *
 * 여기서 0 은 정상값일 수 있다. 아무도 안 하는 게임이면 실제로 0 명이다.
 * 없는 appid 를 물으면 result 가 1 이 아니거나 player_count 자체가 없다.
 */
export function parse(body) {
  if (body === null || typeof body !== 'object') {
    throw new SchemaError('응답이 객체가 아니다');
  }
  const r = body.response;
  if (r === null || typeof r !== 'object') {
    throw new SchemaError('response 필드가 객체가 아니다');
  }
  if (r.result !== 1) {
    throw new SchemaError(`result 가 1 이 아니다: ${JSON.stringify(r.result)}`);
  }
  if (typeof r.player_count !== 'number' || !Number.isFinite(r.player_count)) {
    throw new SchemaError(`player_count 가 숫자가 아니다: ${JSON.stringify(r.player_count)}`);
  }
  if (r.player_count < 0) {
    throw new SchemaError(`player_count 가 음수다: ${r.player_count}`);
  }
  return r.player_count;
}

export class SchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaError';
  }
}
