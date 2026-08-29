import discounts from '../../data/discounts.json';
import popularDiscounts from '../../data/popular-discounts.json';
import epicFree from '../../data/epic-free.json';
import steamFree from '../../data/steam-free.json';
import salesCharts from '../../data/sales-charts.json';
import streaming from '../../data/streaming.json';
import './measurement-status.css';

const COLORS = ['cyan', 'violet', 'green', 'amber', 'muted'];

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

function MetricIcon({ name }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (name === 'players') return <svg {...common}><path d="M4 18c0-3 2.4-5 6-5s6 2 6 5" /><circle cx="10" cy="7" r="3" /><path d="M17 10c2.1.4 3.5 1.8 3.5 4M17 4.5a2.5 2.5 0 0 1 0 5" /></svg>;
  if (name === 'prices') return <svg {...common}><path d="M4 7.5V4h3.5L20 16.5 16.5 20 4 7.5Z" /><circle cx="8" cy="8" r="1.2" /><path d="m12 10 4 4M16 10l-4 4" /></svg>;
  if (name === 'free') return <svg {...common}><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M7.5 7C5 7 5 3.5 7.5 4c2 .4 4.5 3 4.5 3M16.5 7c2.5 0 2.5-3.5 0-3-2 .4-4.5 3-4.5 3" /></svg>;
  if (name === 'charts') return <svg {...common}><path d="M4 19V9h4v10M10 19V4h4v15M16 19v-7h4v7M3 19h18" /></svg>;
  return <svg {...common}><path d="M6 18V6l11 6-11 6Z" /><path d="M17 5.5c2 1.6 3 3.8 3 6.5s-1 4.9-3 6.5" /></svg>;
}

function Status({ state }) {
  const label = state === 'ok' ? '정상' : state === 'loading' ? '읽는 중' : '일부 확인';
  return <span className={`measurement-state is-${state}`}><i />{label}</span>;
}

function CoverageRing({ value, total }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="coverage-ring" style={{ '--coverage': `${percent * 3.6}deg` }} role="img" aria-label={`측정 범위 ${value}/${total}, ${percent}%`}>
      <div><strong>{percent}</strong><span>%</span></div>
    </div>
  );
}

function StackedBar({ segments }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div className="stack-chart" role="img" aria-label={segments.map((segment) => `${segment.label} ${segment.value}`).join(', ')}>
      <div className="stack-track">
        {segments.map((segment, index) => <i key={segment.label} className={`is-${COLORS[index]}`} style={{ width: `${total ? (segment.value / total) * 100 : 0}%` }} />)}
      </div>
      <div className="stack-legend">
        {segments.map((segment, index) => <span key={segment.label}><i className={`is-${COLORS[index]}`} />{segment.label}<b>{count(segment.value)}</b></span>)}
      </div>
    </div>
  );
}

