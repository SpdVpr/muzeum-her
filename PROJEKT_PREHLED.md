# Muzeum Her - Kiosk System - Přehled Projektu

## 📋 Shrnutí

Webová aplikace pro správu vstupenek a časového limitu v Muzeu Her (Cibien's Corner).
Systém se skládá z kiosk terminálů (Vstup, Check, Výstup) a admin panelu.

## ✅ Co je hotové

### 1. **Základní infrastruktura**
- ✅ React + TypeScript + Vite projekt
- ✅ Firebase konfigurace s offline persistence
- ✅ React Router pro routing
- ✅ Design system podle Muzeum Her brandingu
- ✅ Responzivní layout pro různé velikosti monitorů

### 2. **Barcode Scanner**
- ✅ Univerzální hook pro USB čtečky (keyboard emulation)
- ✅ Podpora pro Desktop 2D Scanner SL20UD
- ✅ Podpora pro pistolové čtečky
- ✅ Debounce a validace
- ✅ Konfigurovatelné parametry

### 3. **Kiosk Terminály**
- ✅ **Entry Terminal** (`/kiosk/entry`)
  - Uvítací obrazovka
  - Skenování vstupenky
  - Zobrazení povoleného času
  - Příprava pro otevření dveří (relé)
  
- ✅ **Check Terminal** (`/kiosk/check`)
  - Kontrola zbývajícího času
  - Barevné kódování (zelená/oranžová/červená)
  - Varování při nízkém času
  
- ✅ **Exit Terminal** (`/kiosk/exit`)
  - Kontrola při odchodu
  - Zobrazení zbývajícího času
  - Detekce a zobrazení doplatku
  - Příprava pro otevření dveří (relé)

### 4. **Admin Panel**
- ✅ **Dashboard** (`/admin`)
  - 4 KPI karty (Uvnitř, Dnes, Odešlo, Kapacita)
  - Průměrná doba návštěvy
  - Tržby dnes
  - Live aktivita (real-time log)
  - Responzivní layout
  
- ✅ **Layout komponenty**
  - Sidebar navigace
  - Top bar s notifikacemi
  - Responsive design

### 5. **Utility funkce**
- ✅ Validace EAN kódů
- ✅ Výpočet zbývajícího času
- ✅ Výpočet doplatku
- ✅ Formátování času
- ✅ Mock funkce pro relé

### 6. **Offline-first**
- ✅ Firebase Firestore offline persistence
- ✅ Automatická synchronizace
- ✅ Optimalizace pro pomalé připojení

## 🚧 Co zbývá implementovat

### 1. **Firebase integrace**
- [ ] Vytvoření Firebase projektu
- [ ] Nastavení Firestore databáze
- [ ] Implementace real-time listenerů
- [ ] Implementace CRUD operací pro vstupenky
- [ ] Implementace logování událostí

### 2. **Admin funkce**
- [ ] Správa řad EAN kódů (CRUD)
- [ ] Detailní statistiky s grafy (Recharts)
- [ ] Vyhledávání zákazníků
- [ ] Export dat (CSV)
- [ ] Nastavení systému
- [ ] Manuální ovládání relé

### 3. **Relé/Hardware**
- [ ] Implementace skutečného ovládání relé
- [ ] Lokální Node.js server (nebo IoT řešení)
- [ ] Testování s reálným hardware

### 4. **Autentizace**
- [ ] Firebase Authentication pro admin
- [ ] Login/Logout
- [ ] Ochrana admin routes

### 5. **Pokročilé funkce**
- [ ] Email notifikace
- [ ] Push notifikace pro admin
- [ ] Tisk vstupenek (volitelné)
- [ ] Multi-location podpora (Plzeň/Praha)

## 📁 Struktura projektu

```
muzeumher-kiosk/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLayout.tsx      # Layout pro admin
│   │   │   ├── Sidebar.tsx          # Navigace
│   │   │   ├── StatCard.tsx         # KPI karta
│   │   │   └── LiveActivity.tsx     # Real-time log
│   │   └── kiosk/
│   │       ├── KioskLayout.tsx      # Layout pro kiosky
│   │       └── BarcodeIcon.tsx      # Ikona čárového kódu
│   ├── config/
│   │   ├── firebase.ts              # Firebase konfigurace
│   │   └── theme.ts                 # Design system
│   ├── hooks/
│   │   └── useBarcodeScanner.ts     # Barcode scanner hook
│   ├── pages/
│   │   ├── admin/
│   │   │   └── Dashboard.tsx        # Admin dashboard
│   │   ├── EntryTerminal.tsx        # Vstupní terminál
│   │   ├── CheckTerminal.tsx        # Check terminál
│   │   └── ExitTerminal.tsx         # Výstupní terminál
│   ├── styles/
│   │   └── global.css               # Globální styly
│   ├── types/
│   │   └── index.ts                 # TypeScript typy
│   ├── utils/
│   │   ├── relay.ts                 # Relé funkce (mock)
│   │   └── validation.ts            # Validační funkce
│   ├── App.tsx                      # Hlavní komponenta
│   └── main.tsx                     # Entry point
├── FIREBASE_SETUP.md                # Návod na Firebase setup
├── README.md                        # Dokumentace
└── package.json
```

## 🎨 Design

- **Barevná paleta**: Podle muzeumher.cz
  - Primary: `#0037FD` (modrá)
  - Success: `#09B872` (zelená)
  - Error: `#CF2E2E` (červená)
  - Warning: `#FF6900` (oranžová)

- **Responzivita**: Plně responzivní pro všechny velikosti monitorů
- **Animace**: Smooth transitions, pulse, shake, slide-in

## 🔧 Technologie

- React 18 + TypeScript
- Vite (build tool)
- Firebase (Firestore + Auth)
- React Router
- Recharts (grafy)
- date-fns (datum/čas)
- idb (IndexedDB)

## 🚀 Spuštění

```bash
# Instalace
npm install

# Development
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## 📝 Další kroky

1. **Nastavit Firebase projekt** (viz FIREBASE_SETUP.md)
2. **Implementovat Firebase logiku** v terminálech
3. **Dokončit admin funkce** (správa kódů, statistiky)
4. **Implementovat relé ovládání**
5. **Testování** s reálnými čtečkami a daty
6. **Nasazení** na produkci

## 📞 Kontakt

Pro otázky a podporu kontaktuj vývojáře.

