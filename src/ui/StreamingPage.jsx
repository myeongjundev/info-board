import { useEffect, useMemo, useState } from 'react';

import SubpageTopBar from './SubpageTopBar.jsx';

import {
  crossPlatformGames,
  formatViewerCount,
  previousStreamingReading,
  STREAMING_PLATFORMS,
  streamingRankTrend,
  validateStreamingHistory,
  validateStreamingSnapshot,
} from '../source/streaming.js';
import GameArt from './GameArt.jsx';

const DATA_URL = `${import.meta.env.BASE_URL}data/streaming.json`;
const HISTORY_URL = `${import.meta.env.BASE_URL}data/streaming-history.json`;

const STATUS_COPY = {
  ok: ['수집 완료', '표본이 정상적으로 집계됐다.'],
  credentials_required: ['인증 연결 필요', '공식 API용 Client ID와 Secret이 필요하다.'],
  error: ['수집 실패', '직전 수집 오류를 0명으로 바꾸지 않고 분리했다.'],
};

function formatKst(iso) {
  if (!iso) return '아직 수집 전';
  return `${new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso))} KST`;
}

function signedViewerDelta(value) {
  if (value == null) return null;
  if (value === 0) return '시청자 변화 없음';
  return `시청자 ${value > 0 ? '+' : '−'}${formatViewerCount(Math.abs(value))}명`;
}

