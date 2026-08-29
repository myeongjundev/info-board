// 어두운 화면 ↔ 밝은 화면.
//
// 네 화면이 같은 단추를 쓴다. 첫 화면에만 두면 하위 페이지로 넘어간 사람은
// 바꿀 방법이 없고, 페이지마다 따로 만들면 언젠가 서로 다르게 생긴다 —
// 상단 띠를 하나로 묶은 것과 같은 이유다.
//
// 상태는 문서(`data-theme`)와 저장소에 있지 이 컴포넌트에 있지 않다. 그래서
// 네 곳에 놓아도 서로 어긋나지 않는다.

import { useState } from 'react';

import { applyTheme, resolveTheme, saveTheme } from './theme.js';

export default function ThemeToggle({ className = 'gear theme-toggle' }) {
  const [theme, setTheme] = useState(() => resolveTheme());
  const light = theme === 'light';

  return (
    <button
      type="button"
      className={className}
      aria-pressed={light}
      aria-label={light ? '어두운 화면으로 바꾸기' : '밝은 화면으로 바꾸기'}
      title={light ? '어두운 화면으로' : '밝은 화면으로'}
      onClick={() => {
        const next = light ? 'dark' : 'light';
        saveTheme(next);
        setTheme(applyTheme(next));
      }}
    >
      <span aria-hidden="true">{light ? '☾' : '☀'}</span>
    </button>
  );
}
