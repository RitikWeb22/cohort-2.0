import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowRight, Feather, ShieldCheck, RefreshCw, Truck } from 'lucide-react';
import { setToast } from '../../store/slices/uiSlice.js';

export const Footer = () => {
  const dispatch = useDispatch();
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      dispatch(
        setToast({
          message: 'Thank you for subscribing to the KORA Gazette.',
          type: 'success',
        })
      );
      setNewsletterEmail('');
    }
  };

  return (
    <footer
      style={{
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--sand)',
        marginTop: 'auto',
        color: 'var(--ink)',
      }}
    >
      {/* 1. Value Proposition Banner */}
      <div
        style={{
          borderBottom: '1px solid var(--sand-light)',
          backgroundColor: 'var(--bg)',
          padding: '2.5rem 0',
        }}
      >
        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Feather size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                100% Pure Natural Fibres
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', margin: 0, marginTop: '0.2rem' }}>
                Pure flax linen, wild silk & organic cotton
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Truck size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Expedited Dispatch
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', margin: 0, marginTop: '0.2rem' }}>
                Handcrafted & shipped safely across India
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <RefreshCw size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                7-Day Easy Exchanges
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', margin: 0, marginTop: '0.2rem' }}>
                Seamless doorstep pickup & size swaps
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ShieldCheck size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Encrypted Checkout
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', margin: 0, marginTop: '0.2rem' }}>
                Instant UPI, Cards & verified payment options
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Gazette Newsletter Bar */}
      <div
        style={{
          borderBottom: '1px solid var(--sand-light)',
          padding: '3rem 0',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2rem',
          }}
        >
          <div style={{ maxWidth: '520px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              The KORA Gazette
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.8rem',
                margin: '0.3rem 0 0.4rem 0',
                color: 'var(--ink)',
              }}
            >
              Private Capsule Previews & Textile Stories
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', margin: 0 }}>
              Subscribe to receive curated releases, slow-fashion essays, and private client invitations.
            </p>
          </div>

          <form
            onSubmit={handleNewsletterSubmit}
            style={{
              display: 'flex',
              gap: '0.5rem',
              width: '100%',
              maxWidth: '420px',
            }}
          >
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="input-field"
              style={{ flex: 1, backgroundColor: 'var(--bg)' }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.7rem 1.4rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              Subscribe <ArrowRight size={14} style={{ marginLeft: '0.3rem' }} />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Main Multi-Column Directory */}
      <div style={{ padding: '4.5rem 0 3.5rem 0' }}>
        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
          }}
        >
          {/* Brand Bio */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link
              to="/"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2rem',
                letterSpacing: '0.2em',
                color: 'var(--ink)',
                textTransform: 'uppercase',
                display: 'inline-block',
                marginBottom: '0.8rem',
                textDecoration: 'none',
              }}
            >
              KORA
            </Link>
            <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', lineHeight: '1.7', marginBottom: '1.2rem' }}>
              A luxury conscious clothing label devoted to pure Belgian flax linen, handspun mulmul, and wild mulberry silk. Thoughtfully tailored for quiet poise and everyday ease.
            </p>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.3rem 0.6rem',
                border: '1px solid var(--sand)',
                backgroundColor: 'var(--bg)',
                color: 'var(--ink-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'inline-block',
              }}
            >
              Zero Synthetic Blends
            </span>
          </div>

          {/* Departments */}
          <div>
            <h4
              style={{
                fontSize: '0.8rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: '1.2rem',
                color: 'var(--ink)',
              }}
            >
              Shop Collections
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem' }}>
              <Link to="/catalog?category=men" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
                Menswear
              </Link>
              <Link to="/catalog?category=women" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
                Womenswear
              </Link>
              <Link to="/catalog?category=collections" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
                Signature Collections
              </Link>
              <Link to="/catalog" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
                Shop All Pieces
              </Link>
              <Link to="/catalog?sort=newest" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
                New Arrivals
              </Link>
            </div>
          </div>

          {/* Client Experience */}
          <div>
            <h4
              style={{
                fontSize: '0.8rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: '1.2rem',
                color: 'var(--ink)',
              }}
            >
              Client Care
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem' }}>
              <Link to="/orders" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
                Track Your Orders
              </Link>
              <Link to="/profile" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
                My Profile & Addresses
              </Link>
              <Link to="/checkout" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
                Express Checkout
              </Link>
              <span style={{ color: 'var(--ink-subtle)', cursor: 'default' }}>
                Size & Measurement Guide
              </span>
              <span style={{ color: 'var(--ink-subtle)', cursor: 'default' }}>
                Natural Textile Care
              </span>
            </div>
          </div>

          {/* Atelier Contact */}
          <div>
            <h4
              style={{
                fontSize: '0.8rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: '1.2rem',
                color: 'var(--ink)',
              }}
            >
              Atelier & Studio
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem', color: 'var(--ink-muted)', lineHeight: '1.6' }}>
              <p style={{ margin: 0 }}>
                <strong>Client Desk:</strong>
                <br />
                care@kora.in
              </p>
              <p style={{ margin: 0 }}>
                <strong>Studio Hours:</strong>
                <br />
                Mon – Sat: 10:00 AM – 7:00 PM IST
              </p>
              <p style={{ margin: 0 }}>
                <strong>Flagships:</strong>
                <br />
                Mumbai · New Delhi · Kolkata · Bengaluru
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Legal & Copyright Bar */}
      <div
        style={{
          borderTop: '1px solid var(--sand-light)',
          backgroundColor: 'var(--bg)',
          padding: '1.8rem 0',
          fontSize: '0.78rem',
          color: 'var(--ink-subtle)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} KORA. All rights reserved. Thoughtfully crafted in India.
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Ethical Sourcing Statement</span>
            <span>Worldwide Shipping</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
