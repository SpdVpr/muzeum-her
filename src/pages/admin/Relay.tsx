/**
 * Admin Relay Page
 * Manuální ovládání relé (dveří)
 */

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import { triggerRelay } from '../../utils/relay';

interface RelayEvent {
  id: string;
  timestamp: Timestamp;
  triggeredBy: string;
  terminal: string;
  duration: number;
}

export const Relay: React.FC = () => {
  const [relayStatus, setRelayStatus] = useState<'closed' | 'open'>('closed');
  const [history, setHistory] = useState<RelayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Real-time listener pro historii
  useEffect(() => {
    const historyQuery = query(
      collection(db, 'relay_events'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const events = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RelayEvent[];

        setHistory(events);
      },
      (err) => {
        console.error('Error loading relay history:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleOpenDoor = async (terminal: 'entry' | 'exit') => {
    setLoading(true);
    setMessage('');

    try {
      // Zavolej funkci pro otevření dveří
      const success = await triggerRelay(terminal);

      if (success) {
        // Zaloguj do Firebase
        await addDoc(collection(db, 'relay_events'), {
          timestamp: Timestamp.now(),
          triggeredBy: 'admin',
          terminal: terminal === 'entry' ? 'entry-1' : 'exit-1',
          duration: 5, // 5 sekund
        });

        setRelayStatus('open');
        setMessage(`✅ Dveře ${terminal === 'entry' ? 'VSTUP' : 'VÝSTUP'} otevřeny`);

        // Simulace zavření po 5 sekundách
        setTimeout(() => {
          setRelayStatus('closed');
        }, 5000);
      } else {
        setMessage('❌ Chyba při otevírání dveří');
      }
    } catch (err: any) {
      setMessage(`❌ Chyba: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const formatTimestamp = (timestamp: Timestamp) => {
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

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
          🎛️ Ovládání relé
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
          Manuální otevření dveří
        </p>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: spacing.md,
          marginBottom: spacing.lg,
          backgroundColor: message.startsWith('✅') ? colors.success + '20' : colors.error + '20',
          color: message.startsWith('✅') ? colors.success : colors.error,
          borderRadius: borderRadius.md,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {message}
        </div>
      )}

      {/* Status */}
      <div style={{ 
        backgroundColor: colors.cardBg, 
        borderRadius: borderRadius.lg, 
        padding: spacing.xl, 
        marginBottom: spacing.xl, 
        boxShadow: shadows.card,
        textAlign: 'center',
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>
          Status relé
        </h3>
        <div style={{ 
          fontSize: '4rem', 
          marginBottom: spacing.md,
          color: relayStatus === 'open' ? colors.success : colors.textSecondary,
        }}>
          {relayStatus === 'open' ? '🟢' : '🔴'}
        </div>
        <div style={{ 
          fontSize: '1.5rem', 
          fontWeight: 700,
          color: relayStatus === 'open' ? colors.success : colors.textSecondary,
        }}>
          {relayStatus === 'open' ? 'OTEVŘENO' : 'ZAVŘENO'}
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: spacing.lg, 
        marginBottom: spacing.xl 
      }}>
        <button
          onClick={() => handleOpenDoor('entry')}
          disabled={loading}
          style={{
            padding: spacing.xl,
            backgroundColor: loading ? colors.textSecondary : colors.success,
            color: 'white',
            border: 'none',
            borderRadius: borderRadius.lg,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1.25rem',
            fontWeight: 700,
            boxShadow: shadows.card,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{ fontSize: '3rem', marginBottom: spacing.sm }}>🚪</div>
          OTEVŘÍT VSTUP
        </button>

        <button
          onClick={() => handleOpenDoor('exit')}
          disabled={loading}
          style={{
            padding: spacing.xl,
            backgroundColor: loading ? colors.textSecondary : colors.warning,
            color: 'white',
            border: 'none',
            borderRadius: borderRadius.lg,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1.25rem',
            fontWeight: 700,
            boxShadow: shadows.card,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{ fontSize: '3rem', marginBottom: spacing.sm }}>🚶</div>
          OTEVŘÍT VÝSTUP
        </button>
      </div>

      {/* History */}
      <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, boxShadow: shadows.card }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>
          📜 Historie otevření
        </h3>
        {history.length === 0 ? (
          <p style={{ color: colors.textSecondary, textAlign: 'center' }}>Žádná historie</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.background}` }}>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>
                    Datum a čas
                  </th>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>
                    Terminál
                  </th>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>
                    Spuštěno
                  </th>
                  <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: colors.textSecondary }}>
                    Doba
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((event) => (
                  <tr key={event.id} style={{ borderBottom: `1px solid ${colors.background}` }}>
                    <td style={{ padding: spacing.md, fontSize: '0.875rem' }}>
                      {formatTimestamp(event.timestamp)}
                    </td>
                    <td style={{ padding: spacing.md, fontSize: '0.875rem' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: event.terminal.includes('entry') ? colors.success + '20' : colors.warning + '20',
                        color: event.terminal.includes('entry') ? colors.success : colors.warning,
                      }}>
                        {event.terminal.includes('entry') ? '🚪 Vstup' : '🚶 Výstup'}
                      </span>
                    </td>
                    <td style={{ padding: spacing.md, fontSize: '0.875rem' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: colors.primary + '20',
                        color: colors.primary,
                      }}>
                        {event.triggeredBy === 'admin' ? '👤 Admin' : '🤖 Auto'}
                      </span>
                    </td>
                    <td style={{ padding: spacing.md, fontSize: '0.875rem', fontWeight: 600 }}>
                      {event.duration}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

