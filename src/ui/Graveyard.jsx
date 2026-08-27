// 💀 아직 살아 있는가 — 오래된 게임의 오늘 사람 수.
// 이전 기록이 필요 없어 첫날부터 보인다.

import { formatNumber } from '../view/board.js';
import { aliveLabel, ageOf, ALIVE_RULE } from '../view/panels.js';

export default function Graveyard({ rows, date }) {
  if (!rows) {
    return <p className="empty-note">오늘 잰 오래된 게임 기록이 없다.</p>;
  }

  return (
    <>
      <table className="records">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="source-url">
        <b>오른쪽 말은 원자료가 아니라 우리가 붙인 분류다.</b> 기준은 이것뿐이고
        손으로 확인할 수 있다 —{' '}
        {ALIVE_RULE.map((r) => `${formatNumber(r.min)}명 이상 → ${r.label}`).join(' · ')}.
      </p>
    </>
  );
}
