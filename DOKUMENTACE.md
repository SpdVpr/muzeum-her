# 📚 Kompletní dokumentace - Muzeum Her Kiosk System

## 🎯 Přehled dokumentů

### 🚀 Začínáme
- **[START_HERE.md](./START_HERE.md)** - Začni tady! Rychlý start guide
- **[README.md](./README.md)** - Kompletní dokumentace projektu
- **[PROJEKT_PREHLED.md](./PROJEKT_PREHLED.md)** - Přehled projektu a struktury

### 🔧 Nastavení
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Detailní návod na nastavení Firebase
- **[IMPORT_DAT.md](./IMPORT_DAT.md)** - Návod na import dat do Firestore
- **[.env.local.example](./.env.local.example)** - Příklad konfigurace

### 📋 EAN kódy a data
- **[CODE_RANGES.md](./CODE_RANGES.md)** - Struktura a definice všech řad EAN kódů
- **[TESTOVACI_KODY.md](./TESTOVACI_KODY.md)** - Testovací EAN kódy pro všechny typy
- **[firebase-seed-data.json](./firebase-seed-data.json)** - JSON s daty pro import

### 💡 Příklady a testování
- **[EXAMPLES.md](./EXAMPLES.md)** - Příklady použití a testovací scénáře
- **[TODO.md](./TODO.md)** - Seznam zbývajících úkolů

---

## 📊 Struktura EAN kódů

### Formát: `PP-TT-NNNN` (8 číslic)

- **PP** - Pobočka (01, 02, 03)
- **TT** - Typ lístku (01-05)
- **NNNN** - Číslo lístku

### Pobočky
- `01` - Game Station
- `02` - Game World
- `03` - Cyber Arcade

### Typy lístků
- `01` - VIP Celodenní (Zlatá) - 480 min, 600 Kč
- `02` - Celodenní (Fialová) - 480 min, 400 Kč
- `03` - 2 hodiny (Oranžová) - 120 min, 250 Kč
- `04` - 1 hodina (Limetková) - 60 min, 150 Kč
- `05` - Speciální (Modrá) - 30-480 min, 100-200 Kč

### Příklady
```
03041000 = Cyber Arcade (03) + 1 hodina (04) + lístek #1000
02031500 = Game World (02) + 2 hodiny (03) + lístek #1500
01021000 = Game Station (01) + Celodenní (02) + lístek #1000
```

---

## 🏗️ Architektura systému

### Frontend (React + TypeScript)
```
src/
├── components/
│   ├── admin/          # Admin komponenty
│   │   ├── AdminLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   └── LiveActivity.tsx
│   └── kiosk/          # Kiosk komponenty
│       ├── KioskLayout.tsx
│       └── BarcodeIcon.tsx
├── pages/
│   ├── admin/          # Admin stránky
│   │   ├── Dashboard.tsx
│   │   └── Setup.tsx
│   ├── EntryTerminal.tsx
│   ├── CheckTerminal.tsx
│   └── ExitTerminal.tsx
├── hooks/
│   └── useBarcodeScanner.ts
├── utils/
│   ├── relay.ts
│   └── validation.ts
├── config/
│   ├── firebase.ts
│   └── theme.ts
└── types/
    └── index.ts
```

### Backend (Firebase)
```
Firestore Collections:
├── code_ranges/        # Řady EAN kódů
├── tickets/            # Vstupenky (EAN jako ID)
├── events/             # Log událostí
└── terminals/          # Konfigurace terminálů
```

---

## 🎨 Design System

### Barvy (podle muzeumher.cz)
```typescript
Primary:   #0037FD  (modrá)
Success:   #09B872  (zelená)
Error:     #CF2E2E  (červená)
Warning:   #FF6900  (oranžová)
```

### Barvy lístků
```
Limetková: #BFFF00  (1 hodina)
Oranžová:  #FF6900  (2 hodiny)
Fialová:   #9B59B6  (Celodenní)
Zlatá:     #FFD700  (VIP)
Modrá:     #3498DB  (Speciální)
```

### Responzivní breakpointy
```typescript
mobile:     480px
tablet:     768px
laptop:     1024px
desktop:    1366px
wide:       1920px
ultrawide:  2560px
```

---

## 🔌 Hardware integrace

### Barcode Scanner
- **Typ**: USB keyboard emulation
- **Podporované**: Desktop 2D Scanner SL20UD, pistolové čtečky
- **Konfigurace**: 8-13 číslic, timeout 100ms, debounce 3s

### Relé (připraveno)
- **Mock implementace**: `src/utils/relay.ts`
- **Možnosti**:
  1. Lokální Node.js server + USB relé
  2. IoT řešení (ESP32/Raspberry Pi)
  3. HTTP API

---

## 📱 Routing

### Kiosk terminály
```
/kiosk/entry  - Vstupní terminál
/kiosk/check  - Check terminál
/kiosk/exit   - Výstupní terminál
```

### Admin panel
```
/admin              - Dashboard
/admin/tickets      - Správa vstupenek
/admin/stats        - Statistiky
/admin/customers    - Zákazníci
/admin/revenue      - Tržby
/admin/settings     - Nastavení
/admin/relay        - Relé ovládání
/admin/logs         - Logy
/admin/setup        - Import dat
```

---

## 🧪 Testování

### Quick test
```bash
npm run dev
# Otevři: http://localhost:5173/kiosk/entry
# Naskenuj: 03041000
```

### Testovací kódy
```
03041000  - Cyber Arcade, 1h
02031000  - Game World, 2h
01021000  - Game Station, Celodenní
03011000  - Cyber Arcade, VIP
02051000  - Game World, 30 min
```

Více: **[TESTOVACI_KODY.md](./TESTOVACI_KODY.md)**

---

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production build
```bash
npm run build
npm run preview
```

### Firebase Hosting
```bash
firebase deploy
```

---

## 📈 Statistiky

### Celkem lístků: 21 000
- Limetková (1h): 5 000
- Oranžová (2h): 5 000
- Fialová (Celodenní): 5 000
- Zlatá (VIP): 2 000
- Modrá (Speciální): 4 000

### Pobočky
- Cyber Arcade: 7 500 lístků
- Game World: 7 000 lístků
- Game Station: 6 500 lístků

---

## 🔒 Bezpečnost

### Firebase Security Rules
- Code ranges: Read všichni, Write admin
- Tickets: Read/Write všichni (TODO: rate limiting)
- Events: Create všichni, Read admin
- Terminals: Admin only

### Environment variables
- Všechny Firebase credentials v `.env.local`
- Nikdy necommituj `.env.local` do gitu

---

## 📞 Podpora

Pro otázky a podporu kontaktuj vývojáře.

---

**Poslední aktualizace**: 2025-12-15

