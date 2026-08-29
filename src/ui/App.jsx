// 화면 조립. 계산은 하지 않는다 — 전부 src/view/board.js 에서 온다.

import { useCallback, useEffect, useState } from 'react';

import { SOURCE, GAMES, todayLocal } from '../source/definition.js';
import {
  loadRecordsFile, faultFromSearch, FAULT_BY_PARAM, FAULT_COPY, FetchFault,
} from '../source/loadRecordsFile.js';
import { buildBoard, formatInstant, STATE } from '../view/board.js';
import {
  movers, graveyard, leaderboard, dayStrip, byGenre, withGenres, timeBias, rankMovement,
} from '../view/panels.js';

import RecordList from './RecordList.jsx';
import FaultSwitch from './FaultSwitch.jsx';
import Movers from './Movers.jsx';
import Graveyard from './Graveyard.jsx';
import Leaderboard from './Leaderboard.jsx';
import TopBar from './TopBar.jsx';
import SectionNav from './SectionNav.jsx';
import SettingsModal from './SettingsModal.jsx';
import DayStrip from './DayStrip.jsx';
import SymbolRail from './SymbolRail.jsx';
import Genres from './Genres.jsx';
import TimeBias from './TimeBias.jsx';
import RankMovement from './RankMovement.jsx';
import DataProof from './DataProof.jsx';
import StorePriceModal from './StorePriceModal.jsx';
import ReplayPage from './ReplayPage.jsx';
import OverviewStrip from './OverviewStrip.jsx';
import GameFocusPanel from './GameFocusPanel.jsx';
import MeasurementStatus from './MeasurementStatus.jsx';

const RECORDS_URL = `${import.meta.env.BASE_URL}data/records.json`;
// 하루 중 다른 시각 표본. 날짜별 기록과 별개 파일이고, 못 읽어도 화면은 멀쩡하다.
const PROBE_URL = `${import.meta.env.BASE_URL}data/timeprobe.json`;

// 구획 나브에 들어가는 줄. 참고한 화면과 달리 **누르면 갈아끼우지 않고 내려간다.**
// 브리프가 카드 1·5 의 통과 기준을 `한 화면에 보인다` 로 못박아서, 탭 뒤로 숨기면
// 그 순간 조건이 깨진다. 여기 있는 id 는 전부 같은 페이지에 실제로 있어야 한다.
const NAV = [
  { id: 'sec-now', label: '현재', icon: 'now' },
  { id: 'sec-proof', label: '데이터 품질', icon: 'proof' },
  { id: 'sec-when', label: '시각·장르', icon: 'time' },
  { id: 'sec-rank', label: '순위·변화', icon: 'trend' },
  { id: 'sec-old', label: '오래된 게임', icon: 'archive' },
];

export default function App() {
  const replay = new URLSearchParams(window.location.search).get('replay');
  return replay ? <ReplayPage mode={replay} /> : <LiveApp />;
}

