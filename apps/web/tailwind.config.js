// AI_DECISION: Use relative path for tailwind-preset due to workspace linking issues
// Justificación: pnpm workspaces with custom exports not resolving correctly in tailwind.config.js
// Impacto: Enables Next.js to load tailwind preset correctly
const { uiPreset } = require('../../packages/ui/dist/tailwind-preset');

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
};
