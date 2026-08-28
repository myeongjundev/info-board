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
  if (axis.state === AXIS.UNAVAILABLE) {
    return { metric: '확인 불가', subject: axis.reason, detail: '자료 상태를 확인하세요' };
  }
  if (axis.state === AXIS.EMPTY) {
    return { metric: '현재 없음', subject: axis.reason, detail: '정상 응답 · 해당 항목 0건' };
  }

  switch (axis.id) {
    case 'playing': {
      const delta = axis.delta === null
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
        metric: `무료 ${number(axis.freeNow)} · 할인 목록 ${number(axis.onSale)}`,
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

export default function OverviewStrip({ board }) {
  const axes = overview({
    board, salesCharts, epicFree, steamFree, discounts, popularDiscounts, streaming,
  });

  return (
    <section className="overview-strip" aria-labelledby="overview-title">
      <header className="overview-strip-heading">
        <div>
          <p>GAME MARKET AT A GLANCE</p>
          <h2 id="overview-title">지금 게임 시장, 네 가지 질문</h2>
        </div>
        <span>대표값을 선택하면 근거가 있는 상세 구역으로 이동합니다.</span>
      </header>
      <div className="overview-axis-grid">
        {axes.map((axis, index) => {
          const copy = axisCopy(axis);
          return (
            <a key={axis.id} className={`overview-axis is-${axis.state}`} href={axis.href}>
              <span className="overview-axis-number">0{index + 1}</span>
              <span className="overview-axis-question">{axis.question}</span>
              <strong>{copy.metric}</strong>
              <b>{copy.subject}</b>
              <small>{copy.detail}</small>
            </a>
          );
        })}
      </div>
    </section>
  );
}