function LiveApp() {
  const [status, setStatus] = useState('loading');   // loading | ok | fault
  const [payload, setPayload] = useState(null);      // { data, quarantined }
  const [fault, setFault] = useState(null);          // FetchFault
  const [now, setNow] = useState(() => new Date());

  // 주소창의 재현 스위치. 없으면 정상 호출이다.
  const simulate = faultFromSearch(window.location.search);
  // 마지막 정상값조차 없는 상태를 보려면 ?empty=1
  const noLastGood = new URLSearchParams(window.location.search).get('empty') === '1';

  // 대표값 자리에 놓을 게임. 주소에 남겨 둔다 — ?fault= 와 같은 방식이고,
  // 그래야 "내가 본 화면" 을 링크로 그대로 넘길 수 있다.
  const [picked, setPicked] = useState(() => {
    const raw = new URLSearchParams(window.location.search).get('game');
    const n = Number(raw);
    return raw !== null && Number.isInteger(n) ? n : null;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [priceAppid, setPriceAppid] = useState(null);

  // 다른 시각 표본. **보조 자료라 실패해도 화면이 멀쩡해야 한다.**
  // 이 파일이 없어도 값·단위·날짜·비교는 하나도 안 바뀐다 — 못 읽으면 그 패널만
  // 안 나온다. 그래서 본문 로딩과 상태를 섞지 않는다.
  const [probe, setProbe] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(PROBE_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (alive) setProbe(json); })
      .catch(() => { if (alive) setProbe(null); });
    return () => { alive = false; };
  }, []);

  const pickGame = useCallback((appid) => {
    setPicked(appid);
    setSettingsOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('game', String(appid));
    window.history.replaceState(null, '', url);
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    setFault(null);

    // 재현 모드에서도 마지막 정상값은 실제 파일에서 가져온다. 그래야 카드 3 이
    // 요구하는 "마지막 정상값 + 오래된 데이터 표시" 가 실제로 보인다.
    // 값을 지어내지 않는다 — 파일이 없으면 없는 대로 빈 상태가 된다.
    // ?empty=1 을 붙이면 이 단계를 건너뛰어 "정상값이 한 번도 없는" 화면을 본다.
    if (simulate && !noLastGood) {
      try {
        setPayload(await loadRecordsFile({ url: RECORDS_URL }));
      } catch {
        setPayload(null);
      }
    } else if (simulate && noLastGood) {
      setPayload(null);
    }

    try {
      const result = await loadRecordsFile({ url: RECORDS_URL, simulate });
      // 성공했을 때만 마지막 정상값을 갈아 끼운다.
      setPayload(result);
      setNow(new Date());
      setStatus('ok');
    } catch (err) {
      if (!(err instanceof FetchFault)) throw err;
      // 실패해도 payload 를 지우지 않는다. 마지막 정상값은 지킨다.
      setFault(err);
      setStatus('fault');
    }
  }, [simulate, noLastGood]);

  useEffect(() => { load(); }, [load]);

  // 시계를 계속 돌린다.
  //
  // now 를 로드 성공 때만 갱신하면, 페이지를 열어 둔 채로 두었을 때 "34분 전" 이
  // 영원히 34분 전으로 남는다. 자정을 넘겨도 `오늘 잰 값` 배지가 그대로 붙어 있다.
  // 값은 안 건드렸는데 시각에 대해 거짓말을 하는 셈이고, 이 정보판이 잡으려는
  // 거짓말과 정확히 같은 종류다. 30초마다 다시 센다 — 자료를 다시 부르지는 않는다.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const today = todayLocal(now);
  const board = payload ? buildBoard({ data: payload.data, today, now, appid: picked }) : null;

  // 장애 중에는 마지막 정상값을 보여주되 잰 시각을 갱신하지 않는다.
  // board.reading 이 그대로 남아 있으므로 시각도 그때 것이 그대로 쓰인다.
  const showing = board && board.state !== STATE.EMPTY ? board : null;

  // 장르·tier 는 잰 것이 아니라 우리가 붙인 이름이라 코드 표가 최신이다.
  // 값과 이어지는 이름·연도는 기록 파일 것을 그대로 쓴다.
  const games = withGenres(payload?.data?.games, GAMES);
  // 화면이 크게 띄운 게임과 목록에서 강조되는 게임은 같아야 한다.
  const selectedAppid = board?.selectedAppid ?? payload?.data?.source?.heroAppid;
  // 배치 기준은 대표 게임을 잰 시각이다. movers 와 같은 기준을 써야 한 화면 안에서
  // "대표 배치" 가 패널마다 다른 것을 가리키지 않는다.
  const anchorAppid = payload?.data?.source?.heroAppid;
  const ranking = showing
    ? leaderboard(payload.data.records, games, showing.reading.date, { anchorAppid })
    : null;
  // 운영 상태의 분모는 기록 파일에 이미 들어온 게임이 아니라 코드에 확정한 수집 대상이다.
  // 첫날 파일은 16개뿐이지만 다음 정규 측정 대상은 100개이므로 16/16 이라고 쓰면
  // 준비가 끝난 것처럼 보인다.
  const coverage = showing
    ? leaderboard(payload.data.records, GAMES, showing.reading.date, { anchorAppid })
    : null;
  // 시각 편향 표본은 최신 일일 Reading이 아니라 표본 자신과 같은 KST 날짜의
  // 대표 배치와 견준다. 날짜가 지난 뒤에도 역사적 실측 근거가 거짓 비교로 바뀌지 않는다.
  const probeDate = probe?.samples?.at(-1)?.at
    ? todayLocal(new Date(probe.samples.at(-1).at))
    : showing?.reading.date;

  return (
    <div className="page">
      <TopBar
        games={games}
        selectedAppid={selectedAppid}
        onPick={pickGame}
        onOpenSettings={() => setSettingsOpen(true)}
        badge={<StateBadge status={status} board={board} />}
        scheduledAt={payload?.data?.source?.measuredAtLocal ?? SOURCE.measuredAtLocal}
        reading={showing?.reading}
      />

      <SectionNav items={NAV} />

      <SymbolRail onRefresh={load} busy={status === 'loading'} />

      {settingsOpen && (
        <SettingsModal
          games={games}
          selectedAppid={selectedAppid}
          defaultAppid={payload?.data?.source?.heroAppid}
          source={payload?.data?.source}
          onPick={pickGame}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {priceAppid !== null && (
        <StorePriceModal
          game={games.find((game) => game.appid === priceAppid)}
          onClose={() => setPriceAppid(null)}
        />
      )}

      {simulate && (
        <p className="sim-banner" role="status">
          저장 파일 장애 시연 — 실제 마지막 정상값 위에 <b>{simulate}</b> 읽기 실패를 모의하는 중이다.
          T04 공개 fixture 판정은 아래의 별도 재생 화면을 사용한다.
          주소에서 <code>?fault=</code> 를 빼면 정상으로 돌아온다.
        </p>
      )}

      <main id="sec-now">
        <OverviewStrip board={showing} faulted={status === 'fault'} loading={status === 'loading' && !showing} />

        <GameFocusPanel
          board={showing}
          status={status}
          fault={fault}
          onRetry={load}
          coverage={coverage}
          totalGames={GAMES.length}
          statusBadge={<StateBadge status={status} board={board} />}
          onShowPrice={() => showing && setPriceAppid(showing.reading.appid)}
        />

        <section className="history-block" aria-labelledby="history-title">
          <header className="section-heading">
            <p>MEASUREMENT HISTORY</p>
            <h2 id="history-title">측정 이력</h2>
          </header>
          <div className="history-grid">
            <section className="panel" aria-label="날짜별 기록">
              <h3 className="panel-title">날짜별 기록</h3>
              <RecordList board={showing} data={payload?.data} />
            </section>

            {showing && (
              <section className="panel" id="sec-days" aria-label="날짜 카드">
                <h3 className="panel-title">{showing.game?.name ?? '대표값'} 추이</h3>
                <DayStrip
                  strip={dayStrip(payload.data.records, showing.selectedAppid, today)}
                  unit={showing.reading.unit}
                />
              </section>
            )}
          </div>
        </section>

      {/* 2층 — 근거. 심사자가 화면에서 바로 검산하는 자리다. */}
      <section className="quality-section" id="sec-proof" aria-labelledby="quality-title">
        <header className="quality-heading">
          <div>
            <p>DATA QUALITY</p>
            <h2 id="quality-title">데이터 품질</h2>
          </div>
          <span>출처부터 장애 상태까지 한곳에서 검증</span>
        </header>

        <MeasurementStatus
          coverage={coverage}
          totalGames={GAMES.length}
          loading={status === 'loading' && !showing}
          fetchedAt={showing?.reading?.fetchedAt}
        />

        <div className="quality-grid">
          <section className="quality-item" aria-label="출처">
            <h3>01 · 출처</h3>
            <SourceBlock reading={showing?.reading} />
          </section>

          <section className="quality-item" aria-label="원자료 대조">
            <h3>02 · 검증 경로</h3>
            <DataProof board={showing} />
          </section>

          <section className="quality-item faults" id="sec-fault" aria-label="장애 재현">
            <h3>03 · 제품 장애 시연과 T04 fixture 재생</h3>
            <FaultSwitch active={simulate} names={Object.keys(FAULT_BY_PARAM)} />
          </section>
        </div>
      </section>

      {/* 3층 — 같은 기록에서 꺼낸 이야기들. API 를 더 붙이지 않았다. */}
      {showing && (
        <>
          <TierRule label="데이터 인사이트" note="추가 API 없이 동일한 측정 기록에서 계산한 분석이다." />

          {/* 재현 모드에서는 안 보인다. 장애를 흉내내는 화면에 멀쩡히 받아온
              보조 자료가 섞이면 무엇이 실패한 것인지 헷갈린다. */}
          {!simulate && (
            <section className="panel insight-panel" id="sec-when" aria-label="시각에 따른 차이">
              <PanelHeading
                eyebrow="TIME BIAS"
                title="시간대에 따른 편향"
                note="같은 날 다른 시각의 실제 측정값 비교"
              />
              <TimeBias data={timeBias(payload.data.records, probe, games, probeDate, {
                anchorAppid: payload.data.source.heroAppid,
              })} />
            </section>
          )}

          <section className="panel insight-panel" id="sec-genre" aria-label="장르로 묶어 보기">
            <PanelHeading
              eyebrow="DISTRIBUTION"
              title="장르별 구성"
              note="측정 대상 안에서 장르별 규모를 비교"
            />
            <Genres
              data={byGenre(payload.data.records, games, showing.reading.date, { anchorAppid })}
              games={games}
              onPickGame={pickGame}
            />
          </section>

          {/* 질문 하나에 한 띠.
              ① 오늘 누가 위인가  ② 어제와 견주면 무엇이 달라졌나  ③ 오래 살아남은 것은

              전에는 `순위`와 `이전 대비 변화 + 장기 생존`을 두 기둥으로 세웠다.
              두 가지가 어긋나 있었다.

              1. **빈칸.** 왼쪽 831px, 오른쪽 1,650px 이라 왼쪽 아래가 819px 비었다.
              2. **같은 질문이 갈라져 있었다.** `접속자가 얼마나 변했나`와 `순위가
                 얼마나 움직였나`는 같은 물음에 단위만 다른 답인데, 사이에 성격이
                 다른 `장기 생존`이 끼어 있고 순위 이동은 아예 다른 띠에 있었다.

              높이로 짝을 맞추지 않은 이유. 오늘 장기 생존이 1,262px 인 것은 오래된
              게임을 그만큼 재고 있어서고, 목록이 늘면 또 달라진다. **오늘 화면에
              맞춰 기둥을 짜면 자료가 늘 때마다 같은 자리가 다시 어긋난다.** */}
          <section className="panel insight-panel ranking-panel" id="sec-rank" aria-label="오늘 잰 게임 순위">
            {/* 제목에 개수를 적지 않는다. games.length 는 '부른 개수' 이지
                '잰 개수' 가 아니라, 일부가 실패하면 제목 16 · 목록 14 가 된다.
                실제로 센 수는 Leaderboard 가 자기 자료에서 적는다. */}
            <PanelHeading
              eyebrow="RANKING"
              title="측정 게임 순위"
              note="측정 시각의 동시접속자 기준"
            />
            <Leaderboard
              data={ranking}
              heroAppid={selectedAppid}
              onShowPrice={setPriceAppid}
            />
          </section>

          {/* 어제와 견준 둘. 같은 질문에 단위만 다르다 — 한쪽은 사람 수, 한쪽은 자리. */}
          <div className="columns columns-even">
            <section className="panel insight-panel" id="sec-move" aria-label="오른 게임과 내린 게임">
              <PanelHeading
                eyebrow="MOVEMENT"
                title="이전 측정 대비 변화"
                note="양쪽 날짜에 모두 있는 게임만 비교"
              />
              {/* 위아래 6개씩 12줄. 옆 칸의 `순위 이동`이 처음에 12줄을 보이므로
                  같은 질문에 답하는 두 칸이 같은 수를 본다. 픽셀을 채우려고 고른
                  수가 아니다 — 그렇게 고르면 자료가 바뀔 때마다 다시 골라야 한다. */}
              <Movers
                data={movers(payload.data.records, games, showing.reading.date, {
                  limit: 6,
                  anchorAppid: payload.data.source.heroAppid,
                })}
                dates={showing.dates}
              />
            </section>

            <section className="panel insight-panel" id="sec-rankmove" aria-label="순위 이동">
              <PanelHeading
                eyebrow="RANK MOVEMENT"
                title="순위 이동"
                note="비교 가능한 공통 게임만 같은 분모로 계산"
              />
              <RankMovement
                data={rankMovement(payload.data.records, games, showing.reading.date, { anchorAppid })}
                onPickGame={pickGame}
              />
            </section>
          </div>

          <section className="panel insight-panel" id="sec-old" aria-label="오래된 게임">
            <PanelHeading
              eyebrow="LONGEVITY"
              title="장기 생존 게임"
              note="우리가 오래됐다고 분류한 게임의 현재 접속자"
            />
            <Graveyard
              rows={graveyard(payload.data.records, games, showing.reading.date, { anchorAppid })}
              date={showing.reading.date}
              spread={ranking?.spread ?? null}
            />
          </section>
        </>
      )}
      </main>

      <footer className="foot">
        <div>
          기준 시간대 {SOURCE.timezone} · 매일 {SOURCE.measuredAtLocal} 수집 예정 ·
          실제 조회 시각은 각 Reading에 보존 · 단위 {SOURCE.unit}
        </div>
        <div>
          기록은 이 저장소의 <code>data/records.json</code> 에 커밋으로 쌓인다 ·{' '}
          <a href="https://github.com/myeongjundev/info-board" target="_blank" rel="noreferrer">
            저장소
          </a>
        </div>
      </footer>
    </div>
  );
}

/**
 * 층을 가르는 줄.
 *
 * 문서에는 `1층 판정 · 2층 근거 · 3층 확장` 이라고 적어 두고 화면에서는 패널
 * 여섯 개가 전부 같은 모양이었다. 구조를 적어만 두고 보여주지 않으면 스크롤한
 * 사람에게는 없는 구조다.
 */
function TierRule({ label, note }) {
  return (
    <div className="tier-rule">
      <h2>{label}</h2>
      {note && <p>{note}</p>}
    </div>
  );
}

function PanelHeading({ eyebrow, title, note }) {
  return (
    <header className="panel-heading">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {note && <span>{note}</span>}
    </header>
  );
}

function StateBadge({ status, board }) {
  if (status === 'loading' && !board) {
    return <span className="badge">읽는 중</span>;
  }
  // 정상값이 없으면 '오래된 자료' 라고 하지 않는다. 오래된 값조차 없기 때문이다.
  if (!board || board.state === STATE.EMPTY) {
    return <span className="badge is-empty">자료 없음</span>;
  }
  if (status === 'fault') {
    return <span className="badge is-stale">오래된 자료</span>;
  }
  // 기록이 방문자의 오늘보다 뒤면 밀린 것이 아니라 방문자 시계가 뒤처진 것이다.
  if (board.clockSkew) {
    return <span className="badge is-stale">이 브라우저 시계가 어긋남</span>;
  }
  if (board.state === STATE.STALE) {
    return <span className="badge is-stale">오래된 자료 · {board.staleDays}일 밀림</span>;
  }
  return <span className="badge is-fresh">오늘 잰 값</span>;
}

function SourceBlock({ reading }) {
  if (!reading) {
    return <p className="empty-note">정상값이 없어 출처를 잇지 않는다.</p>;
  }
  return (
    <>
      <span className="source-kicker">공식 원자료</span>
      <a className="source-link" href={reading.sourceUrl} target="_blank" rel="noreferrer">
        {reading.sourceLabel} ↗
      </a>
      <p className="source-url raw-url">{reading.sourceUrl}</p>
      <dl className="source-times">
        <div>
          <dt>출처 관측 시각</dt>
          <dd>{reading.sourceTime
            ? formatInstant(reading.sourceTime, reading.timezone)
            : '제공되지 않음 · Steam API 미제공'}</dd>
        </div>
        <div>
          <dt>조회 시각</dt>
          <dd>{formatInstant(reading.fetchedAt, reading.timezone)}</dd>
        </div>
      </dl>
      <p className="source-summary">
        <b>화면값은 측정 당시 값</b>
        <span>원자료 링크는 지금 값을 열어 숫자가 다를 수 있다.</span>
      </p>
      <details className="source-details">
        <summary>숫자가 다른 이유</summary>
        <p>
          동시접속자는 부르는 순간의 사람 수다. 화면 숫자는{' '}
          <b>{formatInstant(reading.fetchedAt, SOURCE.timezone)}</b>에 저장한 값이고,
          링크 속 숫자는 현재 값이라 서로 일치하지 않는다.
        </p>
      </details>
    </>
  );
}
