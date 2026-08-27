// 화면 조립. 계산은 하지 않는다 — 전부 src/view/board.js 에서 온다.

import { useCallback, useEffect, useState } from 'react';

import { SOURCE, todayLocal } from '../source/definition.js';
import {
  loadRecordsFile, faultFromSearch, FAULT_BY_PARAM, FAULT_COPY, FetchFault,
} from '../source/loadRecordsFile.js';
import { buildBoard, formatInstant, STATE } from '../view/board.js';
import { movers, graveyard, leaderboard, dayStrip } from '../view/panels.js';

import HeroValue from './HeroValue.jsx';
import Comparison from './Comparison.jsx';
import RecordList from './RecordList.jsx';
import FaultPanel from './FaultPanel.jsx';
import FaultSwitch from './FaultSwitch.jsx';
import Movers from './Movers.jsx';
import Graveyard from './Graveyard.jsx';
import Leaderboard from './Leaderboard.jsx';
import TopBar from './TopBar.jsx';
import SectionNav from './SectionNav.jsx';
import SettingsModal from './SettingsModal.jsx';
import DayStrip from './DayStrip.jsx';
import SymbolRail from './SymbolRail.jsx';

const RECORDS_URL = `${import.meta.env.BASE_URL}data/records.json`;

// 구획 나브에 들어가는 줄. 참고한 화면과 달리 **누르면 갈아끼우지 않고 내려간다.**
// 브리프가 카드 1·5 의 통과 기준을 `한 화면에 보인다` 로 못박아서, 탭 뒤로 숨기면
// 그 순간 조건이 깨진다. 여기 있는 id 는 전부 같은 페이지에 실제로 있어야 한다.
const NAV = [
  { id: 'sec-now', label: '현재' },
  { id: 'sec-days', label: '잰 날' },
  { id: 'sec-fault', label: '장애' },
  { id: 'sec-rank', label: '순위' },
  { id: 'sec-move', label: '움직임' },
  { id: 'sec-old', label: '오래된 게임' },
];

export default function App() {
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

  const games = payload?.data?.games ?? [];
  // 화면이 크게 띄운 게임과 목록에서 강조되는 게임은 같아야 한다.
  const selectedAppid = board?.selectedAppid ?? payload?.data?.source?.heroAppid;

  return (
    <div className="page">
      <TopBar
        games={games}
        selectedAppid={selectedAppid}
        onPick={pickGame}
        onOpenSettings={() => setSettingsOpen(true)}
        badge={<StateBadge status={status} board={board} />}
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

      {simulate && (
        <p className="sim-banner" role="status">
          재현 모드 — 실제 자료를 부르지 않고 <b>{simulate}</b> 상태를 만들어 보이는 중이다.
          주소에서 <code>?fault=</code> 를 빼면 정상으로 돌아온다.
        </p>
      )}

      <main className="columns" id="sec-now">
        <div>
          <section className="panel" aria-label="현재값">
            {status === 'loading' && !showing ? (
              <div className="skeleton" />
            ) : status === 'fault' && !showing ? (
              <FaultPanel fault={fault} onRetry={load} busy={status === 'loading'} />
            ) : (
              <HeroValue board={showing} status={status} fault={fault} onRetry={load} />
            )}
          </section>

          <section className="panel" aria-label="이전 기록 대비 변화">
            <h2 className="panel-title">어제와 비교</h2>
            <Comparison board={showing} />
          </section>
        </div>

        <div>
          <section className="panel" aria-label="출처">
            <h2 className="panel-title">출처</h2>
            <SourceBlock reading={showing?.reading} />
          </section>

          <section className="panel" aria-label="날짜별 기록">
            <h2 className="panel-title">날짜별 기록</h2>
            <RecordList board={showing} data={payload?.data} />
          </section>
        </div>
      </main>

      {showing && (
        <section className="panel" id="sec-days" aria-label="날짜 카드">
          <h2 className="panel-title">
            잰 날 — {showing.game?.name ?? '대표값'}
          </h2>
          <DayStrip
            strip={dayStrip(payload.data.records, showing.selectedAppid, today)}
            unit={showing.reading.unit}
          />
        </section>
      )}

      <section className="panel faults" id="sec-fault" aria-label="장애 재현">
        <h2 className="panel-title">장애 재현 — 카드 3</h2>
        <FaultSwitch active={simulate} names={Object.keys(FAULT_BY_PARAM)} />
      </section>

      {/* 3층 — 같은 기록에서 꺼낸 이야기들. API 를 더 붙이지 않았다. */}
      {showing && (
        <>
          <TierRule label="같은 기록에서 꺼낸 이야기" note="API 를 더 붙이지 않았다. 아래 셋은 전부 위와 같은 파일에서 나온다." />

          <div className="columns">
            <section className="panel" id="sec-rank" aria-label="오늘 잰 게임 순위">
              {/* 제목에 개수를 적지 않는다. games.length 는 '부른 개수' 이지
                  '잰 개수' 가 아니라, 일부가 실패하면 제목 16 · 목록 14 가 된다.
                  실제로 센 수는 Leaderboard 가 자기 자료에서 적는다. */}
              <h2 className="panel-title">오늘 잰 것 — 사람 수 순</h2>
              <Leaderboard
                data={leaderboard(payload.data.records, payload.data.games ?? [], showing.reading.date)}
                heroAppid={selectedAppid}
              />
            </section>

            <div>
              <section className="panel" id="sec-move" aria-label="오른 게임과 내린 게임">
                <h2 className="panel-title">어제보다 움직인 게임</h2>
                <Movers
                  data={movers(payload.data.records, payload.data.games ?? [], showing.reading.date)}
                  dates={showing.dates}
                />
              </section>

              <section className="panel" id="sec-old" aria-label="오래된 게임">
                <h2 className="panel-title">아직 살아 있는가</h2>
                <Graveyard
                  rows={graveyard(payload.data.records, payload.data.games ?? [], showing.reading.date)}
                  date={showing.reading.date}
                />
              </section>
            </div>
          </div>
        </>
      )}

      <footer className="foot">
        <div>
          기준 시간대 {SOURCE.timezone} · 매일 {SOURCE.measuredAtLocal} 측정 ·
          단위 {SOURCE.unit}
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
      <a className="source-link" href={reading.sourceUrl} target="_blank" rel="noreferrer">
        {reading.sourceLabel} ↗
      </a>
      <p className="source-url">{reading.sourceUrl}</p>
      <p className="caveat">
        <b>이 링크는 지금 값을 연다.</b> 동시접속자는 부르는 순간의 사람 수라,
        위 숫자와 링크 속 숫자는 <b>일치하지 않는다.</b> 위 숫자는{' '}
        {formatInstant(reading.fetchedAt, SOURCE.timezone)} 에 잰 값이다.
      </p>
    </>
  );
}
