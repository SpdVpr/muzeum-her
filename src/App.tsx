/**
 * Main App Component
 * Routing pro Entry/Check/Exit terminály a Admin
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EntryTerminal } from './pages/EntryTerminal';
import { CheckTerminal } from './pages/CheckTerminal';
import { ExitTerminal } from './pages/ExitTerminal';
import { AdminLayout } from './components/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Setup } from './pages/admin/Setup';
import { Tickets } from './pages/admin/Tickets';
import { Stats } from './pages/admin/Stats';
import { Customers } from './pages/admin/Customers';
import { Revenue } from './pages/admin/Revenue';
import { Settings } from './pages/admin/Settings';
import { Logs } from './pages/admin/Logs';
import { Relay } from './pages/admin/Relay';
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Kiosk terminály */}
        <Route path="/kiosk/entry" element={<EntryTerminal />} />
        <Route path="/kiosk/check" element={<CheckTerminal />} />
        <Route path="/kiosk/exit" element={<ExitTerminal />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="stats" element={<Stats />} />
          <Route path="customers" element={<Customers />} />
          <Route path="revenue" element={<Revenue />} />
          <Route path="settings" element={<Settings />} />
          <Route path="relay" element={<Relay />} />
          <Route path="logs" element={<Logs />} />
          <Route path="setup" element={<Setup />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/kiosk/entry" replace />} />

        {/* 404 */}
        <Route path="*" element={
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'sans-serif'
          }}>
            <h1 style={{ fontSize: '4rem', margin: 0 }}>404</h1>
            <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>Stránka nenalezena</p>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="/kiosk/entry" style={{ padding: '0.75rem 1.5rem', background: '#0037FD', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
                Vstup
              </a>
              <a href="/kiosk/check" style={{ padding: '0.75rem 1.5rem', background: '#0037FD', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
                Check
              </a>
              <a href="/kiosk/exit" style={{ padding: '0.75rem 1.5rem', background: '#0037FD', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
                Výstup
              </a>
              <a href="/admin" style={{ padding: '0.75rem 1.5rem', background: '#09B872', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
                Admin
              </a>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

