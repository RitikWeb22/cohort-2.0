import React from 'react';
import { Sparkles } from 'lucide-react';

export const AnnouncementBar = () => {
  return (
    <aside
      aria-label="Store Notice"
      style={{
        backgroundColor: 'var(--ink)',
        color: 'var(--bg)',
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '0.55rem 1rem',
        textAlign: 'center',
        fontWeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <Sparkles size={12} color="var(--accent)" />
      <span>Free shipping across India on orders above ₹2,000</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span style={{ color: 'var(--accent)', fontWeight: 500 }}>100% Pure Natural Fabrics</span>
    </aside>
  );
};
