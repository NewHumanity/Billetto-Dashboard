
import { useState, useMemo } from 'react';
import { SortConfig, SortDirection } from '../types';

// Reusable hook for sorting table data
export const useSortableData = <T extends object>(items: T[], initialConfig: SortConfig<T> | null = null) => {
    const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(initialConfig);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const resolvePath = (object: any, path: string) => path.split('.').reduce((o, p) => (o && o[p] !== undefined && o[p] !== null ? o[p] : undefined), object);

                const aValue = resolvePath(a, sortConfig.key as string);
                const bValue = resolvePath(b, sortConfig.key as string);

                if (aValue === undefined) return 1;
                if (bValue === undefined) return -1;
                
                const valA = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
                const valB = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key: keyof T | string) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return { items: sortedItems, requestSort, sortConfig };
};
