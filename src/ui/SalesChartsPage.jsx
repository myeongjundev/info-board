import { useEffect, useState } from 'react';

import SubpageTopBar from './SubpageTopBar.jsx';
import PageHero from './PageHero.jsx';
import SegmentControl from './SegmentControl.jsx';

import { rankMovement, validateSalesChartSnapshot } from '../source/salesCharts.js';
import { countAdult, displayArt, displayName, priceMarksOnScreen } from '../view/gameDisplay.js';
import GameArt from './GameArt.jsx';

const DATA_URL = `${import.meta.env.BASE_URL}data/sales-charts.json`;

// 가격은 Steam 이 표기한 문자열을 그대로 쓴다. 여기서 나눗셈을 하지 않는다 —
// 전에 `finalMinor / 100` 에 원화 기호를 붙였다가 USD 를 ₩ 로 1000배 틀리게
// 내보냈다. 통화를 화면이 고르면 언젠가 틀린 통화를 고른다. 근거는 chartPrice.js.
function priceLabel(item) {
  if (item.isFree) return <strong className="chart-price-free">무료 플레이</strong>;
  if (!item.priceText) return <span className="chart-price-missing">가격 미표시</span>;
  const discounted = item.discountPercent > 0 && item.priceTextInitial && item.priceTextInitial !== item.priceText;
  if (discounted) {
    return (
      <><span className="chart-discount">-{item.discountPercent}%</span>
        <del>{item.priceTextInitial}</del><strong>{item.priceText}</strong></>
    );
  }
  return <strong>{item.priceText}</strong>;
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

function monthKeyLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return `${year}년 ${month}월`;
}

function releaseTiming(item, upcoming) {
  if (!item.releaseDate) return upcoming ? '날짜 미정' : '이번 달 출시';
  if (!upcoming) return 'NEW RELEASE';
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const days = Math.round((Date.parse(`${item.releaseDate}T00:00:00+09:00`) - Date.parse(`${today}T00:00:00+09:00`)) / 86_400_000);
  return days > 0 ? `D-${days}` : days === 0 ? '오늘 출시' : '일정 확인';
}

