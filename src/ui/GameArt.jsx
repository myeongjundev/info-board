// 게임 표지 그림. **안 오면 조용히 사라진다.**
//
// 이 화면의 주제가 "데이터가 안 올 때" 인데, 정작 안 올 수 있는 것이 이 그림이다.
// CDN 이 죽거나 막히거나 오프라인이면 안 온다. 그때 깨진 네모나 대체 텍스트 상자가
// 남으면 **그림이 안 온 것이 자료가 안 온 것처럼 보인다.** 그래서 자리째 접는다.
//
// alt 를 빈 문자열로 두는 것도 같은 이유다. 게임 이름은 옆에 글자로 이미 있어서
// 화면 낭독기가 같은 이름을 두 번 읽게 만들 뿐이다. 이 그림은 정보를 안 나른다.

import { useState } from 'react';

export default function GameArt({ src, width, height, className, lazy = true, folded = false }) {
  const [failed, setFailed] = useState(false);

  // 접은 자리는 폭을 지킨다. 안 온 자리는 접는다. 이 둘은 다른 일이다.
  //
  // 위 주석이 "자리째 접는다" 고 한 것은 **그림이 안 왔을 때** 다. 그때 빈 상자를
  // 남기면 그림이 안 온 것이 자료가 안 온 것처럼 보인다. 그 이유는 그대로다.
  //
  // 성인 분류를 접는 것은 실패가 아니라 우리가 고른 표시다. 그런데 같은 코드가
  // 둘을 처리해서, 목록에서 접힌 행만 제목이 표지 폭만큼 왼쪽으로 당겨져 열이
  // 어긋나 있었다 (2026-08-28 공개 주소 #/charts 18·19위). 우리가 고른 표시가
  // 배치를 흐트러뜨리면 그건 접은 값이 아니라 화면이 어긋난 것으로 읽힌다.
  if (folded && !src) return <span className={`art-hold ${className ?? ''}`.trim()} aria-hidden="true" />;

  if (failed || !src) return null;

  return (
    <img
      className={className}
      src={src}
      alt=""
      width={width}
      height={height}
      // 첫 화면에 바로 보이는 그림까지 미루면 제일 중요한 것이 제일 늦게 온다.
      // 목록 16장은 미루고, 대표값 한 장은 바로 받는다.
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
