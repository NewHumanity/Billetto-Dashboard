
import { useState, useCallback, useEffect } from 'react';
import { LedgerEntry } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';

const LEDGER_ENTRIES_PER_PAGE = 25;

export const useLedger = (apiClient: BillettoApiClient | null) => {
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [loadingLedger, setLoadingLedger] = useState<boolean>(false);
    const [ledgerError, setLedgerError] = useState<string | null>(null);
    const [ledgerPagination, setLedgerPagination] = useState({ currentPage: 1, total: 0 });
    const [lastUpdatedLedger, setLastUpdatedLedger] = useState<Date | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    const { items: sortedLedger, requestSort: requestLedgerSort, sortConfig: ledgerSortConfig } = useSortableData(ledgerEntries, { key: 'created_at', direction: 'descending' });

    const fetchAndCacheLedger = useCallback(async (page = 1) => {
        if (!apiClient) return;
        setLoadingLedger(true);
        setLedgerError(null);
        try {
            const response = await apiClient.getLedgerEntries(page, LEDGER_ENTRIES_PER_PAGE, ['event']);
            setLedgerEntries(response.data);
            setLedgerPagination({ currentPage: page, total: response.total });
            await db.setLedgerCache(page, response);
            const { lastUpdated } = await db.getLedgerCache(page);
            if (lastUpdated) setLastUpdatedLedger(new Date(lastUpdated));
        } catch (err) {
            if (err instanceof BillettoApiError) setLedgerError(err.message);
            else setLedgerError('An unknown error occurred while fetching financial records.');
        } finally {
            setLoadingLedger(false);
        }
    }, [apiClient]);

    useEffect(() => {
        const loadCachedLedger = async () => {
            const { ledgerData: cachedLedger, lastUpdated: luLedger } = await db.getLedgerCache(1);
            if (cachedLedger) {
                setLedgerEntries(cachedLedger.data);
                setLedgerPagination({ currentPage: 1, total: cachedLedger.total });
                if(luLedger) setLastUpdatedLedger(new Date(luLedger));
            } else {
                fetchAndCacheLedger(1);
            }
        };
        if (apiClient) {
            loadCachedLedger();
        }
    }, [apiClient, fetchAndCacheLedger]);

    const handleLedgerPageChange = async (page: number) => {
        setLedgerPagination(prev => ({ ...prev, currentPage: page }));
        const { ledgerData } = await db.getLedgerCache(page);
        if (ledgerData) {
            setLedgerEntries(ledgerData.data);
            setLedgerPagination({ currentPage: page, total: ledgerData.total });
        } else {
            fetchAndCacheLedger(page);
        }
    };
    
    return {
        sortedLedger, loadingLedger, ledgerError, lastUpdatedLedger,
        fetchAndCacheLedger, ledgerPagination, handleLedgerPageChange,
        selectedOrderId, setSelectedOrderId,
        requestLedgerSort, ledgerSortConfig
    };
};
