/**
 * Validation Utilities
 * Funkce pro validaci EAN kódů a vstupenek
 */

import type { CodeRange, Ticket } from '../types';
import { Timestamp } from 'firebase/firestore';

/**
 * Validace EAN kódu
 */
export function isValidEAN(code: string): boolean {
  // Musí být číselný
  if (!/^\d+$/.test(code)) {
    return false;
  }

  // Délka 7-13 číslic (7 pro kódy bez vedoucí nuly)
  const validLengths = [7, 8, 12, 13];
  if (!validLengths.includes(code.length)) {
    return false;
  }

  // TODO: Implementovat checksum validaci (volitelné)
  // EAN-13 checksum: https://en.wikipedia.org/wiki/International_Article_Number

  return true;
}

/**
 * Najde odpovídající řadu pro EAN kód
 */
export function findCodeRange(ean: string, ranges: CodeRange[]): CodeRange | null {
  // Pokud má EAN 7 číslic, zkus přidat vedoucí nulu (některé čtečky ji vynechávají)
  let eanToSearch = ean;
  if (ean.length === 7) {
    eanToSearch = '0' + ean;
    console.log('🔧 EAN má 7 číslic, přidávám vedoucí nulu:', ean, '→', eanToSearch);
  }

  for (const range of ranges) {
    if (!range.active) continue;

    // Prefix může být:
    // 1. Rozsah: "1000-1999"
    // 2. Wildcard: "200*"
    // 3. Přesná shoda: "1234567890123"

    if (range.prefix.includes('-')) {
      // Rozsah
      const [start, end] = range.prefix.split('-').map(s => s.trim());
      const eanNum = parseInt(eanToSearch);
      const startNum = parseInt(start);
      const endNum = parseInt(end);

      if (eanNum >= startNum && eanNum <= endNum) {
        return range;
      }
    } else if (range.prefix.includes('*')) {
      // Wildcard
      const prefix = range.prefix.replace('*', '');
      if (eanToSearch.startsWith(prefix)) {
        return range;
      }
    } else {
      // Přesná shoda
      if (eanToSearch === range.prefix) {
        return range;
      }
    }
  }

  return null;
}

/**
 * Kontrola, zda je vstupenka platná pro dnešní den
 */
export function isTicketValidToday(ticket: Ticket): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstScanDate = ticket.firstScan.toDate();
  firstScanDate.setHours(0, 0, 0, 0);

  return today.getTime() === firstScanDate.getTime();
}

/**
 * Výpočet zbývajícího času v minutách
 */
export function calculateRemainingMinutes(ticket: Ticket): number {
  const now = new Date();
  const firstScan = ticket.firstScan.toDate();
  const elapsedMinutes = Math.floor((now.getTime() - firstScan.getTime()) / 1000 / 60);
  const remaining = ticket.allowedMinutes - elapsedMinutes;

  return remaining;
}

/**
 * Výpočet překročení času
 */
export function calculateOverstay(ticket: Ticket): {
  overstayMinutes: number;
  overstayCharge: number;
} {
  const remaining = calculateRemainingMinutes(ticket);

  if (remaining >= 0) {
    return { overstayMinutes: 0, overstayCharge: 0 };
  }

  const overstayMinutes = Math.abs(remaining);
  // TODO: Načíst pricePerExtraMinute z code_range
  const pricePerMinute = 5; // Mock
  const overstayCharge = overstayMinutes * pricePerMinute;

  return { overstayMinutes, overstayCharge };
}

/**
 * Formátování času pro zobrazení
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 0) {
    return `0:00`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }

  return `${mins}`;
}

/**
 * Formátování času s jednotkou
 */
export function formatMinutesWithUnit(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    if (mins > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${hours}h`;
  }

  return `${mins} min`;
}

/**
 * Kontrola, zda je vstupenka uvnitř
 */
export function isTicketInside(ticket: Ticket): boolean {
  return ticket.status === 'INSIDE';
}

/**
 * Kontrola, zda je vstupenka expirovaná
 */
export function isTicketExpired(ticket: Ticket): boolean {
  return ticket.status === 'EXPIRED' || !isTicketValidToday(ticket);
}

/**
 * Vytvoření nové vstupenky
 */
export function createNewTicket(
  ean: string,
  rangeId: string,
  allowedMinutes: number
): Omit<Ticket, 'ean'> {
  const now = Timestamp.now();

  return {
    rangeId,
    status: 'INSIDE',
    firstScan: now,
    lastScan: now,
    allowedMinutes,
    remainingMinutes: allowedMinutes, // Zpočátku = celý čas
    scanCount: 1,
    createdAt: now,
    updatedAt: now,
  };
}

