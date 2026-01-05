/**
 * Admin Stats Page
 * Detailní statistiky a grafy
 */

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import type { Ticket, Event, CodeRange } from '../../types';
import { useAuth, BRANCH_TERMINALS } from '../../contexts/AuthContext';

export const Stats: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [stats, setStats] = useState({
    totalVisitors: 0,
    totalRevenue: 0,
    averageVisitMinutes: 0,
    overstayCount: 0,
    overstayRevenue: 0,
    byTicketType: [] as { name: string; count: number; revenue: number }[],
    byHour: [] as { hour: number; count: number }[],
  });

  const { user } = useAuth();

  useEffect(() => {
    const loadStats = async () => {
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
        } else {
          startDate.setDate(now.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
        }

        const startTimestamp = Timestamp.fromDate(startDate);

        // Načti events (potřebujeme je pro filtrování podle pobočky)
        const eventsSnapshot = await getDocs(
          query(
            collection(db, 'events'),
            where('timestamp', '>=', startTimestamp)
          )
        );
        let events = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[];

        // Filter events by branch if not admin
        if (user && user.role === 'BRANCH' && user.branchId) {
          const allowedTerminals = BRANCH_TERMINALS[user.branchId] || [];
          events = events.filter(e => allowedTerminals.includes(e.terminalId));
        }

        // Získej seznam EANů, které mají ENTRY event v našem filtrovaném listu (nebo jakýkoliv event, pokud chceme vidět aktivitu)
        // Pro správné Revenue chceme lístky co "Vstoupily" přes naši bránu, nebo byly odbaveny.
        // Pro zjednodušení vezmeme unikátní EANy z eventů.
        const relevantEans = new Set(events.map(e => e.ean));

        // Načti vstupenky
        const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
        const allTickets = ticketsSnapshot.docs.map(doc => ({
          ean: doc.id,
          ...doc.data()
        })) as Ticket[];

        // Filtruj lístky
        // 1. Podle času (firstScan >= startTimestamp) - to už děláme
        // 2. Podle toho zda patří k naší pobočce (tzn. máme pro ně event)
        // Pokud je admin, vidí vše, co splňuje čas. 
        // Pokud je branch, vidí jen ty, co mají záznam v relevantEans.

        const tickets = allTickets.filter(t => {
          // Časová podmínka
          if (!t.firstScan || t.firstScan.toMillis() < startTimestamp.toMillis()) return false;

          // Pobočková podmínka
          if (user?.role === 'BRANCH') {
            return relevantEans.has(t.ean);
          }
          return true;
        });

        // Načti code_ranges (oprava chybějící části)
        const rangesSnapshot = await getDocs(collection(db, 'code_ranges'));
        const ranges: Record<string, CodeRange> = {};
        rangesSnapshot.docs.forEach(doc => {
          ranges[doc.id] = { id: doc.id, ...doc.data() } as CodeRange;
        });

        // Vypočítej statistiky
        const totalVisitors = tickets.length;
        const totalRevenue = tickets.reduce((sum, t) => {
          const range = ranges[t.rangeId];
          return sum + (range?.price || 0);
        }, 0);

        const leftTickets = tickets.filter(t => t.status === 'LEFT');
        const averageVisitMinutes = leftTickets.length > 0
          ? Math.round(leftTickets.reduce((sum, t) => {
            const duration = (t.lastScan.toMillis() - t.firstScan.toMillis()) / 1000 / 60;
            return sum + duration;
          }, 0) / leftTickets.length)
          : 0;

        const exitEvents = events.filter(e => e.type === 'EXIT');
        const overstayCount = exitEvents.filter(e => e.overstayMinutes > 0).length;
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

        // Statistiky podle typu lístku
        const byTicketType: Record<string, { name: string; count: number; revenue: number }> = {};
        tickets.forEach(t => {
          const range = ranges[t.rangeId];
          if (range) {
            if (!byTicketType[range.id]) {
              byTicketType[range.id] = { name: range.name, count: 0, revenue: 0 };
            }
            byTicketType[range.id].count++;
            byTicketType[range.id].revenue += range.price;
          }
        });

        // Statistiky podle hodin
        const byHour: Record<number, number> = {};
        for (let i = 0; i < 24; i++) byHour[i] = 0;

        tickets.forEach(t => {
          if (t.firstScan) {
            const hour = t.firstScan.toDate().getHours();
            byHour[hour]++;
          }
        });

        setStats({
          totalVisitors,
          totalRevenue,
          averageVisitMinutes,
          overstayCount,
          overstayRevenue,
          byTicketType: Object.values(byTicketType).sort((a, b) => b.count - a.count),
          byHour: Object.entries(byHour).map(([hour, count]) => ({ hour: parseInt(hour), count })),
        });

        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading stats:', err);
        setLoading(false);
      }
    };

    loadStats();
  }, [dateRange]);

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1920px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
          📈 Statistiky
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
          Detailní přehled návštěvnosti a tržeb
        </p>
      </div>

      {/* Date Range Filter */}
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xl }}>
        {(['today', 'week', 'month'] as const).map((range) => (
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
            {range === 'today' ? 'Dnes' : range === 'week' ? 'Týden' : 'Měsíc'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.textSecondary }}>
          Načítám statistiky...
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing.lg, marginBottom: spacing.xl }}>
            <StatCard title="Celkem návštěvníků" value={stats.totalVisitors} icon="👥" />
            <StatCard title="Celková tržba" value={`${stats.totalRevenue.toLocaleString('cs-CZ')} Kč`} icon="💰" />
            <StatCard title="Průměrná doba" value={`${stats.averageVisitMinutes} min`} icon="⏱️" />
            <StatCard title="Doplatky" value={`${stats.overstayRevenue.toLocaleString('cs-CZ')} Kč`} icon="⚠️" />
          </div>

          {/* By Ticket Type */}
          <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.xl, boxShadow: shadows.card }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>📊 Podle typu lístku</h3>
            {stats.byTicketType.length === 0 ? (
              <p style={{ color: colors.textSecondary }}>Žádná data</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.background}` }}>
                    <th style={{ padding: spacing.md, textAlign: 'left' }}>Typ lístku</th>
                    <th style={{ padding: spacing.md, textAlign: 'right' }}>Počet</th>
                    <th style={{ padding: spacing.md, textAlign: 'right' }}>Tržba</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byTicketType.map((item) => (
                    <tr key={item.name} style={{ borderBottom: `1px solid ${colors.background}` }}>
                      <td style={{ padding: spacing.md }}>{item.name}</td>
                      <td style={{ padding: spacing.md, textAlign: 'right', fontWeight: 600 }}>{item.count}</td>
                      <td style={{ padding: spacing.md, textAlign: 'right', fontWeight: 600 }}>{item.revenue.toLocaleString('cs-CZ')} Kč</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* By Hour */}
          <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, boxShadow: shadows.card }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>🕐 Podle hodin</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: spacing.xs, height: '200px' }}>
              {stats.byHour.map((item) => {
                const maxCount = Math.max(...stats.byHour.map(h => h.count), 1);
                const height = (item.count / maxCount) * 100;
                return (
                  <div key={item.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${height}%`,
                        backgroundColor: colors.primary,
                        borderRadius: `${borderRadius.sm} ${borderRadius.sm} 0 0`,
                        transition: 'all 0.3s',
                      }}
                      title={`${item.hour}:00 - ${item.count} návštěvníků`}
                    />
                    <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>{item.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: string }> = ({ title, value, icon }) => (
  <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.lg, boxShadow: shadows.card }}>
    <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>{icon}</div>
    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: spacing.xs }}>{value}</div>
    <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>{title}</div>
  </div>
);

