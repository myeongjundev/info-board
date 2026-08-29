// 곧 끝나는 할인을 맨 앞에 세우는 구역.
//
// 할인 목록은 여태 **할인율 순**이었다. 그러면 오늘 밤 끝나는 30% 가 열흘 남은 90%
// 뒤로 밀린다. 90% 는 내일 봐도 되고 30% 는 오늘 안 보면 없다 — 급한 쪽이 뒤에
// 있는 목록은 순서가 있으나 마나다.
//
// **순서만 바꾸고 할인율을 고쳐 부르지 않는다.** 아래 원래 목록은 그대로 있고,
// 이 구역은 그 목록에서 시각이 급한 것을 앞으로 꺼내 놓는 것뿐이다.
//
// 계산은 전부 `view/discountDeadline.js` 에 있다. 며칠 남았는지는 달력 경계 판단이라
// 브라우저를 띄워야만 확인되는 자리에 두면 검증할 수 없다.

import { endingSoonAcross, formatDeadline } from '../view/discountDeadline.js';
import { displayName } from '../view/gameDisplay.js';
import GameArt from './GameArt.jsx';

const won = new Intl.NumberFormat('ko-KR');
const headerUrl = (appid) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

function formatWon(minor) {
  return `₩${won.format(Math.round(minor / 100))}`;
}

export default function EndingSoon({ tracked, popular }) {
  const { rows, widened, withinDays, knownCount, totalCount } = endingSoonAcross([tracked, popular]);

  // 아는 것이 하나도 없으면 구역 자체를 안 그린다. `곧 끝나는 할인 없음` 은
  // **할인이 없다는 말로 읽힌다.** 우리가 모르는 것과 없는 것은 다르다.
  if (knownCount === 0 || rows.length === 0) return null;

  return (
    <section id="sec-ending" className="ending-soon" aria-labelledby="ending-soon-title">
      <header>
        <div>
          <p>ENDING SOON</p>
          <h2 id="ending-soon-title">곧 끝나는 할인</h2>
        </div>
        <span>
          {widened
            // 넓힌 사실을 숨기지 않는다. 이걸 안 적으면 이레 뒤 끝나는 것이
            // 오늘 끝나는 것처럼 읽힌다.
            ? `오늘·내일 끝나는 할인은 없다. ${withinDays}일 안에 끝나는 것을 대신 놓았다.`
            : '오늘 또는 내일 끝난다. 지나면 정가로 돌아간다.'}
          {' '}
          할인 {totalCount}개 가운데 종료 시각을 확인한 {knownCount}개에서 골랐다.
        </span>
      </header>

      <ol className="ending-soon-list">
        {rows.map(({ reading, deadline }) => (
          <li key={reading.appid} className={deadline.urgent ? 'is-urgent' : undefined}>
            <a className="ending-soon-art" href={reading.storeUrl} target="_blank" rel="noreferrer">
              {/* 성인 분류면 표지와 제목을 접는다 — 규칙 5-6. 순위·가격·할인율은 손대지 않는다. */}
              <GameArt src={reading.adult ? null : (reading.imageUrl || headerUrl(reading.appid))} width={460} height={215} />
            </a>
            <div className="ending-soon-copy">
              <b className="ending-soon-when">{deadline.label}</b>
              <h3>{displayName(reading)}</h3>
              <p>
                <span className="ending-soon-pct">-{reading.discountPercent}%</span>
                <del>{formatWon(reading.initialMinor)}</del>
                <strong>{formatWon(reading.finalMinor)}</strong>
              </p>
              <small>{reading.discountKind ? `${reading.discountKind} · ` : ''}{formatDeadline(reading.discountEndsAt)}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
