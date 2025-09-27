/**
 * Cactus Dashboard - Layout Configuration
 * Nueva paleta de colores actualizada para todo el sistema
 */

export const LayoutConfig = {
  brand: "Cactus Dashboard",
  
  // Paleta de colores principal
  colors: {
    // Colores de marca Cactus
    cactus: {
      50: "#F0FFF6",
      100: "#DFFBEA",
      200: "#C8F6DC",
      300: "#A6EDC8",
      400: "#7FE5B0",
      500: "#55DFA0",
      600: "#2CCB86",
      700: "#16B273",
      800: "#0E8E5B",
      900: "#0C7048",
      950: "#0A5A3A"
    },
    
    // Colores Oasis (azul-verde)
    oasis: {
      500: "#2AADC7",
      600: "#1E92AB",
      700: "#18778C",
      800: "#145E6F"
    },
    
    // Colores Terracotta (naranja-rojo)
    terracotta: {
      500: "#DC6A52",
      600: "#C45542",
      700: "#A34539"
    },
    
    // Colores Pear (púrpura)
    pear: {
      500: "#8E63EB",
      600: "#7448D4",
      700: "#5F3CB1"
    },
    
    // Colores Sunlight (amarillo)
    sunlight: {
      500: "#FFB300",
      600: "#E79F00",
      700: "#C48600"
    },
    
    // Colores de error
    error: {
      600: "#BA3737",
      700: "#992E2E"
    },
    
    // Colores neutrales
    neutral: {
      0: "#FFFFFF",
      50: "#F8FAF9",
      100: "#F2F5F4",
      200: "#E6EBE9",
      300: "#D5DDDA",
      400: "#BFCBC7",
      500: "#A5B5B0",
      600: "#7F9190",
      700: "#5D6E6C",
      800: "#3B4A49",
      900: "#1E2726",
      950: "#0E1413"
    },
    
    // Colores semánticos
    semantics: {
      bg: "#F8FAF9", // neutral.50
      surface: "#FFFFFF", // neutral.0
      text: "#1E2726", // neutral.900
      muted: "#7F9190", // neutral.600
      brand: "#55DFA0", // cactus.500
      brandStrong: "#0C7048", // cactus.900
      onBrandStrong: "#FFFFFF" // neutral.0
    },
    
    // Estados
    states: {
      info: "#18778C", // oasis.700
      success: "#16B273", // cactus.700
      warning: "#C48600", // sunlight.700
      danger: "#BA3737", // error.600
      onState: "#FFFFFF" // neutral.0
    }
  }
};