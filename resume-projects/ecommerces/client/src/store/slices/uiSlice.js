import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isCartDrawerOpen: false,
  isAuthModalOpen: false,
  authModalMode: 'login', // 'login' | 'register'
  toast: null, // { message, type: 'success' | 'error' | 'info' }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleCartDrawer: (state) => {
      state.isCartDrawerOpen = !state.isCartDrawerOpen;
    },
    setCartDrawerOpen: (state, action) => {
      state.isCartDrawerOpen = action.payload;
    },
    openAuthModal: (state, action) => {
      state.isAuthModalOpen = true;
      state.authModalMode = action.payload || 'login';
    },
    closeAuthModal: (state) => {
      state.isAuthModalOpen = false;
    },
    setToast: (state, action) => {
      state.toast = action.payload;
    },
    clearToast: (state) => {
      state.toast = null;
    },
  },
});

export const {
  toggleCartDrawer,
  setCartDrawerOpen,
  openAuthModal,
  closeAuthModal,
  setToast,
  clearToast,
} = uiSlice.actions;

export default uiSlice.reducer;
