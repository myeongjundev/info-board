// 💀 아직 살아 있는가 — 오래된 게임의 오늘 사람 수.
// 이전 기록이 필요 없어 첫날부터 보인다.

import { formatNumber, formatInstant } from '../view/board.js';
import { aliveLabel, ageOf, ageSpan, ALIVE_RULE } from '../view/panels.js';
import { SOURCE } from '../source/definition.js';
import SpreadNote from './SpreadNote.jsx';

export default function Graveyard({ rows, date, spread = null }) {
  if (!rows) {
    return <p className="empty-note">오늘 잰 오래된 게임 기록이 없다.</p>;
  }

  // 이 목록이 실제로 몇 년째부터 몇 년째까지인가. 셈은 view 에 있다.
  const span = ageSpan(rows, date);

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
        <summary>목록도 생존 상태도 자체 기준</summary>
        {/* 나이 규칙으로 고른 목록이 아니다. 개발이 멈춘 게임은 9년째여도 여기 있고,
            지금도 현역인 게임은 14년째여도 없다. 규칙을 적으면 그게 거짓말이 되므로
            실제 범위를 세서 적는다. */}
        <p>
          <b>이 목록은 나이로 고른 것이 아니라 우리가 오래됐다고 분류한 것이다.</b>{' '}
          {span && `지금 ${span.count}개가 들어 있고 ${span.min}년째부터 ${span.max}년째까지다.`}{' '}
          나온 지 오래됐어도 지금 현역인 게임은 여기 넣지 않았다.
        </p>
        <p>
          오른쪽 상태 문구는 원자료가 아니라 우리가 붙인 분류다. 기준은{' '}
          {ALIVE_RULE.map((r) => `${formatNumber(r.min)}명 이상 → ${r.label}`).join(' · ')}이다.
        </p>
      </details>
    </>
  );
}
