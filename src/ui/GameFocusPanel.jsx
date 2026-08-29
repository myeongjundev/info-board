import { SOURCE } from '../source/definition.js';
import { formatInstant } from '../view/board.js';
import Comparison from './Comparison.jsx';
import FaultPanel from './FaultPanel.jsx';
import HeroValue from './HeroValue.jsx';

export default function GameFocusPanel({
  board, status, fault, onRetry, coverage, totalGames, statusBadge, onShowPrice,
}) {
  const reading = board?.reading;

  return (
    <section id="sec-focus" className="dashboard-summary game-focus-panel" aria-labelledby="dashboard-title">
      <header className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">SELECTED GAME · QUICK STATS</p>
          <h2 id="dashboard-title">선택 게임 스냅샷</h2>
          <p>한 Reading에 묶인 값·변화·조회 시각과 측정 범위를 함께 확인한다.</p>
        </div>
        {reading && (
          <p className="dashboard-date">
            <span>{reading.date}</span>
            {reading.timezone}
          </p>
        )}
      </header>

      <div className="kpi-grid">
        <section className="kpi kpi-primary" aria-label="현재 접속자">
          <h3>현재 접속자</h3>
          {status === 'loading' && !board ? (
            <div className="skeleton" />
          ) : status === 'fault' && !board ? (
            <FaultPanel fault={fault} onRetry={onRetry} busy={status === 'loading'} />
          ) : (
            <HeroValue
              board={board}
              status={status}
              fault={fault}
              onRetry={onRetry}
              showTiming={false}
              showArtwork
              onShowPrice={onShowPrice}
            />
          )}
        </section>

        <section className="kpi" aria-label="이전 측정 대비">
          <h3>이전 측정 대비</h3>
          <Comparison board={board} compact />
        </section>

        <section className="kpi" aria-label="측정 시각">
          <h3>측정 시각</h3>
          {reading ? (
            <>
              <p className="kpi-time">{formatInstant(reading.fetchedAt, SOURCE.timezone)}</p>
              <p className="kpi-meta">{board.elapsed?.text ?? '경과 시간 확인 불가'} · {reading.timezone}</p>
            </>
          ) : <p className="kpi-empty">정상 측정값 없음</p>}
        </section>

        <section className="kpi" aria-label="데이터 상태">
          <h3>데이터 상태</h3>
          <div className="kpi-status">{statusBadge}</div>
          <p className="kpi-coverage">
            <b>{coverage?.measured ?? 0}</b>
            <span>/ {totalGames} games measured</span>
          </p>
          {coverage?.missing > 0 && (
            <p className="kpi-meta">나머지 {coverage.missing}개는 다음 정규 측정 대상</p>
          )}
        </section>
      </div>
    </section>
  );
}
