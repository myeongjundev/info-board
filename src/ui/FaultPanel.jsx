// 장애 화면 — 카드 3. 5종이 서로 다른 문구로 나온다.

import { FAULT_COPY } from '../source/loadRecordsFile.js';

export default function FaultPanel({ fault, onRetry, busy }) {
  const copy = FAULT_COPY[fault?.fault] ?? FAULT_COPY.UNKNOWN;

  return (
    <div role="alert">
      <p className="fault-kind">{fault?.fault}</p>
      <p className="fault-title">{copy.title}</p>
      <p className="fault-body">{copy.body}</p>
      <p className="empty-note">
        정상값이 한 번도 없어 보여 줄 마지막 값이 없다. 숫자 자리를 채우지 않는다.
      </p>
      <button className="retry" onClick={onRetry} disabled={busy}>
        다시 시도
      </button>
    </div>
  );
}
