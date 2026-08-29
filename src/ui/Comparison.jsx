// 어제와 비교 — 카드 5. 차이·방향·단위, 그리고 손계산 식을 그대로 보여준다.

import { formatNumber, crosscheckRows, timeOfDayDrift, STATE } from '../view/board.js';
import { SOURCE } from '../source/definition.js';

export default function Comparison({ board, compact = false }) {
  if (!board || board.state === STATE.EMPTY) {
    return <p className="delta-none">정상값이 없어 비교하지 않는다.</p>;
  }

  const x = crosscheckRows(board.comparison);

  if (!x) {
    // 비교할 이전 기록이 없다. 변화값을 만들어내지 않는다.
    if (compact) {
      return (
        <div className="kpi-no-comparison">
          <strong>비교 준비 중</strong>
          <span>{board.dates.length}일치 기록 · 다음 측정 후 활성화</span>
        </div>
      );
    }
    return (
      <p className="delta-none">
        비교할 이전 기록이 아직 없다. 기록이 <b>{board.dates.length}일치</b>뿐이라
        차이를 만들어내지 않는다. 내일 한 번 더 재면 이 자리에 값이 생긴다.
      </p>
    );
  }

  const sign = x.delta > 0 ? '+' : '';
  // 두 값을 하루 중 어느 시각에 쟀는가. 날짜만 적으면 "어제 대비" 가 시각 차이를
  // 감춘다 — 순간값끼리 견주는 이상 시각은 값만큼 중요하다.
  const drift = timeOfDayDrift(x.previous.fetchedAt, x.current.fetchedAt, SOURCE.timezone);

  if (compact) {
    return (
      <>
        <p className={`delta is-${x.direction}`}>
          <span>{x.arrow}</span>
          <span className="delta-value">{sign}{formatNumber(x.delta)} {x.unit}</span>
          {x.percent !== null && <small>{sign}{x.percent.toFixed(2)}%</small>}
        </p>
        <p className="kpi-meta">
          기준 {x.previous.date}
          {drift && ` · ${drift.previousClock} → ${drift.currentClock}`}
        </p>
        {drift && !drift.aligned && (
          <p className="kpi-meta is-warn">잰 시각이 {drift.minutes}분 다르다</p>
        )}
      </>
    );
  }

  return (
    <>
      <p className={`delta is-${x.direction}`}>
        <span>{x.arrow}</span>
        <span className="delta-value">{sign}{formatNumber(x.delta)} {x.unit}</span>
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

      {/* 날짜 사이의 시각 차이는 여기 적지 않는다. 이 갈래(compact 아님)는 지금
          아무 데서도 안 그려지므로, 그렸다고 믿을 수 없는 자리에 문장을 두지 않는다.
          같은 사실을 대조 패널(DataProof)이 실제로 그리는 자리에서 말한다. */}

      {/* 요일 차이가 커서 전일 대비만 보면 노이즈를 정보인 척하게 된다.
          7일이 안 차면 movingAverage 가 null 을 줘서 이 줄이 아예 안 나온다. */}
      {board.average && (
        <p className="hand">
          {board.average.window}일 평균{' '}
          <b>{formatNumber(Math.round(board.average.value))}</b> {x.unit}
          <span className="muted">
            {' '}· {board.average.from} ~ {board.average.to}
          </span>
        </p>
      )}
    </>
  );
}
