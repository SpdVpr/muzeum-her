import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded users configuration
// In production, this should be in a database
// Hardcoded users configuration
// In production, this should be in a database
const USERS: Record<string, User & { password: string }> = {
    'admin': {
        id: 'u1',
        username: 'admin',
        role: 'ADMIN',
        password: import.meta.env.VITE_PWD_ADMIN || 'admin',
        branchName: 'Centrála'
    },
    'gameworld': {
        id: 'u2',
        username: 'gameworld',
        role: 'BRANCH',
        branchId: 'gameworld',
        branchName: 'Game World (OC Šestka)',
        password: import.meta.env.VITE_PWD_GAMEWORLD || 'gw',
    },
    'cyberarcade': {
        id: 'u3',
        username: 'cyberarcade',
        role: 'BRANCH',
        branchId: 'cyberarcade',
        branchName: 'Cyber Arcade (Bartůňkova)',
        password: import.meta.env.VITE_PWD_CYBERARCADE || 'ca',
    },
    'gamestation': {
        id: 'u4',
        username: 'gamestation',
        role: 'BRANCH',
        branchId: 'gamestation',
        branchName: 'Game Station (Plzeň)',
        password: import.meta.env.VITE_PWD_GAMESTATION || 'gs',
    },
    'gameplanet': {
        id: 'u5',
        username: 'gameplanet',
        role: 'BRANCH',
        branchId: 'gameplanet',
        branchName: 'Game Planet (Olomouc)',
        password: import.meta.env.VITE_PWD_GAMEPLANET || 'gp',
    }
};

// Map branches to terminals
// This helps filtering stats
export const BRANCH_TERMINALS: Record<string, string[]> = {
    'gameworld': ['entry-1', 'exit-1', 'check-1'],
    'cyberarcade': ['entry-2', 'exit-2', 'check-2'],
    'gamestation': ['entry-3', 'exit-3', 'check-3'],
    'gameplanet': [], // Brzy otevřeme
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check localStorage for persisted session
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user from local storage", e);
                localStorage.removeItem('auth_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        // Simple mock login
        const foundUser = Object.values(USERS).find(u => u.username === username && u.password === password);
        if (foundUser) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...safeUser } = foundUser;
            setUser(safeUser);
            localStorage.setItem('auth_user', JSON.stringify(safeUser));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('auth_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
