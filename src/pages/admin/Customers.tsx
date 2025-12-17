/**
 * Admin Customers Page
 * Přehled všech zákazníků (naskenovaných vstupenek)
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import type { Ticket, CodeRange } from '../../types';

export const Customers: React.FC = () => {
  const [tickets, setTickets] = useState<(Ticket & { id: string })[]>([]);
  const [codeRanges, setCodeRanges] = useState<Record<string, CodeRange>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'INSIDE' | 'LEFT'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  // Real-time listener pro vstupenky
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tickets'),
      (snapshot) => {
        const ticketsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ean: doc.id,
          ...doc.data(),
        })) as (Ticket & { id: string })[];

        // Seřaď podle posledního skenu
        ticketsData.sort((a, b) => {
          const aTime = a.lastScan?.toMillis?.() || 0;
          const bTime = b.lastScan?.toMillis?.() || 0;
          return bTime - aTime;
        });

        setTickets(ticketsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading tickets:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtrování
  const filteredTickets = tickets.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch = searchTerm === '' || t.ean.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  // Statistiky
  const stats = {
    total: tickets.length,
    inside: tickets.filter(t => t.status === 'INSIDE').length,
    left: tickets.filter(t => t.status === 'LEFT').length,
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
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      INSIDE: { bg: colors.success + '20', color: colors.success, text: '🟢 Uvnitř' },
      LEFT: { bg: colors.textSecondary + '20', color: colors.textSecondary, text: '⚪ Odešel' },
    };

    const style = styles[status] || styles.INSIDE;

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

  const calculateRemainingTime = (ticket: Ticket) => {
    if (!ticket.firstScan) return 0;
    const elapsed = (Date.now() - ticket.firstScan.toMillis()) / 1000 / 60;
    return Math.max(0, Math.round(ticket.allowedMinutes - elapsed));
  };

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1920px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
          👥 Zákazníci
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
          Přehled všech návštěvníků
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.lg, marginBottom: spacing.xl }}>
        <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.lg, boxShadow: shadows.card }}>
          <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>📊</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: spacing.xs }}>{stats.total}</div>
          <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>Celkem</div>
        </div>
        <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.lg, boxShadow: shadows.card }}>
          <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>🟢</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: colors.success, marginBottom: spacing.xs }}>{stats.inside}</div>
          <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>Uvnitř</div>
        </div>
        <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.lg, boxShadow: shadows.card }}>
          <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>⚪</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: spacing.xs }}>{stats.left}</div>
          <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>Odešlo</div>
        </div>
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
        {(['all', 'INSIDE', 'LEFT'] as const).map((f) => (
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
            {f === 'all' ? 'Všichni' : f === 'INSIDE' ? 'Uvnitř' : 'Odešlo'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.textSecondary }}>
          Načítám zákazníky...
        </div>
      ) : (
        <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, boxShadow: shadows.card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: colors.background }}>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>EAN</th>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Typ lístku</th>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Status</th>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Vstup</th>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Poslední sken</th>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Zbývá</th>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Skenů</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: spacing.md, textAlign: 'center', color: colors.textSecondary }}>
                      Žádní zákazníci
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const range = codeRanges[ticket.rangeId];
                    const remaining = calculateRemainingTime(ticket);
                    return (
                      <tr
                        key={ticket.id}
                        style={{ borderBottom: `1px solid ${colors.background}` }}
                      >
                        <td style={{ padding: spacing.md }}>
                          <code style={{ fontSize: '0.875rem', fontWeight: 600 }}>{ticket.ean}</code>
                        </td>
                        <td style={{ padding: spacing.md }}>
                          {range ? (
                            <div>
                              <div style={{ fontWeight: 500 }}>{range.name}</div>
                              <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                                {range.durationMinutes} min • {range.price} Kč
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: colors.textSecondary }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: spacing.md }}>{getStatusBadge(ticket.status)}</td>
                        <td style={{ padding: spacing.md, fontSize: '0.875rem' }}>{formatTimestamp(ticket.firstScan)}</td>
                        <td style={{ padding: spacing.md, fontSize: '0.875rem' }}>{formatTimestamp(ticket.lastScan)}</td>
                        <td style={{ padding: spacing.md, fontSize: '0.875rem', fontWeight: 600 }}>
                          {ticket.status === 'INSIDE' ? `${remaining} min` : '-'}
                        </td>
                        <td style={{ padding: spacing.md, fontSize: '0.875rem' }}>{ticket.scanCount}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredTickets.length > 0 && (
            <div style={{ padding: spacing.md, backgroundColor: colors.background, textAlign: 'center', fontSize: '0.875rem', color: colors.textSecondary }}>
              Zobrazeno {filteredTickets.length} z {tickets.length} zákazníků
            </div>
          )}
        </div>
      )}
    </div>
  );
};

