import { create } from 'zustand';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/currency';

const INITIAL_CURRENCY = localStorage.getItem('floorly_currency') || 'USD';

export const useCurrencyStore = create((set, get) => ({
  currency: INITIAL_CURRENCY,

  setCurrency: async (newCurrency, syncWithServer = true) => {
    const code = (newCurrency || 'USD').toUpperCase();
    localStorage.setItem('floorly_currency', code);
    set({ currency: code });

    if (syncWithServer) {
      try {
        await api.updateProfile({ currency: code });
      } catch (err) {
        // Silently tolerate server sync error on initial guest mode
      }
    }
  },

  // Helper formatting function bound to active currency
  format: (amount, options = {}) => {
    return formatCurrency(amount, get().currency, options);
  },

  formatDate: (date, options = {}) => {
    return formatDate(date, options);
  },
}));
