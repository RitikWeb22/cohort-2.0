/**
 * Formats integer paise into INR currency display
 * Example: 480000 paise -> ₹4,800
 */
export const formatPaise = (paise) => {
  if (paise === null || paise === undefined || isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
};
