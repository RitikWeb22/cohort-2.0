import { create } from 'zustand';

export const useQuickModalStore = create((set) => ({
  isOpen: false,
  activeTab: 'quick_project', // 'quick_project' | 'new_client' | 'new_invoice'
  openModal: (tab = 'quick_project') => set({ isOpen: true, activeTab: tab }),
  closeModal: () => set({ isOpen: false }),
}));
