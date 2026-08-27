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
 * tier 는 화면에서 쓰는 분류일 뿐 원자료에는 없다.
 *   active — 지금 현역인 게임
 *   legacy — 나온 지 오래된 게임. "아직 살아 있는가" 를 묻는 자리에 쓴다
 *
 * 2026-08-27 에 16개 전부 실제로 불러 result:1 을 확인하고 넣었다.
 */
export const GAMES = [
  { appid: 730,     name: 'Counter-Strike 2',            year: 2012, tier: 'active' },
  { appid: 570,     name: 'Dota 2',                      year: 2013, tier: 'active' },
  { appid: 1623730, name: 'Palworld',                    year: 2024, tier: 'active' },
  { appid: 578080,  name: 'PUBG: BATTLEGROUNDS',         year: 2017, tier: 'active' },
  { appid: 1172470, name: 'Apex Legends',                year: 2020, tier: 'active' },
  { appid: 553850,  name: 'HELLDIVERS 2',                year: 2024, tier: 'active' },
  { appid: 271590,  name: 'Grand Theft Auto V',          year: 2015, tier: 'active' },
  { appid: 105600,  name: 'Terraria',                    year: 2011, tier: 'legacy' },
  { appid: 440,     name: 'Team Fortress 2',             year: 2007, tier: 'legacy' },
  { appid: 218620,  name: 'PAYDAY 2',                    year: 2013, tier: 'legacy' },
  { appid: 550,     name: 'Left 4 Dead 2',               year: 2009, tier: 'legacy' },
  { appid: 4000,    name: "Garry's Mod",                 year: 2006, tier: 'legacy' },
  { appid: 8930,    name: "Sid Meier's Civilization V",  year: 2010, tier: 'legacy' },
  { appid: 10,      name: 'Counter-Strike',              year: 2000, tier: 'legacy' },
  { appid: 620,     name: 'Portal 2',                    year: 2011, tier: 'legacy' },
  { appid: 72850,   name: 'The Elder Scrolls V: Skyrim', year: 2011, tier: 'legacy' },
];

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
