// 오른쪽에 붙는 맨위로 · 새로 고침. MSN 날씨의 navbarSymbolContainer 에 대응한다.
//
// 새로 고침이 하는 일은 **기록 파일을 다시 읽는 것**이지 Steam 을 다시 부르는 것이
// 아니다. 브라우저는 Steam 을 부를 수 없고(CORS), 값은 하루 한 번 Actions 가
// 받아 커밋한다. 그래서 눌러도 대개 같은 값이 온다 — 그 사실을 툴팁에 적었다.
// `새로 고침` 이 `지금 다시 잰다` 로 읽히면 그것이 곧 LIVE 표시와 같은 거짓말이다.

import { useEffect, useState } from 'react';

import { scrollToTop } from './scroll.js';

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
        onClick={() => scrollToTop()}
        disabled={!showTop}
        title="맨 위로"
        aria-label="맨 위로"
      >
        ↑
      </button>
      {/* 새로 고침은 다시 읽을 것이 있는 화면에만 둔다.
          하위 페이지는 자기 자료를 스스로 받아 오고 다시 부르는 길을 갖고 있지
          않다. 거기에 눌러도 아무 일 없는 단추를 두면 **없는 기능을 있다고 말하는
          것**이다. 이 판이 LIVE 라고 안 쓰기로 한 것과 같은 이유다. */}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          title="기록 파일을 다시 읽는다. Steam 을 다시 부르는 것이 아니라 대개 같은 값이 온다"
          aria-label="기록 파일 다시 읽기"
        >
          {busy ? '···' : '↻'}
        </button>
      )}
    </div>
  );
}
