# Příklady použití

## Testování barcode scanneru

### Manuální testování (bez čtečky)

1. Otevři terminál (např. `/kiosk/entry`)
2. Klikni do okna prohlížeče (aby mělo focus)
3. Napiš číslo: `1234567890123`
4. Stiskni Enter
5. Systém by měl detekovat skenování

### S USB čtečkou

1. Připoj USB čtečku (SL20UD nebo pistolovou)
2. Otevři terminál
3. Naskenuj EAN kód
4. Čtečka automaticky pošle data + Enter

## Testovací EAN kódy

Pro testování můžeš použít tyto kódy:

```
Základní vstup (60 min):
- 1234567890123
- 1000000000001
- 1999999999999

Prodloužená návštěva (120 min):
- 2000000000001
- 2500000000000
- 2999999999999

Celodenní (480 min):
- 3000000000001
- 3500000000000
- 3999999999999
```

## Scénáře testování

### Scénář 1: Normální návštěva

1. **Vstup** (`/kiosk/entry`)
   - Naskenuj: `1234567890123`
   - Očekávaný výsledek: Zelená obrazovka "Vítejte! Máte 60 minut"

2. **Check** (`/kiosk/check`) - po 30 minutách
   - Naskenuj stejný kód: `1234567890123`
   - Očekávaný výsledek: Zelená obrazovka "Zbývá: 30 minut"

3. **Výstup** (`/kiosk/exit`) - po 50 minutách
   - Naskenuj stejný kód: `1234567890123`
   - Očekávaný výsledek: Zelená obrazovka "Zbývalo: 10 minut"

### Scénář 2: Překročení času

1. **Vstup** - naskenuj kód
2. **Výstup** - po více než 60 minutách
   - Očekávaný výsledek: Červená obrazovka "Doplatek: X Kč"

### Scénář 3: Neplatný kód

1. **Vstup**
   - Naskenuj: `999` (příliš krátký)
   - Očekávaný výsledek: Žádná reakce (validace selže)

## Konfigurace terminálů

### Fullscreen režim (pro produkci)

Přidej do URL parametr nebo použij F11:

```
http://localhost:5173/kiosk/entry
```

Pak stiskni F11 pro fullscreen.

### Různé velikosti monitorů

Aplikace automaticky škáluje podle velikosti:

- **Tablet (768px)**: Menší fonty
- **Laptop (1024px)**: Střední fonty
- **Desktop (1920px)**: Velké fonty
- **Wide (2560px+)**: Extra velké fonty

## Admin panel

### Přístup

```
http://localhost:5173/admin
```

### Navigace

- **Dashboard**: Přehled statistik
- **Vstupenky**: Správa vstupenek (TODO)
- **Statistiky**: Detailní grafy (TODO)
- **Nastavení**: Konfigurace systému (TODO)

## Firebase integrace (po nastavení)

### Vytvoření vstupenky

```typescript
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const ticketData = {
  rangeId: 'range-1',
  status: 'INSIDE',
  firstScan: Timestamp.now(),
  lastScan: Timestamp.now(),
  allowedMinutes: 60,
  scanCount: 1,
};

await setDoc(doc(db, 'tickets', '1234567890123'), ticketData);
```

### Načtení vstupenky

```typescript
import { doc, getDoc } from 'firebase/firestore';

const ticketRef = doc(db, 'tickets', '1234567890123');
const ticketSnap = await getDoc(ticketRef);

if (ticketSnap.exists()) {
  const ticket = ticketSnap.data();
  console.log('Ticket:', ticket);
}
```

### Real-time listener (pro admin)

```typescript
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const eventsQuery = query(
  collection(db, 'events'),
  orderBy('timestamp', 'desc'),
  limit(10)
);

const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
  const events = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  console.log('Recent events:', events);
});

// Cleanup
// unsubscribe();
```

## Relé ovládání (po implementaci)

### Mock test

```typescript
import { openDoor, RELAY_CONFIGS } from './utils/relay';

// Test otevření dveří
await openDoor(RELAY_CONFIGS.entry);
```

### S lokálním serverem

```bash
# Spusť lokální Node.js server (TODO: vytvořit)
node relay-server.js

# V aplikaci se automaticky zavolá:
# POST http://localhost:3001/open-door
```

## Debugging

### Console logy

Aplikace loguje všechny důležité události:

```
🔍 Barcode scanner initialized
✅ Barcode scanned: 1234567890123
🚪 [MOCK] Opening door for terminal: entry-1
```

### Chrome DevTools

1. Otevři DevTools (F12)
2. Záložka Console - pro logy
3. Záložka Network - pro Firebase requesty
4. Záložka Application > IndexedDB - pro offline data

## Tipy pro produkci

1. **Skryj kurzor**: Automaticky skrytý v kiosk režimu
2. **Disable right-click**: Přidej do CSS
3. **Auto-refresh**: Nastav v browseru auto-reload každých 24h
4. **Monitoring**: Použij Firebase Performance Monitoring
5. **Error tracking**: Integrace se Sentry (volitelné)

