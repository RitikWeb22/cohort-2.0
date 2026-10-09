import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearToast } from '../../store/slices/uiSlice.js';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export const Toast = () => {
  const dispatch = useDispatch();
  const { toast } = useSelector((state) => state.ui);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        dispatch(clearToast());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 70,
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--sand)',
      boxShadow: 'var(--shadow-card)',
      padding: '1rem 1.4rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem',
      maxWidth: '400px',
      animation: 'fadeIn 0.2s ease-in-out',
    }}>
      {isSuccess ? (
        <CheckCircle2 size={18} color="var(--status-success)" />
      ) : (
        <AlertCircle size={18} color="var(--status-danger)" />
      )}
      <p style={{ fontSize: '0.85rem', color: 'var(--ink)', flex: 1 }}>{toast.message}</p>
      <button
        onClick={() => dispatch(clearToast())}
        style={{ color: 'var(--ink-muted)', padding: '0.2rem' }}
        aria-label="Dismiss toast"
      >
        <X size={14} />
      </button>
    </div>
  );
};
