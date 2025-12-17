# Muzeum Her - Kiosk System

Webová aplikace pro správu vstupenek a časového limitu v Muzeu Her (Cibien's Corner).

## 🚀 Quick Start

```bash
# 1. Instalace závislostí
npm install

# 2. Spuštění dev serveru
npm run dev

# 3. Otevři prohlížeč
# Kiosk terminály:
#   http://localhost:5173/kiosk/entry
#   http://localhost:5173/kiosk/check
#   http://localhost:5173/kiosk/exit
# Admin:
#   http://localhost:5173/admin
```

**Pro testování barcode scanneru:**
- Klikni do okna prohlížeče
- Naskenuj EAN kód (nebo napiš číslo 8 číslic a stiskni Enter)
- Systém automaticky detekuje skenování
- Testovací kódy: `03041000`, `02031000`, `01021000`

**Pro import dat do Firebase:**
1. Nastav Firebase credentials v `.env.local`
2. Otevři http://localhost:5173/admin/setup
3. Klikni "🚀 Spustit import"

## 🎯 Funkce

### Kiosk Terminály
- **Entry Terminal** (`/kiosk/entry`) - Vstupní terminál s kontrolou vstupenky a otevřením dveří
- **Check Terminal** (`/kiosk/check`) - Kontrola zbývajícího času
- **Exit Terminal** (`/kiosk/exit`) - Výstupní terminál s kontrolou doplatku

### Admin Panel
- **Dashboard** (`/admin`) - Analytický dashboard se statistikami (v přípravě)
- Správa řad EAN kódů
- Real-time monitoring návštěvníků
- Statistiky a exporty

## 🚀 Instalace a spuštění

### Prerekvizity
- Node.js 18+ a npm
- Firebase projekt (pro produkci)

### Lokální vývoj

```bash
# Instalace závislostí
npm install

# Spuštění dev serveru
npm run dev

# Build pro produkci
npm run build
```

Aplikace poběží na `http://localhost:5173`

## 🔧 Konfigurace

### Firebase
1. Vytvoř Firebase projekt na https://console.firebase.google.com
2. Zkopíruj Firebase credentials do `src/config/firebase.ts`
3. Nastav Firestore pravidla (viz níže)

### Barcode Scanner
Aplikace podporuje USB čtečky v režimu "keyboard emulation":
- Desktop 2D Barcode Scanner SL20UD
- Pistolové čtečky
- Jakékoliv čtečky, které posílají data jako klávesnice + Enter

Konfigurace v `src/hooks/useBarcodeScanner.ts`:
- `minLength`: 8 (EAN-8)
- `maxLength`: 13 (EAN-13)
- `timeout`: 100ms mezi znaky
- `debounce`: 3000ms (zamezí dvojímu skenování)

### Relé/Dveře
Mock implementace v `src/utils/relay.ts`

Pro produkci implementuj jednu z možností:
1. **Lokální Node.js server** s USB relé modulem
2. **IoT řešení** (ESP32/Raspberry Pi) s Firebase triggery
3. **HTTP API** na lokální hardware controller

## 📱 Responzivita

Všechny komponenty jsou plně responzivní s podporou pro:
- Malé monitory (tablet portrait): 768px
- Střední monitory (laptop): 1024px - 1366px
- Velké monitory (desktop): 1920px
- Extra velké monitory (wide): 2560px+

Font sizes používají `clamp()` pro automatické škálování.

## 🎨 Design System

Barevná paleta podle Muzeum Her brandingu:
- **Primary**: `#0037FD` (modrá)
- **Success**: `#09B872` (zelená)
- **Error**: `#CF2E2E` (červená)
- **Warning**: `#FF6900` (oranžová)
- **Info**: `#ECF6FF` (světle modrá)

Viz `src/config/theme.ts` pro kompletní design system.

## 🗄️ Firestore Struktura

```
/code_ranges
  - id, name, prefix, durationMinutes, price, pricePerExtraMinute, active

/tickets
  - ean (document ID), rangeId, status, firstScan, lastScan, allowedMinutes

/events
  - id, ean, type (ENTRY/CHECK/EXIT), terminalId, timestamp, remainingMinutes

/terminals
  - id, type, location, relayEnabled, active
```

## 🔒 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read pro kiosky (s rate limiting)
    match /code_ranges/{rangeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /tickets/{ean} {
      allow read, write: if true; // TODO: Přidat rate limiting
    }
    
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow create: if true;
    }
    
    // Admin only
    match /terminals/{terminalId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📦 Technologie

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Firebase** - Backend (Firestore + Auth)
- **React Router** - Routing
- **Recharts** - Grafy (pro admin)
- **date-fns** - Práce s datem/časem
- **idb** - IndexedDB wrapper (offline cache)

## 🌐 Offline-First

Aplikace funguje i bez internetu díky:
- Firebase Firestore offline persistence
- IndexedDB cache pro aktivní vstupenky
- Automatická synchronizace po obnovení připojení

## 🚦 URL Routes

```
/kiosk/entry    - Vstupní terminál
/kiosk/check    - Kontrola času
/kiosk/exit     - Výstupní terminál
/admin          - Admin dashboard
```

## 📝 TODO

- [ ] Implementovat Firebase logiku (validace vstupenek)
- [ ] Admin Dashboard s grafy
- [ ] Správa řad EAN kódů v adminu
- [ ] Real-time statistiky
- [ ] Implementace relé ovládání
- [ ] Firebase Authentication pro admin
- [ ] Export dat (CSV)
- [ ] Email notifikace
- [ ] Tisk vstupenek (volitelné)

## 🤝 Podpora

Pro otázky kontaktuj vývojáře.