export default function SalesChartsPage() {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [region, setRegion] = useState('korea');
  const [releaseTab, setReleaseTab] = useState('current');

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
  const releaseItems = state.data?.releaseCalendar?.[releaseTab] ?? [];
  // 접힌 항목이 몇 개인지 화면이 스스로 밝힌다. 조용히 가리면 그것도 숨기는 것이다.
  const adultOnScreen = countAdult([
    ...liveItems, ...releaseItems,
    ...(state.data?.weekly?.items ?? []), ...(state.data?.monthly?.items ?? []),
  ]);
  // 통화도 같은 이유로 화면이 스스로 밝힌다. 수집 위치에 따라 바뀌기 때문이다.
  const currencyOnScreen = priceMarksOnScreen([
    ...liveItems, ...releaseItems,
    ...(state.data?.weekly?.items ?? []), ...(state.data?.monthly?.items ?? []),
  ]);
  const releaseMonth = state.data?.releaseCalendar?.[releaseTab === 'current' ? 'currentMonth' : 'nextMonth'];

  return (
    <div className="page charts-page">
      <SubpageTopBar current="#/charts" caption="Steam 한국·글로벌 매출 순위" />

      <main>
        <PageHero
          tone="selling"
          eyebrow="STEAM REVENUE RANKING"
          title={<>무엇이 지금<br />{' '}팔리고 있을까</>}
          description="판매량 추정 없이 Steam이 공개한 매출 순위만 읽는다."
          aside={state.data && <div className="charts-updated"><span>LAST CHECKED</span><strong>{formatKst(state.data.completedAt)}</strong><small>KST · 매시간 갱신</small></div>}
        />

        {state.status === 'loading' && <p className="sales-state">Steam 판매 차트를 읽는 중…</p>}
        {state.status === 'error' && <p className="sales-state is-error"><b>판매 차트를 읽지 못했다.</b><span>{state.message}</span></p>}

        {state.data && <>
          <section className="live-sales-section" aria-labelledby="live-sales-title">
            <header className="charts-section-heading">
              <div><p>TOP SELLING RIGHT NOW · BY REVENUE</p><h2 id="live-sales-title">지금 많이 팔리는 게임</h2></div>
              <SegmentControl
                className="region-switch"
                label="판매 지역"
                value={region}
                onChange={setRegion}
                options={[{ value: 'korea', label: '한국' }, { value: 'global', label: '글로벌' }]}
              />
            </header>
            <ol className="sales-rank-list">
              {liveItems.map((item) => <li key={`${region}-${item.appid}`}>
                <b className="sales-rank-no">{String(item.rank).padStart(2, '0')}</b>
                <a className="sales-rank-game" href={item.storeUrl} target="_blank" rel="noreferrer">
                  <GameArt src={displayArt(item)} folded={item.adult} width={184} height={86} /><strong>{displayName(item)}</strong>
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
                  <a href={item.storeUrl} target="_blank" rel="noreferrer"><GameArt src={displayArt(item)} folded={item.adult} width={184} height={86} /><strong>{displayName(item)}</strong></a>
                  <span className={`rank-movement is-${movement.kind}`}>{movement.label}</span>
                  <span className="rank-weeks">{item.consecutiveWeeks}주</span>
                  <div>{priceLabel(item)}</div>
                </li>;
              })}
            </ol>
          </section>

          <section className="release-calendar-section" aria-labelledby="release-calendar-title">
            <header className="charts-section-heading">
              <div><p>STEAM RELEASE CALENDAR · POPULAR SAMPLE</p><h2 id="release-calendar-title">신작 출시 캘린더</h2><span>한국 상점의 인기 신작·주요 출시 예정작 각 최대 20개</span></div>
              <a href={state.data.source.releaseCalendar[releaseTab === 'current' ? 'recent' : 'upcoming']} target="_blank" rel="noreferrer">검색 원자료 ↗</a>
            </header>
            <SegmentControl
              className="release-calendar-tabs"
              role="tablist"
              label="출시 월 선택"
              value={releaseTab}
              onChange={setReleaseTab}
              options={[
                { value: 'current', label: `${monthKeyLabel(state.data.releaseCalendar.currentMonth)} 신작`, meta: state.data.releaseCalendar.current.length },
                { value: 'upcoming', label: `${monthKeyLabel(state.data.releaseCalendar.nextMonth)} 출시 예정`, meta: state.data.releaseCalendar.upcoming.length },
              ]}
            />
            {releaseItems.length === 0 ? (
              <p className="release-calendar-empty">{monthKeyLabel(releaseMonth)}에 공개 날짜가 확인된 인기 게임이 없다.</p>
            ) : (
              <div className="release-calendar-grid" role="tabpanel">
                {releaseItems.map((item) => <article key={`${releaseTab}-${item.appid}`}>
                  <a className="release-calendar-art" href={item.storeUrl} target="_blank" rel="noreferrer">
                    <GameArt src={displayArt(item)} width={460} height={215} />
                    <b>{releaseTiming(item, releaseTab === 'upcoming')}</b>
                  </a>
                  <div>
                    <span className="release-calendar-date">{item.releaseLabel}</span>
                    <h3>{displayName(item)}</h3>
                    <p>{priceLabel(item)}</p>
                    <a href={item.storeUrl} target="_blank" rel="noreferrer">{releaseTab === 'upcoming' ? '찜 목록·상점 보기 ↗' : 'Steam에서 보기 ↗'}</a>
                  </div>
                </article>)}
              </div>
            )}
            <footer className="release-calendar-foot">Steam 인기 검색 표본 · 전체 출시작 목록이 아님 · 공개된 날짜 표현만 사용</footer>
          </section>

          <section className="monthly-releases-section" aria-labelledby="monthly-releases-title">
            <header className="charts-section-heading">
              <div><p>MONTHLY TOP RELEASES</p><h2 id="monthly-releases-title">{monthLabel(state.data.monthly.monthAt)} 인기 신작</h2><span>Steam 공개 목록 · 개별 매출 순위는 제공되지 않음</span></div>
              <a href={`https://store.steampowered.com/charts/topnewreleases/${state.data.monthly.saleName}`} target="_blank" rel="noreferrer">월간 원자료 ↗</a>
            </header>
            <div className="monthly-release-grid">
              {state.data.monthly.items.map((item) => <article key={`monthly-${item.appid}`}>
                <a href={item.storeUrl} target="_blank" rel="noreferrer"><GameArt src={displayArt(item)} width={460} height={215} /></a>
                <div><h3>{displayName(item)}</h3><p>{priceLabel(item)}</p><a href={item.storeUrl} target="_blank" rel="noreferrer">Steam에서 보기 ↗</a></div>
              </article>)}
            </div>
          </section>

          <section className="charts-quality-note">
            <div><p>DATA QUALITY</p><h2>순위가 말하지 않는 것</h2></div>
            <div className="charts-quality-copy">
              <p>현재·주간 차트는 판매 수량이 아니라 매출 순위다. Steam은 판매량과 매출액을 공개하지 않는다. 출시 캘린더는 인기 검색 결과 중 달력 범위에 맞는 최대 20개 표본이며 전체 출시작 목록이 아니다. 월간 자료는 해당 월 출시작의 인기 목록으로 항목 사이의 세부 순위는 제공되지 않는다.</p>
              <p className="source-path-note">
                <b>자료는 공식, 경로는 아니다.</b> 여기 순위는 Steam이 스스로 공개한 공식 차트다.
                다만 가져오는 방법은 문서화된 API가 아니라 차트 페이지의 서버 렌더링 응답을 읽는 것이다.
                이 둘은 다른 주장이라 갈라 적는다. 이 화면의 어떤 값도 대표값(동시접속자) 계산에
                들어가지 않는다.
              </p>
              <p className="currency-note">
                <b>가격은 Steam이 표기한 글자를 그대로 옮긴다.</b> 우리가 통화를 붙이거나 단위를
                환산하지 않는다. 차트 응답에는 통화 코드가 없고, 통화는 <b>수집기가 호출한 위치</b>가
                정한다 — 주소의 <code>cc=KR</code>은 무시된다(같은 날 KR·US·JP로 불러 같은 값을 받았다).
                그래서 이 화면의 가격을 &quot;한국 가격&quot;이라고 부르지 않는다.
                {currencyOnScreen && <> 지금 표기는 <b>{currencyOnScreen}</b>다.</>}{' '}
                순위는 한국 차트 주소에서 오므로 통화와 무관하다.
              </p>
              <p className="adult-policy-note">
                Steam이 성인 콘텐츠로 분류한 항목(content descriptor 3·4)은 제목과 표지를 접어서 보여준다.
                <b> 순위·가격·할인율은 그대로 둔다</b> — 공개된 순위를 지우지 않는다. Steam도 이 항목의 상점
                페이지를 나이 확인 뒤에 두므로, 접는 쪽이 원본의 표시 방식에 가깝다. 제목을 보려면 상점 링크로
                가면 되고 확인은 Steam이 한다.
                {adultOnScreen > 0 && <> 이 화면에서 접힌 항목은 <b>{adultOnScreen}개</b>다.</>}
              </p>
            </div>
            <div className="charts-quality-links"><a href={state.data.source.korea} target="_blank" rel="noreferrer">한국 Top Sellers ↗</a><a href={state.data.source.global} target="_blank" rel="noreferrer">Global Top Sellers ↗</a></div>
          </section>
        </>}
      </main>
    </div>
  );
}
