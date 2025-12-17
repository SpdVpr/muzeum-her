# TODO List - Muzeum Her Kiosk System

## 🔥 Priorita 1 - Základní funkčnost

### Firebase Setup
- [ ] Vytvořit Firebase projekt
- [ ] Nastavit Firestore databázi
- [ ] Vytvořit kolekce (code_ranges, tickets, events, terminals)
- [ ] Nastavit Security Rules
- [ ] Vytvořit indexy
- [ ] Přidat Firebase credentials do `src/config/firebase.ts`

### Implementace Firebase logiky v terminálech

**Entry Terminal:**
- [ ] Načíst code_ranges z Firestore
- [ ] Validovat EAN kód proti code_ranges
- [ ] Vytvořit/aktualizovat ticket v Firestore
- [ ] Zalogovat event (ENTRY)
- [ ] Implementovat kontrolu "jeden den"
- [ ] Implementovat kontrolu duplicitního vstupu

**Check Terminal:**
- [ ] Načíst ticket z Firestore
- [ ] Vypočítat zbývající čas
- [ ] Zalogovat event (CHECK)
- [ ] Zobrazit správnou barvu podle času

**Exit Terminal:**
- [ ] Načíst ticket z Firestore
- [ ] Vypočítat zbývající čas / doplatek
- [ ] Aktualizovat status ticketu na 'LEFT'
- [ ] Zalogovat event (EXIT)
- [ ] Implementovat logiku doplatku

## 🎨 Priorita 2 - Admin Panel

### Dashboard
- [ ] Implementovat real-time listener pro statistiky
- [ ] Přidat graf návštěvnosti (Recharts)
- [ ] Přidat heatmapu vytížení
- [ ] Implementovat auto-refresh každých 5 sekund

### Správa vstupenek
- [ ] Stránka se seznamem všech vstupenek
- [ ] Filtry (status, datum, řada)
- [ ] Vyhledávání podle EAN
- [ ] Detail vstupenky
- [ ] Manuální editace (prodloužení času, označení jako zaplaceno)

### Správa řad kódů
- [ ] CRUD operace pro code_ranges
- [ ] Formulář pro přidání nové řady
- [ ] Aktivace/deaktivace řady
- [ ] Validace rozsahů (nesmí se překrývat)

### Statistiky
- [ ] Denní návštěvnost (graf)
- [ ] Týdenní návštěvnost (graf)
- [ ] Měsíční návštěvnost (graf)
- [ ] Top vstupenky (tabulka)
- [ ] Průměrná doba návštěvy (trend)
- [ ] Tržby (graf + tabulka)
- [ ] Export do CSV

### Zákazníci
- [ ] Seznam všech návštěvníků
- [ ] Vyhledávání podle EAN
- [ ] Historie návštěv
- [ ] Statistiky jednotlivých zákazníků

### Nastavení
- [ ] Konfigurace terminálů
- [ ] Nastavení kapacity
- [ ] Nastavení cen
- [ ] Nastavení notifikací
- [ ] Obecná nastavení systému

### Logy
- [ ] Zobrazení všech events
- [ ] Filtry (typ, terminál, datum)
- [ ] Export logů
- [ ] Real-time aktualizace

## 🔐 Priorita 3 - Autentizace

- [ ] Implementovat Firebase Authentication
- [ ] Login stránka
- [ ] Logout funkce
- [ ] Protected routes pro admin
- [ ] Role-based access (admin, operator)
- [ ] Password reset

## 🚪 Priorita 4 - Hardware integrace

### Relé ovládání
- [ ] Rozhodnout o řešení (lokální server vs. IoT)
- [ ] Implementovat lokální Node.js server (pokud lokální)
  - [ ] Express server
  - [ ] USB relé komunikace
  - [ ] API endpoints (/open-door)
- [ ] Nebo implementovat IoT řešení (ESP32/Raspberry Pi)
  - [ ] Firebase Cloud Functions trigger
  - [ ] MQTT komunikace
- [ ] Testování s reálným hardware
- [ ] Implementovat timeout a error handling
- [ ] Přidat manuální ovládání v adminu

### Čtečky
- [ ] Otestovat s reálnými čtečkami (SL20UD, pistolové)
- [ ] Optimalizovat debounce a timeout
- [ ] Přidat zvukovou/vizuální feedback při skenování

## 📱 Priorita 5 - UX vylepšení

### Kiosk terminály
- [ ] Přidat zvuky (beep při skenování, success/error)
- [ ] Přidat více animací
- [ ] Implementovat screensaver (po 30s nečinnosti)
- [ ] Přidat podporu pro dotykové obrazovky
- [ ] Optimalizovat pro různé orientace (portrait/landscape)

### Admin
- [ ] Přidat loading states všude
- [ ] Přidat error boundaries
- [ ] Implementovat toast notifikace
- [ ] Přidat dark mode (volitelné)
- [ ] Přidat keyboard shortcuts

## 🔔 Priorita 6 - Notifikace

- [ ] Email notifikace při překročení času
- [ ] Push notifikace pro admin (nový návštěvník, doplatek)
- [ ] SMS notifikace (volitelné)
- [ ] Webhook integrace (volitelné)

## 📊 Priorita 7 - Pokročilé funkce

### Multi-location
- [ ] Podpora pro více poboček (Plzeň, Praha)
- [ ] Centralizovaná správa
- [ ] Synchronizace dat mezi pobočkami

### Reporting
- [ ] Automatické denní reporty (email)
- [ ] Týdenní/měsíční reporty
- [ ] Custom reporty
- [ ] PDF export

### Integrace
- [ ] Integrace s pokladním systémem
- [ ] Integrace s online prodej vstupenek
- [ ] API pro třetí strany

### Tisk vstupenek
- [ ] Generování QR kódů
- [ ] Tisk vstupenek (thermal printer)
- [ ] Email vstupenky

## 🧪 Priorita 8 - Testování

- [ ] Unit testy (Vitest)
- [ ] Integration testy
- [ ] E2E testy (Playwright)
- [ ] Performance testy
- [ ] Load testing

## 🚀 Priorita 9 - Deployment

- [ ] Nastavit Firebase Hosting
- [ ] Nebo nastavit vlastní hosting
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment variables
- [ ] Monitoring (Firebase Performance)
- [ ] Error tracking (Sentry)
- [ ] Analytics (Google Analytics)

## 📚 Priorita 10 - Dokumentace

- [ ] API dokumentace
- [ ] User manual (pro obsluhu)
- [ ] Admin manual
- [ ] Video tutoriály
- [ ] FAQ

## 🐛 Bug tracking

- [ ] Nastavit issue tracker (GitHub Issues)
- [ ] Definovat bug reporting proces
- [ ] Nastavit error monitoring

## 🔒 Bezpečnost

- [ ] Security audit
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] HTTPS only
- [ ] Firestore Security Rules review
- [ ] Backup strategie

## 📈 Optimalizace

- [ ] Code splitting
- [ ] Lazy loading
- [ ] Image optimization
- [ ] Bundle size optimization
- [ ] Lighthouse audit
- [ ] Performance monitoring

