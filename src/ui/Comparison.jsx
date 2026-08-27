// 어제와 비교 — 카드 5. 차이·방향·단위, 그리고 손계산 식을 그대로 보여준다.

import { formatNumber, crosscheckRows, STATE } from '../view/board.js';

export default function Comparison({ board }) {
  if (!board || board.state === STATE.EMPTY) {
    return <p className="delta-none">정상값이 없어 비교하지 않는다.</p>;
  }

  const x = crosscheckRows(board.comparison);

  if (!x) {
    // 비교할 이전 기록이 없다. 변화값을 만들어내지 않는다.
    return (
      <p className="delta-none">
        비교할 이전 기록이 아직 없다. 기록이 <b>{board.dates.length}일치</b>뿐이라
        차이를 만들어내지 않는다. 내일 한 번 더 재면 이 자리에 값이 생긴다.
      </p>
    );
  }

  const sign = x.delta > 0 ? '+' : '';

  return (
    <>
      <p className={`delta is-${x.direction}`}>
        <span>{x.arrow}</span>
        <span>{sign}{formatNumber(x.delta)} {x.unit}</span>
        {x.percent !== null && <small>{sign}{x.percent.toFixed(2)}%</small>}
      </p>

      <table className="records">
        <thead>
          <tr><th>날짜</th><th>저장값</th></tr>
        </thead>
        <tbody>
          <tr>
            <td className="muted">{x.previous.date}</td>
            <td>{formatNumber(x.previous.value)}</td>
          </tr>
          <tr>
            <td className="muted">{x.current.date}</td>
            <td>{formatNumber(x.current.value)}</td>
          </tr>
        </tbody>
      </table>

      <p className="hand">
        손계산 <b>{x.hand}</b> {x.unit}
      </p>
    </>
  );
}
