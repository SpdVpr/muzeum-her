/**
 * Admin Dashboard
 * Hlavní analytický dashboard se statistikami
 */

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { StatCard } from '../../components/admin/StatCard';
import { LiveActivity } from '../../components/admin/LiveActivity';
import { colors, spacing } from '../../config/theme';
import type { DashboardStats, Event, Ticket, CodeRange } from '../../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    currentlyInside: 0,
    todayTotal: 0,
    todayLeft: 0,
    capacity: 200,
    capacityPercent: 0,
    averageVisitMinutes: 0,
    todayRevenue: 0,
    todayOverstayCount: 0,
    todayOverstayRevenue: 0,
  });

  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [codeRanges, setCodeRanges] = useState<Record<string, CodeRange>>({});
  const [tickets, setTickets] = useState<Record<string, Ticket>>({});
  const [loading, setLoading] = useState(true);

  // Real-time listener pro statistiky
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Načti všechny vstupenky
        const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
        const tickets = ticketsSnapshot.docs.map(doc => ({
          ean: doc.id,
          ...doc.data()
        })) as Ticket[];

        // Načti code_ranges pro výpočet tržeb
        const rangesSnapshot = await getDocs(collection(db, 'code_ranges'));
        const ranges: Record<string, CodeRange> = {};
        rangesSnapshot.docs.forEach(doc => {
          ranges[doc.id] = { id: doc.id, ...doc.data() } as CodeRange;
        });
        setCodeRanges(ranges);

        // Ulož tickets do state
        const ticketsMap: Record<string, Ticket> = {};
        tickets.forEach(t => {
          ticketsMap[t.ean] = t;
        });
        setTickets(ticketsMap);

        // Dnešní datum (začátek dne)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        // Filtruj dnešní vstupenky
        const todayTickets = tickets.filter(t =>
          t.firstScan && t.firstScan.toMillis() >= todayTimestamp.toMillis()
        );

        // Vypočítej statistiky
        const currentlyInside = tickets.filter(t => t.status === 'INSIDE').length;
        const todayTotal = todayTickets.length;
        const todayLeft = todayTickets.filter(t => t.status === 'LEFT').length;

        // Tržby - součet cen všech dnešních vstupenek
        const todayRevenue = todayTickets.reduce((sum, ticket) => {
          const range = ranges[ticket.rangeId];
          return sum + (range?.price || 0);
        }, 0);

        // Načti všechny dnešní eventy pro výpočet skutečné doby návštěvy
        const allEventsSnapshot = await getDocs(
          query(
            collection(db, 'events'),
            where('timestamp', '>=', todayTimestamp),
            orderBy('timestamp', 'asc')
          )
        );

        const allEvents = allEventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[];

        // Vypočítej skutečnou dobu návštěvy pro každou vstupenku
        // Sečti všechny úseky mezi ENTRY a EXIT
        const visitDurations: Record<string, number> = {};
        const lastEntry: Record<string, number> = {}; // timestamp posledního vstupu

        allEvents.forEach(event => {
          if (event.type === 'ENTRY') {
            lastEntry[event.ean] = event.timestamp.toMillis();
          } else if (event.type === 'EXIT' && lastEntry[event.ean]) {
            const duration = (event.timestamp.toMillis() - lastEntry[event.ean]) / 1000 / 60;
            visitDurations[event.ean] = (visitDurations[event.ean] || 0) + duration;
            delete lastEntry[event.ean]; // Reset pro další vstup
          }
        });

        // Průměrná doba návštěvy (pouze pro ty, co mají zaznamenanou dobu)
        const completedVisits = Object.values(visitDurations);
        const averageVisitMinutes = completedVisits.length > 0
          ? Math.round(completedVisits.reduce((sum, duration) => sum + duration, 0) / completedVisits.length)
          : 0;

        console.log(`📊 Průměrná doba návštěvy: ${averageVisitMinutes} min z ${completedVisits.length} dokončených návštěv`);
        Object.entries(visitDurations).forEach(([ean, duration]) => {
          console.log(`  - ${ean}: ${Math.round(duration)} min`);
        });

        // Doplatky - použij už načtené eventy
        const exitEvents = allEvents.filter(e => e.type === 'EXIT');

        const todayOverstayCount = exitEvents.filter(e => e.overstayMinutes > 0).length;
        const todayOverstayRevenue = exitEvents.reduce((sum, e) => {
          if (e.overstayMinutes > 0) {
            // Najdi ticket a range pro výpočet doplatku
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

        const capacity = 200; // TODO: Načíst z nastavení
        const capacityPercent = Math.round((currentlyInside / capacity) * 100);

        setStats({
          currentlyInside,
          todayTotal,
          todayLeft,
          capacity,
          capacityPercent,
          averageVisitMinutes,
          todayRevenue,
          todayOverstayCount,
          todayOverstayRevenue,
        });

        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading dashboard data:', err);
        setLoading(false);
      }
    };

    loadDashboardData();

    // Refresh každých 10 sekund
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Real-time listener pro nedávné události
  useEffect(() => {
    const eventsQuery = query(
      collection(db, 'events'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];

      setRecentEvents(events);
    }, (err) => {
      console.error('❌ Error loading events:', err);
    });

    return () => unsubscribe();
  }, []);

  // Fallback mock events pokud nejsou žádné reálné
  useEffect(() => {
    if (recentEvents.length === 0 && !loading) {
      const mockEvents: Event[] = [
        {
          id: '1',
          ean: '03021005',
          type: 'ENTRY',
          terminalId: 'entry-1',
          timestamp: Timestamp.fromDate(new Date(Date.now() - 60000)),
          remainingMinutes: 60,
          overstayMinutes: 0,
        },
      ];
      setRecentEvents(mockEvents);
    }
  }, [recentEvents.length, loading]);

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1920px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            📊 Dashboard
          </h1>
          <p style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
            Přehled aktuálního stavu a statistik
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            fontSize: '0.875rem',
            color: colors.textSecondary,
          }}
        >
          <span style={{ color: colors.success, fontWeight: 600 }}>🔄 Live</span>
          <span>{new Date().toLocaleDateString('cs-CZ')}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <StatCard
          title="Aktuálně uvnitř"
          value={stats.currentlyInside}
          icon="👥"
          trend={{ value: 3, label: 'za 5 min' }}
          color={colors.primary}
          loading={loading}
        />
        <StatCard
          title="Návštěvníků dnes"
          value={stats.todayTotal}
          icon="📊"
          trend={{ value: 12, label: 'vs. včera' }}
          color={colors.success}
          loading={loading}
        />
        <StatCard
          title="Odešlo dnes"
          value={stats.todayLeft}
          icon="🚪"
          trend={{ value: 9, label: 'za hodinu' }}
          color={colors.textSecondary}
          loading={loading}
        />
        <StatCard
          title="Kapacita"
          value={`${stats.capacityPercent}%`}
          icon="📈"
          color={stats.capacityPercent > 80 ? colors.warning : colors.success}
          loading={loading}
        />
      </div>

      {/* Main content grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: spacing.xl,
          marginBottom: spacing.xl,
        }}
      >
        {/* Průměrná doba návštěvy */}
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: '12px',
            padding: spacing.xl,
            boxShadow: '0 0 30px -8px rgba(0, 0, 0, 0.24)',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: spacing.lg }}>
            ⏱ Průměrná doba návštěvy
          </h3>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: colors.primary }}>
              {Math.floor(stats.averageVisitMinutes / 60)}:{(stats.averageVisitMinutes % 60)
                .toString()
                .padStart(2, '0')}
            </div>
            <div style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
              hodin
            </div>
          </div>
        </div>

        {/* Tržby dnes */}
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: '12px',
            padding: spacing.xl,
            boxShadow: '0 0 30px -8px rgba(0, 0, 0, 0.24)',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: spacing.lg }}>
            💵 Tržby dnes
          </h3>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: colors.success }}>
              {stats.todayRevenue.toLocaleString('cs-CZ')} Kč
            </div>
            <div style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
              + {stats.todayOverstayRevenue} Kč doplatky
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity */}
      <LiveActivity
        events={recentEvents}
        maxItems={10}
        codeRanges={codeRanges}
        tickets={tickets}
      />
    </div>
  );
};

