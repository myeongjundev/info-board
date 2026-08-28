// 재현 스위치. 주소창을 바꾸므로 새로고침해도 같은 상태가 나온다 — 캡처하기 좋다.

export default function FaultSwitch({ active, names }) {
  const url = (name) => {
    const u = new URL(window.location.href);
    if (name) u.searchParams.set('fault', name);
    else u.searchParams.delete('fault');
    return u.pathname + u.search;
  };
  const replayUrl = (name) => {
    const u = new URL(window.location.href);
    u.searchParams.delete('fault');
    u.searchParams.set('replay', name);
    return u.pathname + u.search;
  };

  return (
    <>
      <p className="fixture-switch-title">저장 파일 장애 시연 · 실제 마지막 정상값 사용</p>
      <div className="fault-row">
        {names.map((name) => (
          <a
            key={name}
            className={`fault-btn ${active && url(name) === window.location.pathname + window.location.search ? 'is-on' : ''}`}
            href={url(name)}
          >
            {name}
          </a>
        ))}
        <a className="fault-btn is-reset" href={url(null)}>정상으로</a>
      </div>
      <p className="source-url">
        현재 records.json을 먼저 읽고, 그 다음 정적 파일 읽기 실패를 모의한다.
        실제 마지막 정상값을 보존하는 제품 장애 화면이며 T04 fixture 판정 경로는 아니다.
      </p>
      <p className="fixture-switch-title">T04 공개 합성 fixture 재생 · C12~C21·C26</p>
      <div className="fault-row">
        {['timeout', 'auth', 'rate-limit', 'offline', 'schema', 'normal'].map((name) => (
          <a key={`replay-${name}`} className="fault-btn" href={replayUrl(name)}>{name}</a>
        ))}
      </div>
    </>
  );
}
