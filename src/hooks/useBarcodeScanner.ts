/**
 * Universal Barcode Scanner Hook
 * 
 * Funguje s USB čtečkami v režimu "keyboard emulation":
 * - Desktop 2D Barcode Scanner SL20UD
 * - Pistolové čtečky
 * 
 * Čtečky posílají znaky jako klávesnice a končí Enterem.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { BarcodeScanCallback, BarcodeScannerConfig } from '../types';

const DEFAULT_CONFIG: BarcodeScannerConfig = {
  enabled: true,
  minLength: 7,        // Dočasně 7 (některé čtečky vynechávají vedoucí nulu)
  maxLength: 13,       // EAN-13 maximálně
  timeout: 100,        // 100ms mezi znaky (čtečky jsou rychlé)
  debounce: 3000,      // 3 sekundy debounce (zamezí dvojímu skenování)
  enterKey: true,      // Čtečky končí Enterem
};

/**
 * Hook pro detekci barcode skenování
 * 
 * @param onScan - Callback funkce volaná po úspěšném skenování
 * @param config - Konfigurace scanneru (volitelné)
 * 
 * @example
 * ```tsx
 * useBarcodeScanner((code) => {
 *   console.log('Naskenován kód:', code);
 * });
 * ```
 */
export function useBarcodeScanner(
  onScan: BarcodeScanCallback,
  config: Partial<BarcodeScannerConfig> = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const processScan = useCallback(async (code: string) => {
    // Debounce - zamezí dvojímu skenování stejného kódu
    const now = Date.now();
    if (now - lastScanRef.current < fullConfig.debounce) {
      console.log('🚫 Barcode scan ignored (debounce):', code);
      return;
    }

    // Validace délky
    if (code.length < fullConfig.minLength || code.length > fullConfig.maxLength) {
      console.warn('⚠️ Invalid barcode length:', code.length, 'Expected:', fullConfig.minLength, '-', fullConfig.maxLength);
      return;
    }

    // Validace - pouze číslice (EAN kódy)
    if (!/^\d+$/.test(code)) {
      console.warn('⚠️ Invalid barcode format (not numeric):', code);
      return;
    }

    console.log('✅ Barcode scanned:', code);
    lastScanRef.current = now;
    isProcessingRef.current = true;

    try {
      await onScan(code);
    } catch (error) {
      console.error('❌ Error processing barcode:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [onScan, fullConfig.debounce, fullConfig.minLength, fullConfig.maxLength]);

  useEffect(() => {
    if (!fullConfig.enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Debug log
      console.log('🔑 Key event:', event.type, 'key:', event.key, 'code:', event.code);

      // Ignoruj, pokud je focus v input fieldu (admin formuláře)
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        console.log('⏭️ Skipping - input field focused');
        return;
      }

      // Ignoruj, pokud se právě zpracovává předchozí scan
      if (isProcessingRef.current) {
        console.log('⏭️ Skipping - processing previous scan');
        event.preventDefault();
        return;
      }

      const key = event.key;

      // Ignoruj modifier klávesy (Shift, Ctrl, Alt, atd.)
      const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'];
      if (modifierKeys.includes(key)) {
        console.log('⏭️ Ignoring modifier key:', key);
        return;
      }

      // Enter = konec skenování
      if (key === 'Enter' && fullConfig.enterKey) {
        event.preventDefault();
        console.log('✅ Enter detected, buffer:', bufferRef.current);

        if (bufferRef.current.length > 0) {
          console.log('📤 Processing scan:', bufferRef.current);
          processScan(bufferRef.current);
          resetBuffer();
        }
        return;
      }

      // Číslice = přidej do bufferu
      if (/^\d$/.test(key)) {
        event.preventDefault();
        bufferRef.current += key;
        console.log('📝 Buffer:', bufferRef.current);

        // Reset timeout - pokud přestanou přicházet znaky, vymaž buffer
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          // Timeout vypršel - pravděpodobně to nebylo skenování, ale manuální psaní
          if (bufferRef.current.length > 0) {
            console.log('⏱️ Barcode timeout - buffer cleared:', bufferRef.current);
            resetBuffer();
          }
        }, fullConfig.timeout);

        return;
      }

      // Jiné klávesy = reset bufferu (pravděpodobně manuální psaní)
      if (bufferRef.current.length > 0) {
        console.log('🔄 Resetting buffer due to non-digit key:', key);
        resetBuffer();
      }
    };

    // Přidej event listener - pouze keydown (některé čtečky nefungují s keypress)
    window.addEventListener('keydown', handleKeyPress);

    console.log('🔍 Barcode scanner initialized (listening on keydown)');

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      resetBuffer();
      console.log('🔍 Barcode scanner destroyed');
    };
  }, [fullConfig.enabled, fullConfig.enterKey, fullConfig.timeout, processScan, resetBuffer]);

  return {
    isEnabled: fullConfig.enabled,
    lastScan: lastScanRef.current,
  };
}

