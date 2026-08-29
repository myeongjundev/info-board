import salesCharts from '../../data/sales-charts.json';
import epicFree from '../../data/epic-free.json';
import steamFree from '../../data/steam-free.json';
import discounts from '../../data/discounts.json';
import popularDiscounts from '../../data/popular-discounts.json';
import streaming from '../../data/streaming.json';
import { AXIS, overview } from '../view/overview.js';

const PLATFORM = { chzzk: '치지직', twitch: 'Twitch' };

function number(value) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function axisCopy(axis) {
  // 아직 안 읽은 것을 못 읽었다고 말하지 않는다. 잠깐 스쳐 가는 상태라도
  // 그 순간 화면에 뜨는 것은 뜨는 것이다.
  if (axis.state === AXIS.LOADING) {
    return { metric: '읽는 중', subject: axis.reason, detail: '아직 못 읽은 것이 아니다' };
  }
  if (axis.state === AXIS.UNAVAILABLE) {
    return { metric: '확인 불가', subject: axis.reason, detail: '자료 상태를 확인하세요' };
  }
  if (axis.state === AXIS.EMPTY) {
    return { metric: '현재 없음', subject: axis.reason, detail: '정상 응답 · 해당 항목 0건' };
  }

  switch (axis.id) {
    case 'playing': {
      const delta = axis.stale
        ? '오래된 값 · 제품 장애 시 마지막 정상 Reading'
        : axis.delta === null
        ? '이전 날짜 비교 전'
        : `이전 기록 대비 ${axis.delta > 0 ? '+' : ''}${number(axis.delta)} ${axis.unit}`;
      return { metric: `${number(axis.value)} ${axis.unit}`, subject: axis.subject, detail: delta };
    }
    case 'selling':
      return {
        metric: axis.isFree ? '무료' : (axis.priceText ?? '가격 미표시'),
        subject: axis.subject,
        detail: `한국 매출 1위${axis.discountPercent ? ` · ${axis.discountPercent}% 할인` : ''}`,
      };
    case 'deals':
      return {
        metric: `무료 ${number(axis.freeNow)} · 할인 ${number(axis.onSale)}`,
        subject: '한국 상점 행사',
        detail: axis.partial ? '일부 자료 기준' : 'Epic·Steam 정적 수집본 기준',
      };
    case 'watching':
      return {
        metric: `${number(axis.viewerCount)}명 시청`,
        subject: axis.subject,
        detail: `${PLATFORM[axis.platformId] ?? axis.platformId} 표본 1위 · 플랫폼끼리 합산하지 않음`,
      };
    default:
      return { metric: '—', subject: '', detail: '' };
  }
}

export default function OverviewStrip({ board, faulted = false, loading = false }) {
  const axes = overview({
    loading,
    board: faulted && board ? { ...board, state: 'STALE' } : board,
    salesCharts,
    epicFree,
    steamFree,
    discounts,
    popularDiscounts,
    streaming,
  });

  return (
    <section className="overview-strip" aria-labelledby="overview-title">
      <header className="overview-strip-heading">
        <div>
          <p>GAME MARKET INTELLIGENCE</p>
          <h2 id="overview-title">게임 시장, 한눈에 읽다</h2>
        </div>
        <div className="overview-strip-meta">
          <b>{board?.reading?.date ?? '최신 수집본'} · 4 AXES</b>
          <span>각 지표를 선택하면 계산 근거와 상세 구역으로 이동합니다.</span>
        </div>
      </header>
      <div className="overview-axis-grid">
        {axes.map((axis, index) => {
          const copy = axisCopy(axis);
          return (
            <a
              key={axis.id}
              className={`overview-axis is-${axis.state}${axis.stale ? ' is-stale' : ''}`}
              href={axis.href}
            >
              <span className="overview-axis-number">0{index + 1}</span>
              <span className="overview-axis-label">{axis.label}</span>
              <strong>{copy.metric}</strong>
              <b>{copy.subject}</b>
              <small>{copy.detail}</small>
              <span className="overview-axis-action">상세 보기 <i aria-hidden="true">→</i></span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
