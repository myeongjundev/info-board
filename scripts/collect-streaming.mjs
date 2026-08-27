import { readFile, writeFile } from 'node:fs/promises';

import {
  appendStreamingHistory,
  rankGameBroadcasts,
  validateStreamingHistory,
  validateStreamingSnapshot,
} from '../src/source/streaming.js';

const outputUrl = new URL('../data/streaming.json', import.meta.url);
const historyUrl = new URL('../data/streaming-history.json', import.meta.url);
const SAMPLE_SIZE = 100;

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function collectChzzk(clientId, clientSecret) {
  const rows = [];
  let next = null;
  while (rows.length < SAMPLE_SIZE) {
    const url = new URL('https://openapi.chzzk.naver.com/open/v1/lives');
    url.searchParams.set('size', '20');
    if (next) url.searchParams.set('next', next);
    const body = await fetchJson(url, {
      headers: { 'Client-Id': clientId, 'Client-Secret': clientSecret },
    });
    const content = body.content ?? body;
    if (!Array.isArray(content.data)) throw new TypeError('CHZZK 라이브 응답 형식이 달라졌다');
    rows.push(...content.data);
    next = content.page?.next;
    if (!next || content.data.length === 0) break;
  }

  const broadcasts = rows.slice(0, SAMPLE_SIZE)
    .filter((item) => item.categoryType === 'GAME' && item.liveCategoryValue)
    .map((item) => ({
      gameId: item.liveCategory,
      gameName: item.liveCategoryValue,
      viewerCount: item.concurrentUserCount,
      categoryUrl: item.liveCategory
        ? `https://chzzk.naver.com/category/GAME/${encodeURIComponent(item.liveCategory)}`
        : 'https://chzzk.naver.com/',
    }));
  const rankings = rankGameBroadcasts(broadcasts);
  if (!rankings.length) throw new TypeError('CHZZK 게임 방송 표본이 비어 있다');
  return Promise.all(rankings.map(async (item) => {
    try {
      const url = new URL('https://openapi.chzzk.naver.com/open/v1/categories/search');
      url.searchParams.set('query', item.gameName);
      url.searchParams.set('size', '50');
      const body = await fetchJson(url, {
        headers: { 'Client-Id': clientId, 'Client-Secret': clientSecret },
      });
      const categories = (body.content ?? body).data;
      const category = Array.isArray(categories)
        ? categories.find((candidate) => candidate.categoryType === 'GAME' && candidate.categoryId === item.gameId)
        : null;
      return { ...item, imageUrl: category?.posterImageUrl || null };
    } catch {
      return item;
    }
  }));
}

async function twitchAppToken(clientId, clientSecret) {
  const url = new URL('https://id.twitch.tv/oauth2/token');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('grant_type', 'client_credentials');
  const body = await fetchJson(url, { method: 'POST' });
  if (!body.access_token) throw new TypeError('Twitch 앱 토큰이 없다');
  return body.access_token;
}

async function collectTwitch(clientId, clientSecret) {
  const token = await twitchAppToken(clientId, clientSecret);
  const body = await fetchJson('https://api.twitch.tv/helix/streams?first=100', {
    headers: { Authorization: `Bearer ${token}`, 'Client-Id': clientId },
  });
  if (!Array.isArray(body.data)) throw new TypeError('Twitch 스트림 응답 형식이 달라졌다');
  const streams = body.data.slice(0, SAMPLE_SIZE);
  const gameIds = [...new Set(streams.map((item) => item.game_id).filter(Boolean))];
  const gamesUrl = new URL('https://api.twitch.tv/helix/games');
  gameIds.forEach((gameId) => gamesUrl.searchParams.append('id', gameId));
  const gamesBody = await fetchJson(gamesUrl, {
    headers: { Authorization: `Bearer ${token}`, 'Client-Id': clientId },
  });
  if (!Array.isArray(gamesBody.data)) throw new TypeError('Twitch 게임 응답 형식이 달라졌다');
  const games = new Map(gamesBody.data.map((game) => [game.id, game]));

  const broadcasts = streams
    .filter((item) => item.game_id && item.game_name && games.get(item.game_id)?.igdb_id)
    .map((item) => ({
      gameId: item.game_id,
      gameName: item.game_name,
      viewerCount: item.viewer_count,
      categoryUrl: `https://www.twitch.tv/directory/game/${encodeURIComponent(item.game_name)}`,
      imageUrl: games.get(item.game_id).box_art_url
        ?.replace('{width}', '144').replace('{height}', '192') ?? null,
    }));
  const rankings = rankGameBroadcasts(broadcasts);
  if (!rankings.length) throw new TypeError('Twitch 게임 방송 표본이 비어 있다');
  return rankings;
}

const snapshot = JSON.parse(await readFile(outputUrl, 'utf8'));
if (!validateStreamingSnapshot(snapshot)) throw new TypeError('기존 streaming.json 형식이 맞지 않는다');
let history = JSON.parse(await readFile(historyUrl, 'utf8'));
if (!validateStreamingHistory(history)) throw new TypeError('기존 streaming-history.json 형식이 맞지 않는다');

const collectors = [
  {
    id: 'chzzk',
    ready: Boolean(process.env.CHZZK_CLIENT_ID && process.env.CHZZK_CLIENT_SECRET),
    run: () => collectChzzk(process.env.CHZZK_CLIENT_ID, process.env.CHZZK_CLIENT_SECRET),
  },
  {
    id: 'twitch',
    ready: Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET),
    run: () => collectTwitch(process.env.TWITCH_CLIENT_ID, process.env.TWITCH_CLIENT_SECRET),
  },
];

let attempted = 0;
const succeeded = [];
const platforms = [...snapshot.platforms];
for (const collector of collectors) {
  if (!collector.ready) {
    console.log(`${collector.id}: 인증 정보가 없어 기존 상태를 지킨다.`);
    continue;
  }
  attempted += 1;
  const index = platforms.findIndex((item) => item.id === collector.id);
  try {
    const rankings = await collector.run();
    platforms[index] = {
      ...platforms[index], status: 'ok', fetchedAt: new Date().toISOString(), rankings,
      message: `상위 라이브 ${SAMPLE_SIZE}개 표본을 게임별로 합산한 Top 10이다.`,
    };
    succeeded.push(platforms[index]);
    console.log(`${collector.id}: Top ${rankings.length} 수집 완료`);
  } catch (error) {
    platforms[index] = {
      ...platforms[index], status: 'error',
      message: `${collector.id} 공식 API 수집 실패: ${error.message}`,
    };
    console.error(platforms[index].message);
  }
}

if (attempted === 0) {
  console.log('연결된 스트리밍 인증 정보가 없어 파일을 변경하지 않았다.');
} else {
  const next = { ...snapshot, platforms };
  if (!validateStreamingSnapshot(next)) throw new TypeError('새 스트리밍 스냅샷 검증 실패');
  if (history.readings.length === 0) history = appendStreamingHistory(history, snapshot.platforms);
  history = appendStreamingHistory(history, succeeded);
  await writeFile(outputUrl, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  await writeFile(historyUrl, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
}
