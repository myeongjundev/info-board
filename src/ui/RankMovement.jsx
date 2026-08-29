// 어제와 오늘의 순위 이동.
//
// **양쪽 날에 다 있는 게임만으로 양쪽 순위를 다시 매긴 것**이다. 그래서 여기 나오는
// 순위는 위 줄세우기 패널의 순위와 다를 수 있다. 다른 것이 맞다 — 줄세우기는 오늘
// 잰 것 전부의 순위이고, 여기는 견줄 수 있는 것만의 순위다.
//
// 그냥 그날의 전체 순위끼리 견주면 재는 게임을 늘린 다음 날 모두가 폭락한 것처럼
// 보인다. 값은 멀쩡한데 화면이 거짓말을 하는 종류라 계산에서 막았고, 화면에는
// 기준이 된 개수를 적는다.

import { useState } from 'react';
import { formatNumber } from '../view/board.js';

export default function RankMovement({ data, onPickGame }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <p className="delta-none">
        견줄 이전 기록이 없어 순위 이동을 만들지 않는다. 하루가 더 쌓이면 이 자리에
        생긴다.
      </p>
    );
  }

  // 자리가 바뀐 것만 위에 따로 보인다. 안 바뀐 줄이 대부분이면 볼 것이 없다.
  const moved = data.rows.filter((r) => r.movement !== 0);
  const visibleRows = expanded ? data.rows : data.rows.slice(0, 12);
  const hiddenCount = data.rows.length - visibleRows.length;

  return (
    <>
      <p className="tb-lede">
        <b>{data.previousDate}</b> 와 견줬다. 양쪽 날에 다 있는{' '}
        <b>{data.basis}개</b> 안에서 양쪽 순위를 다시 매긴 것이다.
      </p>

      {moved.length === 0 ? (
        <p className="empty-note">자리가 바뀐 게임이 없다.</p>
      ) : (
        <ol className="rankmove">
          {visibleRows.map((r) => (
            <li key={r.appid} className={r.movement === 0 ? 'is-flat' : undefined}>
              <button type="button" onClick={() => onPickGame?.(r.appid)} title={`${r.name} 을 대표값으로 보기`}>
                <span className="rm-rank">{r.currentRank}</span>
                <span className={`rm-move is-${r.movement > 0 ? 'up' : r.movement < 0 ? 'down' : 'flat'}`}>
                  {r.movement > 0 ? `▲${r.movement}` : r.movement < 0 ? `▼${Math.abs(r.movement)}` : '─'}
                </span>
                <span className="rm-name">{r.name}</span>
                <span className="rm-value">{formatNumber(r.currentValue)}</span>
                <span className="rm-was">
                  {r.previousRank}위 · {formatNumber(r.previousValue)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {moved.length > 0 && data.rows.length > 12 && (
        <div className="list-disclosure">
          <p>
            상위 <b>{visibleRows.length}개</b> 표시
            {!expanded && <span> · 나머지 {hiddenCount}개 순위 이동은 펼쳐서 확인</span>}
          </p>
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
            {expanded ? '목록 접기' : `전체 ${data.rows.length}개 보기`}
            <span aria-hidden="true">{expanded ? '↑' : '↓'}</span>
          </button>
        </div>
      )}

      <p className="source-url">
        <b>여기 순위는 위 줄세우기의 순위와 다를 수 있다.</b> 줄세우기는 오늘 잰 것
        전부의 순위이고, 여기는 <b>어제와 견줄 수 있는 {data.basis}개만의 순위</b>다.
        그날의 전체 순위끼리 견주면 재는 게임을 늘린 날 모두가 폭락한 것처럼 보인다.
        {data.excludedToday > 0 && ` 어제 기록이 없는 ${data.excludedToday}개는 빠졌다 — 새로 재기 시작했거나 어제 못 잰 것이지 순위에 들어온 것이 아니다.`}
        {data.excludedBefore > 0 && ` 오늘 못 잰 ${data.excludedBefore}개도 빠졌다.`}
      </p>
    </>
  );
}
