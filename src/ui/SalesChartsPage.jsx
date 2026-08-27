import { useEffect, useState } from 'react';

import { rankMovement, validateSalesChartSnapshot } from '../source/salesCharts.js';
import GameArt from './GameArt.jsx';

const DATA_URL = `${import.meta.env.BASE_URL}data/sales-charts.json`;
const won = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

function priceLabel(item) {
  if (item.isFree) return <strong className="chart-price-free">무료 플레이</strong>;
  if (item.finalMinor == null) return <span className="chart-price-missing">한국 가격 미표시</span>;
  const finalWon = item.finalMinor / 100;
  if (item.discountPercent > 0) return <><span className="chart-discount">-{item.discountPercent}%</span><del>{won.format(item.initialMinor / 100)}</del><strong>{won.format(finalWon)}</strong></>;
  return <strong>{won.format(finalWon)}</strong>;
}

function formatKst(iso) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

function formatDateKst(iso) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso));
}

function monthLabel(iso) {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long' }).format(new Date(iso));
}

export default function SalesChartsPage() {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [region, setRegion] = useState('korea');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    fetch(DATA_URL, { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!validateSalesChartSnapshot(data)) throw new Error('판매 차트 파일 형식이 맞지 않는다');
      if (alive) setState({ status: 'ok', data });
    }).catch((error) => {
      if (alive) setState({ status: 'error', data: null, message: error.message });
    });
    return () => { alive = false; };
  }, []);

  const liveItems = state.data?.live[region] ?? [];

  return (
    <div className="page charts-page">
      <header className="sales-topbar">
        <a className="sales-back" href="#sec-now">← 동시접속자 대시보드</a>
        <nav className="subpage-nav" aria-label="별도 페이지">
          <a href="#/sales">할인 게임</a><a className="is-current" href="#/charts">판매 차트</a><a href="#/streaming">스트리밍 순위</a>
        </nav>
      </header>

      <main>
        <section className="charts-hero">
          <div><p>STEAM REVENUE RANKING</p><h1>무엇이 지금<br />팔리고 있을까</h1><span>판매량 추정 없이 Steam이 공개한 매출 순위만 읽는다.</span></div>
          {state.data && <div className="charts-updated"><span>LAST CHECKED</span><strong>{formatKst(state.data.completedAt)}</strong><small>KST · 매시간 갱신</small></div>}
        </section>

        {state.status === 'loading' && <p className="sales-state">Steam 판매 차트를 읽는 중…</p>}
        {state.status === 'error' && <p className="sales-state is-error"><b>판매 차트를 읽지 못했다.</b><span>{state.message}</span></p>}

        {state.data && <>
          <section className="live-sales-section" aria-labelledby="live-sales-title">
            <header className="charts-section-heading">
              <div><p>TOP SELLING RIGHT NOW · BY REVENUE</p><h2 id="live-sales-title">지금 많이 팔리는 게임</h2></div>
              <div className="region-switch" role="group" aria-label="판매 지역">
                <button className={region === 'korea' ? 'is-active' : ''} type="button" onClick={() => setRegion('korea')}>한국</button>
                <button className={region === 'global' ? 'is-active' : ''} type="button" onClick={() => setRegion('global')}>글로벌</button>
              </div>
            </header>
            <ol className="sales-rank-list">
              {liveItems.map((item) => <li key={`${region}-${item.appid}`}>
                <b className="sales-rank-no">{String(item.rank).padStart(2, '0')}</b>
                <a className="sales-rank-game" href={item.storeUrl} target="_blank" rel="noreferrer">
                  <GameArt src={item.imageUrl} width={184} height={86} /><strong>{item.name}</strong>
                </a>
                <div className="sales-rank-price">{priceLabel(item)}</div>
                <a className="sales-rank-link" href={item.storeUrl} target="_blank" rel="noreferrer">상점 ↗</a>
              </li>)}
            </ol>
          </section>

          <section className="weekly-sales-section" aria-labelledby="weekly-sales-title">
            <header className="charts-section-heading">
              <div><p>OFFICIAL WEEKLY TOP 20</p><h2 id="weekly-sales-title">이번 주 매출 순위</h2><span>{formatDateKst(state.data.weekly.weekStart)} 시작 · 한국</span></div>
              <a href={state.data.source.overview} target="_blank" rel="noreferrer">공식 차트 ↗</a>
            </header>
            <ol className="weekly-rank-list">
              {state.data.weekly.items.map((item) => {
                const movement = rankMovement(item);
                return <li key={`weekly-${item.appid}`}>
                  <b>{String(item.rank).padStart(2, '0')}</b>
                  <a href={item.storeUrl} target="_blank" rel="noreferrer"><GameArt src={item.imageUrl} width={184} height={86} /><strong>{item.name}</strong></a>
                  <span className={`rank-movement is-${movement.kind}`}>{movement.label}</span>
                  <span className="rank-weeks">{item.consecutiveWeeks}주</span>
                  <div>{priceLabel(item)}</div>
                </li>;
              })}
            </ol>
          </section>

          <section className="monthly-releases-section" aria-labelledby="monthly-releases-title">
            <header className="charts-section-heading">
              <div><p>MONTHLY TOP RELEASES</p><h2 id="monthly-releases-title">{monthLabel(state.data.monthly.monthAt)} 인기 신작</h2><span>Steam 공개 목록 · 개별 매출 순위는 제공되지 않음</span></div>
              <a href={`https://store.steampowered.com/charts/topnewreleases/${state.data.monthly.saleName}`} target="_blank" rel="noreferrer">월간 원자료 ↗</a>
            </header>
            <div className="monthly-release-grid">
              {state.data.monthly.items.map((item) => <article key={`monthly-${item.appid}`}>
                <a href={item.storeUrl} target="_blank" rel="noreferrer"><GameArt src={item.imageUrl} width={460} height={215} /></a>
                <div><h3>{item.name}</h3><p>{priceLabel(item)}</p><a href={item.storeUrl} target="_blank" rel="noreferrer">Steam에서 보기 ↗</a></div>
              </article>)}
            </div>
          </section>

          <section className="charts-quality-note">
            <div><p>DATA QUALITY</p><h2>순위가 말하지 않는 것</h2></div>
            <p>현재·주간 차트는 판매 수량이 아니라 매출 순위다. Steam은 판매량과 매출액을 공개하지 않는다. 월간 자료는 해당 월 출시작의 인기 목록이며 전체 게임의 월간 판매 순위도, 항목 사이의 세부 순위도 아니다.</p>
            <div><a href={state.data.source.korea} target="_blank" rel="noreferrer">한국 Top Sellers ↗</a><a href={state.data.source.global} target="_blank" rel="noreferrer">Global Top Sellers ↗</a></div>
          </section>
        </>}
      </main>
    </div>
  );
}
