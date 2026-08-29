export default function SegmentControl({
  label, value, onChange, options, role = 'group', className = '',
}) {
  return (
    <div className={`segment-control ${className}`.trim()} role={role} aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            className={active ? 'is-active' : undefined}
            type="button"
            role={role === 'tablist' ? 'tab' : undefined}
            aria-selected={role === 'tablist' ? active : undefined}
            aria-pressed={role === 'group' ? active : undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.meta !== undefined && <span>{option.meta}</span>}
          </button>
        );
      })}
    </div>
  );
}
