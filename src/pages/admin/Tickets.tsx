/**
 * Admin Tickets Page
 * Správa číselných řad vstupenek (code_ranges)
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import type { CodeRange, Ticket } from '../../types';
import Barcode from 'react-barcode';

export const Tickets: React.FC = () => {
  const [codeRanges, setCodeRanges] = useState<(CodeRange & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingRange, setEditingRange] = useState<(CodeRange & { id: string }) | null>(null);
  const [expandedRangeId, setExpandedRangeId] = useState<string | null>(null);
  const [showEANs, setShowEANs] = useState<Record<string, string[]>>({});
  const [selectedEAN, setSelectedEAN] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Record<string, Ticket>>({});

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
  const filteredRanges = filter === 'all'
    ? codeRanges
    : filter === 'active'
    ? codeRanges.filter(r => r.active)
    : codeRanges.filter(r => !r.active);

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

  // Uložení editace
  const handleSaveEdit = async () => {
    if (!editingRange) return;

    try {
      const rangeRef = doc(db, 'code_ranges', editingRange.id);
      await updateDoc(rangeRef, {
        name: editingRange.name,
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

    if (!ticket) {
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
    <div style={{ padding: spacing.xl, maxWidth: '1920px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
          🎫 Číselné řady vstupenek
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
          Správa a přehled všech řad EAN kódů
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing.lg,
          marginBottom: spacing.xl,
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
                              <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                                {rangeData.ticketType || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={tableCellStyle}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{rangeData.location || '-'}</div>
                            <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                              Kód: {rangeData.locationCode || '-'}
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
                          <strong>{range.durationMinutes}</strong> min
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
                              onClick={() => toggleEANs(range.id, range.prefix)}
                              style={{
                                padding: '6px 12px',
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

      {/* Edit Modal */}
      {editingRange && (
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
              {/* Název */}
              <div>
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
              <Barcode
                value={selectedEAN}
                format={selectedEAN.length === 8 ? "EAN8" : selectedEAN.length === 13 ? "EAN13" : "CODE128"}
                width={2}
                height={100}
                displayValue={true}
                fontSize={20}
                margin={10}
              />
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

