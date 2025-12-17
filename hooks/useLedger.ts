
import { useState, useCallback, useMemo } from 'react';
import { LedgerEntry } from '../types';
import { BillettoApiClient } from '../services/billettoService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { AddToastFn } from '../types';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { LedgerEntrySchema } from '../schemas';

const LEDGER_ENTRIES_PER_PAGE = 100;

export const useLedger = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const [pagination, setPagination] = useState({ currentPage: 1 });

    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);
    
    const {
        data: allEntries = [],
        isPending: loadingLedger,
        isFetching: isRefreshingLedger,
        error: ledgerErrorObject,
        dataUpdatedAt: lastUpdatedLedgerTimestamp,
        refetch: refreshLedger
    } = useQuery({
        queryKey: ['ledger'],
        queryFn: async () => {
            if (!apiClient) return [];
            return await fetchAllPaginatedData<LedgerEntry>('/ledger_entries?expand=event', apiClient, 5, undefined, undefined, onRateLimit, LedgerEntrySchema);
        },
        enabled: !!apiClient,
        staleTime: 1000 * 60 * 5,
        placeholderData: keepPreviousData,
    });

    const ledgerError = ledgerErrorObject instanceof Error ? ledgerErrorObject.message : null;
    const lastUpdatedLedger = lastUpdatedLedgerTimestamp ? new Date(lastUpdatedLedgerTimestamp) : null;

    const { items: sortedLedger, requestSort: requestLedgerSort, sortConfig: ledgerSortConfig } = useSortableData<LedgerEntry>(allEntries, { key: 'created_at', direction: 'descending' });
    
    const paginatedLedger = useMemo(() => {
        const start = (pagination.currentPage - 1) * LEDGER_ENTRIES_PER_PAGE;
        const end = start + LEDGER_ENTRIES_PER_PAGE;
        return sortedLedger.slice(start, end);
    }, [sortedLedger, pagination.currentPage]);

    const handleLedgerPageChange = (page: number) => {
        setPagination({ currentPage: page });
    };
    
    return {
        ledgerEntries: paginatedLedger,
        fullSortedLedger: sortedLedger,
        loadingLedger,
        isRefreshingLedger,
        ledgerError, 
        lastUpdatedLedger,
        refreshLedger,
        ledgerPagination: { currentPage: pagination.currentPage, total: sortedLedger.length }, 
        handleLedgerPageChange,
        requestLedgerSort, 
        ledgerSortConfig
    };
};