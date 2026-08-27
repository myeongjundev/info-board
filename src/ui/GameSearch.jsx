// 상단 가운데 검색창. MSN 날씨의 지역 검색에 대응한다.
//
// 거기서는 도시를 고르면 그 도시 날씨가 오지만, 여기서는 고른 게임이 대표값
// 자리에 온다. 부르는 API 는 늘어나지 않는다 — 재는 게임을 이미 다 재 뒀고, 고르는
// 것은 그중 어느 줄을 크게 볼지다.
//
// 우리가 재지 않는 게임은 검색되지 않는다. 없는 것을 검색창이 있는 척하지 않는다.

import { useEffect, useRef, useState } from 'react';

export default function GameSearch({ games, selectedAppid, onPick }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const q = query.trim().toLowerCase();
  const hits = q
    ? games.filter((g) => g.name.toLowerCase().includes(q) || String(g.appid) === q)
    : games;

  const pick = (appid) => {
    onPick(appid);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="gsearch" ref={boxRef}>
      <input
        type="search"
        className="gsearch-input"
        placeholder="재는 게임 중에서 찾기"
        aria-label="대표값으로 볼 게임 찾기"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); }
          if (e.key === 'Enter' && hits.length > 0) pick(hits[0].appid);
        }}
      />

      {open && (
        <div className="gsearch-pop">
          {hits.length === 0 ? (
            <p className="gsearch-none">
              <b>{query}</b> 는 우리가 재는 목록에 없다. 검색은 매일 재는{' '}
              {games.length}개 안에서만 된다 — 안 잰 게임의 값을 지어내지 않는다.
            </p>
          ) : (
            <ul className="gsearch-list">
              {hits.map((g) => (
                <li key={g.appid}>
                  <button
                    type="button"
                    className={g.appid === selectedAppid ? 'is-on' : undefined}
                    onClick={() => pick(g.appid)}
                  >
                    <span className="gsearch-name">{g.name}</span>
                    <span className="gsearch-meta">{g.year}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
