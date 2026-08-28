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
        과제 원문이 &quot;모의실험한다&quot; 로 명시한 부분이다. 실제 자료를 부르지 않고
        그 상태를 만들어 보인다. 재현 중에는 위에 재현 모드 띠가 뜬다.
      </p>
      <p className="fixture-switch-title">T04 공개 fixture 재생</p>
      <div className="fault-row">
        {['timeout', 'auth', 'rate-limit', 'offline', 'schema', 'normal'].map((name) => (
          <a key={`replay-${name}`} className="fault-btn" href={replayUrl(name)}>{name}</a>
        ))}
      </div>
    </>
  );
}
