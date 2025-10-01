// Script de prueba para debuggear el registro de asesor
// Ejecutar en la consola del navegador en la página de registro

console.log('🧪 TEST: Iniciando prueba de registro de asesor');

// Datos de prueba para asesor
const testData = {
  fullName: 'Test Asesor Debug',
  username: 'test_asesor_debug',
  email: 'test.asesor.debug@example.com',
  phone: '+1234567890',
  password: 'TestPassword123!',
  confirmPassword: 'TestPassword123!',
  role: 'advisor'
};

console.log('🧪 TEST: Datos de prueba:', testData);

// Función para llenar el formulario automáticamente
function fillRegistrationForm() {
  console.log('🧪 TEST: Llenando formulario de registro...');
  
  // Llenar campos del formulario
  const fullNameInput = document.querySelector('input[placeholder*="Juan Pérez"]');
  const usernameInput = document.querySelector('input[placeholder*="tu_usuario"]');
  const emailInput = document.querySelector('input[placeholder*="tu@email.com"]');
  const phoneInput = document.querySelector('input[placeholder*="234 567 8900"]');
  const passwordInput = document.querySelector('input[type="password"]:first-of-type');
  const confirmPasswordInput = document.querySelector('input[type="password"]:last-of-type');
  const roleSelect = document.querySelector('select, [role="combobox"]');
  
  if (fullNameInput) {
    fullNameInput.value = testData.fullName;
    fullNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ TEST: Nombre completo llenado');
  }
  
  if (usernameInput) {
    usernameInput.value = testData.username;
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ TEST: Username llenado');
  }
  
  if (emailInput) {
    emailInput.value = testData.email;
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ TEST: Email llenado');
  }
  
  if (phoneInput) {
    phoneInput.value = testData.phone;
    phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ TEST: Teléfono llenado');
  }
  
  if (passwordInput) {
    passwordInput.value = testData.password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ TEST: Contraseña llenada');
  }
  
  if (confirmPasswordInput) {
    confirmPasswordInput.value = testData.confirmPassword;
    confirmPasswordInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ TEST: Confirmación de contraseña llenada');
  }
  
  console.log('🧪 TEST: Formulario llenado completamente');
}

// Función para simular el envío del formulario
function submitRegistrationForm() {
  console.log('🧪 TEST: Buscando botón de envío...');
  
  const submitButton = document.querySelector('button[type="submit"], button:contains("Crear cuenta")');
  
  if (submitButton) {
    console.log('🧪 TEST: Botón de envío encontrado, haciendo clic...');
    submitButton.click();
  } else {
    console.error('❌ TEST: No se encontró el botón de envío');
    
    // Buscar formulario y enviarlo directamente
    const form = document.querySelector('form');
    if (form) {
      console.log('🧪 TEST: Enviando formulario directamente...');
      form.dispatchEvent(new Event('submit', { bubbles: true }));
    } else {
      console.error('❌ TEST: No se encontró el formulario');
    }
  }
}

// Función principal de prueba
function runRegistrationTest() {
  console.log('🧪 TEST: ===== INICIANDO PRUEBA DE REGISTRO =====');
  
  // Esperar un poco para que la página cargue completamente
  setTimeout(() => {
    fillRegistrationForm();
    
    // Esperar un poco antes de enviar
    setTimeout(() => {
      submitRegistrationForm();
    }, 1000);
  }, 500);
}

// Exportar funciones para uso manual
window.testRegistration = {
  runTest: runRegistrationTest,
  fillForm: fillRegistrationForm,
  submitForm: submitRegistrationForm,
  testData: testData
};

console.log('🧪 TEST: Script cargado. Usa window.testRegistration.runTest() para ejecutar la prueba completa');
console.log('🧪 TEST: O usa window.testRegistration.fillForm() y window.testRegistration.submitForm() por separado');