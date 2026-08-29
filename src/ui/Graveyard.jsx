// 💀 아직 살아 있는가 — 오래된 게임의 오늘 사람 수.
// 이전 기록이 필요 없어 첫날부터 보인다.

import { formatNumber, formatInstant } from '../view/board.js';
import { aliveLabel, ageOf, ALIVE_RULE } from '../view/panels.js';
import { SOURCE } from '../source/definition.js';
import SpreadNote from './SpreadNote.jsx';

export default function Graveyard({ rows, date, spread = null }) {
  if (!rows) {
    return <p className="empty-note">오늘 잰 오래된 게임 기록이 없다.</p>;
  }

  return (
    <>
      <SpreadNote spread={spread} subject="이 표의 값은" />

      <table className="records longevity-table">
        <thead>
          <tr>
            <th>게임</th>
            <th>나이</th>
            <th>지금</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const age = ageOf(r.year, date);
            return (
              <tr key={r.appid}>
                <td>
                  {r.name}
                  <span className="muted"> {r.year}</span>
                </td>
                <td className="muted">{age === null ? '—' : `${age}년째`}</td>
                <td>
                  {formatNumber(r.value)}
                  <span className="alive">{aliveLabel(r.value) ?? '—'}</span>
                  {r.offBatch && (
                    <span className="rank-when" title="대표값과 다른 시각에 잰 값이다">
                      {formatInstant(r.fetchedAt, SOURCE.timezone).slice(11)} 측정
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <details className="method-note">
        <summary>생존 상태는 자체 기준</summary>
        <p>
          오른쪽 상태 문구는 원자료가 아니라 우리가 붙인 분류다. 기준은{' '}
          {ALIVE_RULE.map((r) => `${formatNumber(r.min)}명 이상 → ${r.label}`).join(' · ')}이다.
        </p>
      </details>
    </>
  );
}
