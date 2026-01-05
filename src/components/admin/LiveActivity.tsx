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
  onManualLogout: (ean: string) => void;
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
  const date = timestamp.toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
  });
  const time = timestamp.toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} ${time}`;
};

const formatEAN = (ean: string): string => {
  // Zobraz jen posledních 7 číslic
  return `...${ean.slice(-7)}`;
};

export const LiveActivity: React.FC<LiveActivityProps> = ({ events, maxItems = 10, codeRanges, tickets, onManualLogout }) => {
  const displayEvents = events.slice(0, maxItems);

  const getTicketName = (ean: string): string => {
    const ticket = tickets[ean];
    if (!ticket) return '';

    const range = codeRanges[ticket.rangeId];
    if (!range) return '';

    return range.name;
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div
      style={{
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.lg,
        padding: 'clamp(1rem, 3vw, 2rem)',
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
        <span style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>🔴</span>
        <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 600, margin: 0 }}>
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
            const ticket = tickets[event.ean];
            const isInside = ticket?.status === 'INSIDE';

            return (
              <div
                key={event.id || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto auto',
                  gap: spacing.sm,
                  alignItems: isMobile ? 'flex-start' : 'center',
                  padding: 'clamp(0.75rem, 2vw, 1rem)',
                  backgroundColor: colors.background,
                  borderRadius: borderRadius.base,
                  fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                  borderLeft: `3px solid ${eventColor}`,
                }}
              >
                {isMobile ? (
                  // Mobile layout - stacked
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: colors.textSecondary, fontWeight: 500 }}>
                        {formatTime(event.timestamp.toDate())}
                      </div>
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
                    </div>
                    <div>
                      <div style={{ color: colors.textPrimary, fontFamily: 'monospace', fontWeight: 600 }}>
                        EAN: {formatEAN(event.ean)}
                      </div>
                      {ticketName && (
                        <div style={{ fontSize: '0.7rem', color: colors.textSecondary, marginTop: '2px' }}>
                          {ticketName}
                        </div>
                      )}
                    </div>
                    <div style={{ color: colors.textSecondary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                      {isInside && (
                        <button
                          onClick={() => onManualLogout(event.ean)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: colors.error,
                            color: 'white',
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Odhlásit
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  // Desktop layout - horizontal
                  <>
                    {/* Time */}
                    <div style={{ color: colors.textSecondary, fontWeight: 500, minWidth: '100px' }}>
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

                    {/* Info + Actions */}
                    <div style={{ color: colors.textSecondary, textAlign: 'right', minWidth: '120px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
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

                      {isInside && (
                        <button
                          onClick={() => onManualLogout(event.ean)}
                          style={{
                            padding: '2px 8px',
                            backgroundColor: colors.error,
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: '4px'
                          }}
                        >
                          Odhlásit
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

