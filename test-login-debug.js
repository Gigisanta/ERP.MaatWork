// Test específico para el problema de login
// Este script debe ejecutarse en la consola del navegador

// Función para limpiar el estado y probar login
function testLoginFlow() {
  console.log('🧪 TEST: Iniciando test de login flow');
  
  // 1. Limpiar localStorage
  console.log('🧹 TEST: Limpiando localStorage');
  localStorage.removeItem('auth-storage');
  
  // 2. Recargar la página para limpiar el estado
  console.log('🔄 TEST: Recargando página para limpiar estado');
  window.location.reload();
}

// Función para verificar el estado actual
function checkCurrentState() {
  console.log('🔍 TEST: Verificando estado actual');
  
  // Verificar localStorage
  const authStorage = localStorage.getItem('auth-storage');
  console.log('💾 TEST: Auth storage:', authStorage ? JSON.parse(authStorage) : 'No existe');
  
  // Verificar si hay store disponible
  if (window.useAuthStore) {
    const state = window.useAuthStore.getState();
    console.log('🏪 TEST: Estado del store:', {
      isAuthenticated: state.isAuthenticated,
      user: state.user ? { id: state.user.id, username: state.user.username } : null,
      isLoading: state.isLoading
    });
  } else {
    console.log('❌ TEST: Store no disponible en window');
  }
  
  // Verificar URL actual
  console.log('🌐 TEST: URL actual:', window.location.href);
}

// Función para simular login manual
function simulateLogin() {
  console.log('🎭 TEST: Simulando login manual');
  
  // Buscar los campos del formulario
  const usernameInput = document.querySelector('input[type="text"]');
  const passwordInput = document.querySelector('input[type="password"]');
  const submitButton = document.querySelector('button[type="submit"]');
  
  if (!usernameInput || !passwordInput || !submitButton) {
    console.error('❌ TEST: No se encontraron los elementos del formulario');
    console.log('📋 TEST: Elementos encontrados:', {
      username: !!usernameInput,
      password: !!passwordInput,
      submit: !!submitButton
    });
    return;
  }
  
  console.log('✅ TEST: Elementos del formulario encontrados');
  
  // Llenar los campos
  console.log('📝 TEST: Llenando campos del formulario');
  usernameInput.value = 'gio';
  passwordInput.value = 'Gio123';
  
  // Disparar eventos de cambio
  usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
  passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  console.log('🎯 TEST: Campos llenados, haciendo click en submit');
  
  // Hacer click en el botón
  submitButton.click();
  
  // Verificar estado después de un momento
  setTimeout(() => {
    console.log('⏰ TEST: Verificando estado después del submit');
    checkCurrentState();
  }, 2000);
}

// Función para monitorear cambios en el store
function monitorStoreChanges() {
  console.log('👀 TEST: Iniciando monitoreo del store');
  
  if (!window.useAuthStore) {
    console.error('❌ TEST: Store no disponible para monitoreo');
    return;
  }
  
  let previousState = window.useAuthStore.getState();
  
  const unsubscribe = window.useAuthStore.subscribe((state) => {
    console.log('🔄 TEST: Cambio en el store detectado:', {
      anterior: {
        isAuthenticated: previousState.isAuthenticated,
        isLoading: previousState.isLoading,
        user: previousState.user ? previousState.user.username : null
      },
      nuevo: {
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        user: state.user ? state.user.username : null
      }
    });
    previousState = state;
  });
  
  // Detener monitoreo después de 30 segundos
  setTimeout(() => {
    console.log('⏹️ TEST: Deteniendo monitoreo del store');
    unsubscribe();
  }, 30000);
}

// Función para ejecutar test completo
function runFullTest() {
  console.log('🚀 TEST: Ejecutando test completo de login');
  
  // 1. Verificar estado inicial
  checkCurrentState();
  
  // 2. Iniciar monitoreo
  monitorStoreChanges();
  
  // 3. Simular login después de un momento
  setTimeout(() => {
    simulateLogin();
  }, 1000);
}

// Función para verificar si estamos en la página de login
function isOnLoginPage() {
  return window.location.pathname === '/login' || window.location.pathname === '/';
}

// Función principal
function debugLogin() {
  console.log('🔧 DEBUG: Iniciando debug de login');
  
  if (!isOnLoginPage()) {
    console.log('📍 DEBUG: No estamos en la página de login, navegando...');
    window.location.href = '/login';
    return;
  }
  
  runFullTest();
}

// Exportar funciones al objeto window para uso manual
window.testLoginFlow = testLoginFlow;
window.checkCurrentState = checkCurrentState;
window.simulateLogin = simulateLogin;
window.monitorStoreChanges = monitorStoreChanges;
window.runFullTest = runFullTest;
window.debugLogin = debugLogin;

console.log('✅ TEST: Script de debug cargado. Funciones disponibles:');
console.log('- testLoginFlow(): Limpia estado y recarga');
console.log('- checkCurrentState(): Verifica estado actual');
console.log('- simulateLogin(): Simula login con credenciales');
console.log('- monitorStoreChanges(): Monitorea cambios en el store');
console.log('- runFullTest(): Ejecuta test completo');
console.log('- debugLogin(): Función principal de debug');

// Auto-ejecutar si estamos en la página de login
if (isOnLoginPage()) {
  console.log('🎯 TEST: Detectada página de login, ejecutando debug automáticamente en 2 segundos...');
  setTimeout(debugLogin, 2000);
}