function BarChart({ rows, label }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="mini-bars" role="img" aria-label={`${label}: ${rows.map((row) => `${row.label} ${row.value}`).join(', ')}`}>
      {rows.map((row, index) => (
        <div className="mini-bar-row" key={row.label}>
          <span>{row.label}</span><i><b className={`is-${COLORS[index % COLORS.length]}`} style={{ width: `${(row.value / max) * 100}%` }} /></i><strong>{count(row.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function CardShell({ id, eyebrow, title, state, metric, detail, cadence, at, children }) {
  return (
    <article className={`measurement-card measurement-card-${id} is-${state}`}>
      <header><span className="measurement-icon"><MetricIcon name={id} /></span><div><small>{eyebrow}</small><h4>{title}</h4></div><Status state={state} /></header>
      <div className="measurement-metric"><strong>{metric}</strong><span>{detail}</span></div>
      {children}
      <footer><span>{cadence}</span><time>최근 {checkedAt(at)}</time></footer>
    </article>
  );
}

export default function MeasurementStatus({ coverage, totalGames, loading = false, fetchedAt = null }) {
  const platforms = streaming.platforms ?? [];
  const connected = platforms.filter((platform) => platform.status === 'ok');
  const streamRows = platforms.map((platform) => ({
    label: platform.id === 'chzzk' ? '치지직' : 'Twitch',
    value: (platform.rankings ?? []).reduce((sum, row) => sum + (Number(row.viewerCount) || 0), 0),
  }));
  const freeRows = [
    { label: 'Epic', value: epicFree.giveaways?.length ?? 0 },
    { label: 'Steam 소장', value: steamFree.giveaways?.length ?? 0 },
    { label: '무료 주말', value: steamFree.freeWeekends?.length ?? 0 },
  ];
  const freeNow = freeRows.reduce((sum, row) => sum + row.value, 0);
  const priceRows = [
    { label: '할인', value: discounts.counts?.discount ?? 0 },
    { label: '정가', value: discounts.counts?.regular ?? 0 },
    { label: '무료', value: discounts.counts?.free ?? 0 },
    { label: '가격 없음', value: discounts.counts?.unpriced ?? 0 },
    { label: '실패', value: discounts.counts?.failed ?? 0 },
  ];
  const salesRows = [
    { label: '한국', value: salesCharts.live?.korea?.length ?? 0 },
    { label: '글로벌', value: salesCharts.live?.global?.length ?? 0 },
    { label: '주간', value: salesCharts.weekly?.items?.length ?? 0 },
    { label: '월간', value: salesCharts.monthly?.items?.length ?? 0 },
    { label: '출시', value: (salesCharts.releaseCalendar?.current?.length ?? 0) + (salesCharts.releaseCalendar?.upcoming?.length ?? 0) },
  ];
  const measured = coverage?.measured ?? 0;
  const priceFailures = (discounts.counts?.failed ?? 0) + (popularDiscounts.counts?.failed ?? 0);

  return (
    <section className="measurement-status" aria-labelledby="measurement-status-title">
      <header className="measurement-status-heading">
        <div><p>AUTOMATED MEASUREMENT</p><h3 id="measurement-status-title">지금 측정하고 있는 것</h3></div>
        <div className="measurement-schedule" aria-label="자동 수집 일정"><span><b>10:10</b> 동시접속·가격</span><i /><span><b>:17</b> 무료</span><i /><span><b>:27</b> 판매</span><i /><span><b>:37</b> 스트리밍</span></div>
      </header>

      <div className="measurement-status-grid">
        <CardShell id="players" eyebrow="DAILY READING" title="Steam 동시접속" state={loading ? 'loading' : measured === totalGames ? 'ok' : 'partial'} metric={loading ? '기록 읽는 중' : `${count(measured)} / ${count(totalGames)} 게임`} detail="날짜별로 같은 기준의 Reading을 저장" cadence="매일 10:10 KST 근처" at={fetchedAt}>
          <div className="coverage-visual"><CoverageRing value={measured} total={totalGames} /><p><b>{count(measured)}</b>개 측정 완료<small>{count(Math.max(0, totalGames - measured))}개 남음</small></p></div>
        </CardShell>

        <CardShell id="prices" eyebrow="DAILY SNAPSHOT" title="가격·할인" state={priceFailures ? 'partial' : 'ok'} metric={`${count(discounts.counts?.checked)}개 확인`} detail={`인기 Top 100도 ${count(popularDiscounts.counts?.checked)}개 별도 확인`} cadence="일일 측정 작업과 함께" at={latest(discounts.completedAt, popularDiscounts.completedAt)}>
          <StackedBar segments={priceRows} />
        </CardShell>

        <CardShell id="free" eyebrow="HOURLY · :17" title="무료 배포" state="ok" metric={`${count(freeNow)}개 진행 중`} detail="0개도 정상 응답과 구분해서 표시" cadence="매시간 17분" at={latest(epicFree.completedAt, steamFree.completedAt)}>
          <div className="free-blocks" role="img" aria-label={freeRows.map((row) => `${row.label} ${row.value}개`).join(', ')}>{freeRows.map((row, index) => <div key={row.label} className={`is-${COLORS[index]}`}><span>{row.label}</span><strong>{count(row.value)}</strong><small>게임</small></div>)}</div>
        </CardShell>

        <CardShell id="charts" eyebrow="HOURLY · :27" title="판매·출시" state={salesRows.some((row) => row.value > 0) ? 'ok' : 'partial'} metric="5개 차트 묶음" detail="순위 목록 개수이며 판매량을 뜻하지 않음" cadence="매시간 27분" at={salesCharts.completedAt}>
          <BarChart rows={salesRows} label="판매와 출시 목록" />
        </CardShell>

        <CardShell id="streaming" eyebrow="HOURLY · :37" title="스트리밍 인기" state={connected.length === 2 ? 'ok' : 'partial'} metric={`${count(connected.length)} / 2 플랫폼 연결`} detail="Top 10 시청자 합계 · 플랫폼끼리 합산하지 않음" cadence="매시간 37분" at={latest(...platforms.map((platform) => platform.fetchedAt))}>
          <BarChart rows={streamRows} label="플랫폼별 Top 10 시청자" />
        </CardShell>
      </div>

      <p className="measurement-status-note"><b>그래프를 읽는 법</b> 비율은 각 수집 범위 안에서만 계산한다. 전일 대비·장르·순위 변화·장기 생존은 위 측정값에서 만든 분석이다.</p>
    </section>
  );
}
