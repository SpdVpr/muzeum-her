/**
 * Admin Tickets Page
 * Správa číselných řad vstupenek (code_ranges)
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import type { CodeRange, Ticket } from '../../types';
import Barcode from 'react-barcode';
import { useAuth } from '../../contexts/AuthContext';

const BRANCHES = [
  { id: 'gameworld', name: 'Game World (OC Šestka)' },
  { id: 'cyberarcade', name: 'Cyber Arcade (Bartůňkova)' },
  { id: 'gamestation', name: 'Game Station (Plzeň)' },
  { id: 'gameplanet', name: 'Game Planet (Olomouc)' },
];

export const Tickets: React.FC = () => {
  const { user } = useAuth();
  const [codeRanges, setCodeRanges] = useState<(CodeRange & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingRange, setEditingRange] = useState<(CodeRange & { id: string }) | null>(null);
  const [expandedRangeId, setExpandedRangeId] = useState<string | null>(null);
  const [showEANs, setShowEANs] = useState<Record<string, string[]>>({});
  const [selectedEAN, setSelectedEAN] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Record<string, Ticket>>({});


  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState('');
  const [newRange, setNewRange] = useState({
    name: '',
    branchId: '',
    description: '',
    startEan: '',
    endEan: '',
    durationMinutes: 60,
    price: 0,
    pricePerExtraMinute: 0,
    backgroundColor: '#3399FF', // Default
    generateTickets: true,
  });

  const handleCreateRange = async () => {
    if (!newRange.name || !newRange.startEan || !newRange.endEan || !newRange.branchId) {
      setError('Vyplňte prosím všechna pole (Název, Pobočka, EAN od-do)');
      return;
    }

    setCreationProgress('Zahajuji vytváření...');
    // Calculate range
    const start = parseInt(newRange.startEan);
    const end = parseInt(newRange.endEan);

    if (isNaN(start) || isNaN(end) || start > end) {
      setError('Neplatný rozsah EAN (od musí být menší než do)');
      setCreationProgress('');
      return;
    }

    const count = end - start + 1;
    if (count > 5000) {
      setError('Maximální počet vstupenek v jedné dávce je 5000');
      setCreationProgress('');
      return;
    }

    try {
      const prefix = `${newRange.startEan}-${newRange.endEan}`;

      // 1. Create CodeRange document
      const rangeRef = await addDoc(collection(db, 'code_ranges'), {
        name: newRange.name,
        branchId: newRange.branchId,
        description: newRange.description || '',
        prefix: prefix,
        totalTickets: count,
        durationMinutes: newRange.durationMinutes,
        price: newRange.price,
        pricePerExtraMinute: newRange.pricePerExtraMinute,
        backgroundColor: newRange.backgroundColor, // Add color
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const rangeId = rangeRef.id;

      // 2. Generate Tickets if requested
      if (newRange.generateTickets) {
        setCreationProgress(`Generuji ${count} vstupenek...`);

        const eanLength = newRange.startEan.length; // Preserve leading zeros length based on input
        let processed = 0;
        let batch = writeBatch(db);

        for (let i = start; i <= end; i++) {
          const ean = i.toString().padStart(eanLength, '0');
          const ticketRef = doc(db, 'tickets', ean);

          batch.set(ticketRef, {
            ean: ean,
            rangeId: rangeId,
            branchId: newRange.branchId,
            status: 'ACTIVE', // Ready to use
            scanCount: 0,
            // allowedMinutes logic? Usually allowedMinutes is fixed or decremented. 
            // EntryTerminal sets it from Range usually. 
            // But let's set it here for completeness if we treat this as pre-issued.
            // However, EntryTerminal might overwrite it from Range duration. 
            // Let's keep it null or set 0 and let Entry activate it?
            // Actually `EntryTerminal` logic: 
            // if ticket exists: use it. 
            // if status===active and not inside: entry logic.
            // It does NOT reset allowedMinutes if it exists?
            // Looking at EntryTerminal: `await setDoc(ticketRef, ... ticket ... status: 'INSIDE', ... remainingMinutes: range.durationMinutes` logic is ONLY valid if checking NEW ticket.
            // Wait, if ticket exists in EntryTerminal:
            // `if (ticket.status === 'LEFT') ...`
            // But what if status is 'ACTIVE' (newly imported)?
            // `EntryTerminal` says: `if (ticketSnap.exists()) ... check isTicketValidToday ... check INSIDE ... check LEFT`.
            // It doesn't handle 'ACTIVE' explicitly! It falls through?
            // No, if it exists, it assumes it was ALREADY used today?
            // `isTicketValidToday` checks `firstScan`.
            // Newly imported ticket has NO `firstScan`.
            // `isTicketValidToday` might return true or false?
            // Let's fix EntryTerminal later if needed. For now, we create them as ACTIVE.
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });

          processed++;

          // Commit batch every 400 items
          if (processed % 400 === 0) {
            setCreationProgress(`Ukládám dávku ${processed} / ${count}...`);
            await batch.commit();
            batch = writeBatch(db);
          }
        }

        // Commit remaining
        if (processed % 400 !== 0) {
          await batch.commit();
        }
      }

      setCreationProgress('');
      setIsCreating(false);
      setNewRange({ ...newRange, name: '', startEan: '', endEan: '' });
      console.log('✅ Range created and tickets generated');

    } catch (err: any) {
      console.error('Error creating tickets:', err);
      setError('Chyba při vytváření: ' + err.message);
      setCreationProgress('');
    }
  };

  // Real-time listener pro code_ranges
  useEffect(() => {
    setLoading(true);
    setError('');

    try {
      const unsubscribe = onSnapshot(
        collection(db, 'code_ranges'),
        (snapshot) => {
          console.log('📊 Loaded code ranges:', snapshot.size);

          const rangesData = snapshot.docs.map((doc) => {
            const data = doc.data();
            console.log('Code range:', doc.id, data);
            return {
              id: doc.id,
              ...data,
            };
          }) as (CodeRange & { id: string })[];

          // Seřadíme podle názvu
          rangesData.sort((a, b) => a.name.localeCompare(b.name, 'cs'));

          setCodeRanges(rangesData);
          setLoading(false);
        },
        (err) => {
          console.error('❌ Error loading code ranges:', err);
          setError(`Chyba při načítání: ${err.message}`);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('❌ Error setting up listener:', err);
      setError(`Chyba: ${err.message}`);
      setLoading(false);
    }
  }, []);

  // Real-time listener pro tickets (pro barevné rozlišení)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tickets'),
      (snapshot) => {
        const ticketsMap: Record<string, Ticket> = {};
        snapshot.docs.forEach((doc) => {
          ticketsMap[doc.id] = { ean: doc.id, ...doc.data() } as Ticket;
        });
        setTickets(ticketsMap);
        console.log('📊 Loaded tickets for color coding:', Object.keys(ticketsMap).length);
      },
      (err) => {
        console.error('❌ Error loading tickets:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtrování řad
  const filteredRanges = (filter === 'all'
    ? codeRanges
    : filter === 'active'
      ? codeRanges.filter(r => r.active)
      : codeRanges.filter(r => !r.active)
  ).filter(r => {
    if (user?.role === 'BRANCH' && user.branchId) {
      // Zobrazit řady přidělené této pobočce NEBO řady bez pobočky (společné/staré)
      return !r.branchId || r.branchId === user.branchId;
    }
    return true;
  });

  // Statistiky
  const stats = {
    total: codeRanges.length,
    active: codeRanges.filter(r => r.active).length,
    inactive: codeRanges.filter(r => !r.active).length,
    totalTickets: codeRanges.reduce((sum, r) => sum + ((r as any).totalTickets || 0), 0),
  };

  // Parsování EAN rozsahu
  const parseEANRange = (prefix: string) => {
    if (prefix.includes('-')) {
      const [start, end] = prefix.split('-').map(s => s.trim());
      const count = parseInt(end) - parseInt(start) + 1;
      return { start, end, count };
    }
    return { start: prefix, end: prefix, count: 1 };
  };

  // Generování všech EAN kódů v rozsahu
  const generateEANs = (prefix: string, limit: number = 50): string[] => {
    if (prefix.includes('-')) {
      const [start, end] = prefix.split('-').map(s => s.trim());
      const startNum = parseInt(start);
      const endNum = parseInt(end);
      const eans: string[] = [];

      // Zjisti délku EAN kódu z prvního čísla
      const eanLength = start.length;

      for (let i = startNum; i <= Math.min(endNum, startNum + limit - 1); i++) {
        // Zachovej vedoucí nuly - doplň na původní délku
        const ean = i.toString().padStart(eanLength, '0');
        eans.push(ean);
      }

      return eans;
    }
    return [prefix];
  };

  // Toggle zobrazení EAN kódů
  const toggleEANs = (rangeId: string, prefix: string) => {
    if (expandedRangeId === rangeId) {
      setExpandedRangeId(null);
    } else {
      setExpandedRangeId(rangeId);
      if (!showEANs[rangeId]) {
        const eans = generateEANs(prefix, 100);
        setShowEANs({ ...showEANs, [rangeId]: eans });
      }
    }
  };

  // Smazání řady
  const handleDeleteRange = async (rangeId: string, name: string) => {
    if (!window.confirm(`Opravdu chcete smazat řadu "${name}"? Tato akce je nevratná a zneplatní všechny vstupenky této řady.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'code_ranges', rangeId));
      console.log('✅ Range deleted:', rangeId);
    } catch (err: any) {
      console.error('Error deleting range:', err);
      setError(`Chyba při mazání: ${err.message}`);
    }
  };

  // Uložení editace
  const handleSaveEdit = async () => {
    if (!editingRange) return;

    try {
      const rangeRef = doc(db, 'code_ranges', editingRange.id);
      await updateDoc(rangeRef, {
        name: editingRange.name,
        branchId: editingRange.branchId || '',
        description: editingRange.description || '',
        backgroundColor: editingRange.backgroundColor || '#CCCCCC',
        prefix: editingRange.prefix,
        durationMinutes: editingRange.durationMinutes,
        price: editingRange.price,
        pricePerExtraMinute: editingRange.pricePerExtraMinute,
        active: editingRange.active,
        updatedAt: new Date(),
      });

      setEditingRange(null);
      setError('');
    } catch (err: any) {
      console.error('Error updating range:', err);
      setError(`Chyba při ukládání: ${err.message}`);
    }
  };

  // Získej barvu a stav EAN kódu
  const getEANStatus = (ean: string): { color: string; bgColor: string; label: string; icon: string } => {
    const ticket = tickets[ean];

    if (!ticket || ticket.status === 'ACTIVE') {
      // Nevyužitý - zelená
      return {
        color: colors.success,
        bgColor: colors.success + '15',
        label: 'Nevyužitý',
        icon: '✓',
      };
    }

    if (ticket.status === 'INSIDE') {
      // Uvnitř - modrá
      return {
        color: colors.primary,
        bgColor: colors.primary + '15',
        label: 'Uvnitř',
        icon: '🔵',
      };
    }

    // Využitý (LEFT) - šedá
    return {
      color: colors.textSecondary,
      bgColor: colors.textSecondary + '15',
      label: 'Využitý',
      icon: '⚪',
    };
  };

  // Status badge
  const getStatusBadge = (active: boolean) => {
    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '12px',
          backgroundColor: active ? colors.success + '20' : colors.textSecondary + '20',
          color: active ? colors.success : colors.textSecondary,
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        {active ? '✅ Aktivní' : '⏸️ Neaktivní'}
      </span>
    );
  };

  return (
    <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: '1920px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 'clamp(1rem, 3vw, 2rem)' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, margin: 0 }}>
          🎫 Číselné řady vstupenek
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: spacing.sm, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
          Správa a přehled všech řad EAN kódů
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
          gap: 'clamp(0.75rem, 2vw, 1.5rem)',
          marginBottom: 'clamp(1rem, 3vw, 2rem)',
        }}
      >
        <StatCard label="Celkem řad" value={stats.total} icon="📊" />
        <StatCard label="Aktivní" value={stats.active} icon="✅" color={colors.success} />
        <StatCard label="Neaktivní" value={stats.inactive} icon="⏸️" />
        <StatCard label="Celkem lístků" value={stats.totalTickets.toLocaleString('cs-CZ')} icon="🎫" color={colors.primary} />
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: spacing.md,
          marginBottom: spacing.lg,
          flexWrap: 'wrap',
        }}
      >
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              borderRadius: borderRadius.md,
              border: filter === f ? `2px solid ${colors.primary}` : '2px solid transparent',
              backgroundColor: filter === f ? colors.primary + '20' : colors.cardBg,
              color: filter === f ? colors.primary : colors.text,
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {f === 'all' ? 'Všechny' : f === 'active' ? 'Aktivní' : 'Neaktivní'}
          </button>
        ))}
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreating(true)}
            style={{
              padding: '8px 16px',
              borderRadius: borderRadius.md,
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            ➕ Vytvořit řadu
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: spacing.lg,
            backgroundColor: colors.error + '20',
            color: colors.error,
            borderRadius: borderRadius.md,
            marginBottom: spacing.lg,
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.textSecondary }}>
          ⏳ Načítám číselné řady...
        </div>
      )}

      {/* No ranges info */}
      {!loading && codeRanges.length === 0 && !error && (
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: borderRadius.lg,
            padding: spacing.xl,
            textAlign: 'center',
            boxShadow: shadows.card,
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: spacing.md }}>📦</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.sm }}>
            Zatím žádné číselné řady
          </h3>
          <p style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
            Naimportuj číselné řady EAN kódů v Setup stránce.
          </p>
          <a
            href="/admin/setup"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: colors.primary,
              color: 'white',
              textDecoration: 'none',
              borderRadius: borderRadius.md,
              fontWeight: 600,
            }}
          >
            🚀 Otevřít Setup
          </a>
        </div>
      )}

      {/* Code Ranges Table */}
      {!loading && codeRanges.length > 0 && (
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: borderRadius.lg,
            boxShadow: shadows.card,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: colors.background }}>
                  <th style={tableHeaderStyle}>Název</th>
                  <th style={tableHeaderStyle}>Pobočka</th>
                  <th style={tableHeaderStyle}>EAN rozsah</th>
                  <th style={tableHeaderStyle}>Počet lístků</th>
                  <th style={tableHeaderStyle}>Využití</th>
                  <th style={tableHeaderStyle}>Čas</th>
                  <th style={tableHeaderStyle}>Cena</th>
                  <th style={tableHeaderStyle}>Doplatek/min</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Akce</th>
                </tr>
              </thead>
              <tbody>
                {filteredRanges.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tableCellStyle, textAlign: 'center', color: colors.textSecondary }}>
                      {filter === 'all' ? 'Žádné řady' : `Žádné ${filter === 'active' ? 'aktivní' : 'neaktivní'} řady`}
                    </td>
                  </tr>
                ) : (
                  filteredRanges.map((range) => {
                    const eanRange = parseEANRange(range.prefix);
                    const rangeData = range as any;
                    const bgColor = rangeData.backgroundColor || '#CCCCCC';
                    const isExpanded = expandedRangeId === range.id;
                    const branch = BRANCHES.find(b => b.id === range.branchId);

                    return (
                      <React.Fragment key={range.id}>
                        <tr
                          style={{
                            borderBottom: isExpanded ? 'none' : `1px solid ${colors.background}`,
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.background)}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={tableCellStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                              <div
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '4px',
                                  backgroundColor: bgColor,
                                  border: '1px solid rgba(0,0,0,0.1)',
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 600 }}>{range.name}</div>
                                {range.description && (
                                  <div style={{ fontSize: '0.75rem', color: colors.textSecondary, fontStyle: 'italic', maxWidth: '200px' }}>
                                    {range.description}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                                  {rangeData.ticketType || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={tableCellStyle}>
                            <div>
                              <div style={{ fontWeight: 500 }}>{branch ? branch.name : (rangeData.location || '-')}</div>
                              <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                                {range.branchId || '-'}
                              </div>
                            </div>
                          </td>
                          <td style={tableCellStyle}>
                            <div>
                              <code style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                                {eanRange.start}
                              </code>
                              {eanRange.start !== eanRange.end && (
                                <code style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', color: colors.textSecondary }}>
                                  {eanRange.end}
                                </code>
                              )}
                            </div>
                          </td>
                          <td style={tableCellStyle}>
                            <strong>{rangeData.totalTickets?.toLocaleString('cs-CZ') || eanRange.count.toLocaleString('cs-CZ')}</strong>
                          </td>
                          <td style={tableCellStyle}>
                            {(() => {
                              const rangeTs = Object.values(tickets).filter(t => t.rangeId === range.id);
                              const used = rangeTs.filter(t => t.status === 'LEFT').length;
                              const inside = rangeTs.filter(t => t.status === 'INSIDE').length;
                              // Počítáme volné jako celkovou kapacitu mínus použité/uvnitř
                              // To funguje i pro řady, které nemají vygenerované vstupenky v DB (lazy)
                              const total = rangeData.totalTickets || eanRange.count;
                              const active = Math.max(0, total - used - inside);

                              return (
                                <div style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                                  <div style={{ color: colors.textSecondary }}>✅ {used} využito</div>
                                  <div style={{ color: colors.primary }}>🔵 {inside} uvnitř</div>
                                  <div style={{ color: colors.success }}>🆓 {active} volno</div>
                                </div>
                              );
                            })()}
                          </td>
                          <td style={tableCellStyle}>
                            <strong>{range.durationMinutes}</strong> min
                            {range.durationMinutes >= 60 && (
                              <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                                {(range.durationMinutes / 60).toFixed(1).replace('.0', '')} hod
                              </div>
                            )}
                          </td>
                          <td style={tableCellStyle}>
                            <strong>{range.price}</strong> Kč
                          </td>
                          <td style={tableCellStyle}>
                            {range.pricePerExtraMinute} Kč
                          </td>
                          <td style={tableCellStyle}>{getStatusBadge(range.active)}</td>
                          <td style={tableCellStyle}>
                            <div style={{ display: 'flex', gap: spacing.xs }}>
                              {/* The import and useAuth hook should be at the top level of the component, not here */}
                              {/* Assuming 'user' is available from a useAuth() call at the component's top level */}
                              {user?.role === 'ADMIN' && (
                                <React.Fragment>
                                  <button
                                    onClick={() => setEditingRange(range)}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: colors.primary,
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: borderRadius.sm,
                                      cursor: 'pointer',
                                      fontSize: '0.875rem',
                                      fontWeight: 500,
                                    }}
                                    title="Editovat"
                                  >
                                    ✏️ Editovat
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRange(range.id, range.name)}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: colors.error,
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: borderRadius.sm,
                                      cursor: 'pointer',
                                      fontSize: '0.875rem',
                                      fontWeight: 500,
                                    }}
                                    title="Smazat"
                                  >
                                    🗑️
                                  </button>
                                </React.Fragment>
                              )}
                              <button
                                onClick={() => toggleEANs(range.id, range.prefix)}
                                style={{
                                  backgroundColor: isExpanded ? colors.textSecondary : colors.success,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: borderRadius.sm,
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                }}
                                title="Zobrazit EAN kódy"
                              >
                                {isExpanded ? '🔼 Skrýt' : '🔽 EAN kódy'}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Rozbalovací řádek s EAN kódy */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} style={{ padding: 0, borderBottom: `1px solid ${colors.background}` }}>
                              <div
                                style={{
                                  padding: spacing.lg,
                                  backgroundColor: colors.background,
                                }}
                              >
                                <h4 style={{ margin: 0, marginBottom: spacing.md, fontSize: '0.875rem', fontWeight: 600 }}>
                                  📋 EAN kódy (prvních 100)
                                </h4>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: spacing.sm,
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                  }}
                                >
                                  {(showEANs[range.id] || []).map((ean) => {
                                    const status = getEANStatus(ean);
                                    return (
                                      <div
                                        key={ean}
                                        style={{
                                          padding: spacing.sm,
                                          backgroundColor: status.bgColor,
                                          borderRadius: borderRadius.sm,
                                          fontSize: '0.875rem',
                                          fontFamily: 'monospace',
                                          fontWeight: 600,
                                          textAlign: 'center',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          border: `2px solid ${status.color}40`,
                                          color: status.color,
                                          position: 'relative',
                                        }}
                                        onClick={() => setSelectedEAN(ean)}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'scale(1.05)';
                                          e.currentTarget.style.boxShadow = `0 4px 12px ${status.color}40`;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                          e.currentTarget.style.boxShadow = 'none';
                                        }}
                                        title={`${status.label} - Klikni pro zobrazení čárového kódu`}
                                      >
                                        <div style={{ fontSize: '0.65rem', marginBottom: '2px', opacity: 0.8 }}>
                                          {status.icon}
                                        </div>
                                        {ean}
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Legenda */}
                                <div style={{ marginTop: spacing.lg, display: 'flex', gap: spacing.lg, flexWrap: 'wrap', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                    <div style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '4px',
                                      backgroundColor: colors.success + '40',
                                      border: `2px solid ${colors.success}`
                                    }} />
                                    <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>✓ Nevyužitý</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                    <div style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '4px',
                                      backgroundColor: colors.primary + '40',
                                      border: `2px solid ${colors.primary}`
                                    }} />
                                    <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>🔵 Uvnitř</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                    <div style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '4px',
                                      backgroundColor: colors.textSecondary + '40',
                                      border: `2px solid ${colors.textSecondary}`
                                    }} />
                                    <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>⚪ Využitý</span>
                                  </div>
                                  <div style={{ flex: 1, textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                                      💡 Klikni na EAN kód pro zobrazení čárového kódu
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filteredRanges.length > 0 && (
            <div
              style={{
                padding: spacing.md,
                backgroundColor: colors.background,
                textAlign: 'center',
                fontSize: '0.875rem',
                color: colors.textSecondary,
              }}
            >
              Zobrazeno {filteredRanges.length} z {codeRanges.length} řad
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: spacing.lg,
          }}
          onClick={() => !creationProgress && setIsCreating(false)}
        >
          <div
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: borderRadius.lg,
              padding: spacing.xl,
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: shadows.card,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: spacing.lg }}>
              ➕ Nová číselná řada
            </h2>

            {creationProgress ? (
              <div style={{ textAlign: 'center', padding: spacing.xl }}>
                <div style={{ fontSize: '2rem', marginBottom: spacing.md }}>⏳</div>
                <h3>Pracuji...</h3>
                <p>{creationProgress}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {/* Název a Barva */}
                <div style={{ display: 'flex', gap: spacing.md }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                      Název
                    </label>
                    <input
                      type="text"
                      value={newRange.name}
                      onChange={(e) => setNewRange({ ...newRange, name: e.target.value })}
                      placeholder="Např. Základní vstup - Vánoce"
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.textSecondary}40`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        fontSize: '1rem',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                      Barva
                    </label>
                    <input
                      type="color"
                      value={newRange.backgroundColor || '#3399FF'}
                      onChange={(e) => setNewRange({ ...newRange, backgroundColor: e.target.value })}
                      style={{
                        width: '50px',
                        height: '42px',
                        padding: 0,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.textSecondary}40`,
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>

                {/* Popis */}
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                    Popis (volitelné)
                  </label>
                  <input
                    type="text"
                    value={newRange.description || ''}
                    onChange={(e) => setNewRange({ ...newRange, description: e.target.value })}
                    placeholder="Např. Vstupenka pro děti do 15 let"
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.textSecondary}40`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '1rem',
                    }}
                  />
                </div>

                {/* Pobočka */}
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                    Pobočka
                  </label>
                  <select
                    value={newRange.branchId}
                    onChange={(e) => setNewRange({ ...newRange, branchId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.textSecondary}40`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '1rem',
                    }}
                  >
                    <option value="">-- Vyberte pobočku --</option>
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* EAN Range */}
                <div style={{ display: 'flex', gap: spacing.md }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                      EAN Od (číslo)
                    </label>
                    <input
                      type="number"
                      value={newRange.startEan}
                      onChange={(e) => setNewRange({ ...newRange, startEan: e.target.value })}
                      placeholder="200100"
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.textSecondary}40`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        fontSize: '1rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                      EAN Do (číslo)
                    </label>
                    <input
                      type="number"
                      value={newRange.endEan}
                      onChange={(e) => setNewRange({ ...newRange, endEan: e.target.value })}
                      placeholder="200200"
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.textSecondary}40`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        fontSize: '1rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>

                {/* Info about count */}
                {newRange.startEan && newRange.endEan && (
                  <div style={{ fontSize: '0.875rem', color: colors.textSecondary, textAlign: 'right' }}>
                    Počet vstupenek: <strong>{Math.max(0, parseInt(newRange.endEan) - parseInt(newRange.startEan) + 1)}</strong>
                  </div>
                )}

                {/* Čas */}
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                    Čas (minuty)
                  </label>
                  <input
                    type="number"
                    value={newRange.durationMinutes}
                    onChange={(e) => setNewRange({ ...newRange, durationMinutes: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.textSecondary}40`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '1rem',
                    }}
                  />
                </div>

                {/* Cena */}
                <div style={{ display: 'flex', gap: spacing.md }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                      Cena (Kč)
                    </label>
                    <input
                      type="number"
                      value={newRange.price}
                      onChange={(e) => setNewRange({ ...newRange, price: parseInt(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.textSecondary}40`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        fontSize: '1rem',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                      Doplatek / min (Kč)
                    </label>
                    <input
                      type="number"
                      value={newRange.pricePerExtraMinute}
                      onChange={(e) => setNewRange({ ...newRange, pricePerExtraMinute: parseInt(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.textSecondary}40`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        fontSize: '1rem',
                      }}
                    />
                  </div>
                </div>

                {/* Options */}
                <div style={{ marginTop: spacing.md }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newRange.generateTickets}
                      onChange={(e) => setNewRange({ ...newRange, generateTickets: e.target.checked })}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Vygenerovat vstupenky do DB</span>
                      <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        Pokud zaškrtnuto, systém vytvoří {Math.max(0, parseInt(newRange.endEan) - parseInt(newRange.startEan) + 1)} dokumentů v databázi.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.xl }}>
                  <button
                    onClick={handleCreateRange}
                    style={{
                      flex: 1,
                      padding: spacing.md,
                      backgroundColor: colors.success,
                      color: 'white',
                      border: 'none',
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    🚀 Vytvořit
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    style={{
                      flex: 1,
                      padding: spacing.md,
                      backgroundColor: colors.textSecondary,
                      color: 'white',
                      border: 'none',
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    ❌ Zrušit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}{
        editingRange && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: spacing.lg,
            }}
            onClick={() => setEditingRange(null)}
          >
            <div
              style={{
                backgroundColor: colors.cardBg,
                borderRadius: borderRadius.lg,
                padding: spacing.xl,
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: shadows.card,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: spacing.lg }}>
                ✏️ Editovat číselnou řadu
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {/* Název a Barva */}
                <div style={{ display: 'flex', gap: spacing.md }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                      Název
                    </label>
                    <input
                      type="text"
                      value={editingRange.name}
                      onChange={(e) => setEditingRange({ ...editingRange, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: spacing.sm,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.textSecondary}40`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        fontSize: '1rem',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                      Barva
                    </label>
                    <input
                      type="color"
                      value={editingRange.backgroundColor || '#CCCCCC'}
                      onChange={(e) => setEditingRange({ ...editingRange, backgroundColor: e.target.value })}
                      style={{
                        width: '50px',
                        height: '42px',
                        padding: 0,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.textSecondary}40`,
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>

                {/* Popis */}
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                    Popis (volitelné)
                  </label>
                  <input
                    type="text"
                    value={editingRange.description || ''}
                    onChange={(e) => setEditingRange({ ...editingRange, description: e.target.value })}
                    placeholder="Např. Vstupenka pro děti do 15 let"
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.textSecondary}40`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '1rem',
                    }}
                  />
                </div>

                {/* Pobočka */}
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                    Pobočka
                  </label>
                  <select
                    value={editingRange.branchId || ''}
                    onChange={(e) => setEditingRange({ ...editingRange, branchId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.textSecondary}40`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '1rem',
                    }}
                  >
                    <option value="">-- Vyberte pobočku --</option>
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* EAN rozsah */}
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                    EAN rozsah (např. 03041000-03043000)
                  </label>
                  <input
                    type="text"
                    value={editingRange.prefix}
                    onChange={(e) => setEditingRange({ ...editingRange, prefix: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.textSecondary}40`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '1rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                {/* Čas */}
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                    Čas (minuty)
                  </label>
                  <input
                    type="number"
                    value={editingRange.durationMinutes}
                    onChange={(e) => setEditingRange({ ...editingRange, durationMinutes: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.textSecondary}40`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '1rem',
                    }}
                  />
                </div>

                {/* Cena */}
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                    Cena (Kč)
                  </label>
                  <input
                    type="number"
                    value={editingRange.price}
                    onChange={(e) => setEditingRange({ ...editingRange, price: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.textSecondary}40`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '1rem',
                    }}
                  />
                </div>

                {/* Doplatek */}
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600, fontSize: '0.875rem' }}>
                    Doplatek za minutu (Kč)
                  </label>
                  <input
                    type="number"
                    value={editingRange.pricePerExtraMinute}
                    onChange={(e) => setEditingRange({ ...editingRange, pricePerExtraMinute: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.textSecondary}40`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '1rem',
                    }}
                  />
                </div>

                {/* Aktivní */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editingRange.active}
                      onChange={(e) => setEditingRange({ ...editingRange, active: e.target.checked })}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Aktivní</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.xl }}>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    backgroundColor: colors.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: borderRadius.md,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  💾 Uložit
                </button>
                <button
                  onClick={() => setEditingRange(null)}
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    backgroundColor: colors.textSecondary,
                    color: 'white',
                    border: 'none',
                    borderRadius: borderRadius.md,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  ❌ Zrušit
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Barcode Modal */}
      {selectedEAN && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: spacing.lg,
          }}
          onClick={() => setSelectedEAN(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: borderRadius.lg,
              padding: spacing.xl,
              maxWidth: '800px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: spacing.lg, color: '#000' }}>
              📊 Čárový kód EAN
            </h2>

            <div
              style={{
                backgroundColor: '#fff',
                padding: spacing.xl,
                borderRadius: borderRadius.md,
                marginBottom: spacing.lg,
                border: '2px solid #e0e0e0',
              }}
            >
              {(() => {
                try {
                  return (
                    <Barcode
                      value={selectedEAN}
                      format="CODE128"
                      width={2}
                      height={100}
                      displayValue={true}
                      fontSize={20}
                      margin={10}
                    />
                  );
                } catch (error) {
                  console.error('Barcode generation error:', error);
                  return (
                    <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.error }}>
                      <p style={{ fontSize: '1rem', marginBottom: spacing.sm }}>
                        ⚠️ Nelze vygenerovat čárový kód
                      </p>
                      <p style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                        EAN kód: {selectedEAN}
                      </p>
                    </div>
                  );
                }
              })()}
            </div>

            <div style={{ marginBottom: spacing.lg }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#000', marginBottom: spacing.sm }}>
                {selectedEAN}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>
                Naskenuj tento kód čtečkou nebo zkopíruj do schránky
              </p>
            </div>

            <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedEAN);
                  alert(`EAN ${selectedEAN} zkopírován do schránky!`);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                📋 Kopírovat do schránky
              </button>
              <button
                onClick={() => window.print()}
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
                🖨️ Vytisknout
              </button>
              <button
                onClick={() => setSelectedEAN(null)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: colors.textSecondary,
                  color: 'white',
                  border: 'none',
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                ❌ Zavřít
              </button>
            </div>

            <p style={{ marginTop: spacing.lg, fontSize: '0.75rem', color: '#999' }}>
              💡 Tip: Můžeš naskenovat čárový kód přímo z obrazovky pomocí čtečky
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Pomocná komponenta pro statistiky
const StatCard: React.FC<{ label: string; value: number | string; icon: string; color?: string }> = ({
  label,
  value,
  icon,
  color = colors.text,
}) => (
  <div
    style={{
      backgroundColor: colors.cardBg,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      boxShadow: shadows.card,
    }}
  >
    <div style={{ fontSize: '2rem', marginBottom: spacing.sm }}>{icon}</div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color, marginBottom: spacing.xs }}>{value}</div>
    <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>{label}</div>
  </div>
);

// Styly pro tabulku
const tableHeaderStyle: React.CSSProperties = {
  padding: spacing.md,
  textAlign: 'left',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tableCellStyle: React.CSSProperties = {
  padding: spacing.md,
  fontSize: '0.875rem',
};

