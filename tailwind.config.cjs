const { tailwindTransform } = require('postcss-lit');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    files: ['./src/**/*.{js,ts}'],
    transform: {
      ts: tailwindTransform
    }
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary-color)',
          hover: 'var(--primary-hover)',
          muted: 'var(--primary-muted)',
        },
        danger: {
          DEFAULT: 'var(--danger-color)',
          muted: 'var(--danger-muted)',
        },
        success: {
          DEFAULT: 'var(--success-color)',
          muted: 'var(--success-muted)',
        },
        warning: {
          DEFAULT: 'var(--warning-color)',
          muted: 'var(--warning-muted)',
        },
        info: {
          DEFAULT: 'var(--info-color)',
          muted: 'var(--info-muted)',
        },
        background: 'var(--bg-color)',
        card: 'var(--card-bg)',
        input: 'var(--input-bg)',
        hover: 'var(--hover-bg)',
        active: 'var(--active-bg)',
        border: 'var(--border-color)',
        'border-hover': 'var(--border-hover)',
      },
      textColor: {
        primary: 'var(--text-color)',
        muted: 'var(--text-muted)',
        disabled: 'var(--text-disabled)',
      }
    },
  },
  plugins: [],
};
