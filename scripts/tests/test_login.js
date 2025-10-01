// Script de prueba para verificar el login después del cambio de configuración
// Ejecutar en la consola del navegador en http://localhost:5173/login

console.log('🧪 INICIANDO PRUEBA DE LOGIN');
console.log('📋 Credenciales de prueba: usuario=gio, contraseña=Gio123');

// Función para simular el login
function testLogin() {
  // Buscar los campos de entrada
  const usernameInput = document.querySelector('input[name="username"]') || document.querySelector('input[type="text"]');
  const passwordInput = document.querySelector('input[name="password"]') || document.querySelector('input[type="password"]');
  const loginButton = document.querySelector('button[type="submit"]') || document.querySelector('button:contains("Iniciar")');
  
  if (!usernameInput || !passwordInput || !loginButton) {
    console.error('❌ No se encontraron los elementos del formulario de login');
    console.log('Elementos encontrados:', {
      username: !!usernameInput,
      password: !!passwordInput,
      button: !!loginButton
    });
    return;
  }
  
  console.log('✅ Elementos del formulario encontrados');
  
  // Llenar los campos
  usernameInput.value = 'gio';
  passwordInput.value = 'Gio123';
  
  // Disparar eventos de cambio
  usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
  passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  console.log('📝 Campos llenados con credenciales de prueba');
  
  // Simular click en el botón de login
  setTimeout(() => {
    console.log('🔄 Enviando formulario de login...');
    loginButton.click();
    
    // Verificar redirección después de 2 segundos
    setTimeout(() => {
      const currentUrl = window.location.href;
      console.log('🌐 URL actual después del login:', currentUrl);
      
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ LOGIN EXITOSO: Redirigido al dashboard');
      } else if (currentUrl.includes('/login')) {
        console.log('❌ LOGIN FALLIDO: Permanece en la página de login');
      } else {
        console.log('⚠️ LOGIN INCIERTO: Redirigido a:', currentUrl);
      }
    }, 2000);
  }, 500);
}

// Ejecutar la prueba
testLogin();

// Instrucciones para uso manual
console.log('\n📖 INSTRUCCIONES MANUALES:');
console.log('1. Ir a http://localhost:5173/login');
console.log('2. Ingresar usuario: gio');
console.log('3. Ingresar contraseña: Gio123');
console.log('4. Hacer click en "Iniciar Sesión"');
console.log('5. Verificar que redirija a /dashboard');