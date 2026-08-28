import { useEffect, useMemo, useState } from 'react';

import { SUBPAGE_AXES } from '../view/overview.js';

import { headerUrl } from '../source/artwork.js';
import { krwFromMinor, validateDiscountSnapshot } from '../source/discounts.js';
import { remainingLabel, validateEpicFreeSnapshot } from '../source/epicFree.js';
import { validateFreeToKeepSnapshot, validatePopularDiscountSnapshot } from '../source/steamPromotions.js';
import { countAdult, displayArt, displayName } from '../view/gameDisplay.js';
import GameArt from './GameArt.jsx';

const DATA_URL = `${import.meta.env.BASE_URL}data/discounts.json`;
const EPIC_DATA_URL = `${import.meta.env.BASE_URL}data/epic-free.json`;
const POPULAR_DATA_URL = `${import.meta.env.BASE_URL}data/popular-discounts.json`;
const STEAM_FREE_DATA_URL = `${import.meta.env.BASE_URL}data/steam-free.json`;

const won = new Intl.NumberFormat('ko-KR', {
  style: 'currency', currency: 'KRW', maximumFractionDigits: 0,
});

function formatWon(minor) {
  return won.format(krwFromMinor(minor));
}

function formatKst(iso) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

export default function SalesPage() {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [epicState, setEpicState] = useState({ status: 'loading', data: null });
  const [popularState, setPopularState] = useState({ status: 'loading', data: null });
  const [steamFreeState, setSteamFreeState] = useState({ status: 'loading', data: null });
  const [steamFreeTab, setSteamFreeTab] = useState('keep');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('전체');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let alive = true;
    fetch(DATA_URL, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!validateDiscountSnapshot(data)) throw new Error('할인 파일 형식이 맞지 않는다');
        if (alive) setState({ status: 'ok', data });
      })
      .catch((error) => {
        if (alive) setState({ status: 'error', data: null, message: error.message });
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(POPULAR_DATA_URL, { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) throw new Error(`인기 Top 100 HTTP ${response.status}`);
        const data = await response.json();
        if (!validatePopularDiscountSnapshot(data)) throw new Error('인기 Top 100 할인 파일 형식이 맞지 않는다');
        return data;
      }),
      fetch(STEAM_FREE_DATA_URL, { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) throw new Error(`무료 이벤트 HTTP ${response.status}`);
        const data = await response.json();
        if (!validateFreeToKeepSnapshot(data)) throw new Error('Steam 무료 이벤트 파일 형식이 맞지 않는다');
        return data;
      }),
    ].map((request) => request.then(
      (value) => ({ status: 'fulfilled', value }),
      (reason) => ({ status: 'rejected', reason }),
    ))).then(([popular, steamFree]) => {
      if (!alive) return;
      setPopularState(popular.status === 'fulfilled'
        ? { status: 'ok', data: popular.value }
        : { status: 'error', data: null, message: popular.reason.message });
      setSteamFreeState(steamFree.status === 'fulfilled'
        ? { status: 'ok', data: steamFree.value }
        : { status: 'error', data: null, message: steamFree.reason.message });
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(EPIC_DATA_URL, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!validateEpicFreeSnapshot(data)) throw new Error('Epic 무료 게임 파일 형식이 맞지 않는다');
        if (alive) setEpicState({ status: 'ok', data });
      })
      .catch((error) => {
        if (alive) setEpicState({ status: 'error', data: null, message: error.message });
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const genres = useMemo(() => (
    ['전체', ...new Set(state.data?.discounts.map((item) => item.genre) ?? [])]
  ), [state.data]);
  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ko-KR');
    return state.data?.discounts.filter((item) => (
      (genre === '전체' || item.genre === genre)
      && (!needle || item.name.toLocaleLowerCase('ko-KR').includes(needle))
    )) ?? [];
  }, [state.data, query, genre]);

  const discounts = state.data?.discounts ?? [];
  const maxDiscount = discounts.length ? Math.max(...discounts.map((item) => item.discountPercent)) : null;
  const averageDiscount = discounts.length
    ? Math.round(discounts.reduce((sum, item) => sum + item.discountPercent, 0) / discounts.length)
    : null;
  const snapshotStale = state.data
    ? Date.now() - Date.parse(state.data.completedAt) > 36 * 60 * 60 * 1000
    : false;
  const activeEpicGiveaways = epicState.data?.giveaways.filter((item) => (
    Date.parse(item.startAt) <= nowMs && nowMs < Date.parse(item.endAt)
  )) ?? [];

  return (
    <div className="page sales-page">
      <header className="sales-topbar">
        <a className="sales-back" href="#sec-now">← 전체 현황</a>
        <nav className="subpage-nav" aria-label="별도 페이지">
          {SUBPAGE_AXES.map((axis) => (
            <a
              key={axis.id}
              className={axis.href === '#/sales' ? 'is-current' : undefined}
              href={axis.href}
            >{axis.question}</a>
          ))}
        </nav>
      </header>

      <main>
        <section className="sales-hero">
          <div>
            <p className="sales-eyebrow">KOREA DISCOUNT RADAR</p>
            <h1>한국 할인 게임</h1>
            <p>추적 중인 75개 게임에서 현재 한국 Steam 할인이 확인된 게임만 모았다.</p>
          </div>
          {state.data && (
            <p className={`sales-updated${snapshotStale ? ' is-stale' : ''}`}>
              <span>{snapshotStale ? '오래된 가격 자료' : '마지막 확인'}</span>
              {formatKst(state.data.completedAt)} KST
            </p>
          )}
        </section>

        <section className="epic-giveaway-section" aria-labelledby="epic-free-title">
          <header className="epic-giveaway-heading">
            <div>
              <p>EPIC GAMES · LIMITED GIVEAWAY</p>
              <h2 id="epic-free-title">이번 주 무료 배포</h2>
              <span>상시 무료 플레이 게임을 제외한 기간 한정 혜택</span>
            </div>
            <a href="https://store.epicgames.com/free-games?lang=ko" target="_blank" rel="noreferrer">Epic 무료 게임 전체 보기 ↗</a>
          </header>

          {epicState.status === 'loading' && <p className="epic-state">Epic 무료 배포를 확인하는 중…</p>}
          {epicState.status === 'error' && (
            <p className="epic-state is-error">자료를 읽지 못했다. 기존 Steam 할인 정보와 별개의 오류다. <span>{epicState.message}</span></p>
          )}
          {epicState.status === 'ok' && activeEpicGiveaways.length === 0 && (
            <p className="epic-state">현재 스냅샷에서 진행 중인 기간 한정 무료 배포가 확인되지 않았다.</p>
          )}
          {activeEpicGiveaways.length > 0 && (
            <div className="epic-giveaway-grid">
              {activeEpicGiveaways.map((item) => (
                <article className="epic-giveaway-card" key={item.id}>
                  <a className="epic-giveaway-art" href={item.storeUrl} target="_blank" rel="noreferrer">
                    {item.imageUrl && <img src={item.imageUrl} alt="" />}
                    <span>100% OFF</span>
                  </a>
                  <div className="epic-giveaway-body">
                    <div className="epic-free-meta"><span>지금 무료</span><b>{remainingLabel(item.endAt, nowMs)}</b></div>
                    <h3>{item.title}</h3>
                    <p className="epic-original-price"><span>원래 가격</span><del>{won.format(item.originalPrice)}</del><strong>무료</strong></p>
                    <dl>
                      <div><dt>배포 시작</dt><dd>{formatKst(item.startAt)} KST</dd></div>
                      <div><dt>배포 종료</dt><dd>{formatKst(item.endAt)} KST</dd></div>
                    </dl>
                    <a className="epic-store-button" href={item.storeUrl} target="_blank" rel="noreferrer">Epic에서 받기 ↗</a>
                  </div>
                </article>
              ))}
            </div>
          )}
          {epicState.data && (
            <footer className="epic-source-line">
              <span>마지막 확인 {formatKst(epicState.data.completedAt)} KST</span>
              <span>문서화되지 않은 공개 프로모션 응답 · 실패 시 0건으로 덮지 않음</span>
            </footer>
          )}
        </section>

        <section className="steam-free-section" aria-labelledby="steam-free-title">
          <header>
            <div><p>STEAM · LIMITED FREE EVENTS</p><h2 id="steam-free-title">Steam 무료 이벤트</h2></div>
            <a href="https://store.steampowered.com/search/?category1=998&hidef2p=1&maxprice=free&specials=1" target="_blank" rel="noreferrer">Steam에서 확인 ↗</a>
          </header>
          <div className="steam-free-tabs" role="tablist" aria-label="Steam 무료 이벤트 유형">
            <button type="button" role="tab" aria-selected={steamFreeTab === 'keep'} className={steamFreeTab === 'keep' ? 'is-active' : ''} onClick={() => setSteamFreeTab('keep')}>
              무료 소장 <span>{steamFreeState.data?.giveaways.length ?? '—'}</span>
            </button>
            <button type="button" role="tab" aria-selected={steamFreeTab === 'weekend'} className={steamFreeTab === 'weekend' ? 'is-active' : ''} onClick={() => setSteamFreeTab('weekend')}>
              무료 플레이 주말 <span>{steamFreeState.data?.freeWeekends?.length ?? '—'}</span>
            </button>
          </div>
          {steamFreeState.status === 'loading' && <p className="steam-free-empty">무료 이벤트를 확인하는 중…</p>}
          {steamFreeState.status === 'error' && <p className="steam-free-empty is-error">Steam 무료 이벤트 자료를 읽지 못했다. <span>{steamFreeState.message}</span></p>}
          {steamFreeState.status === 'ok' && steamFreeTab === 'keep' && steamFreeState.data.giveaways.length === 0 && (
            <div className="steam-free-empty"><b>현재 확인된 무료 소장 게임이 없다.</b><span>받아 두면 행사 종료 후에도 라이브러리에 남는 게임만 표시한다.</span></div>
          )}
          {steamFreeTab === 'keep' && steamFreeState.data?.giveaways.length > 0 && (
            <div className="steam-free-grid">
              {steamFreeState.data.giveaways.map((item) => (
                <article key={item.appid}>
                  {item.imageUrl && <img src={item.imageUrl} alt="" />}
                  <div><span>100% 할인 · 무료 소장</span><h3>{item.title}</h3><p><del>{won.format(item.originalWon)}</del><strong>무료</strong></p>
                    <small>{item.endAt ? `${remainingLabel(item.endAt, nowMs)} · ${formatKst(item.endAt)} KST 종료` : '종료 시각은 Steam 상점에서 확인'}</small>
                    <a href={item.storeUrl} target="_blank" rel="noreferrer">라이브러리에 추가 ↗</a>
                  </div>
                </article>
              ))}
            </div>
          )}
          {steamFreeState.status === 'ok' && steamFreeTab === 'weekend' && (steamFreeState.data.freeWeekends?.length ?? 0) === 0 && (
            <div className="steam-free-empty"><b>현재 확인된 무료 플레이 주말 게임이 없다.</b><span>무료 주말은 행사 종료 후 구매해야 계속 플레이할 수 있다.</span></div>
          )}
          {steamFreeTab === 'weekend' && steamFreeState.data?.freeWeekends?.length > 0 && (
            <div className="steam-free-grid">
              {steamFreeState.data.freeWeekends.map((item) => (
                <article className="is-weekend" key={item.appid}>
                  {item.imageUrl && <img src={item.imageUrl} alt="" />}
                  <div><span>기간 한정 · 무료 플레이</span><h3>{item.title}</h3>
                    <p>
                      {item.discountPercent > 0 && <b>-{item.discountPercent}%</b>}
                      <del>{won.format(item.originalWon)}</del>
                      <strong>{item.finalWon ? won.format(item.finalWon) : '구매 가격 확인'}</strong>
                    </p>
                    <small>{item.endAt ? `${remainingLabel(item.endAt, nowMs)} · ${formatKst(item.endAt)} KST 종료` : '무료 플레이 종료 시각은 Steam 상점에서 확인'}</small>
                    <em>행사 종료 후 계속 플레이하려면 구매가 필요하다.</em>
                    <a href={item.storeUrl} target="_blank" rel="noreferrer">Steam에서 플레이 ↗</a>
                  </div>
                </article>
              ))}
            </div>
          )}
          {steamFreeState.data && <footer>마지막 확인 {formatKst(steamFreeState.data.completedAt)} KST · 무료 소장과 임시 플레이를 구분 · 검색 결과가 비면 0건으로 표시</footer>}
        </section>

        <section className="popular-deals-section" aria-labelledby="popular-deals-title">
          <header>
            <div><p>STEAM MOST PLAYED · TOP 100</p><h2 id="popular-deals-title">인기 100 게임 할인</h2><span>수집 당시 동시접속자 순위 기준</span></div>
            {popularState.data && <strong>{popularState.data.discounts.length}<i>/100</i><small>할인 중</small></strong>}
          </header>
          {popularState.status === 'loading' && <p className="popular-deals-state">Steam 인기 100개 가격을 읽는 중…</p>}
          {popularState.status === 'error' && <p className="popular-deals-state is-error">인기 100 할인 자료를 읽지 못했다. {popularState.message}</p>}
          {popularState.data && (
            <>
              <div className="popular-deal-grid">
                {popularState.data.discounts.map((item) => (
                  <article key={item.appid}>
                    <a className="popular-deal-art" href={item.storeUrl} target="_blank" rel="noreferrer">
                      <GameArt src={item.adult ? null : (item.imageUrl || headerUrl(item.appid))} width={460} height={215} />
                      <b>TOP {item.rank}</b><span>-{item.discountPercent}%</span>
                    </a>
                    <div className="popular-deal-body"><h3>{displayName(item)}</h3><p><del>{formatWon(item.initialMinor)}</del><strong>{formatWon(item.finalMinor)}</strong></p><small>수집 시 동시접속자 {new Intl.NumberFormat('ko-KR').format(item.currentPlayers)}명</small></div>
                  </article>
                ))}
              </div>
              <footer className="popular-deals-foot">100개 중 가격 확인 {popularState.data.counts.checked} · 할인 {popularState.data.counts.discount} · 상시 무료 {popularState.data.counts.permanent_free} · 실패 {popularState.data.counts.failed} · {formatKst(popularState.data.completedAt)} KST</footer>
            </>
          )}
        </section>

        {state.status === 'loading' && <p className="sales-state">할인 스냅샷을 읽는 중…</p>}
        {state.status === 'error' && (
          <section className="sales-state is-error">
            <b>할인 자료를 읽지 못했다.</b>
            <span>{state.message}</span>
          </section>
        )}

        {state.data && (
          <>
            <header className="tracked-deals-heading"><div><p>TRACKED LIBRARY</p><h2>추적 게임 할인</h2></div><span>고정 목록 75개 기준</span></header>
            <section className="sales-kpis" aria-label="할인 요약">
              <article><span>할인 중</span><strong>{discounts.length}</strong><small>/ 75개 추적</small></article>
              <article><span>최대 할인</span><strong>{maxDiscount === null ? '—' : `${maxDiscount}%`}</strong></article>
              <article><span>평균 할인</span><strong>{averageDiscount === null ? '—' : `${averageDiscount}%`}</strong></article>
              <article>
                <span>수집 상태</span><strong>{state.data.counts.checked}</strong>
                <small>/ 75개 확인 · 실패 {state.data.counts.failed}</small>
              </article>
            </section>

            <section className="sales-toolbar" aria-label="할인 게임 필터">
              <label>
                <span>게임 검색</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="게임 이름" />
              </label>
              <label>
                <span>장르</span>
                <select value={genre} onChange={(event) => setGenre(event.target.value)}>
                  {genres.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <p><b>{shown.length}</b>개 표시</p>
            </section>

            {shown.length ? (
              <section className="deal-grid" aria-label="할인 게임 목록">
                {shown.map((item) => (
                  <article className="deal-card" key={item.appid}>
                    <a href={item.storeUrl} target="_blank" rel="noreferrer" className="deal-art-link">
                      <GameArt className="deal-art" src={headerUrl(item.appid)} width={460} height={215} />
                      <span className="deal-badge">-{item.discountPercent}%</span>
                    </a>
                    <div className="deal-body">
                      <div className="deal-meta"><span>{item.genre}</span><span>{item.year}</span></div>
                      <h2>{displayName(item)}</h2>
                      <div className="deal-price">
                        <del>{formatWon(item.initialMinor)}</del>
                        <strong>{formatWon(item.finalMinor)}</strong>
                      </div>
                      <p>{formatWon(item.initialMinor - item.finalMinor)} 절약</p>
                    </div>
                    <footer className="deal-foot">
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">원자료 JSON ↗</a>
                      <a href={item.storeUrl} target="_blank" rel="noreferrer">Steam에서 보기 ↗</a>
                    </footer>
                  </article>
                ))}
              </section>
            ) : (
              <p className="sales-state">조건에 맞는 할인 게임이 없다.</p>
            )}

            <section className="sales-source-note">
              <div>
                <p>DATA SOURCE · EXPERIMENTAL</p>
                <h2>비공식 Steam Store 응답</h2>
              </div>
              <p>
                이 페이지는 Steam 전체가 아니라 추적 게임 75개만 확인한다. 문서화되지 않은
                <code> appdetails</code> 응답이라 예고 없이 바뀔 수 있고, 실패한 게임은 0%로
                만들지 않고 수집 상태에서 따로 센다. 제출 전 유지 여부를 다시 검토한다.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
