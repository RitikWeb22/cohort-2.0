import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Base English translations
const resources = {
  en: {
    translation: {
      brand: {
        name: 'Floorly',
        tagline: 'Never undercharge again',
      },
      nav: {
        dashboard: 'Dashboard',
        analyzer: 'AI Requirement Analyzer',
        proposals: 'Proposals & Quotations',
        clients: 'Clients',
        projects: 'Projects',
        invoices: 'Invoices & Payments',
        expenses: 'Expenses & Profit',
        pricing: 'Pricing Rules',
        settings: 'Settings',
        upgrade: 'Upgrade Plan',
      },
      pricing: {
        starter: 'Starter',
        solo: 'Solo',
        pro: 'Pro',
        agency: 'Agency',
      },
      common: {
        save: 'Save Changes',
        cancel: 'Cancel',
        create: 'Create',
        delete: 'Delete',
        edit: 'Edit',
        loading: 'Loading...',
        currency: 'Currency',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes XSS
    },
  });

export default i18n;
