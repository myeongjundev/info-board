export const STREAMING_PLATFORMS = Object.freeze({
  chzzk: {
    label: 'CHZZK',
    koreanLabel: '치지직',
    color: '#00e778',
    // 밝은 바탕에 글자로 얹을 때만 쓰는 짙은 변형. 채움·표시등은 위 브랜드색 그대로다.
    inkColor: '#00703c',
    serviceUrl: 'https://chzzk.naver.com/',
  },
  twitch: {
    label: 'TWITCH',
    koreanLabel: '트위치',
    color: '#a970ff',
    inkColor: '#6b21a8',
    serviceUrl: 'https://www.twitch.tv/directory',
  },
});

const STATUSES = new Set(['ok', 'credentials_required', 'error']);

export function validateStreamingSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.platforms)) return false;
  if (!snapshot.methodology || typeof snapshot.methodology.description !== 'string') return false;

  const ids = new Set();
  for (const platform of snapshot.platforms) {
    if (!STREAMING_PLATFORMS[platform.id] || ids.has(platform.id)) return false;
    if (!STATUSES.has(platform.status) || !Array.isArray(platform.rankings)) return false;
    if (platform.status === 'ok' && !Number.isFinite(Date.parse(platform.fetchedAt))) return false;
    ids.add(platform.id);

    for (const item of platform.rankings) {
      if (!Number.isInteger(item.rank) || item.rank < 1) return false;
      if (typeof item.gameName !== 'string' || !item.gameName.trim()) return false;
      if (!Number.isInteger(item.viewerCount) || item.viewerCount < 0) return false;
      if (!Number.isInteger(item.broadcastCount) || item.broadcastCount < 1) return false;
      if (item.imageUrl != null && typeof item.imageUrl !== 'string') return false;
    }
    if (platform.rankings.length > 10) return false;
    if (platform.rankings.some((item, index) => item.rank !== index + 1)) return false;
  }
  return ids.size === Object.keys(STREAMING_PLATFORMS).length;
}

export function rankGameBroadcasts(broadcasts, limit = 10) {
  const grouped = new Map();
  for (const broadcast of broadcasts) {
    const gameName = typeof broadcast.gameName === 'string' ? broadcast.gameName.trim() : '';
    const viewerCount = Number(broadcast.viewerCount);
    if (!gameName || !Number.isInteger(viewerCount) || viewerCount < 0) continue;
    const key = String(broadcast.gameId || gameName).toLocaleLowerCase('en-US');
    const current = grouped.get(key) ?? {
      gameId: broadcast.gameId || null,
      gameName,
      viewerCount: 0,
      broadcastCount: 0,
      categoryUrl: broadcast.categoryUrl || null,
      imageUrl: broadcast.imageUrl || null,
    };
    current.viewerCount += viewerCount;
    current.broadcastCount += 1;
    if (!current.categoryUrl && broadcast.categoryUrl) current.categoryUrl = broadcast.categoryUrl;
    if (!current.imageUrl && broadcast.imageUrl) current.imageUrl = broadcast.imageUrl;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .sort((a, b) => b.viewerCount - a.viewerCount
      || b.broadcastCount - a.broadcastCount
      || a.gameName.localeCompare(b.gameName, 'ko'))
    .slice(0, limit)
    .map((item, index) => ({ rank: index + 1, ...item }));
}

const CROSS_PLATFORM_ALIASES = new Map([
  ['리그오브레전드', 'leagueoflegends'],
  ['데드바이데이라이트', 'deadbydaylight'],
  ['스타워즈제로컴퍼니', 'starwarszerocompany'],
  ['프로젝트좀보이드', 'projectzomboid'],
  ['마인크래프트', 'minecraft'],
  ['이터널리턴', 'eternalreturn'],
  ['그랜드테프트오토5', 'grandtheftautov'],
  ['gta5', 'grandtheftautov'],
]);

export function canonicalGameKey(name) {
  const compact = String(name ?? '').normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]/gu, '');
  return CROSS_PLATFORM_ALIASES.get(compact) ?? compact;
}

