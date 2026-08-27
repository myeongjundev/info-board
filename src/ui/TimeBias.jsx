// 같은 날, 시각만 다르게 잰 값.
//
// 이 패널이 이 정보판에서 제일 불편한 사실을 말한다. 동시접속자는 순간값이고
// 우리는 하루에 한 번 10:10 KST (01:10 UTC) 에 잰다. 그 시각은 지역별로
//
//   한국·일본 아침 10시 · 유럽 새벽 3시 · 미국 동부 전날 저녁 9시
//
// 이라, 우리 숫자는 "이 게임을 몇 명이 하는가" 가 아니라 **"그 순간 접속해 있던
// 사람이 몇 명인가"** 다. 그래서 순위표는 인기 순위가 아니라 그 시각에 깨어 있던
// 지역의 순위에 가깝다.
//
// 숨기면 순위표가 인기 순위인 척하게 되고, 드러내면 이 과제가 요구하는 태도가
// 된다. 그래서 재서 화면에 올린다.

import { formatNumber, formatInstant } from '../view/board.js';
import { SOURCE } from '../source/definition.js';

export default function TimeBias({ data }) {
  if (!data) {
    return (
      <p className="empty-note">
        다른 시각 표본이 아직 없다. <code>node scripts/probe-hours.mjs</code> 를
        돌리면 생긴다.
      </p>
    );
  }

  // 많이 오른 셋과 많이 내린 셋만 보인다. 가운데는 이야기가 없다.
  const up = data.rows.filter((r) => r.percent !== null && r.percent > 0).slice(0, 5);
  const down = data.rows.filter((r) => r.percent !== null && r.percent < 0).slice(-5).reverse();

  return (
    <>
      <p className="tb-lede">
        같은 날, <b>시각만 다르게</b> 잰 값이다. 어제와 오늘의 비교가 아니다.
      </p>

      <div className="tb-when">
        <div>
          <dt>정규 측정</dt>
          <dd>{formatInstant(data.recordAt, SOURCE.timezone)}</dd>
          <dd className="tb-utc">{data.recordAt.slice(11, 16)} UTC</dd>
        </div>
        <div>
          <dt>다른 시각 표본</dt>
          <dd>{formatInstant(data.probeAt, SOURCE.timezone)}</dd>
          <dd className="tb-utc">{data.probeAt.slice(11, 16)} UTC</dd>
        </div>
      </div>

      <div className="movers">
        <TbColumn kind="up" title="이 시각에 늘어난 게임" rows={up} />
        <TbColumn kind="down" title="이 시각에 줄어든 게임" rows={down} />
      </div>

      <p className="caveat">
        <b>어느 쪽도 진짜 값이 아니다.</b> 둘 다 그 순간에 실제로 잰 값이고, 잰
        시각이 다를 뿐이다. 그래서 위 순위표는 <b>인기 순위가 아니라 01:10 UTC 에
        접속해 있던 사람의 순위</b>다. 주 이용자가 아시아인 게임은 그 시각이
        아침이라 낮게 잡히고, 서구권 게임은 저녁이라 높게 잡힌다.
      </p>

      <details className="method-note">
        <summary>표본 {data.measured}개 · 별도 시각 표본</summary>
        <p>
          이 표본은 <code>data/timeprobe.json</code>에 따로 쌓이고 날짜별 기록을
          건드리지 않는다. 하루에 한 번 같은 시각에 재는 규칙은 그대로 유지한다.
        </p>
      </details>
    </>
  );
}

function TbColumn({ kind, title, rows }) {
  return (
    <div>
      <h3 className="mover-head">{title}</h3>
      {rows.length === 0 ? (
        <p className="empty-note">해당하는 게임이 없다.</p>
      ) : (
        <ol className="mover-list">
          {rows.map((r) => (
            <li key={r.appid}>
              <span className="mover-name">
                {r.name}
                {r.genre && <span className="tb-genre">{r.genre}</span>}
              </span>
              <span className={`mover-pct is-${kind}`}>
                {r.delta > 0 ? '▲' : '▼'} {Math.abs(r.percent).toFixed(0)}%
              </span>
              <span className="mover-raw">
                {formatNumber(r.atRecord)} → {formatNumber(r.atProbe)} {r.unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
