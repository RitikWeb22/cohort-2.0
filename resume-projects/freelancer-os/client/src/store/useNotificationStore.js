import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  toasts: [],
  confirmModal: {
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDestructive: false,
    onConfirm: null,
  },

  showToast: ({ type = 'info', title = '', message = '', duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast = { id, type, title, message };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  showConfirm: ({
    title = 'Are you sure?',
    message = 'Please confirm this action.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    onConfirm = () => {},
  }) => {
    set({
      confirmModal: {
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        isDestructive,
        onConfirm,
      },
    });
  },

  closeConfirm: () => {
    set((state) => ({
      confirmModal: {
        ...state.confirmModal,
        isOpen: false,
        onConfirm: null,
      },
    }));
  },
}));
