// Script de debug para identificar el problema de registro en la app deployada
// Ejecutar en la consola del navegador en: https://traejz5qlwp3-gigisanta-giolivos-projects.vercel.app/register

console.log('🌵 CACTUS DEBUG: Iniciando debug del registro');

// 1. Verificar si hay errores de JavaScript en la página
window.addEventListener('error', (e) => {
  console.error('🚨 ERROR JS:', e.error);
  console.error('🚨 ERROR STACK:', e.error?.stack);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('🚨 PROMISE REJECTION:', e.reason);
});

// 2. Interceptar llamadas a fetch/XMLHttpRequest para ver las requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('🌐 FETCH REQUEST:', args[0], args[1]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('✅ FETCH RESPONSE:', response.status, response.statusText);
      return response;
    })
    .catch(error => {
      console.error('❌ FETCH ERROR:', error);
      throw error;
    });
};

// 3. Interceptar console.error para capturar errores de la aplicación
const originalConsoleError = console.error;
console.error = function(...args) {
  console.log('🔴 APP ERROR DETECTED:', args);
  originalConsoleError.apply(console, args);
};

// 4. Interceptar navegación para detectar recargas
const originalReload = window.location.reload;
window.location.reload = function(...args) {
  console.log('🔄 PAGE RELOAD DETECTED!');
  console.trace('RELOAD STACK TRACE:');
  return originalReload.apply(window.location, args);
};

// 5. Interceptar history.pushState y replaceState
const originalPushState = history.pushState;
history.pushState = function(...args) {
  console.log('📍 NAVIGATION - pushState:', args);
  return originalPushState.apply(history, args);
};

const originalReplaceState = history.replaceState;
history.replaceState = function(...args) {
  console.log('📍 NAVIGATION - replaceState:', args);
  return originalReplaceState.apply(history, args);
};

// 6. Monitorear cambios en la URL
window.addEventListener('popstate', (e) => {
  console.log('📍 POPSTATE EVENT:', e.state);
});

// 7. Función para simular registro de advisor
window.debugRegisterAdvisor = function() {
  console.log('🧪 SIMULANDO REGISTRO DE ADVISOR');
  
  // Buscar el formulario
  const form = document.querySelector('form');
  if (!form) {
    console.error('❌ No se encontró el formulario');
    return;
  }
  
  // Llenar campos del formulario
  const fields = {
    fullName: 'Test Advisor Debug',
    username: 'testadvisor' + Date.now(),
    email: 'testadvisor' + Date.now() + '@example.com',
    company: 'Test Company',
    phone: '1234567890',
    role: 'advisor',
    password: 'testpassword123',
    confirmPassword: 'testpassword123'
  };
  
  Object.keys(fields).forEach(fieldName => {
    const input = form.querySelector(`[name="${fieldName}"]`);
    if (input) {
      input.value = fields[fieldName];
      // Disparar evento change
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Campo ${fieldName} llenado:`, fields[fieldName]);
    } else {
      console.warn(`⚠️ Campo ${fieldName} no encontrado`);
    }
  });
  
  // Marcar checkbox de términos si existe
  const termsCheckbox = form.querySelector('input[type="checkbox"]');
  if (termsCheckbox) {
    termsCheckbox.checked = true;
    termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Términos aceptados');
  }
  
  console.log('📝 Formulario llenado, enviando...');
  
  // Enviar formulario
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.click();
  } else {
    form.submit();
  }
};

// 8. Función para monitorear el estado de la aplicación
window.debugAppState = function() {
  console.log('📊 ESTADO DE LA APLICACIÓN:');
  
  // Verificar si hay stores de Zustand
  if (window.__ZUSTAND_STORES__) {
    console.log('🗄️ Zustand stores:', window.__ZUSTAND_STORES__);
  }
  
  // Verificar localStorage
  console.log('💾 LocalStorage:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, value);
  }
  
  // Verificar sessionStorage
  console.log('🔒 SessionStorage:');
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const value = sessionStorage.getItem(key);
    console.log(`  ${key}:`, value);
  }
  
  // Verificar si hay elementos de error en el DOM
  const errorElements = document.querySelectorAll('[class*="error"], [class*="red"], .text-red-600');
  console.log('🔴 Elementos de error en DOM:', errorElements);
  
  // Verificar formulario actual
  const form = document.querySelector('form');
  if (form) {
    console.log('📝 Formulario encontrado:', form);
    const inputs = form.querySelectorAll('input, select, textarea');
    console.log('📝 Campos del formulario:', inputs.length);
    inputs.forEach(input => {
      console.log(`  ${input.name || input.id}: "${input.value}"`);
    });
  }
};

// 9. Función para limpiar interceptores
window.debugCleanup = function() {
  console.log('🧹 Limpiando interceptores de debug');
  window.fetch = originalFetch;
  console.error = originalConsoleError;
  window.location.reload = originalReload;
  history.pushState = originalPushState;
  history.replaceState = originalReplaceState;
};

console.log('✅ DEBUG SETUP COMPLETO');
console.log('📋 Comandos disponibles:');
console.log('  - debugRegisterAdvisor(): Simula registro de advisor');
console.log('  - debugAppState(): Muestra estado de la aplicación');
console.log('  - debugCleanup(): Limpia interceptores');
console.log('');
console.log('🎯 INSTRUCCIONES:');
console.log('1. Ejecuta debugAppState() para ver el estado inicial');
console.log('2. Ejecuta debugRegisterAdvisor() para simular un registro');
console.log('3. Observa los logs para identificar el problema');
console.log('4. Si necesitas limpiar, ejecuta debugCleanup()');