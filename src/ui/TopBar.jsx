// 상단 띠. MSN 날씨의 top-container 배치를 따랐다 —
// 왼쪽 로고 · 가운데 검색 · 오른쪽 설정 버튼.

import { SUBPAGE_AXES } from '../view/overview.js';
import GameSearch from './GameSearch.jsx';

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
          <span>Steam 동시접속자 · 매일 {scheduledAt} KST 예정</span>
          {actualTime && <span>최근 {actualTime} 측정</span>}
        </p>
      </div>

      <div className="topbar-mid">
        <GameSearch games={games} selectedAppid={selectedAppid} onPick={onPick} />
      </div>

      <div className="topbar-right">
        <nav className="topbar-service-links" aria-label="서비스 페이지">
          {SUBPAGE_AXES.map((axis) => (
            <a key={axis.id} className={axis.navClass} href={axis.href}>{axis.question}</a>
          ))}
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
