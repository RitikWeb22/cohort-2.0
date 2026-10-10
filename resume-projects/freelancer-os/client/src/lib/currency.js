export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', rateAgainstUSD: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', rateAgainstUSD: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', rateAgainstUSD: 0.78 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', rateAgainstUSD: 83.5 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', rateAgainstUSD: 1.52 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', rateAgainstUSD: 1.36 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'en-AE', rateAgainstUSD: 3.67 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', rateAgainstUSD: 1.34 },
];

export const CURRENCY_MAP = SUPPORTED_CURRENCIES.reduce((acc, curr) => {
  acc[curr.code] = curr;
  return acc;
}, {});

/**
 * Format any numerical value using Intl.NumberFormat according to the currency and user locale.
 */
export function formatCurrency(amount, currencyCode = 'USD', options = {}) {
  const num = Number(amount) || 0;
  const code = (currencyCode || 'USD').toUpperCase();
  const config = CURRENCY_MAP[code] || { locale: 'en-US' };
  const locale = options.locale || config.locale || 'en-US';

  const defaultDecimals = num % 1 === 0 ? 0 : 2;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: options.maximumFractionDigits !== undefined ? options.maximumFractionDigits : defaultDecimals,
      minimumFractionDigits: options.minimumFractionDigits !== undefined ? options.minimumFractionDigits : 0,
      ...options,
    }).format(num);
  } catch (err) {
    return `${code} ${num.toLocaleString()}`;
  }
}

/**
 * Format date respecting the user's browser locale.
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(d);
}

/**
 * Convert value between currencies using realistic clean conversion ratios
 */
export function convertCurrency(amount, fromCode = 'USD', toCode = 'USD') {
  const num = Number(amount) || 0;
  if (fromCode === toCode) return num;

  const fromRate = CURRENCY_MAP[fromCode]?.rateAgainstUSD || 1.0;
  const toRate = CURRENCY_MAP[toCode]?.rateAgainstUSD || 1.0;

  // Convert to USD first, then to target
  const inUSD = num / fromRate;
  const converted = inUSD * toRate;

  // Clean rounding
  if (converted > 100) {
    return Math.round(converted / 50) * 50;
  }
  return Math.round(converted);
}
