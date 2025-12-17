/**
 * Live Activity Component
 * Real-time log posledních akcí
 */

import React from 'react';
import { colors, spacing, shadows, borderRadius } from '../../config/theme';
import type { Event, EventType, CodeRange, Ticket } from '../../types';

interface LiveActivityProps {
  events: Event[];
  maxItems?: number;
  codeRanges: Record<string, CodeRange>;
  tickets: Record<string, Ticket>;
}

const getEventIcon = (type: EventType): string => {
  switch (type) {
    case 'ENTRY':
      return '✓';
    case 'CHECK':
      return 'ℹ';
    case 'EXIT':
      return '✓';
    default:
      return '•';
  }
};

const getEventColor = (type: EventType, overstay: number): string => {
  if (overstay > 0) return colors.error;
  switch (type) {
    case 'ENTRY':
      return colors.success;
    case 'CHECK':
      return colors.primary;
    case 'EXIT':
      return colors.textSecondary;
    default:
      return colors.textMuted;
  }
};

const getEventLabel = (type: EventType): string => {
  switch (type) {
    case 'ENTRY':
      return 'VSTUP';
    case 'CHECK':
      return 'CHECK';
    case 'EXIT':
      return 'VÝSTUP';
    default:
      return type;
  }
};

const formatTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatEAN = (ean: string): string => {
  // Zobraz jen posledních 7 číslic
  return `...${ean.slice(-7)}`;
};

export const LiveActivity: React.FC<LiveActivityProps> = ({ events, maxItems = 10, codeRanges, tickets }) => {
  const displayEvents = events.slice(0, maxItems);

  const getTicketName = (ean: string): string => {
    const ticket = tickets[ean];
    if (!ticket) return '';

    const range = codeRanges[ticket.rangeId];
    if (!range) return '';

    return range.name;
  };

  return (
    <div
      style={{
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        boxShadow: shadows.card,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          marginBottom: spacing.lg,
          paddingBottom: spacing.md,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>🔴</span>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
          LIVE AKTIVITA
        </h3>
      </div>

      {/* Events list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {displayEvents.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: spacing.xl,
              color: colors.textMuted,
            }}
          >
            Žádná aktivita
          </div>
        ) : (
          displayEvents.map((event, index) => {
            const eventColor = getEventColor(event.type, event.overstayMinutes);
            const isOverstay = event.overstayMinutes > 0;
            const ticketName = getTicketName(event.ean);

            return (
              <div
                key={event.id || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto',
                  gap: spacing.md,
                  alignItems: 'center',
                  padding: spacing.md,
                  backgroundColor: colors.background,
                  borderRadius: borderRadius.base,
                  fontSize: '0.875rem',
                  borderLeft: `3px solid ${eventColor}`,
                }}
              >
                {/* Time */}
                <div style={{ color: colors.textSecondary, fontWeight: 500, minWidth: '50px' }}>
                  {formatTime(event.timestamp.toDate())}
                </div>

                {/* EAN + Ticket Name */}
                <div>
                  <div style={{ color: colors.textPrimary, fontFamily: 'monospace', fontWeight: 600 }}>
                    EAN: {formatEAN(event.ean)}
                  </div>
                  {ticketName && (
                    <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '2px' }}>
                      {ticketName}
                    </div>
                  )}
                </div>

                {/* Type */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    color: eventColor,
                    fontWeight: 600,
                  }}
                >
                  <span>{getEventIcon(event.type)}</span>
                  <span>{getEventLabel(event.type)}</span>
                </div>

                {/* Info */}
                <div style={{ color: colors.textSecondary, textAlign: 'right', minWidth: '120px' }}>
                  {isOverstay ? (
                    <span style={{ color: colors.error, fontWeight: 600 }}>
                      ⚠ Doplatek {event.overstayMinutes} min
                    </span>
                  ) : event.type === 'ENTRY' ? (
                    <span>Čas: {event.remainingMinutes} min</span>
                  ) : event.type === 'CHECK' ? (
                    <span>Zbývalo: {event.remainingMinutes} min</span>
                  ) : (
                    <span>Zbývalo: {event.remainingMinutes} min</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

