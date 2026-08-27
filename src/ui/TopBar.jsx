// 상단 띠. MSN 날씨의 top-container 배치를 따랐다 —
// 왼쪽 로고 · 가운데 검색 · 오른쪽 설정 버튼.

import GameSearch from './GameSearch.jsx';

export default function TopBar({ games, selectedAppid, onPick, onOpenSettings, badge }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="wordmark">GAME PULSE</h1>
        <p>Steam 동시접속자 · 매일 10:10 KST 측정</p>
      </div>

      <div className="topbar-mid">
        <GameSearch games={games} selectedAppid={selectedAppid} onPick={onPick} />
      </div>

      <div className="topbar-right">
        <nav className="topbar-service-links" aria-label="서비스 페이지">
          <a className="sales-nav-link" href="#/sales">할인 게임</a>
          <a className="sales-chart-nav-link" href="#/charts">판매 차트</a>
          <a className="stream-nav-link" href="#/streaming">스트리밍 순위</a>
        </nav>
        {badge}
        <button
          type="button"
          className="gear"
          onClick={onOpenSettings}
          aria-label="페이지 설정"
          title="페이지 설정"
        >
          <span aria-hidden="true">⚙</span>
          <span className="gear-label">설정</span>
        </button>
      </div>
    </header>
  );
}
