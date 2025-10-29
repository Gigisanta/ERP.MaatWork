const { uiPreset } = require('@cactus/ui/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [uiPreset],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Include UI package so Tailwind sees classes used inside DS components
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/dist/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [],
}
