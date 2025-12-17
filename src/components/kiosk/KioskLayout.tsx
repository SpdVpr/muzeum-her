/**
 * Kiosk Layout Component
 * Základní layout pro všechny kiosk terminály (Entry, Check, Exit)
 */

import React from 'react';
import { colors } from '../../config/theme';

interface KioskLayoutProps {
  children: React.ReactNode;
  backgroundColor?: string;
  showLogo?: boolean;
}

export const KioskLayout: React.FC<KioskLayoutProps> = ({
  children,
  backgroundColor = colors.black,
  showLogo = true,
}) => {
  return (
    <div
      className="kiosk-screen"
      style={{
        backgroundColor,
        transition: 'background-color 0.3s ease',
      }}
    >
      {showLogo && (
        <div style={{
          position: 'absolute',
          top: 'clamp(1rem, 3vw, 3rem)',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
          fontWeight: 700,
          color: colors.white,
          textAlign: 'center',
          zIndex: 10,
        }}>
          Cibien's Corner
          <div style={{
            fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)',
            fontWeight: 400,
            marginTop: '0.5rem',
            opacity: 0.8,
          }}>
            Muzeum Her
          </div>
        </div>
      )}
      
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(2rem, 5vw, 5rem)',
      }}>
        {children}
      </div>
    </div>
  );
};

