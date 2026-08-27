// 장르로 묶어 보기.
//
// 대표값 하나(CS2)만 크게 띄우면 FPS 를 안 하는 사람에게는 첫 화면이 남의
// 이야기가 된다. 장르로 묶으면 들어오는 문이 여러 개가 된다.
//
// 다만 이 패널은 **Steam 의 장르 판도가 아니다.** 장르는 원자료가 주지 않아
// 우리가 GAMES 표에 적은 것이고, 묶이는 16개도 우리가 고른 것이다. 그래서
//   · 장르마다 그 안에 든 게임을 다 펼쳐 보이고
//   · `우리가 N개로 분류` 를 숫자로 적고
//   · 한 개짜리 장르에는 왕관을 씌우지 않는다
// 는 셋을 지킨다. 이걸 안 지키면 `MOBA 1위 Dota 2` 가 순위처럼 보이는데,
// 실제로는 우리가 MOBA 에 Dota 2 하나만 넣었을 뿐이다.

import { formatNumber } from '../view/board.js';

export default function Genres({ data, games }) {
  if (!data) {
    return <p className="empty-note">오늘 잰 기록이 없어 장르로 묶을 것이 없다.</p>;
  }

  return (
    <>
      <ol className="genre-list">
        {data.genres.map((g) => (
          <li key={g.genre}>
            <div className="genre-head">
              <span className="genre-name">{g.genre}</span>
              <span className="genre-count">
                {g.measured === 1 ? '우리가 넣은 게임 1개' : `게임 ${g.measured}개 합`}
                {g.measured !== g.listed && ` · 오늘 못 잰 ${g.listed - g.measured}개 빠짐`}
              </span>
              <span className="genre-total">{formatNumber(g.total)}</span>
              <span className="genre-share">
                {g.shareOfMeasured === null ? '—' : `${g.shareOfMeasured.toFixed(1)}%`}
              </span>
            </div>

            <span
              className="genre-bar"
              style={g.relative === null ? undefined : { '--w': `${g.relative}%` }}
              aria-hidden="true"
            />

            {/* 어느 게임이 이 장르에 들었는지 숨기지 않는다. 분류가 우리 것이라
                보는 사람이 동의하지 않을 수 있고, 그러려면 목록이 보여야 한다. */}
            <p className="genre-members">
              {g.rows.map((r, i) => (
                <span key={r.appid}>
                  {i > 0 && ' · '}
                  {r.name} <b>{formatNumber(r.value)}</b>
                </span>
              ))}
            </p>

            {/* 변화는 양쪽 날에 다 있는 게임만으로 낸다. */}
            {g.delta !== null && (
              <p className="genre-delta">
                <span className={g.delta > 0 ? 'is-up' : g.delta < 0 ? 'is-down' : 'is-flat'}>
                  {g.delta > 0 ? '▲' : g.delta < 0 ? '▼' : '—'} {formatNumber(Math.abs(g.delta))}
                  {g.percent !== null && ` (${g.delta > 0 ? '+' : ''}${g.percent.toFixed(1)}%)`}
                </span>
                <span className="genre-delta-note">
                  {data.previousDate} 대비 ·{' '}
                  {g.paired === g.measured
                    ? `${g.paired}개 모두 양쪽 날에 있다`
                    : `양쪽 날에 다 있는 ${g.paired}개만 견줬다`}
                  {g.pairedPrevTotal !== null && ` · ${formatNumber(g.pairedPrevTotal)} → ${formatNumber(g.pairedPrevTotal + g.delta)}`}
                </span>
              </p>
            )}
          </li>
        ))}
      </ol>

      <p className="source-url">
        <b>장르는 원자료가 주지 않는다. 우리가 붙인 것이다.</b> 공식 API 는 장르를
        주지 않고, 장르를 주는 store 경로는 문서화돼 있지 않아 쓰지 않았다. 그래서
        이것은 <b>Steam 의 장르 판도가 아니라 우리가 고른 {games.length}개를 우리
        기준으로 묶은 것</b>이다. %의 분모는 위 값들의 합{' '}
        <b>{formatNumber(data.total)} {data.unit}</b> 이고, 어느 게임이 어느 장르에
        들었는지는 각 줄에 그대로 적었다.
      </p>

      <p className="source-url">
        고른 16개가 <b>슈터에 치우쳐 있다.</b> 장르별 크기는 그 장르가 큰 것이 아니라
        우리가 그 장르를 많이 넣은 것일 수 있다 — 줄마다 게임 수를 함께 적은 이유다.
      </p>
    </>
  );
}
