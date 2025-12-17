/**
 * Admin Setup Page
 * Stránka pro inicializaci databáze a import dat
 */

import React, { useState } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import seedData from '../../../firebase-seed-data.json';
import { migrateTicketsAddRemainingMinutes } from '../../utils/migrateTickets';

export const Setup: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const importCodeRanges = async () => {
    setImporting(true);
    setError('');
    setSuccess(false);
    setProgress('Importuji řady EAN kódů...');

    try {
      const codeRanges = seedData.code_ranges;
      let count = 0;

      for (const [id, range] of Object.entries(codeRanges)) {
        const docRef = doc(db, 'code_ranges', id);
        
        await setDoc(docRef, {
          ...range,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        count++;
        setProgress(`Importováno ${count}/${Object.keys(codeRanges).length} řad...`);
      }

      // Import terminálů
      setProgress('Importuji terminály...');
      
      const terminals = [
        { id: 'entry-cyber', type: 'ENTRY', location: 'Cyber Arcade - Hlavní vchod', locationCode: '03', relayEnabled: true, active: true },
        { id: 'entry-gameworld', type: 'ENTRY', location: 'Game World - Hlavní vchod', locationCode: '02', relayEnabled: true, active: true },
        { id: 'entry-gamestation', type: 'ENTRY', location: 'Game Station - Hlavní vchod', locationCode: '01', relayEnabled: true, active: true },
        { id: 'check-cyber', type: 'CHECK', location: 'Cyber Arcade - Check', locationCode: '03', relayEnabled: false, active: true },
        { id: 'check-gameworld', type: 'CHECK', location: 'Game World - Check', locationCode: '02', relayEnabled: false, active: true },
        { id: 'exit-cyber', type: 'EXIT', location: 'Cyber Arcade - Východ', locationCode: '03', relayEnabled: true, active: true },
        { id: 'exit-gameworld', type: 'EXIT', location: 'Game World - Východ', locationCode: '02', relayEnabled: true, active: true },
        { id: 'exit-gamestation', type: 'EXIT', location: 'Game Station - Východ', locationCode: '01', relayEnabled: true, active: true },
      ];

      for (const terminal of terminals) {
        const { id, ...data } = terminal;
        const docRef = doc(db, 'terminals', id);
        
        await setDoc(docRef, {
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      setProgress('');
      setSuccess(true);
      setImporting(false);
    } catch (err: any) {
      setError(`Chyba při importu: ${err.message}`);
      setImporting(false);
      setProgress('');
    }
  };

  const handleMigration = async () => {
    setMigrating(true);
    setError('');
    setSuccess(false);
    setProgress('Migruji vstupenky...');

    try {
      const result = await migrateTicketsAddRemainingMinutes();
      setProgress(`✅ Migrace dokončena! Aktualizováno: ${result.updated}, Přeskočeno: ${result.skipped}`);
      setSuccess(true);
      setMigrating(false);
    } catch (err: any) {
      setError(`Chyba při migraci: ${err.message}`);
      setMigrating(false);
      setProgress('');
    }
  };

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
          ⚙️ Nastavení systému
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
          Inicializace databáze a import dat
        </p>
      </div>

      {/* Import Card */}
      <div
        style={{
          backgroundColor: colors.cardBg,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          boxShadow: shadows.card,
          marginBottom: spacing.xl,
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: spacing.lg }}>
          📦 Import řad EAN kódů
        </h2>

        <div style={{ marginBottom: spacing.lg }}>
          <p style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
            Tato akce naimportuje do Firestore všechny definované řady EAN kódů:
          </p>
          <ul style={{ color: colors.textSecondary, paddingLeft: spacing.xl }}>
            <li>15 řad EAN kódů (Limetková, Oranžová, Fialová, Zlatá, Modrá)</li>
            <li>8 terminálů (Entry, Check, Exit pro všechny pobočky)</li>
            <li>Celkem 21 000 lístků</li>
          </ul>
        </div>

        {/* Progress */}
        {progress && (
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.info,
              borderRadius: borderRadius.base,
              marginBottom: spacing.md,
              color: colors.primary,
            }}
          >
            {progress}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              padding: spacing.md,
              backgroundColor: '#FFEBEE',
              borderRadius: borderRadius.base,
              marginBottom: spacing.md,
              color: colors.error,
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            style={{
              padding: spacing.md,
              backgroundColor: '#E8F5E9',
              borderRadius: borderRadius.base,
              marginBottom: spacing.md,
              color: colors.success,
            }}
          >
            ✅ Import byl úspěšný! Data jsou nyní v Firestore.
          </div>
        )}

        {/* Button */}
        <button
          onClick={importCodeRanges}
          disabled={importing}
          style={{
            padding: `${spacing.md} ${spacing.xl}`,
            backgroundColor: importing ? colors.border : colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: borderRadius.base,
            fontSize: '1rem',
            fontWeight: 600,
            cursor: importing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {importing ? '⏳ Importuji...' : '🚀 Spustit import'}
        </button>
      </div>

      {/* Migration Card */}
      <div
        style={{
          backgroundColor: colors.cardBg,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          boxShadow: shadows.card,
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: spacing.md }}>
          🔄 Migrace vstupenek
        </h2>

        <p style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
          Přidá pole <code>remainingMinutes</code> do existujících vstupenek.
          Spusť jednou po aktualizaci systému.
        </p>

        {/* Button */}
        <button
          onClick={handleMigration}
          disabled={migrating}
          style={{
            padding: `${spacing.md} ${spacing.xl}`,
            backgroundColor: migrating ? colors.border : colors.warning,
            color: colors.white,
            border: 'none',
            borderRadius: borderRadius.base,
            fontSize: '1rem',
            fontWeight: 600,
            cursor: migrating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {migrating ? '⏳ Migruji...' : '🔄 Spustit migraci'}
        </button>
      </div>
    </div>
  );
};

