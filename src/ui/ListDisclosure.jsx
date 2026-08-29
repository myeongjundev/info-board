export default function ListDisclosure({
  expanded, onToggle, visible, total, collapsedNote,
}) {
  if (total <= visible && !expanded) return null;

  return (
    <div className="list-disclosure">
      <p>
        <b>{expanded ? `전체 ${total}개` : `상위 ${visible}개`}</b> 표시
        {!expanded && collapsedNote && <span> · {collapsedNote}</span>}
      </p>
      <button type="button" onClick={onToggle} aria-expanded={expanded}>
        {expanded ? '목록 접기' : `전체 ${total}개 보기`}
        <span aria-hidden="true">{expanded ? '↑' : '↓'}</span>
      </button>
    </div>
  );
}
