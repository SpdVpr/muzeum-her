/**
 * Check Terminal - Kontrola času
 * Zobrazení zbývajícího času návštěvníkovi
 */

import React, { useState, useCallback } from 'react';
import { doc, getDoc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { KioskLayout } from '../components/kiosk/KioskLayout';
import { BarcodeIcon } from '../components/kiosk/BarcodeIcon';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { colors } from '../config/theme';
import type { ScanState, Ticket } from '../types';
import { isValidEAN, calculateRemainingMinutes, isTicketValidToday } from '../utils/validation';
import { TestTicketButtons } from '../components/kiosk/TestTicketButtons';

export const CheckTerminal: React.FC = () => {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  const handleScan = useCallback(async (code: string) => {
    console.log('🔍 Check scan:', code);
    setScanState('scanning');

    try {
      // Normalizuj EAN - pokud má 7 číslic, přidej vedoucí nulu
      let normalizedEAN = code;
      if (code.length === 7) {
        normalizedEAN = '0' + code;
        console.log('🔧 Normalizuji EAN:', code, '→', normalizedEAN);
      }

      // 1. Validace EAN formátu
      if (!isValidEAN(normalizedEAN)) {
        setScanState('error');
        setMessage('Neplatný formát EAN kódu');
        setTimeout(() => {
          setScanState('idle');
          setMessage('');
        }, 5000);
        return;
      }

      // 2. Načti vstupenku z Firebase
      const ticketRef = doc(db, 'tickets', normalizedEAN);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        setScanState('error');
        setMessage('Vstupenka nenalezena');
        setTimeout(() => {
          setScanState('idle');
          setMessage('');
        }, 5000);
        return;
      }

      const ticket = { ean: normalizedEAN, ...ticketSnap.data() } as Ticket;

      // 3. Kontrola platnosti pro dnešní den
      if (!isTicketValidToday(ticket)) {
        setScanState('error');
        setMessage('VSTUPENKA EXPIROVALA');
        setTimeout(() => {
          setScanState('idle');
          setMessage('');
        }, 7000);
        return;
      }

      // 4. Kontrola statusu
      if (ticket.status !== 'INSIDE') {
        setScanState('error');
        setMessage('Nejste uvnitř');
        setTimeout(() => {
          setScanState('idle');
          setMessage('');
        }, 5000);
        return;
      }

      // 5. Vypočítej zbývající čas
      const remaining = calculateRemainingMinutes(ticket);
      setRemainingMinutes(remaining);

      // 6. Aktualizuj lastScan
      await setDoc(ticketRef, {
        ...ticket,
        lastScan: Timestamp.now(),
        scanCount: ticket.scanCount + 1,
        updatedAt: Timestamp.now(),
      });

      // 7. Zaloguj event
      const eventRef = doc(collection(db, 'events'));
      await setDoc(eventRef, {
        ean: normalizedEAN,
        type: 'CHECK',
        terminalId: 'check-1',
        timestamp: Timestamp.now(),
        remainingMinutes: remaining,
        overstayMinutes: remaining < 0 ? Math.abs(remaining) : 0,
      });

      setScanState('success');
      console.log('✅ Check complete. Remaining:', remaining, 'minutes');

      // Reset po 10 sekundách (delší čas na přečtení)
      setTimeout(() => {
        setScanState('idle');
        setRemainingMinutes(0);
        setMessage('');
      }, 10000);

    } catch (err: any) {
      console.error('❌ Error processing check:', err);
      setScanState('error');
      setMessage('Chyba systému');
      setTimeout(() => {
        setScanState('idle');
        setMessage('');
      }, 5000);
    }
  }, []);

  useBarcodeScanner(handleScan);

  // Určení barvy podle zbývajícího času
  const getBackgroundColor = () => {
    if (remainingMinutes > 30) return colors.success;
    if (remainingMinutes > 10) return colors.warning;
    return colors.error;
  };

  // Idle stav
  if (scanState === 'idle') {
    return (
      <KioskLayout backgroundColor={colors.black}>
        <div className="flex-column flex-center text-center animate-fade-in">
          <h1 className="kiosk-title" style={{ color: colors.white, marginBottom: '3rem' }}>
            KONTROLA ČASU
          </h1>

          <BarcodeIcon animate size={300} color={colors.info} />

          <p className="kiosk-message" style={{ color: colors.white, marginTop: '3rem' }}>
            Zkontrolujte zbývající čas
          </p>

          <p style={{
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            color: colors.white,
            marginTop: '2rem',
            opacity: 0.7
          }}>
            Přiložte vstupenku k čtečce
          </p>
        </div>
        <TestTicketButtons onScan={handleScan} mode="check" />
      </KioskLayout>
    );
  }

  // Scanning stav
  if (scanState === 'scanning') {
    return (
      <KioskLayout backgroundColor={colors.primary}>
        <div className="flex-column flex-center text-center animate-fade-in">
          <div className="kiosk-title" style={{ color: colors.white }}>
            Kontroluji...
          </div>
        </div>
      </KioskLayout>
    );
  }

  // Success stav
  if (scanState === 'success') {
    return (
      <KioskLayout backgroundColor={getBackgroundColor()}>
        <div className="flex-column flex-center text-center animate-slide-in">
          <h1 className="kiosk-message" style={{ color: colors.white, marginBottom: '2rem' }}>
            ZBÝVAJÍCÍ ČAS:
          </h1>

          <div className="kiosk-time" style={{ color: colors.white }}>
            ⏱ {remainingMinutes}
          </div>

          <p style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: colors.white,
            marginTop: '1rem',
            fontWeight: 600
          }}>
            MINUT
          </p>

          {remainingMinutes <= 10 && (
            <p className="kiosk-message animate-pulse" style={{
              color: colors.white,
              marginTop: '3rem',
              fontWeight: 700
            }}>
              ⚠️ Brzy vám vyprší čas! ⚠️
            </p>
          )}
        </div>
      </KioskLayout>
    );
  }

  // Error stav
  if (scanState === 'error') {
    const isExpired = message === 'VSTUPENKA EXPIROVALA';

    return (
      <KioskLayout backgroundColor={colors.error}>
        <div className="flex-column flex-center text-center animate-shake">
          <div style={{ fontSize: 'clamp(5rem, 10vw, 8rem)', marginBottom: '2rem' }}>
            ✗
          </div>

          <h1 className="kiosk-title" style={{ color: colors.white }}>
            {message || 'Chyba'}
          </h1>

          {isExpired && (
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              color: colors.white,
              marginTop: '2rem',
              opacity: 0.7,
              maxWidth: '80%',
              lineHeight: 1.4
            }}>
              Vstupenky jsou nepřenosné a platí pouze jeden den
            </p>
          )}
        </div>
      </KioskLayout>
    );
  }

  return null;
};

