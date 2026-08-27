// 구획 나브. MSN 날씨의 `현재 · 시간별 · 세부 정보 · 지도 · 추세 · 뉴스` 줄에 대응한다.
//
// **생김새는 가져왔고 동작은 바꿨다.** 거기서는 누르면 내용이 갈아끼워지지만
// 여기서는 그 구획으로 스크롤만 한다. 과제 브리프가 카드 1·5 의 통과 기준을
// `한 화면에 보인다` 로 못박아 두어서, 탭 뒤로 숨기면 그 순간 조건이 깨진다.
//
// 지금 어느 구획을 보고 있는지는 IntersectionObserver 가 표시한다.

import { useEffect, useState } from 'react';

export default function SectionNav({ items }) {
  const [active, setActive] = useState(items[0]?.id);
  // 실제로 페이지에 있는 구획만 줄에 올린다.
  //
  // 값이 하나도 없는 상태(EMPTY)에서는 순위·움직임 같은 구획이 아예 안 그려진다.
  // 그때도 나브에 남겨 두면 눌러도 아무 일이 없는 줄이 생기고, 화면에 없는 것을
  // 있는 것처럼 광고하는 셈이 된다.
  const [present, setPresent] = useState(() => items.map((i) => i.id));

  useEffect(() => {
    const seen = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.intersectionRatio);
        // 화면에 가장 많이 걸친 구획을 현재로 본다.
        let best = null;
        let ratio = 0;
        for (const [id, r] of seen) if (r > ratio) { best = id; ratio = r; }
        if (best) setActive(best);
      },
      { threshold: [0, 0.15, 0.4, 0.75, 1], rootMargin: '-80px 0px -55% 0px' },
    );

    const nodes = items.map((i) => document.getElementById(i.id)).filter(Boolean);
    const ids = nodes.map((n) => n.id);
    // 달라졌을 때만 세운다.
    //
    // 이 효과는 의존성 배열이 없어 렌더마다 돈다 — 자료가 늦게 와서 구획이 뒤늦게
    // 생기는 것을 잡아야 하기 때문이다. 그래서 매번 새 배열을 그대로 넣으면
    // 상태가 늘 바뀐 것으로 보여 렌더가 끝없이 돈다. 내용으로 견주고 나서 세운다.
    setPresent((old) => (old.length === ids.length && old.every((v, k) => v === ids[k]) ? old : ids));
    for (const n of nodes) io.observe(n);
    return () => io.disconnect();
  });   // 의존성을 두지 않는다 — 구획이 뒤늦게 생기는 것을 잡아야 한다

  const shown = items.filter((i) => present.includes(i.id));
  if (shown.length === 0) return null;

  return (
    <nav className="secnav" aria-label="구획 바로가기">
      <ul>
        {shown.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={i.id === active ? 'is-on' : undefined}
              aria-current={i.id === active ? 'true' : undefined}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
