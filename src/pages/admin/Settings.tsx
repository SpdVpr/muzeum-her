/**
 * Admin Settings Page
 * Konfigurace systému
 */

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';

interface SystemSettings {
  capacity: number;
  defaultDuration: number;
  defaultPrice: number;
  defaultOverstayPrice: number;
  relayEnabled: boolean;
  relayDuration: number;
  emailNotifications: boolean;
  adminEmail: string;
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    capacity: 200,
    defaultDuration: 60,
    defaultPrice: 100,
    defaultOverstayPrice: 5,
    relayEnabled: true,
    relayDuration: 5,
    emailNotifications: false,
    adminEmail: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
        if (settingsDoc.exists()) {
          setSettings({ ...settings, ...settingsDoc.data() });
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading settings:', err);
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleClearEvents = async () => {
    if (!window.confirm('⚠️ POZOR: Opravdu chcete smazat VŠECHNY záznamy o průchodech (events)?\n\nStatistiky se vynulují. Lístky zůstanou ve stavu, v jakém jsou (INSIDE/LEFT).\n\nTato akce je nevratná!')) return;

    setSaving(true);
    try {
      const q = query(collection(db, 'events'));
      const snapshot = await getDocs(q);
      const batchSize = 400;
      const batches = [];
      let batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
        if (count >= batchSize) {
          batches.push(batch.commit());
          batch = writeBatch(db);
          count = 0;
        }
      });
      if (count > 0) batches.push(batch.commit());

      await Promise.all(batches);
      alert('Všechny události byly úspěšně smazány.');
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('Chyba: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await setDoc(doc(db, 'settings', 'system'), settings);
      setMessage('✅ Nastavení uloženo');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`❌ Chyba: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textSecondary }}>
        Načítám nastavení...
      </div>
    );
  }

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
          ⚙️ Nastavení
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
          Konfigurace systému a terminálů
        </p>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: spacing.md,
          marginBottom: spacing.lg,
          backgroundColor: message.startsWith('✅') ? colors.success + '20' : colors.error + '20',
          color: message.startsWith('✅') ? colors.success : colors.error,
          borderRadius: borderRadius.md,
          fontWeight: 600,
        }}>
          {message}
        </div>
      )}

      {/* General Settings */}
      <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.xl, boxShadow: shadows.card }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>🏢 Obecné nastavení</h3>

        <div style={{ display: 'grid', gap: spacing.lg }}>
          <SettingField
            label="Kapacita muzea"
            value={settings.capacity}
            onChange={(v) => setSettings({ ...settings, capacity: v })}
            type="number"
            suffix="osob"
            description="Maximální počet návštěvníků současně"
          />

          <SettingField
            label="Výchozí doba návštěvy"
            value={settings.defaultDuration}
            onChange={(v) => setSettings({ ...settings, defaultDuration: v })}
            type="number"
            suffix="minut"
            description="Pokud není specifikováno v code_range"
          />

          <SettingField
            label="Výchozí cena"
            value={settings.defaultPrice}
            onChange={(v) => setSettings({ ...settings, defaultPrice: v })}
            type="number"
            suffix="Kč"
            description="Pokud není specifikováno v code_range"
          />

          <SettingField
            label="Výchozí doplatek za minutu"
            value={settings.defaultOverstayPrice}
            onChange={(v) => setSettings({ ...settings, defaultOverstayPrice: v })}
            type="number"
            suffix="Kč/min"
            description="Pokud není specifikováno v code_range"
          />
        </div>
      </div>

      {/* Relay Settings */}
      <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.xl, boxShadow: shadows.card }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>🚪 Nastavení relé (dveře)</h3>

        <div style={{ display: 'grid', gap: spacing.lg }}>
          <SettingToggle
            label="Povolit relé"
            value={settings.relayEnabled}
            onChange={(v) => setSettings({ ...settings, relayEnabled: v })}
            description="Povolit automatické otevírání dveří"
          />

          <SettingField
            label="Doba otevření"
            value={settings.relayDuration}
            onChange={(v) => setSettings({ ...settings, relayDuration: v })}
            type="number"
            suffix="sekund"
            description="Jak dlouho zůstanou dveře otevřené"
            disabled={!settings.relayEnabled}
          />
        </div>
      </div>

      {/* Notification Settings */}
      <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.xl, boxShadow: shadows.card }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg }}>📧 Notifikace</h3>

        <div style={{ display: 'grid', gap: spacing.lg }}>
          <SettingToggle
            label="Email notifikace"
            value={settings.emailNotifications}
            onChange={(v) => setSettings({ ...settings, emailNotifications: v })}
            description="Posílat upozornění na email"
          />

          <SettingField
            label="Admin email"
            value={settings.adminEmail}
            onChange={(v) => setSettings({ ...settings, adminEmail: v })}
            type="email"
            description="Email pro notifikace"
            disabled={!settings.emailNotifications}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.xl, boxShadow: shadows.card, border: `1px solid ${colors.error}40` }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: spacing.lg, color: colors.error }}>⚠️ Nebezpečná zóna</h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600 }}>Smazat historii událostí</div>
            <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>Vynuluje statistiky návštěvnosti a tržeb. Neovlivní platnost lístků.</div>
          </div>
          <button
            onClick={handleClearEvents}
            type="button"
            style={{
              padding: '8px 16px',
              backgroundColor: colors.error,
              color: 'white',
              border: 'none',
              borderRadius: borderRadius.md,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            🗑️ Smazat historii
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.md }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 32px',
            backgroundColor: saving ? colors.textSecondary : colors.success,
            color: 'white',
            border: 'none',
            borderRadius: borderRadius.md,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          {saving ? '⏳ Ukládám...' : '💾 Uložit nastavení'}
        </button>
      </div>
    </div>
  );
};

const SettingField: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'email';
  suffix?: string;
  description?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, type = 'text', suffix, description, disabled }) => (
  <div>
    <label style={{ display: 'block', marginBottom: spacing.xs, fontWeight: 600 }}>
      {label}
    </label>
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
        disabled={disabled}
        style={{
          flex: 1,
          padding: spacing.sm,
          borderRadius: borderRadius.md,
          border: `1px solid ${colors.textSecondary}40`,
          backgroundColor: disabled ? colors.background : colors.background,
          color: disabled ? colors.textSecondary : colors.text,
          fontSize: '1rem',
        }}
      />
      {suffix && <span style={{ color: colors.textSecondary, fontWeight: 600 }}>{suffix}</span>}
    </div>
    {description && (
      <p style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: spacing.xs }}>
        {description}
      </p>
    )}
  </div>
);

const SettingToggle: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}> = ({ label, value, onChange, description }) => (
  <div>
    <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
      />
      <span style={{ fontWeight: 600 }}>{label}</span>
    </label>
    {description && (
      <p style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: spacing.xs, marginLeft: '28px' }}>
        {description}
      </p>
    )}
  </div>
);

