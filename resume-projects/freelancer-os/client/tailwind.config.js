/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vanilla Cream Canvas (#FAF6EE)
        background: '#FAF6EE',
        surface: '#FFFFFF',
        'surface-subtle': '#F5EFE4',
        'surface-muted': '#EFE7D8',
        'surface-warm': '#FAF6EE',

        // Refined Warm Espresso & Sand Neutrals
        charcoal: {
          50: '#FAF6EE',
          100: '#F5EFE4',
          200: '#E8DEC8', // Soft warm vanilla border
          300: '#D5C7AA',
          400: '#A79777',
          500: '#7A6E55',
          600: '#524936',
          700: '#3D3525',
          800: '#262015',
          900: '#18130B', // Crisp deep text
          950: '#0D0A05',
        },

        // Royal Plum (#593C8F) - Primary Hero Brand
        brand: {
          50: '#F4F0FA',
          100: '#E9E1F5',
          200: '#D3C3EB',
          300: '#BCA5E1',
          400: '#8E6BC9',
          500: '#6E4CB8',
          600: '#593C8F', // Exact Royal Plum
          700: '#483075',
          800: '#38255B',
          900: '#291B42',
          950: '#1B122C',
        },

        // Mint Mist (#A8D5BA) - Secondary Fresh Accent
        mint: {
          50: '#F2F9F5',
          100: '#E3F3EA',
          200: '#CDE9D7',
          300: '#B8DFC7',
          400: '#A8D5BA', // Exact Mint Mist
          500: '#7EB994',
          600: '#5A9973',
          700: '#417855',
          800: '#2E583E',
          900: '#1E3A29',
        },

        // Complementary Accent
        sun: {
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(28, 25, 23, 0.03)',
        card: '0 1px 3px 0 rgba(28, 25, 23, 0.04), 0 1px 2px -1px rgba(28, 25, 23, 0.04)',
        elevated: '0 4px 8px -2px rgba(28, 25, 23, 0.06), 0 2px 4px -2px rgba(28, 25, 23, 0.03)',
        modal: '0 20px 25px -5px rgba(28, 25, 23, 0.1), 0 8px 10px -6px rgba(28, 25, 23, 0.08)',
      },
    },
  },
  plugins: [],
}
