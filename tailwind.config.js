/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'vercel': {
          'black': '#000000',
          'dark': '#111111',
          'darker': '#0D0D0D',
          'card': '#1C1C1C',
          'primary': '#FFFFFF',
          'text': '#FFFFFF',
          'text-secondary': '#888888',
          'border': '#333333',
          'button': '#FFFFFF',
          'button-hover': '#000000',
          'button-text': '#000000',
          'button-text-hover': '#FFFFFF',
          'link': '#FFFFFF',
          'link-hover': '#888888',
          'error': '#FF4444',
          'success': '#0DFF00',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}
