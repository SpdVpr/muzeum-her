# EAN Kódy - Struktura a Řady

## 📋 Struktura EAN kódu

Každý EAN kód má formát: `PP-TT-NNNNN`

- **PP** (2 číslice) - Pobočka
  - `01` - Game Station
  - `02` - Game World
  - `03` - Cyber Arcade

- **TT** (2 číslice) - Typ lístku
  - `01` - 1 hodina (limetkové pozadí)
  - `02` - 2 hodiny (oranžové pozadí)
  - `03` - Celodenní (fialové pozadí)
  - `04` - VIP Celodenní (zlaté pozadí)
  - `05` - 0,5 hodiny / Nehrající doprovod (modré pozadí)

- **NNNNN** (5 číslic) - Číslo lístku (1000-9999)

## 🎫 Definované řady

### 1. Limetkové pozadí - 1 hodina (5000ks)
- **Cyber Arcade**: `03041000` - `03043000` (2000ks)
- **Game World**: `02041000` - `02042500` (1500ks)
- **Game Station**: `01041000` - `01042500` (1500ks)
- **Cena**: 150 Kč
- **Doba**: 60 minut
- **Doplatek**: 5 Kč/min

### 2. Oranžové pozadí - 2 hodiny (5000ks)
- **Cyber Arcade**: `03031000` - `03033000` (2000ks)
- **Game World**: `02031000` - `02032500` (1500ks)
- **Game Station**: `01031000` - `01032500` (1500ks)
- **Cena**: 250 Kč
- **Doba**: 120 minut
- **Doplatek**: 5 Kč/min

### 3. Fialové pozadí - Celodenní (5000ks)
- **Cyber Arcade**: `03021000` - `03023000` (2000ks)
- **Game World**: `02021000` - `02022500` (1500ks)
- **Game Station**: `01021000` - `01022500` (1500ks)
- **Cena**: 400 Kč
- **Doba**: 480 minut (8 hodin)
- **Doplatek**: 5 Kč/min

### 4. Zlaté pozadí - VIP Celodenní (2000ks)
- **Cyber Arcade**: `03011000` - `03012000` (1000ks)
- **Game World**: `02011000` - `02011500` (500ks)
- **Game Station**: `01011000` - `01011500` (500ks)
- **Cena**: 600 Kč
- **Doba**: 480 minut (8 hodin)
- **Doplatek**: 5 Kč/min

### 5. Modré pozadí - 0,5 hodiny / Nehrající doprovod (4000ks)
- **Cyber Arcade**: `03051000` - `03052000` (1000ks) - Celodenní nehrající
- **Game World**: `02051000` - `02051500` (1500ks) - 30 minut
- **Game Station**: `01051000` - `01051500` (1500ks) - Celodenní nehrající
- **Cena**: 100 Kč (Game World), 200 Kč (ostatní)
- **Doba**: 30 minut (Game World), 480 minut (ostatní)
- **Doplatek**: 5 Kč/min

## 📊 Celkový přehled

| Typ | Barva | Kód typu | Doba | Cena | Doplatek | Celkem kusů |
|-----|-------|----------|------|------|----------|-------------|
| 1 hodina | Limetková 🟢 | 04 | 60 min | 150 Kč | 5 Kč/min | 5000 |
| 2 hodiny | Oranžová 🟠 | 03 | 120 min | 250 Kč | 5 Kč/min | 5000 |
| Celodenní | Fialová 🟣 | 02 | 480 min | 400 Kč | 5 Kč/min | 5000 |
| VIP Celodenní | Zlatá 🟡 | 01 | 480 min | 600 Kč | 5 Kč/min | 2000 |
| Speciální | Modrá 🔵 | 05 | 30-480 min | 100-200 Kč | 5 Kč/min | 4000 |
| **CELKEM** | | | | | | **21000** |

## 📋 Detailní rozpis podle poboček

| Pobočka | Kód | Limetková | Oranžová | Fialová | Zlatá | Modrá | Celkem |
|---------|-----|-----------|----------|---------|-------|-------|--------|
| Cyber Arcade | 03 | 2000 | 2000 | 2000 | 1000 | 1000 | **7500** |
| Game World | 02 | 1500 | 1500 | 1500 | 500 | 1500 | **7000** |
| Game Station | 01 | 1500 | 1500 | 1500 | 500 | 1500 | **6500** |
| **CELKEM** | | **5000** | **5000** | **5000** | **2000** | **4000** | **21000** |

## 🏢 Pobočky

1. **Game Station** (01) - 6500 lístků
2. **Game World** (02) - 7000 lístků
3. **Cyber Arcade** (03) - 7500 lístků

## 💡 Poznámky

- Všechny lístky mají doplatek **5 Kč/min** při překročení času
- Lístky jsou platné **pouze v den prvního skenování**
- Modré lístky mají speciální logiku podle pobočky:
  - **Game World**: 30 minut (hrající)
  - **Game Station & Cyber Arcade**: Celodenní nehrající doprovod

