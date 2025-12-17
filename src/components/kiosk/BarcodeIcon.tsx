/**
 * Barcode Icon Component
 * Animovaná ikona čárového kódu pro kiosk terminály
 */

import React from 'react';
import { colors } from '../../config/theme';

interface BarcodeIconProps {
  animate?: boolean;
  size?: number;
  color?: string;
}

export const BarcodeIcon: React.FC<BarcodeIconProps> = ({
  animate = true,
  size = 200,
  color = colors.primary,
}) => {
  return (
    <div
      className={animate ? 'animate-pulse' : ''}
      style={{
        width: size,
        height: size * 0.6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4%',
        padding: '10%',
        border: `3px solid ${color}`,
        borderRadius: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Čárový kód - různé šířky čar */}
      <div style={{ width: '8%', height: '100%', backgroundColor: color }} />
      <div style={{ width: '4%', height: '100%', backgroundColor: color }} />
      <div style={{ width: '8%', height: '100%', backgroundColor: color }} />
      <div style={{ width: '4%', height: '100%', backgroundColor: color }} />
      <div style={{ width: '12%', height: '100%', backgroundColor: color }} />
      <div style={{ width: '4%', height: '100%', backgroundColor: color }} />
      <div style={{ width: '8%', height: '100%', backgroundColor: color }} />
      <div style={{ width: '4%', height: '100%', backgroundColor: color }} />
      <div style={{ width: '8%', height: '100%', backgroundColor: color }} />
    </div>
  );
};

