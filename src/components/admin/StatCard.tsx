/**
 * Stat Card Component
 * KPI karta pro dashboard
 */

import React from 'react';
import { colors, spacing, shadows, borderRadius } from '../../config/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    label: string;
  };
  color?: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = colors.primary,
  loading = false,
}) => {
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <div
      style={{
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        boxShadow: shadows.card,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        minHeight: '140px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dekorativní pruh */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: color,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ fontSize: '0.875rem', color: colors.textSecondary, fontWeight: 500 }}>
          {title}
        </div>
        {icon && (
          <div
            style={{
              fontSize: '2rem',
              opacity: 0.2,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 'clamp(2rem, 3vw, 2.5rem)',
          fontWeight: 700,
          color: colors.textPrimary,
          lineHeight: 1,
        }}
      >
        {loading ? (
          <div
            style={{
              width: '60%',
              height: '2rem',
              backgroundColor: colors.border,
              borderRadius: borderRadius.base,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ) : (
          value
        )}
      </div>

      {/* Trend */}
      {trend && !loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            fontSize: '0.875rem',
          }}
        >
          <span
            style={{
              color: isPositiveTrend ? colors.success : colors.error,
              fontWeight: 600,
            }}
          >
            {isPositiveTrend ? '↑' : '↓'} {Math.abs(trend.value)}
          </span>
          <span style={{ color: colors.textMuted }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
};

