// 상단 띠. MSN 날씨의 top-container 배치를 따랐다 —
// 왼쪽 로고 · 가운데 검색 · 오른쪽 설정 버튼.

import { SERVICE_AXES } from '../view/overview.js';
import GameSearch from './GameSearch.jsx';
import ThemeToggle from './ThemeToggle.jsx';

function measuredTime(reading) {
  if (!reading?.fetchedAt) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: reading.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(reading.fetchedAt));
}

export default function TopBar({
  games, selectedAppid, onPick, onOpenSettings, badge, scheduledAt, reading,
}) {
  const actualTime = measuredTime(reading);
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="wordmark">GAME PULSE</h1>
        <p>
          <span>게임 시장 데이터 인텔리전스</span>
          <span>Steam 기준 매일 {scheduledAt} 예정{actualTime && ` · 최근 ${actualTime} 측정`}</span>
        </p>
      </div>

      <div className="topbar-mid">
        <GameSearch games={games} selectedAppid={selectedAppid} onPick={onPick} />
      </div>

      <div className="topbar-right">
        <nav className="topbar-service-links" aria-label="서비스 페이지">
          {SERVICE_AXES.map((axis) => (
            <a
              key={axis.id}
              className={`${axis.navClass}${axis.href === '#sec-now' ? ' is-current' : ''}`}
              href={axis.href}
              aria-current={axis.href === '#sec-now' ? 'page' : undefined}
            >{axis.label}</a>
          ))}
        </nav>
        {badge}
        {/* 설정 안에 숨기지 않고 톱니 옆에 둔다 — 누르면 바로 바뀌는 것이라
            한 번 더 열게 할 이유가 없다. */}
        <ThemeToggle />
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
