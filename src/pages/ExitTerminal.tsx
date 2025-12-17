/**
 * Exit Terminal - Výstupní terminál
 * Skenování vstupenky při odchodu z muzea
 */

import React, { useState, useCallback } from 'react';
import { doc, getDoc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { KioskLayout } from '../components/kiosk/KioskLayout';
import { BarcodeIcon } from '../components/kiosk/BarcodeIcon';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { colors } from '../config/theme';
import type { ScanState, Ticket, CodeRange } from '../types';
import { isValidEAN, calculateRemainingMinutes, isTicketValidToday } from '../utils/validation';

export const ExitTerminal: React.FC = () => {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);
  const [overstayMinutes, setOverstayMinutes] = useState<number>(0);
  const [overstayCharge, setOverstayCharge] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  const handleScan = useCallback(async (code: string) => {
    console.log('🚪 Exit scan:', code);
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

      // 5. Načti code_range pro cenu doplatku
      const rangeRef = doc(db, 'code_ranges', ticket.rangeId);
      const rangeSnap = await getDoc(rangeRef);

      if (!rangeSnap.exists()) {
        setScanState('error');
        setMessage('Chyba: Typ vstupenky nenalezen');
        setTimeout(() => {
          setScanState('idle');
          setMessage('');
        }, 5000);
        return;
      }

      const range = { id: rangeSnap.id, ...rangeSnap.data() } as CodeRange;

      // 6. Vypočítej zbývající čas
      const remaining = calculateRemainingMinutes(ticket);

      if (remaining < 0) {
        // Překročení času - doplatek
        const overstay = Math.abs(remaining);
        const charge = overstay * range.pricePerExtraMinute;

        setOverstayMinutes(overstay);
        setOverstayCharge(charge);
        setRemainingMinutes(0);
        setScanState('error'); // Error = doplatek

        console.log('⚠️ Overstay detected:', overstay, 'minutes, charge:', charge, 'Kč');
      } else {
        // V pořádku - může odejít
        setRemainingMinutes(remaining);
        setOverstayMinutes(0);
        setOverstayCharge(0);
        setScanState('success');

        // TODO: Otevřít dveře (relé)
        console.log('🚪 Opening door...');
      }

      // 7. Aktualizuj status na LEFT a ulož zbývající čas
      await setDoc(ticketRef, {
        ...ticket,
        status: 'LEFT',
        lastScan: Timestamp.now(),
        remainingMinutes: Math.max(0, remaining), // Ulož zbývající čas (min 0)
        scanCount: ticket.scanCount + 1,
        updatedAt: Timestamp.now(),
      });

      // 8. Zaloguj event
      const eventRef = doc(collection(db, 'events'));
      await setDoc(eventRef, {
        ean: normalizedEAN,
        type: 'EXIT',
        terminalId: 'exit-1',
        timestamp: Timestamp.now(),
        remainingMinutes: remaining > 0 ? remaining : 0,
        overstayMinutes: remaining < 0 ? Math.abs(remaining) : 0,
      });

      console.log('✅ Exit complete');

      // Reset po 7 sekundách (delší čas na přečtení doplatku)
      setTimeout(() => {
        setScanState('idle');
        setRemainingMinutes(0);
        setOverstayMinutes(0);
        setOverstayCharge(0);
        setMessage('');
      }, 7000);

    } catch (err: any) {
      console.error('❌ Error processing exit:', err);
      setScanState('error');
      setMessage('Chyba systému');
      setTimeout(() => {
        setScanState('idle');
        setMessage('');
      }, 5000);
    }
  }, []);

  useBarcodeScanner(handleScan);

  // Idle stav
  if (scanState === 'idle') {
    return (
      <KioskLayout backgroundColor={colors.black}>
        <div className="flex-column flex-center text-center animate-fade-in">
          <h1 className="kiosk-title" style={{ color: colors.white, marginBottom: '3rem' }}>
            ODCHOD
          </h1>
          
          <BarcodeIcon animate size={300} color={colors.primary} />
          
          <p className="kiosk-message" style={{ color: colors.white, marginTop: '3rem' }}>
            Přiložte vstupenku pro odchod
          </p>
        </div>
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

  // Success stav (OK odchod)
  if (scanState === 'success') {
    return (
      <KioskLayout backgroundColor={colors.success}>
        <div className="flex-column flex-center text-center animate-slide-in">
          <div style={{ fontSize: 'clamp(5rem, 10vw, 8rem)', marginBottom: '2rem' }}>
            ✓
          </div>
          
          <h1 className="kiosk-title" style={{ color: colors.white }}>
            DĚKUJEME ZA NÁVŠTĚVU!
          </h1>
          
          {remainingMinutes > 0 && (
            <>
              <p className="kiosk-message" style={{ color: colors.white, marginTop: '2rem' }}>
                Zbývalo vám:
              </p>
              
              <div style={{ 
                fontSize: 'clamp(3rem, 6vw, 5rem)', 
                color: colors.white, 
                marginTop: '1rem',
                fontWeight: 700 
              }}>
                {remainingMinutes} minut
              </div>
            </>
          )}
          
          <p className="kiosk-message" style={{ 
            color: colors.white, 
            marginTop: '3rem',
            opacity: 0.9 
          }}>
            Těšíme se na viděnou!
          </p>
        </div>
      </KioskLayout>
    );
  }

  // Error stav (doplatek nebo chyba)
  if (scanState === 'error') {
    // Pokud je doplatek, zobraz ho
    if (overstayMinutes > 0) {
      return (
        <KioskLayout backgroundColor={colors.error}>
          <div className="flex-column flex-center text-center animate-shake">
            <div style={{ fontSize: 'clamp(5rem, 10vw, 8rem)', marginBottom: '2rem' }}>
              ⚠️
            </div>

            <h1 className="kiosk-title" style={{ color: colors.white }}>
              PŘEKROČENÍ ČASU
            </h1>

            <p className="kiosk-message" style={{ color: colors.white, marginTop: '2rem' }}>
              Překročeno o:
            </p>

            <div style={{
              fontSize: 'clamp(3rem, 6vw, 5rem)',
              color: colors.white,
              marginTop: '1rem',
              fontWeight: 700
            }}>
              {overstayMinutes} minut
            </div>

            <p className="kiosk-message" style={{ color: colors.white, marginTop: '2rem' }}>
              Doplatek:
            </p>

            <div className="kiosk-time" style={{ color: colors.white, marginTop: '1rem' }}>
              {overstayCharge} Kč
            </div>

            <p style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              color: colors.white,
              marginTop: '3rem',
              fontWeight: 600
            }}>
              Navštivte prosím pokladnu
            </p>
          </div>
        </KioskLayout>
      );
    }

    // Jinak zobraz obecnou chybovou zprávu
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