function sameGame(left, right) {
  if (left.gameId && right.gameId && String(left.gameId) === String(right.gameId)) return true;
  return canonicalGameKey(left.gameName) === canonicalGameKey(right.gameName);
}

export function validateStreamingHistory(history) {
  if (!history || history.schemaVersion !== 1 || !Array.isArray(history.readings)) return false;
  return history.readings.every((reading) => (
    STREAMING_PLATFORMS[reading.platformId]
    && Number.isFinite(Date.parse(reading.fetchedAt))
    && Array.isArray(reading.rankings)
    && reading.rankings.length > 0
    && reading.rankings.length <= 10
    && reading.rankings.every((item, index) => (
      item.rank === index + 1 && typeof item.gameName === 'string'
      && Number.isInteger(item.viewerCount) && item.viewerCount >= 0
    ))
  ));
}

export function appendStreamingHistory(history, platforms, limitPerPlatform = 168) {
  if (!validateStreamingHistory(history)) throw new TypeError('스트리밍 기록 형식이 맞지 않는다');
  const readings = [...history.readings];
  for (const platform of platforms) {
    if (platform.status !== 'ok' || !Number.isFinite(Date.parse(platform.fetchedAt))) continue;
    if (readings.some((item) => item.platformId === platform.id && item.fetchedAt === platform.fetchedAt)) continue;
    readings.push({ platformId: platform.id, fetchedAt: platform.fetchedAt, rankings: platform.rankings });
  }
  const trimmed = Object.keys(STREAMING_PLATFORMS).flatMap((platformId) => readings
    .filter((item) => item.platformId === platformId)
    .sort((a, b) => Date.parse(a.fetchedAt) - Date.parse(b.fetchedAt))
    .slice(-limitPerPlatform));
  return { schemaVersion: 1, readings: trimmed };
}

export function previousStreamingReading(history, platformId, currentFetchedAt) {
  if (!validateStreamingHistory(history)) return null;
  return history.readings
    .filter((item) => item.platformId === platformId && Date.parse(item.fetchedAt) < Date.parse(currentFetchedAt))
    .sort((a, b) => Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt))[0] ?? null;
}

export function streamingRankTrend(item, previousReading) {
  if (!previousReading) return { kind: 'baseline', label: '첫 표본', rankDelta: null, viewerDelta: null };
  const previous = previousReading.rankings.find((candidate) => sameGame(item, candidate));
  if (!previous) return { kind: 'new', label: 'NEW', rankDelta: null, viewerDelta: null };
  const rankDelta = previous.rank - item.rank;
  return {
    kind: rankDelta > 0 ? 'up' : rankDelta < 0 ? 'down' : 'same',
    label: rankDelta > 0 ? `▲ ${rankDelta}` : rankDelta < 0 ? `▼ ${Math.abs(rankDelta)}` : '—',
    rankDelta,
    viewerDelta: item.viewerCount - previous.viewerCount,
  };
}

export function crossPlatformGames(snapshot) {
  const chzzk = snapshot?.platforms?.find((item) => item.id === 'chzzk' && item.status === 'ok');
  const twitch = snapshot?.platforms?.find((item) => item.id === 'twitch' && item.status === 'ok');
  if (!chzzk || !twitch) return [];
  return chzzk.rankings.flatMap((chzzkItem) => {
    const twitchItem = twitch.rankings.find((item) => sameGame(chzzkItem, item));
    return twitchItem ? [{
      key: canonicalGameKey(chzzkItem.gameName), gameName: chzzkItem.gameName,
      chzzk: chzzkItem, twitch: twitchItem,
    }] : [];
  });
}

export function formatViewerCount(value) {
  return new Intl.NumberFormat('ko-KR').format(value);
}
