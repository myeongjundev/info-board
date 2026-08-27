// 대표값 — 카드 1. 값·단위·출처·잰 시각이 한 자리에서 나온다.

import { SOURCE } from '../source/definition.js';
import { headerUrl } from '../source/artwork.js';
import GameArt from './GameArt.jsx';
import { formatNumber, formatInstant, STATE } from '../view/board.js';
import { FAULT_COPY } from '../source/loadRecordsFile.js';

export default function HeroValue({ board, status, fault, onRetry }) {
  if (!board || board.state === STATE.EMPTY) {
    // 정상값이 한 번도 없으면 숫자를 만들어내지 않는다.
    return (
      <>
        <p className="hero-game">표시할 정상값이 없다</p>
        <div className="hero-value">
          <span className="hero-number is-empty">—</span>
        </div>
        <p className="empty-note">
          아직 한 번도 정상으로 재지 못했다. 값이 0 인 것과 값이 없는 것은 다르므로
          숫자 자리를 비워 둔다.
        </p>
      </>
    );
  }

  const { reading, game, elapsed } = board;
  const stale = status === 'fault' || board.state === STATE.STALE;

  return (
    <>
      {status === 'fault' && (
        <p className="sim-banner" role="status">
          {FAULT_COPY[fault.fault]?.title ?? '실패'} — 아래는 <b>마지막 정상값</b>이다.
          잰 시각을 지금으로 바꾸지 않는다.
        </p>
      )}

      {/* 그림은 이름을 대신하지 않는다. 안 오면 이 자리가 통째로 접힌다. */}
      <GameArt className="hero-art" src={headerUrl(reading.appid)} width={460} height={215} lazy={false} />

      <p className="hero-game">
        {game?.name ?? `appid ${reading.appid}`}
        {game?.year && <span>{game.year}</span>}
      </p>

      <div className="hero-value">
        <span className="hero-number">{formatNumber(reading.value)}</span>
        <span className="hero-unit">{reading.unit}</span>
      </div>

      <dl className="timing">
        <div>
          <dt>잰 날</dt>
          <dd>
            {reading.date}
            <small>{reading.timezone}</small>
          </dd>
        </div>
        <div>
          <dt>잰 시각</dt>
          <dd>
            {formatInstant(reading.fetchedAt, SOURCE.timezone)}
            {elapsed && <small>{elapsed.text}</small>}
          </dd>
        </div>
      </dl>

      {board.clockSkew ? (
        <p className="caveat">
          <b>이 브라우저 시계가 어긋나 있다.</b> 기록의 날짜({reading.date})가 이
          브라우저가 아는 오늘보다 뒤에 있다. 값과 잰 시각은 위에 적힌 그대로이고,
          <b> 얼마나 지났는지만 셀 수 없다.</b> 기기 시간을 맞추면 다시 보인다.
        </p>
      ) : stale && (
        <p className="caveat">
          <b>오래된 자료다.</b>{' '}
          {status === 'fault'
            ? '지금 기록 파일을 읽지 못했다.'
            : `마지막으로 잰 날이 ${reading.date} 이고 오늘 것이 아니다.`}{' '}
          값은 지우지 않고 그대로 두되, 잰 시각은 위에 적힌 그때 그대로다.
        </p>
      )}

      {status === 'fault' && (
        <button className="retry" onClick={onRetry} disabled={status === 'loading'}>
          다시 시도
        </button>
      )}
    </>
  );
}
