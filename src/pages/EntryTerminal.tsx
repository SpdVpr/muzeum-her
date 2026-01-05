/**
 * Entry Terminal - Vstupní terminál
 * Skenování vstupenky při vstupu do muzea
 */

import React, { useState, useCallback, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { KioskLayout } from '../components/kiosk/KioskLayout';
import { BarcodeIcon } from '../components/kiosk/BarcodeIcon';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { colors } from '../config/theme';
import type { ScanState, CodeRange, Ticket } from '../types';
import { isValidEAN, findCodeRange, isTicketValidToday, createNewTicket } from '../utils/validation';
import { TestTicketButtons } from '../components/kiosk/TestTicketButtons';

export const EntryTerminal: React.FC = () => {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [message, setMessage] = useState<string>('');
  const [allowedMinutes, setAllowedMinutes] = useState<number>(0);
  const [codeRanges, setCodeRanges] = useState<CodeRange[]>([]);

  // Načtení code_ranges při startu
  useEffect(() => {
    const loadCodeRanges = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'code_ranges'));
        const ranges = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CodeRange[];
        setCodeRanges(ranges);
        console.log('✅ Loaded code ranges:', ranges.length);
      } catch (err) {
        console.error('❌ Error loading code ranges:', err);
      }
    };

    loadCodeRanges();
  }, []);

  const handleScan = useCallback(async (code: string) => {
    console.log('🎫 Entry scan:', code);
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

      // 2. Najdi odpovídající code_range
      const range = findCodeRange(normalizedEAN, codeRanges);
      if (!range) {
        setScanState('error');
        setMessage('Neznámý typ vstupenky');
        setTimeout(() => {
          setScanState('idle');
          setMessage('');
        }, 5000);
        return;
      }

      console.log('✅ Found range:', range.name);

      // 3. Zkontroluj, zda vstupenka už existuje (použij normalizovaný EAN)
      const ticketRef = doc(db, 'tickets', normalizedEAN);
      const ticketSnap = await getDoc(ticketRef);

      // Získej ID terminálu z URL (např. ?id=entry-3)
      const urlParams = new URLSearchParams(window.location.search);
      const terminalId = urlParams.get('id') || 'entry-1';

      if (ticketSnap.exists()) {
        // Vstupenka už existuje - zkontroluj status
        const ticket = { ean: normalizedEAN, ...ticketSnap.data() } as Ticket;

        // Kontrola, zda je vstupenka platná pro dnešní den
        if (!isTicketValidToday(ticket)) {
          setScanState('error');
          setMessage('Vstupenka je platná pouze jeden den');
          setTimeout(() => {
            setScanState('idle');
            setMessage('');
          }, 5000);
          return;
        }

        // Kontrola, zda už není uvnitř
        if (ticket.status === 'INSIDE') {
          setScanState('error');
          setMessage('Již jste uvnitř!');
          setTimeout(() => {
            setScanState('idle');
            setMessage('');
          }, 5000);
          return;
        }

        // Pokud už odešel (LEFT), může znovu vstoupit (stejný den)
        if (ticket.status === 'LEFT') {
          // Kontrola, zda má ještě zbývající čas
          if (ticket.remainingMinutes <= 0) {
            setScanState('error');
            setMessage('ČAS BYL VYČERPÁN');
            setTimeout(() => {
              setScanState('idle');
              setMessage('');
            }, 7000); // Delší timeout pro přečtení dodatečné informace
            return;
          }

          // Aktualizuj status na INSIDE (zachovej remainingMinutes)
          await setDoc(ticketRef, {
            ...ticket,
            status: 'INSIDE',
            lastScan: Timestamp.now(),
            scanCount: ticket.scanCount + 1,
            updatedAt: Timestamp.now(),
          });

          // Zaloguj event pro opětovný vstup
          const eventRef = doc(collection(db, 'events'));
          await setDoc(eventRef, {
            ean: normalizedEAN,
            type: 'ENTRY',
            terminalId: terminalId,
            timestamp: Timestamp.now(),
            remainingMinutes: ticket.remainingMinutes, // Použij zbývající čas
            overstayMinutes: 0,
          });

          setScanState('success');
          setAllowedMinutes(ticket.remainingMinutes); // Zobraz zbývající čas
          setMessage('Vítejte zpět!');
        }
      } else {
        // Nová vstupenka - vytvoř záznam (použij normalizovaný EAN)
        const newTicket = createNewTicket(normalizedEAN, range.id, range.durationMinutes);
        await setDoc(ticketRef, newTicket);

        // Zaloguj event pro novou vstupenku
        const eventRef = doc(collection(db, 'events'));
        await setDoc(eventRef, {
          ean: normalizedEAN,
          type: 'ENTRY',
          terminalId: terminalId,
          timestamp: Timestamp.now(),
          remainingMinutes: range.durationMinutes,
          overstayMinutes: 0,
        });

        setScanState('success');
        setAllowedMinutes(range.durationMinutes);
        setMessage('Vítejte!');

        console.log('✅ Created new ticket:', normalizedEAN);
      }

      // TODO: Otevřít dveře (relé)
      console.log('🚪 Opening door...');

      // Reset po 5 sekundách
      setTimeout(() => {
        setScanState('idle');
        setMessage('');
        setAllowedMinutes(0);
      }, 5000);

    } catch (err: any) {
      console.error('❌ Error processing entry:', err);
      setScanState('error');
      setMessage('Chyba systému');
      setTimeout(() => {
        setScanState('idle');
        setMessage('');
      }, 5000);
    }
  }, [codeRanges, allowedMinutes]);

  useBarcodeScanner(handleScan);

  // Idle stav
  if (scanState === 'idle') {
    return (
      <KioskLayout backgroundColor={colors.black}>
        <div className="flex-column flex-center text-center animate-fade-in">
          <h1 className="kiosk-title" style={{ color: colors.white, marginBottom: '3rem' }}>
            🎮 VÍTEJTE V MUZEU HER 🎮
          </h1>

          <BarcodeIcon animate size={300} color={colors.primary} />

          <p className="kiosk-message" style={{ color: colors.white, marginTop: '3rem' }}>
            Přiložte vstupenku k čtečce
          </p>
        </div>
        <TestTicketButtons onScan={handleScan} mode="entry" />
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
      <KioskLayout backgroundColor={colors.success}>
        <div className="flex-column flex-center text-center animate-slide-in">
          <div style={{ fontSize: 'clamp(5rem, 10vw, 8rem)', marginBottom: '2rem' }}>
            ✓
          </div>

          <h1 className="kiosk-title" style={{ color: colors.white }}>
            {message}
          </h1>

          <p className="kiosk-message" style={{ color: colors.white, marginTop: '2rem' }}>
            Máte k dispozici:
          </p>

          <div className="kiosk-time" style={{ color: colors.white, marginTop: '1rem' }}>
            ⏱ {allowedMinutes} MINUT
          </div>

          <p className="kiosk-message" style={{ color: colors.white, marginTop: '3rem', opacity: 0.9 }}>
            Užijte si návštěvu!
          </p>
        </div>
      </KioskLayout>
    );
  }

  // Error stav
  if (scanState === 'error') {
    const isTimeExpired = message === 'ČAS BYL VYČERPÁN';

    return (
      <KioskLayout backgroundColor={colors.error}>
        <div className="flex-column flex-center text-center animate-shake">
          <div style={{ fontSize: 'clamp(5rem, 10vw, 8rem)', marginBottom: '2rem' }}>
            {isTimeExpired ? '⏱' : '✗'}
          </div>

          <h1 className="kiosk-title" style={{ color: colors.white }}>
            {isTimeExpired ? message : 'CHYBA'}
          </h1>

          {!isTimeExpired && (
            <p className="kiosk-message" style={{ color: colors.white, marginTop: '2rem' }}>
              {message}
            </p>
          )}

          <p style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: colors.white,
            marginTop: '3rem',
            opacity: 0.9
          }}>
            {isTimeExpired ? 'Prosím zaplaťte novou vstupenku' : 'Kontaktujte prosím obsluhu'}
          </p>

          {isTimeExpired && (
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

