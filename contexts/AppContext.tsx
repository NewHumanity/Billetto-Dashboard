import React from 'react';
import { useEvents } from '../hooks/useEvents';
import { useOrders } from '../hooks/useOrders';
import { useLedger } from '../hooks/useLedger';
import { useCampaigns } from '../hooks/useCampaigns';
import { useTargetGroups } from '../hooks/useTargetGroups';
import { useAttendees } from '../hooks/useAttendees';
import { useAudience } from '../hooks/useAudience';
import { usePerformance } from '../hooks/usePerformance';
import { BillettoApiClient } from '../services/billettoService';
import { Theme, View } from '../App';
import { ModalView, Toast, BackgroundTask } from '../types';

// Combine the return types of all hooks into one giant context type
export type AppContextType = 
    ReturnType<typeof useEvents> &
    ReturnType<typeof useOrders> &
    ReturnType<typeof useLedger> &
    ReturnType<typeof useCampaigns> &
    ReturnType<typeof useTargetGroups> &
    ReturnType<typeof useAttendees> &
    ReturnType<typeof useAudience> &
    ReturnType<typeof usePerformance> &
    {
        theme: Theme;
        apiClient: BillettoApiClient | null;
        setModalView: (view: ModalView | null) => void;
        navigateTo: (view: View, itemId?: string) => void;
        toasts: Toast[];
        addToast: (message: string, type: Toast['type']) => void;
        backgroundTasks: BackgroundTask[];
        runTaskInBackground: <T>(
            id: string,
            name: string,
            taskFn: (updateProgress: (progress: { value: number; message: string }) => void) => Promise<T>,
            onSuccess?: (result: T) => void
        ) => void;
    };

export const AppContext = React.createContext<AppContextType | null>(null);