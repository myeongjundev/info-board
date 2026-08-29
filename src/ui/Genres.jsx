// 장르로 묶어 보기.
//
// 대표값 하나(CS2)만 크게 띄우면 FPS 를 안 하는 사람에게는 첫 화면이 남의
// 이야기가 된다. 장르로 묶으면 들어오는 문이 여러 개가 된다.
//
// 다만 이 패널은 **Steam 의 장르 판도가 아니다.** 장르는 원자료가 주지 않아
// 우리가 GAMES 표에 적은 것이고, 묶이는 게임도 우리가 고른 것이다. 그래서
//   · 장르마다 그 안에 든 게임을 한 번에 다 볼 수 있게 하고
//   · `우리가 N개로 분류` 를 숫자로 적고
//   · 한 개짜리 장르에는 왕관을 씌우지 않는다
// 는 셋을 지킨다. 이걸 안 지키면 `MOBA 1위 Dota 2` 가 순위처럼 보이는데,
// 실제로는 우리가 MOBA 에 몇 개 못 넣었을 뿐이다.
//
// ## 접힌 상태에서 이름을 다 적지 않기로 했다 — 2026-08-29
//
// 전에는 여기에 `펼치지 않으면 안 보이는 정보를 만들지 않는다` 고 적고 접힌
// 줄에도 게임 이름과 값을 **전부** 늘어놓았다. 슈터 18개, 시뮬레이션 16개가
// 11px 글자로 두 줄씩 이어져 여덟 장르에 274px 이 들어갔다.
//
// 그 원칙이 지키려던 것은 글자 수가 아니라 **우리 분류를 반박할 수 있게 하는
// 것**이었다. 그런데 이름·숫자·가운뎃점이 뒤엉킨 두 줄은 읽히지 않는다 —
// 반박하려면 읽혀야 하고, 안 읽히는 목록은 있어도 그 일을 못 한다.
//
// 그래서 접힌 줄에는 앞의 셋과 `외 N개` 만 두고, 나머지는 줄을 눌러 펼치게
// 했다. 펼친 쪽이 오히려 낫다 — 거기서는 표지·이름·값·막대가 한 줄에 하나씩
// 선다. **정보를 숨긴 것이 아니라 읽을 수 있는 자리로 옮긴 것이고**, 몇 개가
// 더 있는지는 접힌 상태에서도 숫자로 적혀 있다.

import { useState } from 'react';

import { formatNumber } from '../view/board.js';
import SpreadNote from './SpreadNote.jsx';
import { capsuleUrl } from '../source/artwork.js';
import GameArt from './GameArt.jsx';

/** 접힌 줄에 이름을 몇 개까지 적는가. 한 줄에 들어가는 만큼이다. */
const FOLDED = 3;

export default function Genres({ data, games, onPickGame }) {
  const [open, setOpen] = useState(null);

  if (!data) {
    return <p className="empty-note">오늘 잰 기록이 없어 장르로 묶을 것이 없다.</p>;
  }

  return (
    <>
      <SpreadNote spread={data.spread} subject="장르 합계에 든 값은" />

      <ol className="genre-list">
        {data.genres.map((g) => {
          const isOpen = open === g.genre;
          return (
            <li key={g.genre} className={isOpen ? 'is-open' : undefined}>
              <button
                type="button"
                className="genre-head"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : g.genre)}
              >
                <span className="genre-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                <span className="genre-name">{g.genre}</span>
                <span className="genre-count">
                  {g.measured === 1 ? '우리가 넣은 게임 1개' : `게임 ${g.measured}개 합`}
                  {g.measured !== g.listed && ` · 오늘 못 잰 ${g.listed - g.measured}개 빠짐`}
                </span>
                <span className="genre-total">{formatNumber(g.total)}</span>
                <span className="genre-share">
                  {g.shareOfMeasured === null ? '—' : `${g.shareOfMeasured.toFixed(1)}%`}
                </span>
              </button>

              <span
                className="genre-bar"
                style={g.relative === null ? undefined : { '--w': `${g.relative}%` }}
                aria-hidden="true"
              />

              {/* 접힌 줄에는 앞의 셋과 남은 수만. 나머지는 줄을 누르면 표지·이름·값·
                  막대가 한 줄에 하나씩 선다. 몇 개가 더 있는지는 여기 숫자로 있다. */}
              {isOpen ? (
                <GenreChart rows={g.rows} genre={g.genre} onPickGame={onPickGame} />
              ) : (
                <p className="genre-members">
                  {g.rows.slice(0, FOLDED).map((r, i) => (
                    <span key={r.appid}>
                      {i > 0 && ' · '}
                      {r.name} <b>{formatNumber(r.value)}</b>
                    </span>
                  ))}
                  {g.rows.length > FOLDED && (
                    <span className="genre-more"> 외 {g.rows.length - FOLDED}개</span>
                  )}
                </p>
              )}

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
          );
        })}
      </ol>

      <details className="method-note">
        <summary>자체 분류 · Steam 공식 장르 통계가 아님</summary>
        <p>
          장르는 원자료가 주지 않아 우리가 붙였다. 이것은 Steam 전체의 장르 판도가
          아니라 우리가 고른 {games.length}개를 묶은 결과다. %의 분모는 측정값 합계{' '}
          <b>{formatNumber(data.total)} {data.unit}</b>이며, 장르별 게임 수를 함께 표시한다.
        </p>
      </details>
    </>
  );
}

/**
 * 펼쳤을 때 나오는 막대 그래프.
 *
 * 막대 길이는 **그 장르 안 1위 대비**다. 장르마다 규모가 열 배씩 차이 나서
 * 전체 1위에 맞추면 작은 장르는 전부 실선이 되어 서로 견줄 수가 없다.
 * 그래서 기준이 장르마다 다르고, **그 사실을 그래프 아래 적는다** — 안 적으면
 * 다른 장르의 막대와 길이를 견주게 되고 그건 틀린 비교다.
 */
function GenreChart({ rows, genre, onPickGame }) {
  return (
    <div className="genre-chart">
      <ol>
        {rows.map((r) => (
          <li key={r.appid}>
            <button type="button" onClick={() => onPickGame?.(r.appid)} title={`${r.name} 을 대표값으로 보기`}>
              <GameArt className="gchart-art" src={capsuleUrl(r.appid)} width={231} height={87} />
              <span className="gchart-name">{r.name}</span>
              <span className="gchart-value">{formatNumber(r.value)}</span>
              <span
                className="gchart-bar"
                style={r.relativeInGenre === null ? undefined : { '--w': `${r.relativeInGenre}%` }}
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ol>
      <p className="source-url">
        막대는 <b>{genre} 안에서 1위 대비 길이</b>다. 장르마다 규모가 크게 달라
        기준이 장르마다 다르므로, <b>다른 장르의 막대와 길이를 견주면 안 된다.</b>{' '}
        값끼리 견주려면 숫자를 본다. 줄을 누르면 그 게임이 맨 위 대표값 자리로 간다.
      </p>
    </div>
  );
}
