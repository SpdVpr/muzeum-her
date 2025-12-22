import React, { useEffect, useState } from 'react';
import { colors } from '../../config/theme';

interface TestTicketButtonsProps {
    onScan: (code: string) => void;
    mode: 'entry' | 'check' | 'exit';
}

const TEST_TICKETS = [
    {
        name: 'Cyber Arcade (03)',
        tickets: [
            { label: '1h', code: '03041000' },
            { label: '2h', code: '03031000' },
            { label: 'Full', code: '03021000' },
            { label: 'VIP', code: '03011000' },
            { label: 'Dopr', code: '03051000' },
        ]
    },
    {
        name: 'Game World (02)',
        tickets: [
            { label: '1h', code: '02041000' },
            { label: '2h', code: '02031000' },
            { label: 'Full', code: '02021000' },
            { label: 'VIP', code: '02011000' },
            { label: '30m', code: '02051000' },
        ]
    },
    {
        name: 'Game Station (01)',
        tickets: [
            { label: '1h', code: '01041000' },
            { label: '2h', code: '01031000' },
            { label: 'Full', code: '01021000' },
            { label: 'VIP', code: '01011000' },
            { label: 'Dopr', code: '01051000' },
        ]
    }
];

export const TestTicketButtons: React.FC<TestTicketButtonsProps> = ({ onScan, mode }) => {
    const [activeTickets, setActiveTickets] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const loadTickets = () => {
            const saved = localStorage.getItem('test_active_tickets');
            if (saved) {
                try {
                    setActiveTickets(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse active tickets', e);
                }
            } else {
                setActiveTickets([]);
            }
        };

        loadTickets();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'test_active_tickets') {
                loadTickets();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleScan = (code: string) => {
        onScan(code);

        // Pokud jsme na vstupu, přidáme lístek do activeTickets
        if (mode === 'entry') {
            const newActive = [...new Set([...activeTickets, code])]; // Unikátní
            setActiveTickets(newActive);
            localStorage.setItem('test_active_tickets', JSON.stringify(newActive));
        }

        // Pokud jsme na výstupu, odebereme lístek z activeTickets (už není uvnitř)
        if (mode === 'exit') {
            const newActive = activeTickets.filter(t => t !== code);
            setActiveTickets(newActive);
            localStorage.setItem('test_active_tickets', JSON.stringify(newActive));
        }
    };

    const clearActiveTickets = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTickets([]);
        localStorage.removeItem('test_active_tickets');
    };

    // Filtrování lístků pro zobrazení
    const getVisibleTickets = () => {
        if (mode === 'entry') {
            return TEST_TICKETS;
        }

        // Pro check a exit zobrazíme jen ty, které jsou v activeTickets
        // Zachováme strukturu skupin, ale vyfiltrujeme prázdné
        return TEST_TICKETS.map(group => ({
            ...group,
            tickets: group.tickets.filter(t => activeTickets.includes(t.code))
        })).filter(group => group.tickets.length > 0);
    };

    const visibleGroups = getVisibleTickets();

    if (!mounted) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            padding: '10px',
            background: 'rgba(0,0,0,0.9)',
            borderTop: `1px solid ${colors.primary}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 1000,
            maxHeight: '30vh',
            overflowY: 'auto',
            cursor: 'auto'
        }}>
            <div style={{
                color: colors.white,
                textAlign: 'center',
                fontSize: '0.8rem',
                opacity: 0.7,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px'
            }}>
                <span>🧪 Testovací režim ({mode === 'entry' ? 'Všechny lístky' : 'Naskenované lístky'})</span>
                {mode !== 'entry' && activeTickets.length > 0 && (
                    <button
                        onClick={clearActiveTickets}
                        style={{
                            background: 'transparent',
                            border: '1px solid #666',
                            color: '#aaa',
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            cursor: 'pointer'
                        }}
                    >
                        Reset
                    </button>
                )}
            </div>

            {visibleGroups.length === 0 && mode !== 'entry' ? (
                <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                    Žádné naskenované lístky.<br />
                    <small>Naskenujte lístek na Vstupu pro zobrazení zde.</small>
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    {visibleGroups.map(group => (
                        <div key={group.name} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            minWidth: '140px'
                        }}>
                            <div style={{
                                color: colors.primary,
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                textAlign: 'center'
                            }}>
                                {group.name}
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '4px'
                            }}>
                                {group.tickets.map(ticket => (
                                    <button
                                        key={ticket.code}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleScan(ticket.code);
                                        }}
                                        style={{
                                            padding: '8px 4px',
                                            background: '#333',
                                            border: '1px solid #444',
                                            borderRadius: '4px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                            textAlign: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = colors.primary;
                                            e.currentTarget.style.borderColor = colors.primary;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#333';
                                            e.currentTarget.style.borderColor = '#444';
                                        }}
                                    >
                                        {ticket.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
