// 상단 띠. MSN 날씨의 top-container 배치를 따랐다 —
// 왼쪽 로고 · 가운데 검색 · 오른쪽 설정 버튼.

import GameSearch from './GameSearch.jsx';

export default function TopBar({ games, selectedAppid, onPick, onOpenSettings, badge }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="wordmark">GAME PULSE</h1>
        <p>오늘 Steam 에 몇 명이 있는가</p>
      </div>

      <div className="topbar-mid">
        <GameSearch games={games} selectedAppid={selectedAppid} onPick={onPick} />
      </div>

      <div className="topbar-right">
        {badge}
        <button
          type="button"
          className="gear"
          onClick={onOpenSettings}
          aria-label="페이지 설정"
          title="페이지 설정"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
