// Script de diagnóstico para verificar interacciones
console.log('=== DIAGNÓSTICO DE INTERACCIONES ===');

// 1. Verificar si hay overlays invisibles
const allElements = document.querySelectorAll('*');
const problematicElements = [];

allElements.forEach(el => {
  const styles = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  
  // Verificar elementos con z-index alto que podrían estar bloqueando
  if (styles.zIndex && parseInt(styles.zIndex) > 40) {
    problematicElements.push({
      element: el,
      zIndex: styles.zIndex,
      position: styles.position,
      display: styles.display,
      visibility: styles.visibility,
      pointerEvents: styles.pointerEvents,
      className: el.className,
      tagName: el.tagName
    });
  }
  
  // Verificar elementos con pointer-events: none
  if (styles.pointerEvents === 'none') {
    console.warn('Elemento con pointer-events: none:', el);
  }
});

console.log('Elementos con z-index alto:', problematicElements);

// 2. Verificar si los event listeners están funcionando
const testButton = document.querySelector('button');
if (testButton) {
  console.log('Botón de prueba encontrado:', testButton);
  console.log('Event listeners:', getEventListeners ? getEventListeners(testButton) : 'getEventListeners no disponible');
}

// 3. Verificar elementos clickeables
const clickableElements = document.querySelectorAll('button, a, [onclick], [role="button"]');
console.log(`Elementos clickeables encontrados: ${clickableElements.length}`);

clickableElements.forEach((el, index) => {
  if (index < 5) { // Solo los primeros 5 para no saturar
    const styles = window.getComputedStyle(el);
    console.log(`Elemento ${index + 1}:`, {
      tagName: el.tagName,
      className: el.className,
      pointerEvents: styles.pointerEvents,
      display: styles.display,
      visibility: styles.visibility,
      zIndex: styles.zIndex
    });
  }
});

// 4. Verificar si hay errores de JavaScript
console.log('Errores en consola:', console.error.toString());

// 5. Probar un click programático
const firstButton = document.querySelector('button');
if (firstButton) {
  console.log('Intentando click programático en:', firstButton);
  try {
    firstButton.click();
    console.log('Click programático exitoso');
  } catch (error) {
    console.error('Error en click programático:', error);
  }
}

console.log('=== FIN DEL DIAGNÓSTICO ===');