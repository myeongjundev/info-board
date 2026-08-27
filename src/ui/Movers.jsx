// 🚀 급상승 · 📉 급하락 — 같은 기록에서 나온다. API 를 더 붙이지 않았다.

import { formatNumber } from '../view/board.js';

export default function Movers({ data, dates }) {
  if (!data) {
    // 이전 기록이 없다. 순위를 만들어내지 않는다.
    const n = dates?.length ?? 0;
    return (
      <p className="delta-none">
        견줄 이전 기록이 없어 아직 순위를 만들지 않는다. 기록이{' '}
        <b>{n}일치</b>뿐이다. 하루가 더 쌓이면 이 자리에 오른 게임과 내린 게임이 생긴다.
      </p>
    );
  }

  return (
    <>
      <div className="movers">
        <MoverColumn kind="up" title="상승" rows={data.risers} />
        <MoverColumn kind="down" title="하락" rows={data.fallers} />
      </div>
      <p className="source-url">
        <b>{data.previousDate}</b> 기록과 견줬다. 우리가 재는 <b>{data.compared}개</b> 중에서
        고른 것이고, Steam 전체를 훑은 순위가 아니다.
        {data.skipped > 0 && ` 견줄 값이 없는 ${data.skipped}개는 뺐다.`}
      </p>
    </>
  );
}

function MoverColumn({ kind, title, rows }) {
  return (
    <div>
      <h3 className="mover-head">{title}</h3>
      {rows.length === 0 ? (
        <p className="empty-note">해당하는 게임이 없다.</p>
      ) : (
        <ol className="mover-list">
          {rows.map((r) => (
            <li key={r.appid}>
              <span className="mover-name">{r.name}</span>
              <span className={`mover-pct is-${kind}`}>
                {r.delta > 0 ? '▲' : '▼'} {Math.abs(r.percent).toFixed(1)}%
              </span>
              <span className="mover-raw">
                {formatNumber(r.previous)} → {formatNumber(r.current)} {r.unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
