// 이 할인이 언제까지인가. 두 할인 목록이 같은 단추를 쓴다.
//
// **모르면 아무 말도 안 한다.** 기간을 못 받은 줄에 `기간 미확인` 을 띄우면 화면이
// 그 줄만큼 시끄러워지는데, 정작 사람이 할 수 있는 일은 없다. 아는 것만 말하고
// 모르는 것은 비운다 — 없는 시각을 지어내지 않는 것과 같은 이유의 반대편이다.

import { discountDeadline, formatDeadline } from '../view/discountDeadline.js';

export default function DiscountDeadline({ endsAt, kind, className = 'deal-deadline' }) {
  const deadline = discountDeadline(endsAt);
  if (!deadline.known) return null;

  const exact = formatDeadline(endsAt);
  return (
    <p className={`${className}${deadline.urgent ? ' is-urgent' : ''}`}>
      <b>{deadline.label}</b>
      {/* 정확한 시각은 툴팁이 아니라 글자로 남긴다 — 손가락으로 보는 사람에게도 보여야 한다. */}
      <span>{kind ? `${kind} · ` : ''}{exact}</span>
    </p>
  );
}
