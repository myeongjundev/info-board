// 하위 페이지 상단 띠.
//
// 전에는 페이지마다 `← 전체 현황` 하나와 작은 글자 나브가 붙은 얇은 줄이었다.
// 첫 화면의 상단 띠와 가구가 달라서, 넘어가는 순간 머리가 통째로 바뀌었다.
//
// **같은 워드마크, 같은 나브를 쓴다.** 그리고 나브에 네 축을 다 넣는다 —
// 첫 화면으로 돌아가는 길이 `← 전체 현황` 이라는 별도의 말이 아니라
// `몇 명이 하나` 라는 같은 이름의 한 칸이 된다. 길이 네 개면 어디서나 네 개다.

import { SERVICE_AXES } from '../view/overview.js';

export default function SubpageTopBar({ current, caption }) {
  return (
    <header className="topbar is-subpage">
      <div className="topbar-left">
        <a className="wordmark" href="#sec-now">GAME PULSE</a>
        <p><span>{caption}</span></p>
      </div>
      <div className="topbar-right">
        <nav className="topbar-service-links" aria-label="서비스 페이지">
          {SERVICE_AXES.map((axis) => (
            <a
              key={axis.id}
              className={`${axis.navClass}${axis.href === current ? ' is-current' : ''}`}
              href={axis.href}
              aria-current={axis.href === current ? 'page' : undefined}
            >{axis.question}</a>
          ))}
        </nav>
      </div>
    </header>
  );
}
