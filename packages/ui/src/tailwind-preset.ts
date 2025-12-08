// Maat UI Tailwind Preset - Brand Design System v2.0
// Typography: Poppins (Display) + Open Sans (Body)
// Colors: Primary #5900FF (Purple), Secondary #000000 (Black), Accent #00E676
//
// AI_DECISION: Custom breakpoints for better responsive design
// Justificación: xs at 475px provides better control for small devices
// Impacto: More granular responsive control without breaking existing layouts

const uiPreset = {
  theme: {
    screens: {
      xs: '475px', // Small phones in landscape, large phones
      sm: '640px', // Tablets in portrait
      md: '768px', // Tablets in landscape
      lg: '1024px', // Small laptops
      xl: '1280px', // Desktops
      '2xl': '1536px', // Large desktops
    },
    extend: {
      colors: {
        // Primary Brand Colors (Purple - CTAs, highlights)
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          light: 'var(--color-primary-light)',
          subtle: 'var(--color-primary-subtle)',
          foreground: 'var(--color-text-inverse)',
        },
        // Secondary Brand Colors (Black - base, secondary actions)
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          light: 'var(--color-secondary-light)',
          subtle: 'var(--color-secondary-subtle)',
          foreground: 'var(--color-text-inverse)',
        },
        // Accent Colors (Green)
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          light: 'var(--color-accent-light)',
          subtle: 'var(--color-accent-subtle)',
          foreground: 'var(--color-text)',
        },
        // Status Colors
        success: {
          DEFAULT: 'var(--color-success)',
          hover: 'var(--color-success-hover)',
          subtle: 'var(--color-success-subtle)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          hover: 'var(--color-error-hover)',
          subtle: 'var(--color-error-subtle)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          hover: 'var(--color-warning-hover)',
          subtle: 'var(--color-warning-subtle)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          hover: 'var(--color-info-hover)',
          subtle: 'var(--color-info-subtle)',
        },
        // Surface Colors
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
        },
        // Border Colors
        border: {
          DEFAULT: 'var(--color-border)',
          hover: 'var(--color-border-hover)',
        },
        // Text Colors
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        // Chart Colors for Data Visualization
        chart: {
          1: 'var(--color-chart-1)',
          2: 'var(--color-chart-2)',
          3: 'var(--color-chart-3)',
          4: 'var(--color-chart-4)',
          5: 'var(--color-chart-5)',
          6: 'var(--color-chart-6)',
        },
        // Legacy shadcn-style colors for compatibility
        muted: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-text-secondary)',
        },
        destructive: {
          DEFAULT: 'var(--color-error)',
          foreground: 'var(--color-text-inverse)',
        },
        input: 'var(--color-border)',
        ring: 'var(--color-primary)', // Purple ring for focus states
        foreground: 'var(--color-text)',
        card: {
          DEFAULT: 'var(--color-background)',
          foreground: 'var(--color-text)',
        },
        popover: {
          DEFAULT: 'var(--color-background)',
          foreground: 'var(--color-text)',
        },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        primary: 'var(--shadow-primary)',
        'primary-lg': 'var(--shadow-primary-lg)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        DEFAULT: 'var(--transition-base)',
        slow: 'var(--transition-slow)',
      },
      fontFamily: {
        // Display font - Poppins for headings and titles
        display: ['var(--font-display)', 'Poppins', 'system-ui', 'sans-serif'],
        // Body font - Open Sans for body text and UI elements
        sans: ['var(--font-body)', 'Open Sans', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Open Sans', 'system-ui', 'sans-serif'],
        // Monospace font for code
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Display sizes (for headings)
        'display-2xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display-md': ['2.25rem', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'display-sm': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'display-xs': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
      animation: {
        // Fade animations
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.4s ease-out forwards',
        'fade-in-left': 'fadeInLeft 0.4s ease-out forwards',
        'fade-in-right': 'fadeInRight 0.4s ease-out forwards',
        // Scale animations
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'scale-in-bounce': 'scaleInBounce 0.4s ease-out forwards',
        'scale-in-elastic': 'scaleInElastic 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        // Slide animations
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-in-scale': 'slideInFromScale 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in-bottom': 'slideInFromBottom 0.4s ease-out forwards',
        'slide-in-top': 'slideInFromTop 0.4s ease-out forwards',
        'slide-in-left': 'slideInFromLeft 0.4s ease-out forwards',
        'slide-in-right': 'slideInFromRight 0.4s ease-out forwards',
        // Continuous animations
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'skeleton-wave': 'skeletonWave 1.8s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'purple-glow': 'purpleGlow 2s ease-in-out infinite',
        spin: 'spin 1s linear infinite',
        bounce: 'bounce 1s infinite',
        // Interactive animations
        ripple: 'ripple 0.6s ease-out',
        'subtle-pop': 'subtlePop 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        shake: 'shake 0.5s ease-in-out',
        expand: 'expandFromCenter 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        // Page transitions
        'page-enter': 'fadeInUp 0.4s ease-out forwards',
        'reveal-up': 'revealUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleInBounce: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleInElastic: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.05)' },
          '75%': { transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInFromScale: {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideInFromBottom: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInFromTop: {
          '0%': { opacity: '0', transform: 'translateY(-100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInFromLeft: {
          '0%': { opacity: '0', transform: 'translateX(-100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInFromRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        skeletonWave: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        subtlePop: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        expandFromCenter: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        revealUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounce: {
          '0%, 100%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
          '50%': {
            transform: 'translateY(-10%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        purpleGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(89, 0, 255, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(89, 0, 255, 0.5)' },
        },
      },
    },
  },
};

// AI_DECISION: Export both named and default for ESM/CommonJS compatibility
// Justificación: Next.js tailwind.config.js requires CommonJS compatibility
// Impacto: Enables both import and require() to work correctly

export { uiPreset };
export default uiPreset;
