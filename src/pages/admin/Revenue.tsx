/**
 * Admin Revenue Page
 * Přehled tržeb a příjmů
 */

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import type { Ticket, Event, CodeRange } from '../../types';

export const Revenue: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [revenue, setRevenue] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    overstayRevenue: 0,
    totalWithOverstay: 0,
    byTicketType: [] as { name: string; count: number; revenue: number; color: string }[],
    byLocation: [] as { location: string; count: number; revenue: number }[],
    transactions: [] as { date: Date; ean: string; type: string; amount: number; ticketName: string }[],
  });

  useEffect(() => {
    const loadRevenue = async () => {
      setLoading(true);
      try {
        // Vypočítej rozsah dat
        const now = new Date();
        let startDate = new Date();
        
        if (dateRange === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === 'week') {
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === 'month') {
          startDate.setDate(now.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
        } else {
          // all - od začátku
          startDate = new Date(0);
        }

        const startTimestamp = Timestamp.fromDate(startDate);

        // Načti vstupenky
        const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
        const allTickets = ticketsSnapshot.docs.map(doc => ({
          ean: doc.id,
          ...doc.data()
        })) as Ticket[];

        // Filtruj podle rozsahu
        const tickets = allTickets.filter(t => 
          t.firstScan && t.firstScan.toMillis() >= startTimestamp.toMillis()
        );

        // Načti code_ranges
        const rangesSnapshot = await getDocs(collection(db, 'code_ranges'));
        const ranges: Record<string, CodeRange> = {};
        rangesSnapshot.docs.forEach(doc => {
          ranges[doc.id] = { id: doc.id, ...doc.data() } as CodeRange;
        });

        // Načti events pro doplatky
        const eventsSnapshot = await getDocs(
          query(
            collection(db, 'events'),
            where('timestamp', '>=', startTimestamp),
            where('type', '==', 'EXIT')
          )
        );
        const exitEvents = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[];

        // Vypočítej tržby z vstupenek
        const totalTickets = tickets.length;
        const totalRevenue = tickets.reduce((sum, t) => {
          const range = ranges[t.rangeId];
          return sum + (range?.price || 0);
        }, 0);

        // Vypočítej tržby z doplatků
        const overstayRevenue = exitEvents.reduce((sum, e) => {
          if (e.overstayMinutes > 0) {
            const ticket = tickets.find(t => t.ean === e.ean);
            if (ticket) {
              const range = ranges[ticket.rangeId];
              if (range) {
                return sum + (e.overstayMinutes * range.pricePerExtraMinute);
              }
            }
          }
          return sum;
        }, 0);

        // Tržby podle typu lístku
        const byTicketType: Record<string, { name: string; count: number; revenue: number; color: string }> = {};
        tickets.forEach(t => {
          const range = ranges[t.rangeId];
          if (range) {
            if (!byTicketType[range.id]) {
              byTicketType[range.id] = { 
                name: range.name, 
                count: 0, 
                revenue: 0,
                color: (range as any).backgroundColor || '#CCCCCC'
              };
            }
            byTicketType[range.id].count++;
            byTicketType[range.id].revenue += range.price;
          }
        });

        // Tržby podle pobočky
        const byLocation: Record<string, { location: string; count: number; revenue: number }> = {};
        tickets.forEach(t => {
          const range = ranges[t.rangeId];
          if (range) {
            const location = (range as any).location || 'Neznámá pobočka';
            if (!byLocation[location]) {
              byLocation[location] = { location, count: 0, revenue: 0 };
            }
            byLocation[location].count++;
            byLocation[location].revenue += range.price;
          }
        });

        // Transakce (vstupenky + doplatky)
        const transactions: { date: Date; ean: string; type: string; amount: number; ticketName: string }[] = [];
        
        // Přidej vstupenky
        tickets.forEach(t => {
          const range = ranges[t.rangeId];
          if (range && t.firstScan) {
            transactions.push({
              date: t.firstScan.toDate(),
              ean: t.ean,
              type: 'Vstupenka',
              amount: range.price,
              ticketName: range.name,
            });
          }
        });

        // Přidej doplatky
        exitEvents.forEach(e => {
          if (e.overstayMinutes > 0) {
            const ticket = tickets.find(t => t.ean === e.ean);
            if (ticket) {
              const range = ranges[ticket.rangeId];
              if (range) {
                transactions.push({
                  date: e.timestamp.toDate(),
                  ean: e.ean,
                  type: 'Doplatek',
                  amount: e.overstayMinutes * range.pricePerExtraMinute,
                  ticketName: range.name,
                });
              }
            }
          }
        });

        // Seřaď transakce podle data (nejnovější první)
        transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

        setRevenue({
          totalTickets,
          totalRevenue,
          overstayRevenue,
          totalWithOverstay: totalRevenue + overstayRevenue,
          byTicketType: Object.values(byTicketType).sort((a, b) => b.revenue - a.revenue),
          byLocation: Object.values(byLocation).sort((a, b) => b.revenue - a.revenue),
          transactions: transactions.slice(0, 50), // Pouze posledních 50
        });

        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading revenue:', err);
        setLoading(false);
      }
    };

    loadRevenue();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('cs-CZ')} Kč`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1920px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
          💰 Tržby
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
          Přehled příjmů a transakcí
        </p>
      </div>

      {/* Date Range Filter */}
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xl, flexWrap: 'wrap' }}>
        {(['today', 'week', 'month', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            style={{
              padding: '10px 20px',
              borderRadius: borderRadius.md,
              border: dateRange === range ? `2px solid ${colors.primary}` : '2px solid transparent',
              backgroundColor: dateRange === range ? colors.primary + '20' : colors.cardBg,
              color: dateRange === range ? colors.primary : colors.text,
              fontWeight: dateRange === range ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {range === 'today' ? 'Dnes' : range === 'week' ? 'Týden' : range === 'month' ? 'Měsíc' : 'Vše'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.textSecondary }}>
          Načítám tržby...
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing.lg, marginBottom: spacing.xl }}>
            <RevenueCard
              title="Tržby z vstupenek"
              value={formatCurrency(revenue.totalRevenue)}
              subtitle={`${revenue.totalTickets} vstupenek`}
              icon="🎫"
              color={colors.primary}
            />
            <RevenueCard
              title="Tržby z doplatků"
              value={formatCurrency(revenue.overstayRevenue)}
              subtitle="Za překročení času"
              icon="⚠️"
              color={colors.warning}
            />
            <RevenueCard
              title="Celkové tržby"
              value={formatCurrency(revenue.totalWithOverstay)}
              subtitle="Vstupenky + doplatky"
              icon="💰"
              color={colors.success}
            />
          </div>

          {/* By Ticket Type */}
          <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.xl, boxShadow: shadows.card }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>📊 Podle typu lístku</h3>
            {revenue.byTicketType.length === 0 ? (
              <p style={{ color: colors.textSecondary }}>Žádná data</p>
            ) : (
              <div style={{ display: 'grid', gap: spacing.md }}>
                {revenue.byTicketType.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      backgroundColor: colors.background,
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      backgroundColor: item.color,
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                        {item.count} vstupenek
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: colors.success }}>
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By Location */}
          <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.xl, boxShadow: shadows.card }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>🏢 Podle pobočky</h3>
            {revenue.byLocation.length === 0 ? (
              <p style={{ color: colors.textSecondary }}>Žádná data</p>
            ) : (
              <div style={{ display: 'grid', gap: spacing.md }}>
                {revenue.byLocation.map((item) => (
                  <div
                    key={item.location}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: spacing.md,
                      backgroundColor: colors.background,
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.location}</div>
                      <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                        {item.count} vstupenek
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: colors.success }}>
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, boxShadow: shadows.card }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>📝 Poslední transakce</h3>
            {revenue.transactions.length === 0 ? (
              <p style={{ color: colors.textSecondary }}>Žádné transakce</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${colors.background}` }}>
                      <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Datum</th>
                      <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>EAN</th>
                      <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Typ</th>
                      <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Lístek</th>
                      <th style={{ padding: spacing.md, textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>Částka</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.transactions.map((tx, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${colors.background}` }}>
                        <td style={{ padding: spacing.md, fontSize: '0.875rem' }}>{formatDate(tx.date)}</td>
                        <td style={{ padding: spacing.md, fontSize: '0.875rem' }}>
                          <code>{tx.ean}</code>
                        </td>
                        <td style={{ padding: spacing.md }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: tx.type === 'Vstupenka' ? colors.primary + '20' : colors.warning + '20',
                            color: tx.type === 'Vstupenka' ? colors.primary : colors.warning,
                          }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: spacing.md, fontSize: '0.875rem' }}>{tx.ticketName}</td>
                        <td style={{ padding: spacing.md, textAlign: 'right', fontWeight: 600, fontSize: '1rem', color: colors.success }}>
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const RevenueCard: React.FC<{ title: string; value: string; subtitle: string; icon: string; color: string }> = ({
  title,
  value,
  subtitle,
  icon,
  color
}) => (
  <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.lg, boxShadow: shadows.card }}>
    <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>{icon}</div>
    <div style={{ fontSize: '1.75rem', fontWeight: 700, color, marginBottom: spacing.xs }}>{value}</div>
    <div style={{ fontSize: '0.875rem', color: colors.textSecondary, marginBottom: spacing.xs }}>{title}</div>
    <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>{subtitle}</div>
  </div>
);

