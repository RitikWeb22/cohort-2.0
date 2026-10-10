/**
 * Client Site Configuration
 * Canonical domain & contact details driven by Vite environment variables
 */

export const siteConfig = {
  siteUrl: import.meta.env.VITE_SITE_URL || window.location.origin,
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@floorly.com',
  privacyEmail: import.meta.env.VITE_PRIVACY_EMAIL || import.meta.env.VITE_SUPPORT_EMAIL || 'privacy@floorly.com',
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || import.meta.env.VITE_SUPPORT_EMAIL || 'support@floorly.com',
  contactPhone: import.meta.env.VITE_CONTACT_PHONE || '',
  contactAddress: import.meta.env.VITE_CONTACT_ADDRESS || '',
};
