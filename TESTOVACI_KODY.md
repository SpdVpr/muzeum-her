# 🧪 Testovací EAN kódy

Zde jsou testovací EAN kódy pro všechny typy lístků a pobočky.

## 📍 Cyber Arcade (03)

### Limetková - 1 hodina (60 min, 150 Kč)
```
03041000
03041500
03042999
```

### Oranžová - 2 hodiny (120 min, 250 Kč)
```
03031000
03031500
03032999
```

### Fialová - Celodenní (480 min, 400 Kč)
```
03021000
03021500
03022999
```

### Zlatá - VIP Celodenní (480 min, 600 Kč)
```
03011000
03011500
03011999
```

### Modrá - Nehrající doprovod (480 min, 200 Kč)
```
03051000
03051500
03051999
```

---

## 📍 Game World (02)

### Limetková - 1 hodina (60 min, 150 Kč)
```
02041000
02041500
02042499
```

### Oranžová - 2 hodiny (120 min, 250 Kč)
```
02031000
02031500
02032499
```

### Fialová - Celodenní (480 min, 400 Kč)
```
02021000
02021500
02022499
```

### Zlatá - VIP Celodenní (480 min, 600 Kč)
```
02011000
02011250
02011499
```

### Modrá - 0,5 hodiny (30 min, 100 Kč) ⚠️ SPECIÁLNÍ
```
02051000
02051250
02051499
```

---

## 📍 Game Station (01)

### Limetková - 1 hodina (60 min, 150 Kč)
```
01041000
01041500
01042499
```

### Oranžová - 2 hodiny (120 min, 250 Kč)
```
01031000
01031500
01032499
```

### Fialová - Celodenní (480 min, 400 Kč)
```
01021000
01021500
01022499
```

### Zlatá - VIP Celodenní (480 min, 600 Kč)
```
01011000
01011250
01011499
```

### Modrá - Nehrající doprovod (480 min, 200 Kč)
```
01051000
01051250
01051499
```

---

## 🧪 Testovací scénáře

### Scénář 1: Normální návštěva (1 hodina)
1. **Entry**: Naskenuj `03041000` (Cyber Arcade, 1h)
   - Očekávaný výsledek: ✅ "Vítejte! Máte 60 minut"
2. **Check** (po 30 min): Naskenuj `03041000`
   - Očekávaný výsledek: ✅ "Zbývá: 30 minut" (zelená)
3. **Exit** (po 50 min): Naskenuj `03041000`
   - Očekávaný výsledek: ✅ "Zbývalo: 10 minut"

### Scénář 2: Překročení času
1. **Entry**: Naskenuj `02041000` (Game World, 1h)
2. **Exit** (po 75 min): Naskenuj `02041000`
   - Očekávaný výsledek: ❌ "Doplatek: 15 minut = 75 Kč"

### Scénář 3: VIP Celodenní
1. **Entry**: Naskenuj `03011000` (Cyber Arcade, VIP)
   - Očekávaný výsledek: ✅ "Vítejte! Máte 480 minut (8 hodin)"
2. **Check** (kdykoliv): Naskenuj `03011000`
   - Očekávaný výsledek: ✅ Zobrazí zbývající čas

### Scénář 4: Speciální - Game World 30 minut
1. **Entry**: Naskenuj `02051000` (Game World, 0,5h)
   - Očekávaný výsledek: ✅ "Vítejte! Máte 30 minut"
2. **Exit** (po 35 min): Naskenuj `02051000`
   - Očekávaný výsledek: ❌ "Doplatek: 5 minut = 25 Kč"

### Scénář 5: Nehrající doprovod
1. **Entry**: Naskenuj `01051000` (Game Station, doprovod)
   - Očekávaný výsledek: ✅ "Vítejte! Máte 480 minut (celodenní)"

---

## 🎯 Quick Test Kódy

Pro rychlé testování použij tyto kódy:

```
03041000  - Cyber Arcade, 1h
02031000  - Game World, 2h
01021000  - Game Station, Celodenní
03011000  - Cyber Arcade, VIP
02051000  - Game World, 30 min (speciální)
```

---

## ⚠️ Důležité poznámky

1. **Modré lístky mají speciální logiku:**
   - Game World (02): 30 minut hrající
   - Game Station (01) & Cyber Arcade (03): Celodenní nehrající doprovod

2. **Všechny lístky:**
   - Platné pouze v den prvního skenování
   - Doplatek: 5 Kč/min při překročení
   - Nelze použít dvakrát na vstupu (duplicitní vstup)

3. **Formát EAN:**
   - 8 číslic: `PPTTNNNN`
   - PP = Pobočka (01, 02, 03)
   - TT = Typ (01-05)
   - NNNN = Číslo lístku

