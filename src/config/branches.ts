export const BRANCHES = [
    { id: 'gameworld', name: 'Game World (OC Šestka)', terminals: ['entry-1', 'exit-1', 'check-1'] },
    { id: 'cyberarcade', name: 'Cyber Arcade (Bartůňkova)', terminals: ['entry-2', 'exit-2', 'check-2'] },
    { id: 'gamestation', name: 'Game Station (Plzeň)', terminals: ['entry-3', 'exit-3', 'check-3'] },
    { id: 'gameplanet', name: 'Game Planet (Olomouc)', terminals: ['entry-4', 'exit-4', 'check-4'] },
] as const;

export type BranchId = typeof BRANCHES[number]['id'];

export const getBranchName = (id?: string) => {
    const branch = BRANCHES.find(b => b.id === id);
    return branch ? branch.name : (id || 'Neznámá pobočka');
};

export const getBranchTerminals = (id: string): string[] => {
    const branch = BRANCHES.find(b => b.id === id);
    return branch ? [...branch.terminals] : [];
};
