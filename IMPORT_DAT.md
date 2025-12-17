# 📦 Import dat do Firebase

## Rychlý návod

### 1. Nastav Firebase

Pokud jsi ještě nenastavil Firebase, udělej to teď:

```bash
# Zkopíruj example soubor
cp .env.local.example .env.local

# Otevři .env.local a vyplň své Firebase credentials
```

Kde získat credentials? → **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**

### 2. Spusť aplikaci

```bash
npm run dev
```

### 3. Otevři Setup stránku

Otevři v prohlížeči:
```
http://localhost:5173/admin/setup
```

### 4. Klikni na "Spustit import"

Aplikace automaticky naimportuje:
- ✅ **15 řad EAN kódů** (všechny typy lístků pro všechny pobočky)
- ✅ **8 terminálů** (Entry, Check, Exit pro všechny pobočky)
- ✅ **21 000 lístků** celkem

### 5. Hotovo! 🎉

Po úspěšném importu můžeš začít testovat s reálnými EAN kódy.

---

## Co se importuje?

### Řady EAN kódů (15 řad)

#### Cyber Arcade (03)
- 🟢 Limetková 1h: `03041000-03043000` (2000ks, 60 min, 150 Kč)
- 🟠 Oranžová 2h: `03031000-03033000` (2000ks, 120 min, 250 Kč)
- 🟣 Fialová Celodenní: `03021000-03023000` (2000ks, 480 min, 400 Kč)
- 🟡 Zlatá VIP: `03011000-03012000` (1000ks, 480 min, 600 Kč)
- 🔵 Modrá Doprovod: `03051000-03052000` (1000ks, 480 min, 200 Kč)

#### Game World (02)
- 🟢 Limetková 1h: `02041000-02042500` (1500ks, 60 min, 150 Kč)
- 🟠 Oranžová 2h: `02031000-02032500` (1500ks, 120 min, 250 Kč)
- 🟣 Fialová Celodenní: `02021000-02022500` (1500ks, 480 min, 400 Kč)
- 🟡 Zlatá VIP: `02011000-02011500` (500ks, 480 min, 600 Kč)
- 🔵 Modrá 0,5h: `02051000-02051500` (1500ks, **30 min**, 100 Kč) ⚠️

#### Game Station (01)
- 🟢 Limetková 1h: `01041000-01042500` (1500ks, 60 min, 150 Kč)
- 🟠 Oranžová 2h: `01031000-01032500` (1500ks, 120 min, 250 Kč)
- 🟣 Fialová Celodenní: `01021000-01022500` (1500ks, 480 min, 400 Kč)
- 🟡 Zlatá VIP: `01011000-01011500` (500ks, 480 min, 600 Kč)
- 🔵 Modrá Doprovod: `01051000-01051500` (1500ks, 480 min, 200 Kč)

### Terminály (8 terminálů)

- **Entry terminály**: entry-cyber, entry-gameworld, entry-gamestation
- **Check terminály**: check-cyber, check-gameworld
- **Exit terminály**: exit-cyber, exit-gameworld, exit-gamestation

---

## Testování po importu

### Quick test kódy

```
03041000  - Cyber Arcade, 1 hodina
02031000  - Game World, 2 hodiny
01021000  - Game Station, Celodenní
03011000  - Cyber Arcade, VIP
02051000  - Game World, 30 minut (speciální)
```

### Testovací scénář

1. **Entry** (`/kiosk/entry`): Naskenuj `03041000`
   - Měl by se zobrazit: "Vítejte! Máte 60 minut"

2. **Check** (`/kiosk/check`): Naskenuj `03041000`
   - Měl by se zobrazit zbývající čas

3. **Exit** (`/kiosk/exit`): Naskenuj `03041000`
   - Měl by se zobrazit výsledek (OK nebo doplatek)

4. **Admin** (`/admin`): Zkontroluj statistiky
   - Měly by se zobrazit aktuální data

---

## Troubleshooting

### "Missing or insufficient permissions"
- Zkontroluj Firebase Security Rules v Firebase Console
- Ujisti se, že jsou nastavené podle [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

### "Firebase config not found"
- Zkontroluj, že máš vyplněný `.env.local`
- Restartuj dev server (`npm run dev`)

### Import selhal
- Zkontroluj Firebase Console → Firestore Database
- Ujisti se, že databáze existuje a je v Production mode
- Zkontroluj internet připojení

### Data se neobjevují v terminalech
- Implementace Firebase logiky v terminálech je TODO
- Momentálně terminály používají mock data
- Po implementaci Firebase logiky budou fungovat s reálnými daty

---

## Další kroky

Po úspěšném importu:

1. ✅ Data jsou v Firestore
2. 🚧 Implementuj Firebase logiku v terminálech (TODO)
3. 🚧 Implementuj real-time statistiky v adminu (TODO)
4. 🧪 Testuj s reálnými čtečkami

Viz **[TODO.md](./TODO.md)** pro kompletní seznam zbývajících úkolů.

---

## Poznámky

- Import je **idempotentní** - můžeš ho spustit vícekrát bez problémů
- Existující data budou **přepsána**
- Všechny lístky mají doplatek **5 Kč/min**
- Modré lístky mají **speciální logiku** podle pobočky

