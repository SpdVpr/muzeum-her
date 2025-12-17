/**
 * Migrace existujících vstupenek - přidání pole remainingMinutes
 * Spusť jednou pro aktualizaci databáze
 */

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function migrateTicketsAddRemainingMinutes() {
  console.log('🔄 Migrace vstupenek - přidání remainingMinutes...');

  try {
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    let updated = 0;
    let skipped = 0;

    for (const ticketDoc of ticketsSnapshot.docs) {
      const ticket = { ean: ticketDoc.id, ...ticketDoc.data() } as any;

      // Pokud už má remainingMinutes, přeskoč
      if (ticket.remainingMinutes !== undefined) {
        skipped++;
        continue;
      }

      // Vypočítej zbývající čas
      let remainingMinutes = ticket.allowedMinutes;

      if (ticket.status === 'LEFT') {
        // Pokud už odešel, vypočítej kolik mu zbývalo
        const now = new Date();
        const firstScan = ticket.firstScan.toDate();
        const elapsedMinutes = Math.floor((now.getTime() - firstScan.getTime()) / 1000 / 60);
        remainingMinutes = Math.max(0, ticket.allowedMinutes - elapsedMinutes);
      } else if (ticket.status === 'INSIDE') {
        // Pokud je uvnitř, vypočítej aktuální zbývající čas
        const now = new Date();
        const firstScan = ticket.firstScan.toDate();
        const elapsedMinutes = Math.floor((now.getTime() - firstScan.getTime()) / 1000 / 60);
        remainingMinutes = Math.max(0, ticket.allowedMinutes - elapsedMinutes);
      }

      // Aktualizuj vstupenku
      await updateDoc(doc(db, 'tickets', ticketDoc.id), {
        remainingMinutes,
      });

      updated++;
      console.log(`✅ Aktualizováno: ${ticketDoc.id} → remainingMinutes: ${remainingMinutes}`);
    }

    console.log(`✅ Migrace dokončena! Aktualizováno: ${updated}, Přeskočeno: ${skipped}`);
    return { updated, skipped };
  } catch (err) {
    console.error('❌ Chyba při migraci:', err);
    throw err;
  }
}

