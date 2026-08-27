// 오른쪽 위 설정 버튼이 여는 팝업. MSN 날씨의 지역·언어 설정에 대응한다.
//
// 거기서 고르는 것은 지역과 언어지만, 여기서 고를 수 있는 것은 대표 게임뿐이다.
// 시간대와 재는 시각은 **고를 수 없다.** 값이 그 시각에 잰 것이라서 그렇다 —
// 화면에서 시간대를 바꾸면 잰 시각과 보는 시각이 어긋나고, 그것이 이 정보판이
// 잡아내려는 거짓말이다. 그래서 바꾸는 자리가 아니라 **적어 두는 자리**로 뒀다.

import { useEffect, useRef } from 'react';

export default function SettingsModal({ games, selectedAppid, defaultAppid, source, onPick, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    // 열리면 첫 요소로 초점을 옮기고, Esc 로 닫는다.
    ref.current?.querySelector('button')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-veil" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="페이지 설정" ref={ref}>
        <div className="modal-head">
          <h2>페이지 설정</h2>
          <button type="button" className="modal-x" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <section className="modal-sect">
          <h3>대표값으로 볼 게임</h3>
          <p className="modal-note">
            매일 재는 {games.length}개 중에서 고른다. <b>고른다고 새로 부르지 않는다</b> —
            16개를 이미 같은 시각에 다 재 뒀고, 어느 줄을 크게 볼지만 바뀐다.
          </p>
          <ul className="modal-games">
            {games.map((g) => (
              <li key={g.appid}>
                <button
                  type="button"
                  className={g.appid === selectedAppid ? 'is-on' : undefined}
                  onClick={() => onPick(g.appid)}
                >
                  <span className="modal-game-name">{g.name}</span>
                  <span className="modal-game-meta">
                    {g.year}
                    {g.appid === defaultAppid && <em> 기본</em>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="modal-sect">
          <h3>바꿀 수 없는 것</h3>
          <dl className="modal-fixed">
            <div>
              <dt>기준 시간대</dt>
              <dd>{source?.timezone ?? '—'}</dd>
            </div>
            <div>
              <dt>재는 시각</dt>
              <dd>매일 {source?.measuredAtLocal ?? '—'}</dd>
            </div>
            <div>
              <dt>단위</dt>
              <dd>{source?.unit ?? '—'}</dd>
            </div>
          </dl>
          <p className="modal-note">
            <b>이 셋은 고르는 자리가 아니라 적어 두는 자리다.</b> 값이 저 시간대의
            저 시각에 잰 것이라서 그렇다. 화면에서 시간대를 바꾸면 잰 시각과 보는
            시각이 어긋나고, 그 어긋남이 이 정보판이 잡아내려는 거짓말이다.
          </p>
        </section>
      </div>
    </div>
  );
}
