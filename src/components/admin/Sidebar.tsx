/**
 * Admin Sidebar Navigation
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { colors, spacing } from '../../config/theme';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const navItems = [
  { path: '/admin', icon: '📊', label: 'Dashboard', exact: true },
  { path: '/admin/tickets', icon: '🎫', label: 'Vstupenky' },
  { path: '/admin/stats', icon: '📈', label: 'Statistiky' },
  { path: '/admin/customers', icon: '👥', label: 'Zákazníci' },
  { path: '/admin/revenue', icon: '💰', label: 'Tržby' },
  { path: '/admin/settings', icon: '⚙️', label: 'Nastavení' },
  { path: '/admin/relay', icon: '🎛️', label: 'Relé' },
  { path: '/admin/logs', icon: '📋', label: 'Logy' },
  { path: '/admin/setup', icon: '🔧', label: 'Setup DB' },
];

const terminalItems = [
  { path: '/kiosk/entry', icon: '🚪', label: 'Vstup', external: true },
  { path: '/kiosk/check', icon: '🔍', label: 'Kontrola', external: true },
  { path: '/kiosk/exit', icon: '🚶', label: 'Výstup', external: true },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose, isMobile = false }) => {
  return (
    <aside
      style={{
        width: isOpen ? '250px' : '0',
        height: '100vh',
        backgroundColor: colors.black,
        color: colors.white,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        zIndex: isMobile ? 1000 : 'auto',
        boxShadow: isMobile && isOpen ? '2px 0 8px rgba(0, 0, 0, 0.3)' : 'none',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: spacing.xl,
          borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Muzeum Her
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.25rem' }}>
            Admin Panel
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.white,
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: spacing.md, overflowY: 'auto' }}>
        {/* Admin Pages */}
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            onClick={() => {
              // Zavři menu na mobilu po kliknutí
              if (isMobile && onClose) {
                onClose();
              }
            }}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              padding: `${spacing.md} ${spacing.lg}`,
              marginBottom: spacing.sm,
              borderRadius: '8px',
              textDecoration: 'none',
              color: colors.white,
              backgroundColor: isActive ? colors.primary : 'transparent',
              transition: 'background-color 0.2s ease',
              fontSize: '0.95rem',
              fontWeight: isActive ? 600 : 400,
            })}
          >
            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Divider */}
        <div style={{
          height: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          margin: `${spacing.lg} 0`,
        }} />

        {/* Terminals Section */}
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.5)',
          padding: `${spacing.sm} ${spacing.lg}`,
          marginBottom: spacing.sm,
        }}>
          TERMINÁLY
        </div>

        {terminalItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              // Zavři menu na mobilu po kliknutí
              if (isMobile && onClose) {
                onClose();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              padding: `${spacing.md} ${spacing.lg}`,
              marginBottom: spacing.sm,
              borderRadius: '8px',
              textDecoration: 'none',
              color: colors.white,
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s ease',
              fontSize: '0.95rem',
              fontWeight: 400,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            <span>{item.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.5 }}>↗</span>
          </a>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: spacing.lg,
          borderTop: `1px solid rgba(255, 255, 255, 0.1)`,
          fontSize: '0.75rem',
          opacity: 0.5,
          textAlign: 'center',
        }}
      >
        © 2025 Cibien's Corner
      </div>
    </aside>
  );
};

