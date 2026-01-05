/**
 * Admin Dashboard
 * Hlavní analytický dashboard se statistikami
 */

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, Timestamp, doc, updateDoc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { StatCard } from '../../components/admin/StatCard';
import { LiveActivity } from '../../components/admin/LiveActivity';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import { BRANCHES } from '../../config/branches';
import type { DashboardStats, Event, Ticket, CodeRange } from '../../types';
import { useAuth, BRANCH_TERMINALS } from '../../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

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
  const [manualEan, setManualEan] = useState('');
  const [processingManual, setProcessingManual] = useState(false);

  // Real-time listener pro statistiky
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Dnešní datum (začátek dne)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        // Načti všechny dnešní eventy NEJDŘÍVE, musíme podle nich filtrovat
        const allEventsSnapshot = await getDocs(
          query(
            collection(db, 'events'),
            where('timestamp', '>=', todayTimestamp),
            orderBy('timestamp', 'asc')
          )
        );

        let allEvents = allEventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[];

        // Filter events by branch if not admin
        if (user && user.role === 'BRANCH' && user.branchId) {
          const allowedTerminals = BRANCH_TERMINALS[user.branchId] || [];
          allEvents = allEvents.filter(e => allowedTerminals.includes(e.terminalId));
        }



        // Načti všechny vstupenky
        const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
        let allTickets = ticketsSnapshot.docs.map(doc => ({
          ean: doc.id,
          ...doc.data()
        })) as Ticket[];

        // Filter tickets if branch
        if (user?.role === 'BRANCH' && user.branchId) {
          // Zobraz jen lístky pro tuto pobočku
          // Pokud lístek nemá branchId (stará data), raději ho zobraz aby šel odbavit
          allTickets = allTickets.filter(t => !t.branchId || t.branchId === user.branchId);
        }

        // Načti code_ranges pro výpočet tržeb
        const rangesSnapshot = await getDocs(collection(db, 'code_ranges'));
        const ranges: Record<string, CodeRange> = {};
        rangesSnapshot.docs.forEach(doc => {
          ranges[doc.id] = { id: doc.id, ...doc.data() } as CodeRange;
        });
        setCodeRanges(ranges);

        // Ulož tickets do state
        const ticketsMap: Record<string, Ticket> = {};
        allTickets.forEach(t => {
          ticketsMap[t.ean] = t;
        });
        setTickets(ticketsMap);

        // Filtruj dnešní vstupenky
        const todayTickets = allTickets.filter(t =>
          t.firstScan && t.firstScan.toMillis() >= todayTimestamp.toMillis()
        );

        // Vypočítej statistiky
        const currentlyInside = allTickets.filter(t => t.status === 'INSIDE').length;
        const todayTotal = todayTickets.length;
        const todayLeft = todayTickets.filter(t => t.status === 'LEFT').length;

        // Tržby - součet cen všech dnešních vstupenek
        const todayRevenue = todayTickets.reduce((sum, ticket) => {
          const range = ranges[ticket.rangeId];
          return sum + (range?.price || 0);
        }, 0);

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
            const ticket = ticketsMap[e.ean];
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
    let eventsQuery;

    if (user?.role === 'BRANCH' && user.branchId) {
      const allowedTerminals = BRANCH_TERMINALS[user.branchId] || [];
      // Firestore 'in' limitation: up to 10 values. We expect fewer terminals per branch.
      if (allowedTerminals.length > 0) {
        eventsQuery = query(
          collection(db, 'events'),
          where('terminalId', 'in', allowedTerminals),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
      } else {
        // No terminals allowed? Return empty
        setRecentEvents([]);
        return;
      }
    } else {
      eventsQuery = query(
        collection(db, 'events'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
    }

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
  }, [user]);



  const handleManualAction = async (eanInput?: string) => {
    const rawEan = eanInput || manualEan;
    if (!rawEan) return;

    // Oříznout mezery/neviditelné znaky
    const eanToProcess = rawEan.trim();

    setProcessingManual(true);
    try {
      let ticket = tickets[eanToProcess];

      // Pokud není v lokálním stavu, zkus načíst přímo z DB (ID lookup)
      if (!ticket) {
        const ticketDoc = await getDoc(doc(db, 'tickets', eanToProcess));
        if (ticketDoc.exists()) {
          ticket = { ean: ticketDoc.id, ...ticketDoc.data() } as Ticket;
        }
      }

      // Fallback: Zkus najít podle pole 'ean' (kdyby ID bylo jiné než EAN)
      if (!ticket) {
        try {
          console.log(`Searching tickets for ean field: "${eanToProcess}" (type: ${typeof eanToProcess})`);
          // Try string query
          let q = query(collection(db, 'tickets'), where('ean', '==', eanToProcess));
          let querySnapshot = await getDocs(q);

          // Try number query if string failed
          if (querySnapshot.empty && !isNaN(Number(eanToProcess))) {
            const numEan = Number(eanToProcess);
            console.log(`Trying number query for: ${numEan}`);
            q = query(collection(db, 'tickets'), where('ean', '==', numEan));
            querySnapshot = await getDocs(q);
          }

          if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0];
            ticket = { ean: docData.id, ...docData.data() } as Ticket;
            console.log('Ticket found via query:', ticket);
          } else {
            console.log('Query returned empty.');
          }
        } catch (e) {
          console.error("Query fallback failed", e);
        }
      }

      // Fallback 2: Lazy creation from Code Range (pokud fyzická vstupenka existuje, ale není v DB)
      if (!ticket) {
        const matchingRange = Object.values(codeRanges).find(r => {
          if (r.prefix.includes('-')) {
            const [start, end] = r.prefix.split('-').map(s => s.trim());
            // Kontrola délky pro spolehlivé lexikografické porovnání
            if (eanToProcess.length !== start.length || eanToProcess.length !== end.length) {
              return false;
            }
            return eanToProcess >= start && eanToProcess <= end;
          }
          return r.prefix === eanToProcess;
        });

        if (matchingRange) {
          console.log('Found matching range for orphan EAN:', matchingRange.name);

          if (user?.role === 'BRANCH' && user.branchId && matchingRange.branchId && matchingRange.branchId !== user.branchId) {
            alert(`Vstupenka spadá pod řadu '${matchingRange.name}' jiné pobočky. Nemáte oprávnění.`);
            setProcessingManual(false);
            return;
          }

          const newTicket: any = {
            ean: eanToProcess,
            rangeId: matchingRange.id,
            branchId: matchingRange.branchId,
            status: 'ACTIVE',
            scanCount: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          await setDoc(doc(db, 'tickets', eanToProcess), newTicket);
          ticket = newTicket as Ticket;
          // alert('Vstupenka byla automaticky zaregistrována do systému na základě číselné řady.');
        }
      }

      if (!ticket) {
        alert(`EAN "${eanToProcess}" nebyl nalezen v databázi ani neodpovídá žádné známé řadě.`);
        setProcessingManual(false);
        return;
      }

      // Kontrola oprávnění pobočky
      if (user?.role === 'BRANCH' && user.branchId && ticket.branchId && ticket.branchId !== user.branchId) {
        alert(`Vstupenka patří jiné pobočce '${ticket.branchId}'. Nemáte oprávnění ji upravit.`);
        setProcessingManual(false);
        return;
      }

      let range = codeRanges[ticket.rangeId];
      if (!range) {
        // Pokus načíst range pokud chybí
        const rangeDoc = await getDoc(doc(db, 'code_ranges', ticket.rangeId));
        if (rangeDoc.exists()) {
          range = { id: rangeDoc.id, ...rangeDoc.data() } as CodeRange;
        } else {
          alert('Nelze dohledat definici řady (rozsah) pro tento lístek.');
          setProcessingManual(false);
          return;
        }
      }

      const isInside = ticket.status === 'INSIDE';
      const now = Timestamp.now();

      // Determine terminal ID for visibility
      let terminalId = 'admin-dashboard';
      if (user?.role === 'BRANCH' && user.branchId) {
        const allowedTerminals = BRANCH_TERMINALS[user.branchId] || [];
        // Try to match action type (entry/exit) to terminal ID for realism
        if (isInside) {
          terminalId = allowedTerminals.find(t => t.includes('exit')) || allowedTerminals[0] || `manual-${user.branchId}`;
        } else {
          terminalId = allowedTerminals.find(t => t.includes('entry')) || allowedTerminals[0] || `manual-${user.branchId}`;
        }
      }

      if (isInside) {
        // EXIT
        let minutesSpent = 0;
        if (ticket.firstScan) {
          minutesSpent = Math.max(0, Math.floor((new Date().getTime() - ticket.firstScan.toMillis()) / 1000 / 60));
        }
        const allowed = range.durationMinutes;
        const remaining = allowed - minutesSpent;
        const overstay = remaining < 0 ? Math.abs(remaining) : 0;

        await updateDoc(doc(db, 'tickets', ticket.ean), {
          status: 'LEFT',
          lastScan: now,
        });

        await addDoc(collection(db, 'events'), {
          ean: ticket.ean,
          type: 'EXIT',
          timestamp: now,
          terminalId: terminalId,
          blockingDuration: 0,
          remainingMinutes: remaining > 0 ? remaining : 0,
          overstayMinutes: overstay
        });
      } else {
        // ENTRY
        await updateDoc(doc(db, 'tickets', ticket.ean), {
          status: 'INSIDE',
          firstScan: ticket.firstScan || now,
          lastScan: now,
        });

        await addDoc(collection(db, 'events'), {
          ean: ticket.ean,
          type: 'ENTRY',
          timestamp: now,
          terminalId: terminalId,
          blockingDuration: 0,
          remainingMinutes: range.durationMinutes,
          overstayMinutes: 0
        });
      }
      setManualEan('');
    } catch (err: any) {
      console.error(err);
      alert('Chyba: ' + err.message);
    }
    setProcessingManual(false);
  };



  return (
    <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: '1920px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: window.innerWidth < 640 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: window.innerWidth < 640 ? 'flex-start' : 'center',
          marginBottom: 'clamp(1rem, 3vw, 2rem)',
          gap: spacing.md,
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, margin: 0 }}>
            📊 Dashboard
          </h1>
          <p style={{ color: colors.textSecondary, marginTop: spacing.sm, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
            Přehled aktuálního stavu a statistik
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
          gap: 'clamp(0.75rem, 2vw, 1.5rem)',
          marginBottom: 'clamp(1rem, 3vw, 2rem)',
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

      {/* Branch Stats (Admin Only) */}
      {user?.role === 'ADMIN' && (
        <div style={{ marginBottom: spacing.xl }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.md }}>🏢 Pobočky</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: spacing.md }}>
            {BRANCHES.map(branch => {
              // Calc stats
              const branchTickets = Object.values(tickets).filter(t => t.branchId === branch.id);
              const inside = branchTickets.filter(t => t.status === 'INSIDE').length;

              // Revenue today
              const todayTs = new Date(); todayTs.setHours(0, 0, 0, 0);
              const revenue = branchTickets.reduce((sum, t) => {
                if (t.firstScan && t.firstScan.toMillis() >= todayTs.getTime()) {
                  const range = codeRanges[t.rangeId];
                  return sum + (range?.price || 0);
                }
                return sum;
              }, 0);

              return (
                <div key={branch.id} style={{
                  backgroundColor: colors.cardBg,
                  borderRadius: borderRadius.lg,
                  padding: spacing.lg,
                  boxShadow: shadows.card,
                  borderLeft: `4px solid ${colors.primary}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>{branch.name}</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: colors.textSecondary, fontSize: '0.9rem' }}>Uvnitř:</span>
                    <span style={{ fontWeight: 600, color: colors.primary, fontSize: '1.2rem' }}>{inside}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${colors.background}`, paddingTop: 8 }}>
                    <span style={{ color: colors.textSecondary, fontSize: '0.9rem' }}>Dnešní tržba:</span>
                    <span style={{ fontWeight: 600 }}>{revenue.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
          gap: 'clamp(1rem, 3vw, 2rem)',
          marginBottom: 'clamp(1rem, 3vw, 2rem)',
        }}
      >
        {/* Průměrná doba návštěvy */}
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: '12px',
            padding: 'clamp(1rem, 3vw, 2rem)',
            boxShadow: '0 0 30px -8px rgba(0, 0, 0, 0.24)',
          }}
        >
          <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 600, marginBottom: spacing.lg }}>
            ⏱ Průměrná doba návštěvy
          </h3>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 700, color: colors.primary }}>
              {Math.floor(stats.averageVisitMinutes / 60)}:{(stats.averageVisitMinutes % 60)
                .toString()
                .padStart(2, '0')}
            </div>
            <div style={{ color: colors.textSecondary, marginTop: spacing.sm, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
              hodin
            </div>
          </div>
        </div>

        {/* Tržby dnes */}
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: '12px',
            padding: 'clamp(1rem, 3vw, 2rem)',
            boxShadow: '0 0 30px -8px rgba(0, 0, 0, 0.24)',
          }}
        >
          <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 600, marginBottom: spacing.lg }}>
            💵 Tržby dnes
          </h3>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', fontWeight: 700, color: colors.success }}>
              {stats.todayRevenue.toLocaleString('cs-CZ')} Kč
            </div>
            <div style={{ color: colors.textSecondary, marginTop: spacing.sm, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
              + {stats.todayOverstayRevenue} Kč doplatky
            </div>
          </div>
        </div>
      </div>

      {/* Manual Input */}
      <div
        style={{
          backgroundColor: colors.cardBg,
          borderRadius: borderRadius.lg,
          padding: 'clamp(1rem, 3vw, 2rem)',
          boxShadow: shadows.card,
          marginBottom: 'clamp(1rem, 3vw, 2rem)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>
          ⌨️ Manuální zadání
        </h3>
        <div style={{ display: 'flex', flex: 1, minWidth: '250px', gap: spacing.md }}>
          <input
            type="text"
            value={manualEan}
            onChange={(e) => setManualEan(e.target.value)}
            placeholder="Zadejte EAN kód pro manuální vstup/výstup..."
            onKeyDown={(e) => e.key === 'Enter' && handleManualAction()}
            style={{
              flex: 1,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.textSecondary}40`,
              backgroundColor: colors.background,
              color: colors.text,
            }}
          />
          <button
            onClick={() => handleManualAction()}
            disabled={processingManual || !manualEan}
            style={{
              padding: '0 24px',
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: borderRadius.md,
              fontWeight: 600,
              cursor: processingManual ? 'wait' : 'pointer',
              opacity: processingManual || !manualEan ? 0.7 : 1,
            }}
          >
            {processingManual ? '⏳' : 'Odeslat'}
          </button>
        </div>
      </div>

      {/* Live Activity */}
      <LiveActivity
        events={recentEvents}
        maxItems={10}
        codeRanges={codeRanges}
        tickets={tickets}
        onManualLogout={(ean) => handleManualAction(ean)}
      />
    </div>
  );
};

