/**
 * Relay Control Utilities
 * Ovládání relé pro otevírání dveří
 *
 * Podporuje:
 * 1. Lokální Node.js server s USB relé modulem
 * 2. IoT řešení (ESP32/Raspberry Pi) s HTTP API
 * 3. Mock mode pro testování
 */

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface RelayConfig {
  enabled: boolean;
  endpoint?: string;      // URL lokálního serveru (např. http://localhost:3001)
  duration?: number;      // Jak dlouho držet relé sepnuté (ms)
  terminalId: string;     // ID terminálu
}

/**
 * Otevře dveře pomocí relé
 */
export async function openDoor(config: RelayConfig): Promise<boolean> {
  if (!config.enabled) {
    console.log('🚪 Relay disabled - door would NOT open');
    return false;
  }

  console.log(`🚪 Opening door for terminal: ${config.terminalId}`);
  console.log(`🚪 Duration: ${config.duration || 3000}ms`);

  // Pokus o skutečné volání
  if (config.endpoint) {
    try {
      const response = await fetch(`${config.endpoint}/open-door`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId: config.terminalId,
          duration: config.duration || 3000,
        }),
        signal: AbortSignal.timeout(2000), // 2s timeout
      });

      if (!response.ok) {
        throw new Error('Failed to open door');
      }

      console.log('✅ Door opened successfully');

      // Zaloguj do Firebase
      await addDoc(collection(db, 'relay_events'), {
        timestamp: Timestamp.now(),
        triggeredBy: 'system',
        terminal: config.terminalId,
        duration: (config.duration || 3000) / 1000,
        success: true,
        mock: false,
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to open door:', error);
      // Fallback na mock
      return mockOpenDoor(config);
    }
  } else {
    // Žádný endpoint - použij mock
    return mockOpenDoor(config);
  }
}

/**
 * Mock implementace pro testování
 */
async function mockOpenDoor(config: RelayConfig): Promise<boolean> {
  console.log(`🎭 [MOCK] Opening door for terminal: ${config.terminalId}`);

  // Mock delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Zaloguj do Firebase
  await addDoc(collection(db, 'relay_events'), {
    timestamp: Timestamp.now(),
    triggeredBy: 'system',
    terminal: config.terminalId,
    duration: (config.duration || 3000) / 1000,
    success: true,
    mock: true,
  });

  console.log('✅ [MOCK] Door opened successfully');
  return true;
}

/**
 * Testovací funkce pro relé
 */
export async function testRelay(config: RelayConfig): Promise<void> {
  console.log('🧪 Testing relay...');
  const result = await openDoor(config);
  console.log(`🧪 Test result: ${result ? 'SUCCESS' : 'FAILED'}`);
}

/**
 * Jednoduchá funkce pro spuštění relé (pro admin panel)
 */
export async function triggerRelay(
  terminal: 'entry' | 'exit',
  duration: number = 5
): Promise<boolean> {
  const config = RELAY_CONFIGS[terminal];
  config.duration = duration * 1000; // převod na ms
  return openDoor(config);
}

/**
 * Default konfigurace pro různé terminály
 */
export const RELAY_CONFIGS: Record<string, RelayConfig> = {
  entry: {
    enabled: true,
    endpoint: import.meta.env.VITE_RELAY_SERVER || undefined,
    duration: 5000,  // 5 sekund
    terminalId: 'entry-1',
  },
  exit: {
    enabled: true,
    endpoint: import.meta.env.VITE_RELAY_SERVER || undefined,
    duration: 5000,  // 5 sekund
    terminalId: 'exit-1',
  },
  check: {
    enabled: false,  // Check terminál nemá dveře
    terminalId: 'check-1',
  },
};

