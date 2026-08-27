// 오늘 잰 16개를 사람 수 순으로 줄 세운다.
//
// 이 패널만 이전 기록 없이 성립한다. 기록이 하루뿐인 첫날에 움직임 패널이
// 꺼져 있어도 여기는 채워진다 — 재놓고 안 보여주던 15개를 꺼내는 자리다.

import { formatNumber } from '../view/board.js';
import { capsuleUrl, ARTWORK_NOTE } from '../source/artwork.js';
import GameArt from './GameArt.jsx';

export default function Leaderboard({ data, heroAppid }) {
  if (!data) {
    return <p className="empty-note">오늘 잰 기록이 없다.</p>;
  }

  return (
    <>
      <ol className="rank-list">
        {data.rows.map((r) => (
          <li key={r.appid} className={r.appid === heroAppid ? 'is-hero' : undefined}>
            <span className="rank-no">{r.rank}</span>
            {/* 자리는 남기고 그림만 사라진다.
                대표값 쪽은 하나뿐이라 자리째 접지만, 목록은 그러면 안 된다 —
                16줄 중 하나만 안 왔을 때 그 줄만 밀리면 그게 더 고장 나 보인다.
                CDN 이 통째로 막히면 왼쪽에 빈 칸이 남는데, 줄이 어긋나는 것보다 낫다. */}
            <span className="rank-art-slot">
              <GameArt className="rank-art" src={capsuleUrl(r.appid)} width={231} height={87} />
            </span>
            <span className="rank-name" title={r.name}>
              {r.name}
              <span className="rank-year">{r.year}</span>
            </span>
            <span className="rank-value">
              {formatNumber(r.value)}
              <span className="rank-share">
                {r.shareOfMeasured === null ? '—' : `${r.shareOfMeasured.toFixed(1)}%`}
              </span>
            </span>
            {/* 막대는 장식이 아니라 눈으로 하는 나눗셈이다. 1등 대비 길이라
                옆줄과 견주는 것이 곧 값끼리 견주는 것이 된다. 비율을 만들 수
                없으면(합이 0) 그리지 않는다. */}
            <span
              className="rank-bar"
              style={r.relative === null ? undefined : { '--w': `${r.relative}%` }}
              aria-hidden="true"
            />
          </li>
        ))}
      </ol>

      <p className="source-url">
        {ARTWORK_NOTE}{' '}
        <b>%는 이 {data.measured}개 안에서의 비중이다.</b> Steam 전체에서의 비중이
        아니다 — 전체 동시접속자는 이 엔드포인트가 주지 않으므로 모르고,
        모르는 것을 분모로 쓰지 않는다. 분모는 위 값들의 합{' '}
        <b>{formatNumber(data.total)} {data.unit}</b> 이고 손으로 더해 확인할 수 있다.
        {data.missing > 0 && ` 오늘 못 가져온 ${data.missing}개는 줄에 없다 — 0 으로 채우지 않는다.`}
      </p>
    </>
  );
}
