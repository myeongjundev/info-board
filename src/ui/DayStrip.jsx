// 날짜 카드 줄. MSN 날씨의 `26 어제 · 27 오늘 · 28 금` 가로 스트립에 대응한다.
//
// **거기와 결정적으로 다른 점 하나.** 날씨는 오른쪽을 예보로 채우지만 우리는
// 미래 칸을 만들지 않는다. 동시접속자는 부르는 순간의 값이라 예보가 없다.
// 빈 칸을 그려 두면 "곧 채워질 값" 이 아니라 "아는 척하는 값" 이 된다.
//
// 계산은 전부 view/panels.js 의 dayStrip() 이 한다. 여기는 그리기만 한다.

import { formatNumber } from '../view/board.js';

export default function DayStrip({ strip, unit }) {
  if (!strip) {
    return <p className="empty-note">이 게임의 기록이 아직 없다.</p>;
  }

  const only = strip.cards.length === 1;

  return (
    <>
      <ol className="daystrip">
        {strip.cards.map((c) => (
          <li key={c.date} className={c.isToday ? 'is-today' : undefined}>
            {/* 앞 카드와 달력상 이어지지 않으면 그 사실을 카드 사이에 적는다.
                빠진 날의 카드를 만들지 않는다 — 만들면 그날 잰 것처럼 보인다. */}
            {c.gapBefore > 0 && (
              <span className="daystrip-gap" title={`${c.gapBefore}일 빔`}>
                {c.gapBefore}일 빔
              </span>
            )}
            <span className="daystrip-day">{c.date.slice(8)}</span>
            <span className="daystrip-when">{c.isToday ? '오늘' : c.date.slice(5, 7) + '월'}</span>
            <span className="daystrip-value">{formatNumber(c.value)}</span>
            <span className={`daystrip-delta is-${c.delta === null ? 'none' : c.delta > 0 ? 'up' : c.delta < 0 ? 'down' : 'flat'}`}>
              {c.delta === null
                ? '—'
                : `${c.delta > 0 ? '▲' : c.delta < 0 ? '▼' : '—'} ${formatNumber(Math.abs(c.delta))}`}
            </span>
          </li>
        ))}
      </ol>

      <p className="source-url">
        {only ? (
          <>
            <b>카드가 하나뿐이다.</b> 기록이 하루치라서다. 오른쪽에 앞날 칸을 만들지
            않는다 — 동시접속자는 부르는 순간의 값이라 예보가 없고, 빈 칸을 그리면
            아는 척하는 값이 된다.
          </>
        ) : (
          <>
            잰 날만 카드가 된다. 단위는 {unit}, 화살표는 <b>바로 앞 카드와의 차이</b>다.
            {strip.gaps > 0 && ' 수집이 빠진 날은 카드를 만들지 않고 몇 일 비었는지만 적었다.'}
          </>
        )}
      </p>
    </>
  );
}
