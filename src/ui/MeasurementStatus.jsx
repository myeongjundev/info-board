import discounts from '../../data/discounts.json';
import popularDiscounts from '../../data/popular-discounts.json';
import epicFree from '../../data/epic-free.json';
import steamFree from '../../data/steam-free.json';
import salesCharts from '../../data/sales-charts.json';
import streaming from '../../data/streaming.json';
import './measurement-status.css';

function count(value) {
  return new Intl.NumberFormat('ko-KR').format(Number(value) || 0);
}

function latest(...values) {
  return values.filter((value) => Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

function checkedAt(value) {
  if (!value) return '확인 시각 없음';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export default function MeasurementStatus({ coverage, totalGames, loading = false, fetchedAt = null }) {
  const connected = streaming.platforms?.filter((platform) => platform.status === 'ok') ?? [];
  const streamRows = Object.fromEntries(
    (streaming.platforms ?? []).map((platform) => [platform.id, platform.rankings?.length ?? 0]),
  );
  const freeNow = (epicFree.giveaways?.length ?? 0)
    + (steamFree.giveaways?.length ?? 0)
    + (steamFree.freeWeekends?.length ?? 0);
  const chartRows = (salesCharts.live?.korea?.length ?? 0)
    + (salesCharts.live?.global?.length ?? 0)
    + (salesCharts.weekly?.items?.length ?? 0)
    + (salesCharts.monthly?.items?.length ?? 0);
  const releaseRows = (salesCharts.releaseCalendar?.current?.length ?? 0)
    + (salesCharts.releaseCalendar?.upcoming?.length ?? 0);
  const measured = coverage?.measured ?? 0;

  const rows = [
    {
      id: 'players', eyebrow: 'DAILY', title: 'Steam 동시접속',
      metric: loading ? '읽는 중' : `${count(measured)} / ${count(totalGames)} 게임`,
      detail: '현재 플레이어 수를 날짜별 Reading으로 저장', cadence: '매일 10:10 KST 근처',
      at: fetchedAt,
      state: loading ? 'loading' : measured === totalGames ? 'ok' : 'partial',
    },
    {
      id: 'prices', eyebrow: 'DAILY', title: '가격·할인',
      metric: `추적 ${count(discounts.counts?.checked)} · 인기 ${count(popularDiscounts.counts?.checked)}`,
      detail: `현재 할인 ${count(discounts.discounts?.length)}개 · 인기 할인 ${count(popularDiscounts.discounts?.length)}개`,
      cadence: '일일 측정 작업과 함께',
      at: latest(discounts.completedAt, popularDiscounts.completedAt),
      state: (discounts.counts?.failed ?? 0) + (popularDiscounts.counts?.failed ?? 0) > 0 ? 'partial' : 'ok',
    },
    {
      id: 'free', eyebrow: 'HOURLY · :17', title: '무료 배포',
      metric: `${count(freeNow)}개 진행 중`,
      detail: 'Epic 무료 배포 · Steam 무료 소장·무료 주말', cadence: '매시간 17분',
      at: latest(epicFree.completedAt, steamFree.completedAt), state: 'ok',
    },
    {
      id: 'charts', eyebrow: 'HOURLY · :27', title: '판매·출시',
      metric: `차트 ${count(chartRows)} · 출시 ${count(releaseRows)}`,
      detail: '한국·글로벌·주간·월간 차트와 출시 달력', cadence: '매시간 27분',
      at: salesCharts.completedAt, state: chartRows > 0 ? 'ok' : 'partial',
    },
    {
      id: 'streaming', eyebrow: 'HOURLY · :37', title: '스트리밍 인기',
      metric: `${count(connected.length)} / 2 플랫폼`,
      detail: `치지직 ${count(streamRows.chzzk)} · Twitch ${count(streamRows.twitch)} 게임`,
      cadence: '매시간 37분',
      at: latest(...(streaming.platforms ?? []).map((platform) => platform.fetchedAt)),
      state: connected.length === 2 ? 'ok' : 'partial',
    },
  ];

  return (
    <section className="measurement-status" aria-labelledby="measurement-status-title">
      <header className="measurement-status-heading">
        <div>
          <p>AUTOMATED MEASUREMENT</p>
          <h3 id="measurement-status-title">지금 측정하고 있는 것</h3>
        </div>
        <span><i /> 자동 수집 운영 중</span>
      </header>
      <div className="measurement-status-grid">
        {rows.map((row) => (
          <article key={row.id} className={`measurement-card is-${row.state}`}>
            <div className="measurement-card-top">
              <span>{row.eyebrow}</span>
              <i aria-label={row.state === 'ok' ? '정상' : row.state === 'loading' ? '읽는 중' : '일부 확인'} />
            </div>
            <h4>{row.title}</h4>
            <strong>{row.metric}</strong>
            <p>{row.detail}</p>
            <footer>
              <span>{row.cadence}</span>
              <time>{checkedAt(row.at)}</time>
            </footer>
          </article>
        ))}
      </div>
      <p className="measurement-status-note">
        전일 대비·장르·순위 변화·장기 생존은 위 측정값에서 계산하며 별도 외부 수집값이 아니다.
      </p>
    </section>
  );
}
