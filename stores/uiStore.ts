import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme, ModalView, Toast } from '../types';

interface UIState {
  theme: Theme;
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  isMoreMenuOpen: boolean;
  modalView: ModalView | null;
  toasts: Toast[];
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setMoreMenuOpen: (isOpen: boolean) => void;
  openModal: (view: ModalView) => void;
  closeModal: () => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      isSidebarOpen: window.innerWidth > 1024,
      isSearchOpen: false,
      isMoreMenuOpen: false,
      modalView: null,
      toasts: [],

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
      setMoreMenuOpen: (isOpen) => set({ isMoreMenuOpen: isOpen }),
      openModal: (view) => set({ modalView: view }),
      closeModal: () => set({ modalView: null }),
      addToast: (message, type) => set((state) => {
         const id = Date.now();
         // Simple deduplication for toast messages
         const existingToast = state.toasts.find(t => t.message === message && t.type === type);
         if (existingToast) {
             return {
                 toasts: state.toasts.map(t => t.id === existingToast.id ? { ...t, count: (t.count || 1) + 1, id } : t)
             }
         }
         return { toasts: [...state.toasts, { id, message, type, count: 1 }] };
      }),
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'billetto-ui-storage',
      partialize: (state) => ({ theme: state.theme, isSidebarOpen: state.isSidebarOpen }), // Only persist theme and sidebar preference
    }
  )
);
