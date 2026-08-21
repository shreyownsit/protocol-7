import React from 'react';
import { OctagonAlert, TriangleAlert, AlertCircle, CheckCircle2 } from 'lucide-react';
import { RiskLevel } from '@/types/document';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'default' | 'compact';
  showIcon?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'default',
  showIcon = true,
  className = '',
}) => {
  const config = {
    critical: {
      label: 'Critical',
      color: 'var(--color-critical)',
      bg: '#C7333314',
      border: '#C7333340',
      icon: OctagonAlert,
    },
    high: {
      label: 'High',
      color: 'var(--color-high)',
      bg: '#D65A3A14',
      border: '#D65A3A40',
      icon: TriangleAlert,
    },
    moderate: {
      label: 'Moderate',
      color: 'var(--color-moderate)',
      bg: '#C68A2B14',
      border: '#C68A2B40',
      icon: AlertCircle,
    },
    low: {
      label: 'Low',
      color: 'var(--color-low)',
      bg: '#4B8F6814',
      border: '#4B8F6840',
      icon: CheckCircle2,
    },
  }[level];

  const IconComponent = config.icon;
  const isCompact = size === 'compact';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full transition-all duration-150 ${
        isCompact
          ? 'px-2 py-0.5 text-[11px] leading-tight'
          : 'px-2.5 py-1 text-xs leading-normal'
      } ${className}`}
      style={{
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
      }}
      aria-label={`${config.label} risk level`}
    >
      {showIcon && (
        <IconComponent
          size={isCompact ? 11 : 13}
          strokeWidth={2.2}
          className="shrink-0"
          aria-hidden="true"
        />
      )}
      <span className="tracking-tight">{config.label}</span>
    </span>
  );
};
