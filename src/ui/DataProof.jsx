// 원자료 → 저장값 → 계산값 → 화면값을 한 자리에서 대조한다.
//
// 이 내용은 [docs/CROSSCHECK.md](../../docs/CROSSCHECK.md) 에 이미 있었지만
// **문서에만 있었다.** 화면을 보는 사람이 검산하려면 저장소를 열어야 했다는 뜻이다.
// 접이식으로 화면에 두면 그 자리에서 확인된다.
//
// 여기서 제일 중요한 줄은 맨 위다. **원자료는 화면값과 일치하지 않는다.**
// 동시접속자는 부르는 순간의 값이라 링크를 누를 때마다 다른 숫자가 나온다.
// 숨기면 "화면값이 원자료와 일치한다" 를 못 지킨 것이 되고, 드러내면 이 정보판이
// 하려는 말 그 자체가 된다.

import { useState } from 'react';

import { formatNumber, formatInstant, crosscheckRows } from '../view/board.js';
import { SOURCE } from '../source/definition.js';

export default function DataProof({ board }) {
  const [open, setOpen] = useState(false);

  if (!board?.reading) {
    return <p className="empty-note">정상값이 없어 대조할 것이 없다.</p>;
  }

  const { reading, game, comparison } = board;
  const cross = crosscheckRows(comparison);

  return (
    <>
      <button
        type="button"
        className="proof-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        {open ? '접기' : '펼쳐서 손으로 대조하기'}
      </button>

      {!open ? (
        <p className="source-url">
          화면에 보이는 숫자가 어디서 왔는지, 어떻게 계산됐는지를 한 자리에 편다.
          {cross ? ' 손계산 식도 함께 나온다.' : ' 견줄 이전 기록이 생기면 손계산 식도 나온다.'}
        </p>
      ) : (
        <div className="proof">
          <p className="caveat">
            <b>원자료는 화면값과 일치하지 않는다.</b> 동시접속자는 부르는 순간의
            사람 수라, 아래 링크를 누를 때마다 다른 숫자가 나온다. 화면값은{' '}
            {formatInstant(reading.fetchedAt, SOURCE.timezone)} 에 잰 값이고
            링크는 <b>지금</b> 값을 연다. 이 어긋남은 결함이 아니라 이 자료의 성질이다.
          </p>

          <dl className="proof-rows">
            <ProofRow label="대상" value={`${game?.name ?? `appid ${reading.appid}`} · appid ${reading.appid}`} />

            <div>
              <dt>원자료 주소</dt>
              <dd>
                <a className="source-link" href={reading.sourceUrl} target="_blank" rel="noreferrer">
                  지금 값 열기 ↗
                </a>
                <span className="proof-url">{reading.sourceUrl}</span>
              </dd>
            </div>

            <ProofRow label="저장값" value={`${reading.value} ${reading.unit}`} mono />
            <ProofRow label="저장 위치" value={`data/records.json · 열쇠 ${reading.date}|${reading.appid}`} mono />
            <ProofRow label="잰 날" value={`${reading.date} (${reading.timezone})`} mono />
            <ProofRow label="잰 시각" value={`${formatInstant(reading.fetchedAt, SOURCE.timezone)} · ${reading.fetchedAt}`} mono />

            {cross ? (
              <>
                <ProofRow label="이전 저장값" value={`${cross.previous.value} ${cross.unit} (${cross.previous.date})`} mono />
                <ProofRow label="손계산" value={cross.hand} mono strong />
                <ProofRow
                  label="계산값"
                  value={`${cross.arrow} ${cross.delta} ${cross.unit}${cross.percent === null ? '' : ` · ${cross.percent.toFixed(2)}%`}`}
                  mono
                />
                <ProofRow
                  label="화면값"
                  value={`${cross.arrow} ${formatNumber(Math.abs(cross.delta))} ${cross.unit}`}
                  mono
                  strong
                />
              </>
            ) : (
              <div>
                <dt>손계산</dt>
                <dd className="proof-none">
                  견줄 이전 기록이 아직 없다. <b>없는 차이를 만들지 않는다.</b>
                </dd>
              </div>
            )}
          </dl>

          <p className="source-url">
            <b>저장값과 화면값은 같은 숫자여야 하고, 손계산 식은 그 자리에서 맞아야
            한다.</b> 원자료만 다르다. 전체 대조 내역과 비밀값 검사는{' '}
            <a href="https://github.com/myeongjundev/info-board/blob/main/docs/CROSSCHECK.md" target="_blank" rel="noreferrer">
              docs/CROSSCHECK.md
            </a>{' '}
            에 있고, 기록이 쌓인 이력은{' '}
            <a href="https://github.com/myeongjundev/info-board/commits/main/data/records.json" target="_blank" rel="noreferrer">
              커밋 이력
            </a>
            에서 그대로 볼 수 있다.
          </p>
        </div>
      )}
    </>
  );
}

function ProofRow({ label, value, mono, strong }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={`${mono ? 'is-mono' : ''} ${strong ? 'is-strong' : ''}`.trim()}>{value}</dd>
    </div>
  );
}
