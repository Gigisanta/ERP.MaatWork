// Script de debug para el problema de registro
// Ejecutar en la consola del navegador en http://localhost:5173/register

console.log('🔍 INICIANDO DEBUG DEL REGISTRO');

// Función para llenar el formulario automáticamente
function fillRegistrationForm() {
  console.log('📝 Llenando formulario de registro...');
  
  // Llenar campos del formulario
  const fullNameInput = document.querySelector('input[name="fullName"]');
  const usernameInput = document.querySelector('input[name="username"]');
  const emailInput = document.querySelector('input[name="email"]');
  const phoneInput = document.querySelector('input[name="phone"]');
  const roleSelect = document.querySelector('select[name="role"]');
  const passwordInput = document.querySelector('input[name="password"]');
  const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
  const termsCheckbox = document.querySelector('input[type="checkbox"]#terms');
  
  if (fullNameInput) {
    fullNameInput.value = 'Test Usuario';
    fullNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    fullNameInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Nombre completo llenado');
  }
  
  if (usernameInput) {
    usernameInput.value = 'test_user_' + Date.now();
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Username llenado');
  }
  
  if (emailInput) {
    emailInput.value = 'test' + Date.now() + '@test.com';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Email llenado');
  }
  
  if (phoneInput) {
    phoneInput.value = '+1234567890';
    phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
    phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Teléfono llenado');
  }
  
  if (roleSelect) {
    roleSelect.value = 'advisor';
    roleSelect.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Rol seleccionado: advisor');
  }
  
  if (passwordInput) {
    passwordInput.value = 'test123456';
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Contraseña llenada');
  }
  
  if (confirmPasswordInput) {
    confirmPasswordInput.value = 'test123456';
    confirmPasswordInput.dispatchEvent(new Event('input', { bubbles: true }));
    confirmPasswordInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Confirmación de contraseña llenada');
  }
  
  if (termsCheckbox) {
    termsCheckbox.checked = true;
    termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Términos aceptados');
  }
  
  console.log('📝 Formulario completado');
}

// Función para simular el envío del formulario
function simulateFormSubmission() {
  console.log('🚀 Simulando envío del formulario...');
  
  const form = document.querySelector('form');
  const submitButton = document.querySelector('button[type="submit"]');
  
  if (form) {
    console.log('📋 Formulario encontrado');
    
    // Verificar si el botón está deshabilitado
    if (submitButton && submitButton.disabled) {
      console.warn('⚠️ El botón de envío está deshabilitado');
      return;
    }
    
    // Crear y disparar evento de submit
    const submitEvent = new Event('submit', {
      bubbles: true,
      cancelable: true
    });
    
    console.log('🎯 Disparando evento submit...');
    const result = form.dispatchEvent(submitEvent);
    console.log('📊 Resultado del evento submit:', result);
    
    // También intentar hacer click en el botón
    if (submitButton) {
      console.log('🖱️ Haciendo click en el botón de envío...');
      submitButton.click();
    }
  } else {
    console.error('❌ No se encontró el formulario');
  }
}

// Función para verificar el estado del formulario
function checkFormState() {
  console.log('🔍 Verificando estado del formulario...');
  
  const form = document.querySelector('form');
  const inputs = document.querySelectorAll('input, select, textarea');
  const submitButton = document.querySelector('button[type="submit"]');
  
  console.log('📋 Formulario:', form);
  console.log('📝 Inputs encontrados:', inputs.length);
  console.log('🔘 Botón de envío:', submitButton);
  
  if (submitButton) {
    console.log('🔘 Botón deshabilitado:', submitButton.disabled);
    console.log('🔘 Clases del botón:', submitButton.className);
  }
  
  // Verificar valores de los inputs
  inputs.forEach((input, index) => {
    if (input.name) {
      console.log(`📝 Input ${index + 1} (${input.name}):`, input.value);
    }
  });
  
  // Verificar event listeners
  console.log('🎧 Event listeners en el formulario:');
  if (form) {
    console.log('🎧 onsubmit:', form.onsubmit);
  }
}

// Función para monitorear eventos
function monitorEvents() {
  console.log('👂 Iniciando monitoreo de eventos...');
  
  const form = document.querySelector('form');
  
  if (form) {
    // Monitorear evento submit
    form.addEventListener('submit', (e) => {
      console.log('🎯 EVENTO SUBMIT DETECTADO');
      console.log('🎯 Event:', e);
      console.log('🎯 Target:', e.target);
      console.log('🎯 DefaultPrevented:', e.defaultPrevented);
    }, true);
    
    // Monitorear clicks en el botón
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.addEventListener('click', (e) => {
        console.log('🖱️ CLICK EN BOTÓN SUBMIT DETECTADO');
        console.log('🖱️ Event:', e);
        console.log('🖱️ Target:', e.target);
        console.log('🖱️ DefaultPrevented:', e.defaultPrevented);
      }, true);
    }
  }
}

// Función principal de debug
function debugRegistration() {
  console.log('🔍 ===== INICIANDO DEBUG COMPLETO =====');
  
  // Paso 1: Verificar estado inicial
  checkFormState();
  
  // Paso 2: Monitorear eventos
  monitorEvents();
  
  // Paso 3: Llenar formulario
  setTimeout(() => {
    fillRegistrationForm();
    
    // Paso 4: Verificar estado después de llenar
    setTimeout(() => {
      console.log('🔍 Estado después de llenar:');
      checkFormState();
      
      // Paso 5: Simular envío
      setTimeout(() => {
        simulateFormSubmission();
      }, 1000);
    }, 500);
  }, 1000);
}

// Exportar funciones para uso manual
window.debugRegistration = debugRegistration;
window.fillRegistrationForm = fillRegistrationForm;
window.simulateFormSubmission = simulateFormSubmission;
window.checkFormState = checkFormState;
window.monitorEvents = monitorEvents;

console.log('🔧 Funciones de debug disponibles:');
console.log('🔧 - debugRegistration(): Ejecuta debug completo');
console.log('🔧 - fillRegistrationForm(): Llena el formulario');
console.log('🔧 - simulateFormSubmission(): Simula envío');
console.log('🔧 - checkFormState(): Verifica estado');
console.log('🔧 - monitorEvents(): Monitorea eventos');

// Ejecutar debug automáticamente
debugRegistration();