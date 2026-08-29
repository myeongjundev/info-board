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
import ListDisclosure from './ListDisclosure.jsx';
import { formatNumber, formatInstant, formatSpan } from '../view/board.js';
import { SOURCE } from '../source/definition.js';

/** 그날을 언제 쟀는가. 한 배치면 시각 하나, 아니면 구간과 길이. */
function whenText(spread) {
  if (!spread) return '잰 시각을 알 수 없다';
  const from = formatInstant(spread.from, SOURCE.timezone);
  if (spread.coherent) return `${from} 한 번`;
  return `${from} ~ ${formatInstant(spread.to, SOURCE.timezone).slice(11)} (${formatSpan(spread.spanMs)}에 걸쳐)`;
}

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

  return (
    <>
      <p className="tb-lede">
        <b>{data.previousDate}</b> 와 견줬다. 양쪽 날에 다 있는{' '}
        <b>{data.basis}개</b> 안에서 양쪽 순위를 다시 매긴 것이다.
      </p>

      {/* 두 날을 각각 언제 쟀는지 적는다. 순위 이동은 두 날의 값으로 내므로,
          한쪽이 아침이고 한쪽이 저녁이면 이동의 일부는 하루의 변화가 아니다.
          값은 빼지 않는다 — 전부 실제로 잰 값이다. */}
      {(data.spread?.coherent === false || data.previousSpread?.coherent === false) && (
        <p className="spread-note">
          <b>두 날을 잰 시각이 다르다.</b> {data.previousDate} 는{' '}
          {whenText(data.previousSpread)}, {data.spread ? formatInstant(data.spread.from, SOURCE.timezone).slice(0, 10) : '오늘'} 은{' '}
          {whenText(data.spread)} 쟀다. 동시접속자는 부르는 순간의 값이라 아침과 저녁은
          게임마다 반대로 움직인다. 그래서 아래 <b>{data.rows.filter((r) => r.crossBatch).length}개</b> 줄의
          이동에는 하루의 변화가 아니라 <b>잰 시각의 차이</b>가 섞여 있다. 값은 지우지 않고
          그대로 두고 그 줄에 시각을 달았다.
        </p>
      )}

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
                  {r.crossBatch && (
                    <em className="rank-when" title="두 값을 서로 다른 시각에 쟀다">
                      {formatInstant(r.previousAt, SOURCE.timezone).slice(11)} →{' '}
                      {formatInstant(r.currentAt, SOURCE.timezone).slice(11)}
                    </em>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {moved.length > 0 && data.rows.length > 12 && (
        <ListDisclosure
          expanded={expanded}
          onToggle={() => setExpanded((value) => !value)}
          visible={visibleRows.length}
          total={data.rows.length}
          collapsedNote={`나머지 ${data.rows.length - visibleRows.length}개 순위 이동은 펼쳐서 확인`}
        />
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
