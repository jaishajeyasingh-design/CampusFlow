import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  status?: string;
  variant?: StatusVariant;
  label?: string;
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  showDot = true,
  className = '',
}) => {
  const resolveVariant = (statusText?: string): StatusVariant => {
    if (variant) return variant;
    if (!statusText) return 'neutral';
    const s = statusText.toUpperCase();
    if (['APPROVED', 'ACTIVE', 'COMPLETED', 'SUCCESS', 'VERIFIED'].includes(s)) return 'success';
    if (['PENDING', 'PENDING_FACULTY_APPROVAL', 'WARNING', 'IN_REVIEW'].includes(s)) return 'warning';
    if (['REJECTED', 'CANCELLED', 'FAILED', 'INACTIVE', 'DANGER'].includes(s)) return 'danger';
    if (['DRAFT', 'ONGOING', 'INFO', 'IN_PROGRESS'].includes(s)) return 'info';
    return 'neutral';
  };

  const currentVariant = resolveVariant(status);

  const variantStyles: Record<StatusVariant, { badge: string; dot: string }> = {
    success: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    warning: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
    },
    danger: {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    },
    info: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
    },
    neutral: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
    },
  };

  const formatText = (text?: string) => {
    if (label) return label;
    if (!text) return '';
    return text
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const config = variantStyles[currentVariant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.badge} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0`} />}
      <span>{formatText(status)}</span>
    </span>
  );
};

export default StatusBadge;
