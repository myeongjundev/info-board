// 화면 조립. 계산은 하지 않는다 — 전부 src/view/board.js 에서 온다.

import { useCallback, useEffect, useState } from 'react';

import { SOURCE, todayLocal } from '../source/definition.js';
import {
  loadRecordsFile, faultFromSearch, FAULT_BY_PARAM, FAULT_COPY, FetchFault,
} from '../source/loadRecordsFile.js';
import { buildBoard, formatInstant, STATE } from '../view/board.js';
import { movers, graveyard } from '../view/panels.js';

import HeroValue from './HeroValue.jsx';
import Comparison from './Comparison.jsx';
import RecordList from './RecordList.jsx';
import FaultPanel from './FaultPanel.jsx';
import FaultSwitch from './FaultSwitch.jsx';
import Movers from './Movers.jsx';
import Graveyard from './Graveyard.jsx';

const RECORDS_URL = `${import.meta.env.BASE_URL}data/records.json`;

export default function App() {
  const [status, setStatus] = useState('loading');   // loading | ok | fault
  const [payload, setPayload] = useState(null);      // { data, quarantined }
  const [fault, setFault] = useState(null);          // FetchFault
  const [now, setNow] = useState(() => new Date());

  // 주소창의 재현 스위치. 없으면 정상 호출이다.
  const simulate = faultFromSearch(window.location.search);
  // 마지막 정상값조차 없는 상태를 보려면 ?empty=1
  const noLastGood = new URLSearchParams(window.location.search).get('empty') === '1';

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

  const today = todayLocal(now);
  const board = payload ? buildBoard({ data: payload.data, today, now }) : null;

  // 장애 중에는 마지막 정상값을 보여주되 잰 시각을 갱신하지 않는다.
  // board.reading 이 그대로 남아 있으므로 시각도 그때 것이 그대로 쓰인다.
  const showing = board && board.state !== STATE.EMPTY ? board : null;

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <h1 className="wordmark">GAME PULSE</h1>
          <p>오늘 Steam 에 몇 명이 있는가</p>
        </div>
        <StateBadge status={status} board={board} />
      </header>

      {simulate && (
        <p className="sim-banner" role="status">
          재현 모드 — 실제 자료를 부르지 않고 <b>{simulate}</b> 상태를 만들어 보이는 중이다.
          주소에서 <code>?fault=</code> 를 빼면 정상으로 돌아온다.
        </p>
      )}

      <div className="columns">
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
      </div>

      <section className="panel faults" aria-label="장애 재현">
        <h2 className="panel-title">장애 재현 — 카드 3</h2>
        <FaultSwitch active={simulate} names={Object.keys(FAULT_BY_PARAM)} />
      </section>

      {/* 3층 — 같은 기록에서 꺼낸 이야기들. API 를 더 붙이지 않았다. */}
      {showing && (
        <div className="columns">
          <section className="panel" aria-label="오른 게임과 내린 게임">
            <h2 className="panel-title">어제보다 움직인 게임</h2>
            <Movers
              data={movers(payload.data.records, payload.data.games ?? [], showing.reading.date)}
              dates={showing.dates}
            />
          </section>

          <section className="panel" aria-label="오래된 게임">
            <h2 className="panel-title">아직 살아 있는가</h2>
            <Graveyard
              rows={graveyard(payload.data.records, payload.data.games ?? [], showing.reading.date)}
              date={showing.reading.date}
            />
          </section>
        </div>
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
