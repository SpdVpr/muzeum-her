/**
 * Admin Logs Page
 * Přehled všech událostí (events)
 */

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import type { Event, CodeRange } from '../../types';

export const Logs: React.FC = () => {
  const [events, setEvents] = useState<(Event & { id: string })[]>([]);
  const [codeRanges, setCodeRanges] = useState<Record<string, CodeRange>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ENTRY' | 'CHECK' | 'EXIT'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [maxEvents, setMaxEvents] = useState(100);

  // Načtení code_ranges
  useEffect(() => {
    const loadCodeRanges = async () => {
      try {
        const rangesSnapshot = await getDocs(collection(db, 'code_ranges'));
        const rangesMap: Record<string, CodeRange> = {};
        
        rangesSnapshot.forEach((doc) => {
          rangesMap[doc.id] = { id: doc.id, ...doc.data() } as CodeRange;
        });
        
        setCodeRanges(rangesMap);
      } catch (err: any) {
        console.error('Error loading code ranges:', err);
      }
    };

    loadCodeRanges();
  }, []);

  // Real-time listener pro events
  useEffect(() => {
    const eventsQuery = query(
      collection(db, 'events'),
      orderBy('timestamp', 'desc'),
      limit(maxEvents)
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (Event & { id: string })[];

        setEvents(eventsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading events:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [maxEvents]);

  // Filtrování
  const filteredEvents = events.filter(e => {
    const matchesFilter = filter === 'all' || e.type === filter;
    const matchesSearch = searchTerm === '' || e.ean.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  // Statistiky
  const stats = {
    total: events.length,
    entry: events.filter(e => e.type === 'ENTRY').length,
    check: events.filter(e => e.type === 'CHECK').length,
    exit: events.filter(e => e.type === 'EXIT').length,
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventBadge = (type: string) => {
    const styles: Record<string, any> = {
      ENTRY: { bg: colors.success + '20', color: colors.success, text: '🚪 Vstup' },
      CHECK: { bg: colors.primary + '20', color: colors.primary, text: '🔍 Kontrola' },
      EXIT: { bg: colors.warning + '20', color: colors.warning, text: '🚶 Výstup' },
    };

    const style = styles[type] || styles.ENTRY;

    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '12px',
          backgroundColor: style.bg,
          color: style.color,
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        {style.text}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Datum', 'EAN', 'Typ', 'Terminál', 'Zbývalo (min)', 'Doplatek (min)'];
    const rows = filteredEvents.map(e => [
      formatTimestamp(e.timestamp),
      e.ean,
      e.type,
      e.terminalId,
      e.remainingMinutes,
      e.overstayMinutes,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logy_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1920px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            📋 Logy
          </h1>
          <p style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
            Přehled všech událostí v systému
          </p>
        </div>
        <button
          onClick={exportToCSV}
          style={{
            padding: '12px 24px',
            backgroundColor: colors.success,
            color: 'white',
            border: 'none',
            borderRadius: borderRadius.md,
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          📥 Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.lg, marginBottom: spacing.xl }}>
        <StatCard label="Celkem" value={stats.total} icon="📊" />
        <StatCard label="Vstupy" value={stats.entry} icon="🚪" color={colors.success} />
        <StatCard label="Kontroly" value={stats.check} icon="🔍" color={colors.primary} />
        <StatCard label="Výstupy" value={stats.exit} icon="🚶" color={colors.warning} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Hledat EAN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: borderRadius.md,
            border: `1px solid ${colors.textSecondary}40`,
            backgroundColor: colors.cardBg,
            color: colors.text,
            fontSize: '1rem',
            flex: '1 1 300px',
          }}
        />
        {(['all', 'ENTRY', 'CHECK', 'EXIT'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '10px 20px',
              borderRadius: borderRadius.md,
              border: filter === f ? `2px solid ${colors.primary}` : '2px solid transparent',
              backgroundColor: filter === f ? colors.primary + '20' : colors.cardBg,
              color: filter === f ? colors.primary : colors.text,
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {f === 'all' ? 'Všechny' : f === 'ENTRY' ? 'Vstupy' : f === 'CHECK' ? 'Kontroly' : 'Výstupy'}
          </button>
        ))}
        <select
          value={maxEvents}
          onChange={(e) => setMaxEvents(parseInt(e.target.value))}
          style={{
            padding: '10px 16px',
            borderRadius: borderRadius.md,
            border: `1px solid ${colors.textSecondary}40`,
            backgroundColor: colors.cardBg,
            color: colors.text,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          <option value={50}>50 záznamů</option>
          <option value={100}>100 záznamů</option>
          <option value={500}>500 záznamů</option>
          <option value={1000}>1000 záznamů</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.textSecondary }}>
          Načítám logy...
        </div>
      ) : (
        <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, boxShadow: shadows.card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: colors.background }}>
                  <th style={tableHeaderStyle}>Datum a čas</th>
                  <th style={tableHeaderStyle}>EAN</th>
                  <th style={tableHeaderStyle}>Typ</th>
                  <th style={tableHeaderStyle}>Terminál</th>
                  <th style={tableHeaderStyle}>Zbývalo</th>
                  <th style={tableHeaderStyle}>Doplatek</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center', color: colors.textSecondary }}>
                      Žádné záznamy
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      style={{ borderBottom: `1px solid ${colors.background}` }}
                    >
                      <td style={tableCellStyle}>{formatTimestamp(event.timestamp)}</td>
                      <td style={tableCellStyle}>
                        <code style={{ fontSize: '0.875rem', fontWeight: 600 }}>{event.ean}</code>
                      </td>
                      <td style={tableCellStyle}>{getEventBadge(event.type)}</td>
                      <td style={tableCellStyle}>{event.terminalId}</td>
                      <td style={tableCellStyle}>
                        {event.remainingMinutes > 0 ? (
                          <span style={{ color: colors.success, fontWeight: 600 }}>
                            {event.remainingMinutes} min
                          </span>
                        ) : (
                          <span style={{ color: colors.textSecondary }}>-</span>
                        )}
                      </td>
                      <td style={tableCellStyle}>
                        {event.overstayMinutes > 0 ? (
                          <span style={{ color: colors.error, fontWeight: 600 }}>
                            ⚠️ {event.overstayMinutes} min
                          </span>
                        ) : (
                          <span style={{ color: colors.textSecondary }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredEvents.length > 0 && (
            <div style={{ padding: spacing.md, backgroundColor: colors.background, textAlign: 'center', fontSize: '0.875rem', color: colors.textSecondary }}>
              Zobrazeno {filteredEvents.length} z {events.length} záznamů
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; icon: string; color?: string }> = ({
  label,
  value,
  icon,
  color = colors.text,
}) => (
  <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.lg, boxShadow: shadows.card }}>
    <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>{icon}</div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color, marginBottom: spacing.xs }}>{value}</div>
    <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>{label}</div>
  </div>
);

const tableHeaderStyle = {
  padding: spacing.md,
  textAlign: 'left' as const,
  fontSize: '0.875rem',
  fontWeight: 600,
  color: colors.textSecondary,
};

const tableCellStyle = {
  padding: spacing.md,
  fontSize: '0.875rem',
};

