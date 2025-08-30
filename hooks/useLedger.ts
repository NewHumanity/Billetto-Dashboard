

import { useState, useCallback, useEffect, useMemo } from 'react';
import { LedgerEntry } from '../types';
import { BillettoApiClient, BillettoApiError, NotModifiedError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
// Fix: Import from types.ts to break circular dependency
import { AddToastFn } from '../types';

const LEDGER_ENTRIES_PER_PAGE = 100;

export const useLedger = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
    const [loadingLedger, setLoadingLedger] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [ledgerError, setLedgerError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ currentPage: 1 });
    const [lastUpdatedLedger, setLastUpdatedLedger] = useState<Date | null>(null);

    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);
    
    const { items: sortedLedger, requestSort: requestLedgerSort, sortConfig: ledgerSortConfig } = useSortableData(allEntries, { key: 'created_at', direction: 'descending' });
    
    const paginatedLedger = useMemo(() => {
        const start = (pagination.currentPage - 1) * LEDGER_ENTRIES_PER_PAGE;
        const end = start + LEDGER_ENTRIES_PER_PAGE;
        return sortedLedger.slice(start, end);
    }, [sortedLedger, pagination.currentPage]);

    const fetchAndCacheLedger = useCallback(async (isBackgroundRefresh = false) => {
        if (!apiClient) return;

        if (isBackgroundRefresh) {
            setIsRefreshing(true);
        } else {
            setLoadingLedger(true);
        }
        setLedgerError(null);

        try {
            const response = await fetchAllPaginatedData<LedgerEntry>('/ledger_entries?expand=event', apiClient, 5, undefined, undefined, onRateLimit);
            setAllEntries(response);
            await db.setLedgerCache(response);
            setLastUpdatedLedger(new Date());
        } catch (err) {
            if (err instanceof NotModifiedError) {
                addToast('Financial records are up to date.', 'info');
                setLastUpdatedLedger(new Date());
            } else if (err instanceof BillettoApiError) {
                setLedgerError(err.message);
            } else if (err instanceof Error && err.name !== 'CancellationError') {
                setLedgerError('An unknown error occurred while fetching financial records.');
            }
        } finally {
             if (isBackgroundRefresh) {
                setIsRefreshing(false);
            } else {
                setLoadingLedger(false);
            }
        }
    }, [apiClient, onRateLimit, addToast]);

    useEffect(() => {
        const loadLedger = async () => {
             if (!apiClient) {
                setLoadingLedger(false);
                return;
            };
            const { entries: cachedEntries, lastUpdated } = await db.getLedgerCache();
            if (cachedEntries && cachedEntries.length > 0) {
                setAllEntries(cachedEntries);
                if(lastUpdated) setLastUpdatedLedger(new Date(lastUpdated));
                setLoadingLedger(false);
                fetchAndCacheLedger(true); // stale-while-revalidate
            } else {
                fetchAndCacheLedger(false); // initial full load
            }
        };
        loadLedger();
    }, [apiClient, fetchAndCacheLedger]);

    const handleLedgerPageChange = (page: number) => {
        setPagination({ currentPage: page });
    };
    
    return {
        ledgerEntries: paginatedLedger,
        fullSortedLedger: sortedLedger,
        loadingLedger,
        isRefreshingLedger: isRefreshing,
        ledgerError, 
        lastUpdatedLedger,
        refreshLedger: () => fetchAndCacheLedger(false), 
        ledgerPagination: { currentPage: pagination.currentPage, total: sortedLedger.length }, 
        handleLedgerPageChange,
        requestLedgerSort, 
        ledgerSortConfig
    };
};