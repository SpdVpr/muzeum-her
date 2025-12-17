# 🚪 Relay Server - Ovládání dveří

Dokumentace pro nastavení serveru pro ovládání relé (otevírání dveří).

## 🎯 Možnosti implementace

### 1️⃣ **Lokální Node.js server** (Doporučeno)

Nejjednodušší řešení pro malé instalace.

#### Hardware:
- Raspberry Pi / Arduino / ESP32
- USB relé modul (např. 2-kanálový)
- Napájení 5V

#### Software:
```bash
# Vytvoř nový projekt
mkdir relay-server
cd relay-server
npm init -y

# Instaluj závislosti
npm install express cors serialport
```

#### Kód serveru (`server.js`):
```javascript
const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurace sériového portu (USB relé)
const port = new SerialPort({
  path: '/dev/ttyUSB0', // Linux/Mac
  // path: 'COM3',       // Windows
  baudRate: 9600
});

// Otevři dveře
app.post('/open-door', async (req, res) => {
  const { terminalId, duration = 3000 } = req.body;
  
  console.log(`Opening door for ${terminalId}, duration: ${duration}ms`);
  
  try {
    // Zapni relé (pošli příkaz na sériový port)
    port.write(Buffer.from([0xFF, 0x01, 0x01])); // Příklad - závisí na relé modulu
    
    // Počkej
    await new Promise(resolve => setTimeout(resolve, duration));
    
    // Vypni relé
    port.write(Buffer.from([0xFF, 0x01, 0x00]));
    
    res.json({ success: true, message: 'Door opened' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: port.path,
    isOpen: port.isOpen 
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚪 Relay server running on http://localhost:${PORT}`);
});
```

#### Spuštění:
```bash
node server.js
```

#### Konfigurace v kiosk systému:
```bash
# .env.local
VITE_RELAY_SERVER=http://localhost:3001
```

---

### 2️⃣ **ESP32/ESP8266 s HTTP API**

Pro bezdrátové řešení.

#### Hardware:
- ESP32 nebo ESP8266
- Relé modul (5V)
- Napájení

#### Software (Arduino IDE):
```cpp
#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";

WebServer server(80);

const int RELAY_PIN = 2; // GPIO pin pro relé

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  
  // Připoj se k WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Endpoints
  server.on("/open-door", HTTP_POST, handleOpenDoor);
  server.on("/status", HTTP_GET, handleStatus);
  
  server.begin();
  Serial.println("Server started");
}

void loop() {
  server.handleClient();
}

void handleOpenDoor() {
  int duration = 3000; // default 3s
  
  if (server.hasArg("duration")) {
    duration = server.arg("duration").toInt();
  }
  
  Serial.println("Opening door...");
  
  // Zapni relé
  digitalWrite(RELAY_PIN, HIGH);
  delay(duration);
  digitalWrite(RELAY_PIN, LOW);
  
  server.send(200, "application/json", "{\"success\":true}");
}

void handleStatus() {
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}
```

#### Konfigurace:
```bash
# .env.local
VITE_RELAY_SERVER=http://192.168.1.100  # IP adresa ESP32
```

---

### 3️⃣ **Raspberry Pi s GPIO**

Pro pokročilé instalace.

#### Hardware:
- Raspberry Pi (Zero, 3, 4)
- Relé modul připojený na GPIO
- Napájení

#### Software:
```bash
# Instaluj Python knihovny
pip3 install flask flask-cors RPi.GPIO
```

#### Kód (`relay_server.py`):
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import RPi.GPIO as GPIO
import time

app = Flask(__name__)
CORS(app)

# GPIO setup
RELAY_PIN = 17  # GPIO 17
GPIO.setmode(GPIO.BCM)
GPIO.setup(RELAY_PIN, GPIO.OUT)
GPIO.output(RELAY_PIN, GPIO.LOW)

@app.route('/open-door', methods=['POST'])
def open_door():
    data = request.json
    duration = data.get('duration', 3000) / 1000  # ms to seconds
    
    print(f"Opening door for {duration}s")
    
    # Zapni relé
    GPIO.output(RELAY_PIN, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(RELAY_PIN, GPIO.LOW)
    
    return jsonify({'success': True})

@app.route('/status', methods=['GET'])
def status():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001)
```

#### Spuštění:
```bash
python3 relay_server.py
```

---

## 🧪 Testování

### Mock mode (bez hardware):
Systém automaticky používá mock mode, pokud není nastaven `VITE_RELAY_SERVER`.

### Test s curl:
```bash
# Test otevření dveří
curl -X POST http://localhost:3001/open-door \
  -H "Content-Type: application/json" \
  -d '{"terminalId":"entry-1","duration":3000}'

# Test status
curl http://localhost:3001/status
```

### Test v admin panelu:
1. Otevři http://localhost:5173/admin/relay
2. Klikni na "OTEVŘÍT VSTUP" nebo "OTEVŘÍT VÝSTUP"
3. Zkontroluj historii otevření

---

## 🔒 Bezpečnost

⚠️ **DŮLEŽITÉ:**
- Relay server by měl běžet pouze v lokální síti
- Neexponuj ho na internet bez autentizace
- Použij firewall pro omezení přístupu
- Zvažte HTTPS pro produkci

---

## 📝 Poznámky

- Výchozí doba otevření: 5 sekund
- Timeout pro HTTP request: 2 sekundy
- Všechna otevření se logují do Firebase (`relay_events`)
- Mock mode automaticky loguje s `mock: true`

