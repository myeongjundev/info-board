// 이 구역의 값들을 언제 잰 것인지 한 줄로 말한다.
//
// 네 패널(줄세우기·장르·순위 이동·오래된 게임)이 같은 사실을 말해야 해서 문장을
// 여기 하나만 둔다. 같은 말을 네 곳에 적으면 언젠가 갈라지고, 그게 이 저장소가
// 문서에서 이미 한 번 겪은 사고다.
//
// **값은 빼지 않는다.** 다른 시각에 잰 줄도 실제로 잰 값이므로 화면에 그대로
// 남기고, 대신 한 번에 잰 것이 아니라는 사실을 적는다. 비교(movers)만은 다르게
// 다룬다 — 그쪽은 시각이 다르면 없는 변화를 만들어 내기 때문이다.

import { formatInstant, formatSpan } from '../view/board.js';
import { SOURCE } from '../source/definition.js';

// subject 는 **조사까지 붙여서** 받는다. 여기서 은/는을 붙이면 받침에 따라
// `이 순위은` 이 나온다. 실제로 한 번 나왔다.
export default function SpreadNote({ spread, subject = '이 구역의 값은' }) {
  // 한 배치로 잰 날은 적을 것이 없다. 없는 경고를 만들지 않는다.
  if (!spread || spread.coherent) return null;

  return (
    <p className="spread-note">
      <b>{subject} 한 번에 잰 것이 아니다.</b>{' '}
      {formatInstant(spread.from, SOURCE.timezone)} 부터{' '}
      {formatInstant(spread.to, SOURCE.timezone)} 까지 <b>{formatSpan(spread.spanMs)}</b>에
      걸쳐 쟀고, 그중 <b>{spread.offBatch}개</b>가 대표값과 다른 시각에 잰 것이다.
      동시접속자는 부르는 순간의 값이라 <b>시각이 다르면 값의 뜻도 다르다</b> — 아침과
      저녁은 접속자가 게임마다 반대로 움직인다. 값은 지우지 않고 그대로 두었다.
    </p>
  );
}
