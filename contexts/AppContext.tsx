import React from 'react';
import { useEvents } from '../hooks/useEvents';
import { useOrders } from '../hooks/useOrders';
import { useLedger } from '../hooks/useLedger';
import { useCampaigns } from '../hooks/useCampaigns';
import { useTargetGroups } from '../hooks/useTargetGroups';
import { useAttendees } from '../hooks/useAttendees';
import { useAudience } from '../hooks/useAudience';
import { BillettoApiClient } from '../services/billettoService';
import { Theme, View } from '../App';

// Combine the return types of all hooks into one giant context type
export type AppContextType = 
    ReturnType<typeof useEvents> &
    ReturnType<typeof useOrders> &
    ReturnType<typeof useLedger> &
    ReturnType<typeof useCampaigns> &
    ReturnType<typeof useTargetGroups> &
    ReturnType<typeof useAttendees> &
    ReturnType<typeof useAudience> &
    {
        theme: Theme;
        apiClient: BillettoApiClient | null;
        setOrderDetailsModalId: (id: string | null) => void;
        setAttendeeDetailsModalId: (id: string | null) => void;
        setCampaignDetailsModalId: (id: string | null) => void;
        setCustomerDetailsModalId: (id: string | null) => void;
        navigateTo: (view: View, itemId?: string) => void;
    };

export const AppContext = React.createContext<AppContextType | null>(null);