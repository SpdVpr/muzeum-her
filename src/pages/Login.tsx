import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, borderRadius, shadows } from '../config/theme';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const success = await login(username, password);
            if (success) {
                navigate('/admin');
            } else {
                setError('Nesprávné jméno nebo heslo');
            }
        } catch {
            setError('Chyba při přihlašování');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
            padding: spacing.md
        }}>
            <div style={{
                backgroundColor: colors.white,
                padding: spacing.xl,
                borderRadius: borderRadius.lg,
                boxShadow: shadows.xl,
                width: '100%',
                maxWidth: '400px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: colors.text }}>
                        Muzeum Her
                    </h1>
                    <p style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                        Admin Panel Login
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: colors.error + '20',
                        color: colors.error,
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        marginBottom: spacing.lg,
                        fontSize: '0.875rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: spacing.lg }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: spacing.xs, color: colors.text }}>
                            Uživatelské jméno
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: spacing.md,
                                borderRadius: borderRadius.md,
                                border: `1px solid ${colors.border}`,
                                backgroundColor: colors.background,
                                fontSize: '1rem',
                                boxSizing: 'border-box'
                            }}
                            placeholder="admin"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: spacing.xl }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: spacing.xs, color: colors.text }}>
                            Heslo
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: spacing.md,
                                borderRadius: borderRadius.md,
                                border: `1px solid ${colors.border}`,
                                backgroundColor: colors.background,
                                fontSize: '1rem',
                                boxSizing: 'border-box'
                            }}
                            placeholder="••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: spacing.md,
                            backgroundColor: colors.primary,
                            color: colors.white,
                            border: 'none',
                            borderRadius: borderRadius.md,
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Přihlašování...' : 'Přihlásit se'}
                    </button>
                </form>


            </div>
        </div>
    );
};
