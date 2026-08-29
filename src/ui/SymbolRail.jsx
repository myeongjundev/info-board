// 오른쪽에 붙는 맨위로 · 새로 고침. MSN 날씨의 navbarSymbolContainer 에 대응한다.
//
// 새로 고침이 하는 일은 **기록 파일을 다시 읽는 것**이지 Steam 을 다시 부르는 것이
// 아니다. 브라우저는 Steam 을 부를 수 없고(CORS), 값은 하루 한 번 Actions 가
// 받아 커밋한다. 그래서 눌러도 대개 같은 값이 온다 — 그 사실을 툴팁에 적었다.
// `새로 고침` 이 `지금 다시 잰다` 로 읽히면 그것이 곧 LIVE 표시와 같은 거짓말이다.

import { useEffect, useState } from 'react';

export default function SymbolRail({ onRefresh, busy }) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="symbolrail">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        disabled={!showTop}
        title="맨 위로"
        aria-label="맨 위로"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        title="기록 파일을 다시 읽는다. Steam 을 다시 부르는 것이 아니라 대개 같은 값이 온다"
        aria-label="기록 파일 다시 읽기"
      >
        {busy ? '···' : '↻'}
      </button>
    </div>
  );
}
