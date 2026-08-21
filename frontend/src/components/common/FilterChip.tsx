import React from 'react';

interface FilterChipProps {
  label: string;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
  accentColor?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  count,
  isSelected,
  onClick,
  accentColor,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border ${
        isSelected
          ? 'bg-[var(--color-primary-dark)] text-[var(--color-surface-primary)] border-[var(--color-primary-dark)] shadow-xs'
          : 'bg-[var(--color-surface-primary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]'
      }`}
      aria-pressed={isSelected}
    >
      {accentColor && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
            isSelected
              ? 'bg-white/20 text-white'
              : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
