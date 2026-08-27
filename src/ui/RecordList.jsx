// 날짜별 기록 — 카드 4. 같은 날짜가 중복되지 않는다는 것이 여기서 보여야 한다.

import { formatNumber, rowsForDate, STATE } from '../view/board.js';

export default function RecordList({ board, data }) {
  if (!board || board.state === STATE.EMPTY || !data) {
    return <p className="empty-note">아직 쌓인 기록이 없다.</p>;
  }

  const heroAppid = data.source?.heroAppid;
  const dates = [...board.dates].reverse();

  return (
    <>
      <table className="records">
        <thead>
          <tr>
            <th>날짜 ({data.source?.timezone})</th>
            <th>게임 수</th>
            <th>대표값</th>
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => {
            const rows = rowsForDate(data.records, data.games ?? [], date);
            const hero = rows.find((r) => r.appid === heroAppid);
            return (
              <tr key={date}>
                <td className="muted">{date}</td>
                <td className="muted">{rows.length}</td>
                <td>{hero ? formatNumber(hero.value) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="source-url">
        날짜마다 한 건씩만 쌓인다. 같은 날 다시 재도 첫 값을 지킨다.
      </p>
    </>
  );
}
