import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { siteConfig } from '../../config/site';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ background: '#FFFFFF', borderTop: '1px solid var(--line, #E8E0CF)', color: 'var(--muted, #5B6676)', padding: '64px 0 40px', fontSize: '15px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <Logo size="md" />
            <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.6', color: 'var(--muted, #5B6676)' }}>
              Never undercharge again.<br />
              <a href={`mailto:${siteConfig.supportEmail}`} style={{ color: 'var(--cobalt, #0047AB)', textDecoration: 'none' }}>
                {siteConfig.supportEmail}
              </a>
            </p>
          </div>

          <nav aria-label="Footer Navigation">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
              <li>
                <Link to="/terms" style={{ color: 'var(--muted, #5B6676)', textDecoration: 'none', fontWeight: 500 }} className="hover:text-[var(--cobalt,#0047AB)]">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" style={{ color: 'var(--muted, #5B6676)', textDecoration: 'none', fontWeight: 500 }} className="hover:text-[var(--cobalt,#0047AB)]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" style={{ color: 'var(--muted, #5B6676)', textDecoration: 'none', fontWeight: 500 }} className="hover:text-[var(--cobalt,#0047AB)]">
                  Refund &amp; Cancellation
                </Link>
              </li>
              <li>
                <Link to="/contact" style={{ color: 'var(--muted, #5B6676)', textDecoration: 'none', fontWeight: 500 }} className="hover:text-[var(--cobalt,#0047AB)]">
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div style={{ paddingTop: '24px', borderTop: '1px solid var(--line, #E8E0CF)', fontSize: '14px', color: 'var(--muted, #5B6676)' }}>
          <p>&copy; {currentYear} Floorly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
