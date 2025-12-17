# 🚀 START HERE - Muzeum Her Kiosk System

Vítej v projektu! Tento soubor ti pomůže rychle začít.

## ✅ Co je hotové

Základní struktura aplikace je **kompletní a funkční**:

- ✅ React + TypeScript + Vite projekt
- ✅ Firebase konfigurace s offline persistence
- ✅ Design system podle Muzeum Her brandingu
- ✅ Barcode scanner pro USB čtečky (SL20UD, pistolové)
- ✅ 3 kiosk terminály (Entry, Check, Exit)
- ✅ Admin dashboard s live statistikami
- ✅ Responzivní design pro různé monitory
- ✅ Offline-first architektura

## 🎯 První kroky

### 1. Instalace a spuštění

```bash
# Instalace závislostí
npm install

# Spuštění dev serveru
npm run dev
```

Aplikace poběží na: **http://localhost:5173**

### 2. Testování terminálů

**Vstupní terminál:**
- Otevři: http://localhost:5173/kiosk/entry
- Klikni do okna a napiš: `1234567890123` + Enter
- Měl by se zobrazit zelený screen "Vítejte!"

**Check terminál:**
- Otevři: http://localhost:5173/kiosk/check
- Naskenuj stejný kód
- Zobrazí se zbývající čas

**Výstupní terminál:**
- Otevři: http://localhost:5173/kiosk/exit
- Naskenuj kód
- Zobrazí se výsledek (OK nebo doplatek)

**Admin dashboard:**
- Otevři: http://localhost:5173/admin
- Uvidíš statistiky a live aktivitu

### 3. Nastavení Firebase (DŮLEŽITÉ!)

Aplikace momentálně běží s **mock daty**. Pro plnou funkčnost musíš nastavit Firebase:

1. **Vytvoř Firebase projekt** - viz `FIREBASE_SETUP.md`
2. **Zkopíruj credentials**:
   ```bash
   cp .env.local.example .env.local
   ```
3. **Vyplň Firebase config** v `.env.local`
4. **Restartuj dev server**
5. **Importuj data do Firestore**:
   - Otevři: http://localhost:5173/admin/setup
   - Klikni na "🚀 Spustit import"
   - Počkej na dokončení

Detailní návod: **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**

### 4. Testování s reálnými daty

Po importu dat můžeš testovat s reálnými EAN kódy:

```
03041000  - Cyber Arcade, 1 hodina
02031000  - Game World, 2 hodiny
01021000  - Game Station, Celodenní
```

Všechny testovací kódy: **[TESTOVACI_KODY.md](./TESTOVACI_KODY.md)**

## 📚 Dokumentace

- **[README.md](./README.md)** - Kompletní dokumentace projektu
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Návod na nastavení Firebase
- **[PROJEKT_PREHLED.md](./PROJEKT_PREHLED.md)** - Přehled projektu a struktury
- **[EXAMPLES.md](./EXAMPLES.md)** - Příklady použití a testování
- **[TODO.md](./TODO.md)** - Seznam zbývajících úkolů

## 🔧 Konfigurace

### Barcode Scanner

Aplikace automaticky detekuje USB čtečky v režimu "keyboard emulation":

- **Desktop 2D Scanner SL20UD** - ✅ Podporováno
- **Pistolové čtečky** - ✅ Podporováno
- **Jakákoliv USB čtečka** v keyboard režimu - ✅ Podporováno

Konfigurace v `src/hooks/useBarcodeScanner.ts`:
- Min délka: 8 číslic
- Max délka: 13 číslic
- Timeout: 100ms
- Debounce: 3 sekundy

### Responzivita

Aplikace automaticky škáluje podle velikosti monitoru:

- Tablet (768px+)
- Laptop (1024px+)
- Desktop (1366px+)
- Wide (1920px+)
- Ultrawide (2560px+)

### Offline režim

Aplikace funguje i **bez internetu** díky:
- Firebase offline persistence
- IndexedDB cache
- Automatická synchronizace při obnovení připojení

## 🎨 Design

Barevná paleta podle **muzeumher.cz**:

- **Primary**: `#0037FD` (modrá)
- **Success**: `#09B872` (zelená)
- **Error**: `#CF2E2E` (červená)
- **Warning**: `#FF6900` (oranžová)

## 🚧 Co zbývá udělat

### Priorita 1 - Firebase integrace
1. Nastavit Firebase projekt
2. Implementovat real-time logiku v terminálech
3. Implementovat validaci vstupenek

### Priorita 2 - Admin funkce
1. Správa řad EAN kódů (CRUD)
2. Detailní statistiky s grafy
3. Export dat

### Priorita 3 - Hardware
1. Implementovat skutečné ovládání relé
2. Testování s reálnými čtečkami

Kompletní TODO: **[TODO.md](./TODO.md)**

## 🆘 Pomoc

### Aplikace nefunguje?

1. **Zkontroluj konzoli** (F12 v prohlížeči)
2. **Zkontroluj, že běží dev server** (`npm run dev`)
3. **Zkontroluj Firebase config** (pokud už je nastavený)

### Barcode scanner nefunguje?

1. **Klikni do okna prohlížeče** (musí mít focus)
2. **Zkontroluj, že čtečka je v keyboard režimu**
3. **Zkus manuálně napsat číslo + Enter**

### Chyby v konzoli?

- Pokud vidíš Firebase chyby → Firebase ještě není nastavený (to je OK)
- Pokud vidíš jiné chyby → napiš mi

## 📞 Kontakt

Pro otázky a podporu kontaktuj vývojáře.

---

## 🎉 Rychlý test

Chceš rychle vyzkoušet celý systém?

1. Spusť: `npm run dev`
2. Otevři 4 okna prohlížeče:
   - http://localhost:5173/kiosk/entry
   - http://localhost:5173/kiosk/check
   - http://localhost:5173/kiosk/exit
   - http://localhost:5173/admin
3. V Entry terminálu naskenuj: `1234567890123`
4. V Check terminálu naskenuj stejný kód
5. V Exit terminálu naskenuj stejný kód
6. V Admin dashboardu sleduj live aktivitu

**Hotovo!** Systém funguje. 🎊

---

**Další krok:** Nastav Firebase podle [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

