import { useMemo, useState } from 'react';

import normalD1A from '../../assets/t04-real-information-board-public-v1/fixtures/normal-d1-a.json';
import normalD1B from '../../assets/t04-real-information-board-public-v1/fixtures/normal-d1-b.json';
import normalD2 from '../../assets/t04-real-information-board-public-v1/fixtures/normal-d2.json';
import timeout from '../../assets/t04-real-information-board-public-v1/fixtures/timeout.json';
import auth from '../../assets/t04-real-information-board-public-v1/fixtures/auth-401.json';
import rateLimit from '../../assets/t04-real-information-board-public-v1/fixtures/rate-429.json';
import offline from '../../assets/t04-real-information-board-public-v1/fixtures/offline.json';
import schemaBreak from '../../assets/t04-real-information-board-public-v1/fixtures/schema-break.json';
import recoverD2 from '../../assets/t04-real-information-board-public-v1/fixtures/recover-d2.json';
import { formatInstant } from '../view/board.js';
import { resetReplayState, runFixture } from '../state/fixtureReplay.js';

const FIXTURES = {
  normal: normalD2,
  timeout,
  auth,
  'rate-limit': rateLimit,
  offline,
  schema: schemaBreak,
};

function initialState(mode) {
  let state = resetReplayState();
  state = runFixture(state, normalD1A);
  state = runFixture(state, normalD1B);
  return runFixture(state, FIXTURES[mode] ?? timeout);
}

export default function ReplayPage({ mode }) {
  const start = useMemo(() => initialState(mode), [mode]);
  const [state, setState] = useState(start);
  const reading = state.lastGood;
  const failed = state.freshness === 'stale';

  return (
    <div className="page replay-page">
      <header className="replay-header">
        <p>PUBLIC FIXTURE REPLAY · SYNTHETIC ONLY</p>
        <h1>T04 결정론 재생</h1>
        <span>실제 records.json과 외부 API를 사용하거나 변경하지 않는다.</span>
      </header>

      <main>
        <section className="replay-status" aria-labelledby="replay-status-title">
          <div>
            <p>READING STATUS</p>
            <h2 id="replay-status-title">{state.freshness} / {state.errorCode}</h2>
            <span>{state.fixtureId}</span>
          </div>
          <dl>
            <div><dt>마지막 정상값</dt><dd>{reading ? `${reading.value} ${reading.unit}` : '—'}</dd></div>
            <div><dt>일별 행</dt><dd>{state.records.length}건</dd></div>
            <div><dt>변화</dt><dd>{state.delta === null ? '—' : `${state.delta > 0 ? '+' : ''}${state.delta} ${reading.unit}`}</dd></div>
          </dl>
          {failed && (
            <button type="button" className="retry" onClick={() => setState((current) => runFixture(current, recoverD2))}>
              다시 시도 · T04-RECOVER-D2
            </button>
          )}
        </section>

        {reading && (
          <section className="replay-reading" aria-label="정규화된 마지막 정상값">
            <h2>정규화 Reading</h2>
            <dl>
              <div><dt>값·단위</dt><dd>{reading.value} {reading.unit}</dd></div>
              <div>
                <dt>출처</dt>
                <dd>
                  {reading.sourceLabel}<br />
                  <span className="fixture-source-id">{reading.sourceUrl}</span><br />
                  <small>합성 식별 주소 · 열리지 않음</small>
                </dd>
              </div>
              <div><dt>출처 관측 시각</dt><dd>{reading.sourceTime ? formatInstant(reading.sourceTime, reading.timezone) : '제공되지 않음 · fixture source_time=null'}</dd></div>
              <div><dt>조회 시각</dt><dd>{formatInstant(reading.fetchedAt, reading.timezone)}</dd></div>
              <div><dt>기준 시간대</dt><dd>{reading.timezone}</dd></div>
            </dl>
          </section>
        )}

        <section className="replay-rows" aria-labelledby="replay-rows-title">
          <h2 id="replay-rows-title">합성 일별 저장</h2>
          <table><thead><tr><th>record ID</th><th>날짜</th><th>값</th></tr></thead>
            <tbody>{state.records.map((row) => <tr key={row.recordId}><td>{row.recordId}</td><td>{row.date}</td><td>{row.value} {row.unit}</td></tr>)}</tbody>
          </table>
        </section>

        <nav className="replay-nav" aria-label="fixture 선택">
          {Object.keys(FIXTURES).map((name) => <a key={name} href={`?replay=${name}`}>{name}</a>)}
          <a href="?">실제 화면으로</a>
        </nav>
      </main>
    </div>
  );
}
