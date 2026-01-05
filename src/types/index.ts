/**
 * TypeScript typy pro celou aplikaci
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// FIRESTORE KOLEKCE
// ============================================================================

/**
 * Konfigurace řad EAN kódů
 * Kolekce: /code_ranges
 */
export interface CodeRange {
  id: string;
  name: string;                    // např. "Základní vstup"
  description?: string;            // Popis/Vysvětlivka
  prefix: string;                  // např. "1000-1999" nebo "200*"
  branchId?: string;               // ID pobočky (pro kterou je řada určena)
  backgroundColor?: string;        // Barva pro odlišení v UI
  durationMinutes: number;         // např. 60
  price: number;                   // např. 150 Kč
  pricePerExtraMinute: number;     // např. 5 Kč/min
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Status vstupenky
 */
export type TicketStatus = 'ACTIVE' | 'INSIDE' | 'LEFT' | 'EXPIRED';

/**
 * Vstupenka
 * Kolekce: /tickets
 * Document ID = EAN kód
 */
export interface Ticket {
  ean: string;                     // Document ID
  rangeId: string;                 // Reference na code_ranges
  branchId?: string;               // ID pobočky
  status: TicketStatus;
  firstScan: Timestamp;            // První průchod (pro validaci "jeden den")
  lastScan: Timestamp;             // Poslední skenování
  allowedMinutes: number;          // Zaplacený čas (původní)
  remainingMinutes: number;        // Zbývající čas (aktualizuje se při výstupu)
  scanCount: number;               // Počet skenování
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Typ události
 */
export type EventType = 'ENTRY' | 'CHECK' | 'EXIT';

/**
 * Událost (log)
 * Kolekce: /events
 */
export interface Event {
  id: string;
  ean: string;
  type: EventType;
  terminalId: string;              // např. "entry-1", "check-2", "exit-1"
  timestamp: Timestamp;
  remainingMinutes: number;        // Zbývající čas v momentě skenování
  overstayMinutes: number;         // Překročení času (0 pokud OK)
  metadata?: Record<string, any>;  // Další data
}

/**
 * Konfigurace terminálu
 * Kolekce: /terminals
 */
export interface Terminal {
  id: string;
  type: EventType;
  location: string;                // např. "Hlavní vchod"
  relayEnabled: boolean;           // Má relé pro dveře?
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// UI TYPY
// ============================================================================

/**
 * Režim kiosku
 */
export type KioskMode = 'entry' | 'check' | 'exit';

/**
 * Stav skenování
 */
export type ScanState = 'idle' | 'scanning' | 'success' | 'error';

/**
 * Výsledek skenování
 */
export interface ScanResult {
  success: boolean;
  message: string;
  ticket?: Ticket;
  remainingMinutes?: number;
  overstayMinutes?: number;
  shouldOpenDoor?: boolean;
}

/**
 * Statistiky pro dashboard
 */
export interface DashboardStats {
  currentlyInside: number;
  todayTotal: number;
  todayLeft: number;
  capacity: number;
  capacityPercent: number;
  averageVisitMinutes: number;
  todayRevenue: number;
  todayOverstayCount: number;
  todayOverstayRevenue: number;
}

/**
 * Data pro graf návštěvnosti
 */
export interface VisitorChartData {
  hour: number;
  entries: number;
  exits: number;
  inside: number;
}

/**
 * Top vstupenka (statistika)
 */
export interface TopTicketStat {
  rangeName: string;
  count: number;
  revenue: number;
}

// ============================================================================
// BARCODE SCANNER
// ============================================================================

/**
 * Konfigurace barcode scanneru
 */
export interface BarcodeScannerConfig {
  enabled: boolean;
  minLength: number;               // Minimální délka EAN kódu
  maxLength: number;               // Maximální délka EAN kódu
  timeout: number;                 // Timeout mezi znaky (ms)
  debounce: number;                // Debounce pro opakované skenování (ms)
  enterKey: boolean;               // Očekává Enter na konci?
}

/**
 * Callback pro barcode scanner
 */
export type BarcodeScanCallback = (code: string) => void | Promise<void>;

// ============================================================================
// AUTH & USERS
// ============================================================================

/**
 * Role uživatele
 */
export type UserRole = 'ADMIN' | 'BRANCH';

/**
 * Uživatel (přihlášený do adminu)
 */
export interface User {
  id: string;
  username: string;
  role: UserRole;
  branchId?: string; // ID pobočky (pro filtry)
  branchName?: string; // Název pobočky (pro zobrazení)
}

/**
 * Definice pobočky
 */
export interface Branch {
  id: string;
  name: string;
  location: string;
  terminals: string[]; // IDs terminálů patřících pod pobočku
}


