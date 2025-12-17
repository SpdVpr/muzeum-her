# Firebase Setup Guide

Návod na nastavení Firebase projektu pro Muzeum Her Kiosk System.

## 1. Vytvoření Firebase projektu

1. Jdi na https://console.firebase.google.com
2. Klikni na "Add project" (Přidat projekt)
3. Zadej název projektu: `muzeumher-kiosk`
4. Vypni Google Analytics (není potřeba pro tento projekt)
5. Klikni "Create project"

## 2. Registrace webové aplikace

1. V Firebase Console klikni na ikonu webu `</>`
2. Zadej název aplikace: `Muzeum Her Kiosk`
3. **NEZAŠKRTÁVEJ** "Also set up Firebase Hosting"
4. Klikni "Register app"
5. **Zkopíruj Firebase config** (budeš ho potřebovat)

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "muzeumher-kiosk.firebaseapp.com",
  projectId: "muzeumher-kiosk",
  storageBucket: "muzeumher-kiosk.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

6. Vlož tento config do `src/config/firebase.ts`

## 3. Nastavení Firestore Database

### Vytvoření databáze

1. V levém menu klikni na "Firestore Database"
2. Klikni "Create database"
3. Vyber **Production mode** (bezpečnější)
4. Vyber lokaci: `europe-west3` (Frankfurt - nejblíže ČR)
5. Klikni "Enable"

### Firestore Security Rules

V záložce "Rules" nahraď výchozí pravidla tímto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Code ranges - read pro všechny, write jen pro admin
    match /code_ranges/{rangeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Tickets - read/write pro všechny (TODO: přidat rate limiting)
    match /tickets/{ean} {
      allow read, write: if true;
    }
    
    // Events - create pro všechny, read jen pro admin
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow create: if true;
      allow update, delete: if false;
    }
    
    // Terminals - pouze admin
    match /terminals/{terminalId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Klikni "Publish"

### Vytvoření indexů

V záložce "Indexes" vytvoř tyto composite indexy:

**Index 1: Events by timestamp**
- Collection: `events`
- Fields:
  - `timestamp` (Descending)
- Query scope: Collection

**Index 2: Tickets by status and firstScan**
- Collection: `tickets`
- Fields:
  - `status` (Ascending)
  - `firstScan` (Descending)
- Query scope: Collection

## 4. Nastavení Authentication (pro admin)

1. V levém menu klikni na "Authentication"
2. Klikni "Get started"
3. V záložce "Sign-in method" zapni:
   - **Email/Password** (pro admin přihlášení)
4. V záložce "Users" přidej prvního admina:
   - Klikni "Add user"
   - Email: `admin@muzeumher.cz`
   - Password: (silné heslo)
   - Klikni "Add user"

## 5. Inicializace dat

### Vytvoření testovacích řad kódů

V Firestore Console vytvoř kolekci `code_ranges` s těmito dokumenty:

**Dokument 1: Základní vstup**
```json
{
  "name": "Základní vstup",
  "prefix": "1000-1999",
  "durationMinutes": 60,
  "price": 150,
  "pricePerExtraMinute": 5,
  "active": true,
  "createdAt": [current timestamp],
  "updatedAt": [current timestamp]
}
```

**Dokument 2: Prodloužená návštěva**
```json
{
  "name": "Prodloužená návštěva",
  "prefix": "2000-2999",
  "durationMinutes": 120,
  "price": 250,
  "pricePerExtraMinute": 5,
  "active": true,
  "createdAt": [current timestamp],
  "updatedAt": [current timestamp]
}
```

**Dokument 3: Celodenní**
```json
{
  "name": "Celodenní",
  "prefix": "3000-3999",
  "durationMinutes": 480,
  "price": 400,
  "pricePerExtraMinute": 5,
  "active": true,
  "createdAt": [current timestamp],
  "updatedAt": [current timestamp]
}
```

### Vytvoření terminálů

Vytvoř kolekci `terminals`:

**Dokument: entry-1**
```json
{
  "type": "ENTRY",
  "location": "Hlavní vchod",
  "relayEnabled": true,
  "active": true,
  "createdAt": [current timestamp],
  "updatedAt": [current timestamp]
}
```

**Dokument: check-1**
```json
{
  "type": "CHECK",
  "location": "Prostřední hala",
  "relayEnabled": false,
  "active": true,
  "createdAt": [current timestamp],
  "updatedAt": [current timestamp]
}
```

**Dokument: exit-1**
```json
{
  "type": "EXIT",
  "location": "Východ",
  "relayEnabled": true,
  "active": true,
  "createdAt": [current timestamp],
  "updatedAt": [current timestamp]
}
```

## 6. Testování

1. Spusť aplikaci: `npm run dev`
2. Otevři http://localhost:5173/kiosk/entry
3. Naskenuj testovací EAN kód: `1234567890123`
4. Zkontroluj v Firebase Console, že se vytvořil dokument v kolekci `tickets`

## 7. Produkční nasazení

### Firebase Hosting (volitelné)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

### Nebo vlastní hosting

```bash
npm run build
# Nahraj obsah složky dist/ na svůj server
```

## Troubleshooting

### Chyba: "Missing or insufficient permissions"
- Zkontroluj Firestore Security Rules
- Ujisti se, že jsou správně nastavené

### Offline persistence nefunguje
- Zkontroluj, že používáš HTTPS (nebo localhost)
- Některé prohlížeče nepodporují IndexedDB

### Pomalé načítání
- Zkontroluj, že máš vytvořené indexy
- Použij Firebase Performance Monitoring

