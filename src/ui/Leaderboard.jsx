// 오늘 잰 게임을 사람 수 순으로 줄 세운다.
//
// 이 패널만 이전 기록 없이 성립한다. 기록이 하루뿐인 첫날에 움직임 패널이
// 꺼져 있어도 여기는 채워진다 — 재놓고 안 보여주던 15개를 꺼내는 자리다.

import { useState } from 'react';
import { formatNumber, formatInstant } from '../view/board.js';
import { capsuleUrl, ARTWORK_NOTE } from '../source/artwork.js';
import { steamStoreUrl } from '../source/steamLinks.js';
import { SOURCE } from '../source/definition.js';
import GameArt from './GameArt.jsx';
import ListDisclosure from './ListDisclosure.jsx';
import SpreadNote from './SpreadNote.jsx';

export default function Leaderboard({ data, heroAppid, onShowPrice }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return <p className="empty-note">오늘 잰 기록이 없다.</p>;
  }

  const visibleRows = expanded ? data.rows : data.rows.slice(0, 12);

  return (
    <>
      <SpreadNote spread={data.spread} subject="이 순위는" />

      <ol className="rank-list">
        {visibleRows.map((r) => (
          <li key={r.appid} className={r.appid === heroAppid ? 'is-hero' : undefined}>
            <span className="rank-no">{r.rank}</span>
            {/* 자리는 남기고 그림만 사라진다.
                대표값 쪽은 하나뿐이라 자리째 접지만, 목록은 그러면 안 된다 —
                16줄 중 하나만 안 왔을 때 그 줄만 밀리면 그게 더 고장 나 보인다.
                CDN 이 통째로 막히면 왼쪽에 빈 칸이 남는데, 줄이 어긋나는 것보다 낫다. */}
            <a
              className="rank-art-slot rank-art-link"
              href={steamStoreUrl(r.appid)}
              target="_blank"
              rel="noreferrer"
              aria-label={`${r.name} Steam 상점 열기`}
            >
              <GameArt className="rank-art" src={capsuleUrl(r.appid)} width={231} height={87} />
            </a>
            <a
              className="rank-name steam-game-link"
              href={steamStoreUrl(r.appid)}
              target="_blank"
              rel="noreferrer"
              title={`${r.name} Steam 상점 열기`}
            >
              {r.name}
              <span className="rank-year">{r.year}</span>
            </a>
            <span className="rank-value">
              {formatNumber(r.value)}
              <span className="rank-share">
                {r.shareOfMeasured === null ? '—' : `${r.shareOfMeasured.toFixed(1)}%`}
              </span>
              {/* 대표값과 다른 시각에 잰 줄만 시각을 단다. 전부 달면 같은 배치인
                  날에도 잡음이 되고, 안 달면 다른 시각인 것이 안 보인다. */}
              {r.offBatch && (
                <span className="rank-when" title="대표값과 다른 시각에 잰 값이다">
                  {formatInstant(r.fetchedAt, SOURCE.timezone).slice(11)} 측정
                </span>
              )}
            </span>
            <button
              type="button"
              className="price-button rank-price-button"
              onClick={() => onShowPrice(r.appid)}
              aria-label={`${r.name} 한국 가격과 할인 보기`}
            >
              가격
            </button>
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

      {data.rows.length > 12 && (
        <ListDisclosure
          expanded={expanded}
          onToggle={() => setExpanded((value) => !value)}
          visible={visibleRows.length}
          total={data.rows.length}
          collapsedNote={`나머지 ${data.rows.length - visibleRows.length}개는 필요할 때 펼쳐본다`}
        />
      )}

      <details className="method-note">
        <summary>%는 측정한 {data.measured}개 안에서 계산</summary>
        <p>
          {ARTWORK_NOTE} Steam 전체 동시접속자는 이 엔드포인트가 주지 않으므로
          분모로 쓰지 않는다. 분모는 측정값 합계{' '}
          <b>{formatNumber(data.total)} {data.unit}</b>다.
          {data.missing > 0 && ` 못 가져온 ${data.missing}개는 0으로 채우지 않고 제외했다.`}
        </p>
      </details>
    </>
  );
}