export default function StreamingPage() {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [activeId, setActiveId] = useState('chzzk');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(DATA_URL, { cache: 'no-store' }),
      fetch(HISTORY_URL, { cache: 'no-store' }),
    ]).then(async ([response, historyResponse]) => {
        if (!response.ok || !historyResponse.ok) throw new Error(`HTTP ${response.status}/${historyResponse.status}`);
        const [data, history] = await Promise.all([response.json(), historyResponse.json()]);
        if (!validateStreamingSnapshot(data)) throw new Error('스트리밍 파일 형식이 맞지 않는다');
        if (!validateStreamingHistory(history)) throw new Error('스트리밍 기록 파일 형식이 맞지 않는다');
        if (alive) setState({ status: 'ok', data, history });
      })
      .catch((error) => {
        if (alive) setState({ status: 'error', data: null, message: error.message });
      });
    return () => { alive = false; };
  }, []);

  const connected = state.data?.platforms.filter((item) => item.status === 'ok').length ?? 0;
  const active = state.data?.platforms.find((item) => item.id === activeId);
  const totalViewers = useMemo(() => (
    active?.rankings.reduce((sum, item) => sum + item.viewerCount, 0) ?? 0
  ), [active]);
  const previous = useMemo(() => (
    active?.fetchedAt ? previousStreamingReading(state.history, active.id, active.fetchedAt) : null
  ), [active, state.history]);
  const sharedGames = useMemo(() => crossPlatformGames(state.data), [state.data]);

  return (
    <div className="page streaming-page">
      <SubpageTopBar current="#/streaming" caption="치지직·Twitch 시청자 순위" />

      <main>
        <section className="streaming-hero">
          <div>
            <p className="sales-eyebrow">STREAMING GAME INDEX</p>
            <h1>지금, 어디서<br />어떤 게임을 볼까</h1>
            <p>치지직 · 트위치의 상위 게임 방송을 같은 기준으로 읽는다.</p>
          </div>
          <div className="streaming-readiness" aria-label="데이터 연결 현황">
            <span>DATA READINESS</span>
            <strong>{connected}<i>/2</i></strong>
            <small>공식 데이터 연결</small>
          </div>
        </section>

        {state.status === 'loading' && <p className="sales-state">스트리밍 스냅샷을 읽는 중…</p>}
        {state.status === 'error' && (
          <section className="sales-state is-error"><b>스트리밍 자료를 읽지 못했다.</b><span>{state.message}</span></section>
        )}

        {state.data && (
          <>
            <section className="platform-status-grid" aria-label="플랫폼 수집 상태">
              {state.data.platforms.map((item) => {
                const meta = STREAMING_PLATFORMS[item.id];
                const status = STATUS_COPY[item.status];
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`platform-status-card is-${item.status}${activeId === item.id ? ' is-active' : ''}`}
                    style={{ '--platform': meta.color }}
                    onClick={() => setActiveId(item.id)}
                  >
                    <span className="platform-wordmark">{meta.label}</span>
                    <span className="platform-status-dot" aria-hidden="true" />
                    <strong>{status[0]}</strong>
                    <small>{item.status === 'ok' ? formatKst(item.fetchedAt) : status[1]}</small>
                  </button>
                );
              })}
            </section>

            <section className="stream-rank-panel" style={{ '--platform': STREAMING_PLATFORMS[activeId].color }}>
              <header>
                <div>
                  <p>{STREAMING_PLATFORMS[activeId].label} · GAME TOP 10</p>
                  <h2>{STREAMING_PLATFORMS[activeId].koreanLabel} 인기 게임 Top 10</h2>
                  <span className="stream-compare-time">{previous ? `${formatKst(previous.fetchedAt)} 대비` : '비교할 이전 정상 표본을 기다리는 중'}</span>
                </div>
                <div className="stream-rank-summary">
                  <span>표본 시청자</span>
                  <strong>{active?.status === 'ok' ? formatViewerCount(totalViewers) : '—'}</strong>
                </div>
              </header>

              {active?.status === 'ok' && active.rankings.length ? (
                <ol className="stream-rank-list">
                  {active.rankings.slice(0, 10).map((item) => {
                    const trend = streamingRankTrend(item, previous);
                    return <li key={`${active.id}-${item.rank}-${item.gameName}`}>
                      <b>{String(item.rank).padStart(2, '0')}</b>
                      <span className="stream-art-slot"><GameArt className="stream-game-art" src={item.imageUrl} width={54} height={72} /></span>
                      <div className="stream-game-copy">
                        <strong>{item.gameName}</strong><span>방송 {formatViewerCount(item.broadcastCount)}개</span>
                        <small className={`stream-trend is-${trend.kind}`}><b>{trend.label}</b>{signedViewerDelta(trend.viewerDelta)}</small>
                      </div>
                      <p><strong>{formatViewerCount(item.viewerCount)}</strong><span>명</span></p>
                      {item.categoryUrl && <a href={item.categoryUrl} target="_blank" rel="noreferrer">보러가기 ↗</a>}
                    </li>;
                  })}
                </ol>
              ) : (
                <div className="stream-empty">
                  <span aria-hidden="true">{String(activeId === 'twitch' ? '02' : '01')}</span>
                  <div>
                    <h3>{STATUS_COPY[active?.status]?.[0] ?? '데이터 없음'}</h3>
                    <p>{active?.message ?? STATUS_COPY[active?.status]?.[1]}</p>
                    <a href={active?.docsUrl ?? STREAMING_PLATFORMS[activeId].serviceUrl} target="_blank" rel="noreferrer">공식 안내 확인 ↗</a>
                  </div>
                </div>
              )}
            </section>

            <section className="stream-cross-section" aria-labelledby="stream-cross-title">
              <header>
                <div><p>CROSS PLATFORM</p><h2 id="stream-cross-title">두 차트에 함께 오른 게임</h2></div>
                <span>시청자 수는 플랫폼별로 따로 읽는다</span>
              </header>
              {sharedGames.length ? <div className="stream-cross-grid">
                {sharedGames.map((item) => <article key={item.key}>
                  <GameArt src={item.chzzk.imageUrl || item.twitch.imageUrl} width={72} height={96} />
                  <div><h3>{item.gameName}</h3><p><b>CHZZK #{item.chzzk.rank}</b><span>{formatViewerCount(item.chzzk.viewerCount)}명</span></p><p><b>TWITCH #{item.twitch.rank}</b><span>{formatViewerCount(item.twitch.viewerCount)}명</span></p></div>
                </article>)}
              </div> : <p className="stream-cross-empty">현재 두 Top 10에 동시에 포함된 것으로 확인된 게임이 없다.</p>}
            </section>

            <section className="stream-method">
              <div><p>METHODOLOGY</p><h2>숫자를 비교하는 기준</h2></div>
              <div className="stream-method-grid">
                <article><b>01</b><h3>동일 시각</h3><p>플랫폼별 수집 시각을 기록하고 오래된 값은 최신 값처럼 섞지 않는다.</p></article>
                <article><b>02</b><h3>Top 10</h3><p>{state.data.methodology.description} 그 결과에서 게임 10개만 표시한다.</p></article>
                <article><b>03</b><h3>실패 분리</h3><p>인증 실패와 수집 장애를 시청자 0명으로 해석하지 않는다.</p></article>
              </div>
            </section>

            <section className="stream-source-note">
              <div><p>DATA QUALITY</p><h2>출처와 제약</h2></div>
              <p>
                Twitch와 CHZZK는 공식 API 인증 정보로 수집한다. 권한이 없는 값을 추정하거나 화면을 비공식 수집하지 않으며,
                각 카드가 실제 연결 상태를 그대로 표시한다.
              </p>
              <div className="source-links">
                {state.data.platforms.map((item) => (
                  <a key={item.id} href={item.docsUrl} target="_blank" rel="noreferrer">{STREAMING_PLATFORMS[item.id].label} 공식 문서 ↗</a>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
