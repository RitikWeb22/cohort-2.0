/**
 * Settings configuration, country defaults, and validation helpers
 */

export const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States', currency: 'USD', taxLabel: 'Sales tax', taxIdLabel: 'EIN', defaultRate: 0, paperSize: 'Letter', routingLabel: 'Routing number' },
  { code: 'IN', name: 'India', currency: 'INR', taxLabel: 'GST', taxIdLabel: 'GSTIN', defaultRate: 18, paperSize: 'A4', routingLabel: 'IFSC code' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', taxLabel: 'VAT', taxIdLabel: 'VAT number', defaultRate: 20, paperSize: 'A4', routingLabel: 'Sort code' },
  { code: 'CA', name: 'Canada', currency: 'CAD', taxLabel: 'GST/HST', taxIdLabel: 'Business number', defaultRate: 5, paperSize: 'Letter', routingLabel: 'Transit number' },
  { code: 'AU', name: 'Australia', currency: 'AUD', taxLabel: 'GST', taxIdLabel: 'ABN', defaultRate: 10, paperSize: 'A4', routingLabel: 'BSB code' },
  { code: 'DE', name: 'Germany', currency: 'EUR', taxLabel: 'VAT', taxIdLabel: 'USt-IdNr', defaultRate: 19, paperSize: 'A4', routingLabel: 'BIC' },
  { code: 'FR', name: 'France', currency: 'EUR', taxLabel: 'VAT', taxIdLabel: 'Numéro de TVA', defaultRate: 20, paperSize: 'A4', routingLabel: 'BIC' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', taxLabel: 'VAT', taxIdLabel: 'TRN', defaultRate: 5, paperSize: 'A4', routingLabel: 'SWIFT/BIC' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', taxLabel: 'VAT', taxIdLabel: 'VAT account number', defaultRate: 15, paperSize: 'A4', routingLabel: 'SWIFT/BIC' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', taxLabel: 'GST', taxIdLabel: 'GST number', defaultRate: 9, paperSize: 'A4', routingLabel: 'Bank code' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', taxLabel: 'GST', taxIdLabel: 'GST number', defaultRate: 15, paperSize: 'A4', routingLabel: 'Bank code' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', taxLabel: 'VAT', taxIdLabel: 'VAT number', defaultRate: 23, paperSize: 'A4', routingLabel: 'BIC' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', taxLabel: 'VAT', taxIdLabel: 'Btw-identificatienummer', defaultRate: 21, paperSize: 'A4', routingLabel: 'BIC' },
  { code: 'OTHER', name: 'Other country', currency: 'USD', taxLabel: 'Tax', taxIdLabel: 'Tax ID', defaultRate: 0, paperSize: 'A4', routingLabel: 'Routing code' },
];

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const SECTIONS = [
  { id: 'business', label: 'Business', description: 'Studio identity, address & logos' },
  { id: 'taxes', label: 'Taxes', description: 'Rates, tax IDs & reverse charge' },
  { id: 'payments', label: 'Payments', description: 'Bank, PayPal, online links & UPI' },
  { id: 'documents', label: 'Documents', description: 'Prefixes, payment terms & notes' },
  { id: 'notifications', label: 'Notifications', description: 'Email alerts & invoice reminders' },
  { id: 'regional', label: 'Regional', description: 'Currency, timezone & formats' },
  { id: 'plan-and-billing', label: 'Plan and billing', description: 'Subscription tier & limits' },
  { id: 'data-and-privacy', label: 'Data and privacy', description: 'Demo data, export & deletion' },
  { id: 'account', label: 'Account', description: 'Password, email & security' },
];

/**
 * Validate an IBAN using checksum mod-97
 */
export function validateIBAN(iban) {
  if (!iban) return { valid: false, error: 'IBAN is required' };
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) {
    return { valid: false, error: 'IBAN must be between 15 and 34 characters' };
  }
  // Check alphanumeric
  if (!/^[A-Z0-9]+$/.test(clean)) {
    return { valid: false, error: 'IBAN contains invalid characters' };
  }
  // Rearrange: move first 4 chars to end
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  // Replace letters with digits: A=10, B=11 ... Z=35
  let digits = '';
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      digits += (code - 55).toString();
    } else {
      digits += rearranged[i];
    }
  }
  // Mod-97 on large numbers
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    const chunk = remainder + digits.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  if (remainder !== 1) {
    return { valid: false, error: 'Invalid IBAN checksum' };
  }
  return { valid: true };
}

/**
 * Validate SWIFT / BIC format (8 or 11 characters)
 */
export function validateSWIFT(swift) {
  if (!swift) return { valid: true }; // optional if not provided
  const clean = swift.replace(/\s+/g, '').toUpperCase();
  const regex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  if (!regex.test(clean)) {
    return { valid: false, error: 'SWIFT/BIC must be 8 or 11 alphanumeric characters (e.g. CHASUS33)' };
  }
  return { valid: true };
}

/**
 * Validate UPI ID (name@bank)
 */
export function validateUPI(upi) {
  if (!upi) return { valid: false, error: 'UPI ID is required' };
  const clean = upi.trim();
  const regex = /^[\w.-]+@[\w.-]+$/;
  if (!regex.test(clean)) {
    return { valid: false, error: 'Invalid UPI ID format (e.g. name@bank or 9876543210@paytm)' };
  }
  return { valid: true };
}

/**
 * Validate GSTIN (India) format: 15 characters
 */
export function validateGSTIN(gstin) {
  if (!gstin) return { valid: true };
  const clean = gstin.trim().toUpperCase();
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (clean.length !== 15 || !regex.test(clean)) {
    return { valid: false, warning: 'Standard GSTIN is 15 alphanumeric characters (e.g. 29ABCDE1234F1Z5)' };
  }
  return { valid: true };
}

/**
 * Validate Phone Number (digits, country code aware)
 */
export function validatePhone(phone) {
  if (!phone) return { valid: false, error: 'Phone number is required' };
  const clean = phone.trim();
  if (clean.length < 7) {
    return { valid: false, error: 'Phone number must have at least 7 digits' };
  }
  if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/.test(clean)) {
    return { valid: false, error: 'Please enter a valid phone number (e.g. +1 555-0199 or +91 98765 43210)' };
  }
  return { valid: true };
}

/**
 * Validate URL
 */
export function validateUrl(url) {
  if (!url) return { valid: true };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must start with http:// or https://' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid web URL' };
  }
}

/**
 * Mask sensitive account number to ****XXXX
 */
export function maskAccountNumber(num) {
  if (!num) return '';
  const clean = String(num).replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  return `****${clean.slice(-4)}`;
}
