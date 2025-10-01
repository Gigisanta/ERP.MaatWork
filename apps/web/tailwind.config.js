/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // Nueva Paleta Cactus Dashboard - Colores Primarios
        cactus: {
          50: '#F0FFF6',
          100: '#DFFBEA',
          200: '#C8F6DC',
          300: '#A6EDC8',
          400: '#7FE5B0',
          500: '#55DFA0', // Color principal de marca
          600: '#2CCB86',
          700: '#16B273',
          800: '#0E8E5B',
          900: '#0C7048',
          950: '#0A5A3A'
        },
        
        // Oasis (Azul Agua)
        oasis: {
          500: '#2AADC7',
          600: '#1E92AB',
          700: '#18778C',
          800: '#145E6F'
        },
        
        // Terracotta (Rojo Tierra)
        terracotta: {
          500: '#DC6A52',
          600: '#C45542',
          700: '#A34539'
        },
        
        // Pear (Violeta)
        pear: {
          500: '#8E63EB',
          600: '#7448D4',
          700: '#5F3CB1'
        },
        
        // Sunlight (Amarillo Dorado)
        sunlight: {
          500: '#FFB300',
          600: '#E79F00',
          700: '#C48600'
        },
        
        // Error (Rojo Peligro)
        error: {
          600: '#BA3737',
          700: '#992E2E'
        },
        
        // Colores Neutros (Sistema)
        neutral: {
          0: '#FFFFFF',
          50: '#F8FAF9',
          100: '#F2F5F4',
          200: '#E6EBE9',
          300: '#D5DDDA',
          400: '#BFCBC7',
          500: '#A5B5B0',
          600: '#7F9190',
          700: '#5D6E6C',
          800: '#3B4A49',
          900: '#1E2726',
          950: '#0E1413'
        },
        
        // Colores Semánticos
        'bg-primary': 'var(--color-bg)',
        'surface-primary': 'var(--color-surface)',
        'text-primary': 'var(--color-text)',
        'text-muted': 'var(--color-muted)',
        'brand-primary': 'var(--color-brand)',
        'brand-strong': 'var(--color-brand-strong)',
        
        // Estados
        'state-info': 'var(--color-info)',
        'state-success': 'var(--color-success)',
        'state-warning': 'var(--color-warning)',
        'state-danger': 'var(--color-danger)',
        
        // Compatibilidad legacy (deprecated)
        success: {
          700: '#16B273' // Mapea a cactus-700
        },
        warning: {
          700: '#C48600' // Mapea a sunlight-700
        },
        info: {
          700: '#18778C' // Mapea a oasis-700
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        
        // Gradientes Cactus Dashboard
        'cactus-primary': 'linear-gradient(135deg, #55DFA0 0%, #2CCB86 50%, #16B273 100%)',
        'cactus-soft': 'linear-gradient(135deg, #F0FFF6 0%, #DFFBEA 50%, #C8F6DC 100%)',
        
        'oasis-gradient': 'linear-gradient(135deg, #2AADC7 0%, #1E92AB 50%, #18778C 100%)',
        'terracotta-gradient': 'linear-gradient(135deg, #DC6A52 0%, #C45542 50%, #A34539 100%)',
        'pear-gradient': 'linear-gradient(135deg, #8E63EB 0%, #7448D4 50%, #5F3CB1 100%)',
        'sunlight-gradient': 'linear-gradient(135deg, #FFB300 0%, #E79F00 50%, #C48600 100%)',
        
        // Gradientes de estado
        'success-gradient': 'linear-gradient(135deg, #55DFA0 0%, #2CCB86 50%, #16B273 100%)',
        'warning-gradient': 'linear-gradient(135deg, #FFB300 0%, #E79F00 50%, #C48600 100%)',
        'error-gradient': 'linear-gradient(135deg, #DC6A52 0%, #BA3737 50%, #992E2E 100%)',
        'info-gradient': 'linear-gradient(135deg, #2AADC7 0%, #1E92AB 50%, #18778C 100%)',
        
        // Gradientes neutros
        'neutral-light': 'linear-gradient(135deg, #F8FAF9 0%, #F2F5F4 50%, #E6EBE9 100%)',
        'neutral-dark': 'linear-gradient(135deg, #5D6E6C 0%, #3B4A49 50%, #1E2726 100%)',
        
        // Gradientes especiales para charts
        'chart-primary': 'linear-gradient(180deg, #55DFA0 0%, rgba(85, 223, 160, 0.1) 100%)',
        'chart-secondary': 'linear-gradient(180deg, #2AADC7 0%, rgba(42, 173, 199, 0.1) 100%)',
        'chart-tertiary': 'linear-gradient(180deg, #8E63EB 0%, rgba(142, 99, 235, 0.1) 100%)',
      },
      fontFamily: {
        'cactus': ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
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
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};
