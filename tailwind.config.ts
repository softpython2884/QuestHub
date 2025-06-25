
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['"Source Code Pro"', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-in-out',
      },
      typography: ({ theme }: { theme: any }) => ({
        DEFAULT: { // Light theme prose (dark text)
          css: {
            '--tw-prose-body': 'hsl(224 71.4% 4.1%)',
            '--tw-prose-headings': 'hsl(224 71.4% 4.1%)',
            '--tw-prose-lead': 'hsl(215.4 16.3% 46.9%)',
            '--tw-prose-links': 'hsl(221.2 83.2% 53.3%)',
            '--tw-prose-bold': 'hsl(224 71.4% 4.1%)',
            '--tw-prose-counters': 'hsl(215.4 16.3% 46.9%)',
            '--tw-prose-bullets': 'hsl(215.4 16.3% 46.9%)',
            '--tw-prose-hr': 'hsl(215 27.9% 90%)',
            '--tw-prose-quotes': 'hsl(224 71.4% 4.1%)',
            '--tw-prose-quote-borders': 'hsl(215 27.9% 90%)',
            '--tw-prose-captions': 'hsl(215.4 16.3% 46.9%)',
            '--tw-prose-code': 'hsl(224 71.4% 4.1%)',
            '--tw-prose-pre-code': 'hsl(224 71.4% 4.1%)',
            '--tw-prose-pre-bg': 'hsl(215 27.9% 95.3%)',
            '--tw-prose-th-borders': 'hsl(215 27.9% 90%)',
            '--tw-prose-td-borders': 'hsl(215 27.9% 90%)',
             // Ensure list items in prose have some space
            'ul > li::before': { backgroundColor: 'hsl(215.4 16.3% 46.9%)' },
            'ol > li::before': { color: 'hsl(215.4 16.3% 46.9%)' },
            'li': { marginTop: theme('spacing.1'), marginBottom: theme('spacing.1') },
             // Style for task list items
            '.task-list-item': { display: 'flex', alignItems: 'center' },
            '.task-list-item-checkbox': { marginRight: theme('spacing.2') },
          },
        },
        invert: { // Dark theme prose (light text)
          css: {
            '--tw-prose-body': 'hsl(210 20% 98%)',
            '--tw-prose-headings': 'hsl(210 20% 98%)',
            '--tw-prose-lead': 'hsl(217.9 10.6% 64.9%)',
            '--tw-prose-links': 'hsl(210 20% 98%)',
            '--tw-prose-bold': 'hsl(210 20% 98%)',
            '--tw-prose-code': 'hsl(210 20% 98%)',
            '--tw-prose-pre-code': 'hsl(210 20% 98%)',
            '--tw-prose-pre-bg': 'hsl(215 27.9% 16.9% / 0.7)',
            'ul > li::before': { backgroundColor: 'hsl(217.9 10.6% 64.9%)' },
            'ol > li::before': { color: 'hsl(217.9 10.6% 64.9%)' },
            'li': { marginTop: theme('spacing.1'), marginBottom: theme('spacing.1') },
          },
        },
      }),
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography')
  ],
} satisfies Config;
