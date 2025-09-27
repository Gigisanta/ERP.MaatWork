// Script para hacer login automático y navegar a la página de equipo

// Función para hacer login
function autoLogin() {
  // Llenar el formulario de login
  const usernameInput = document.querySelector('input[name="username"]');
  const passwordInput = document.querySelector('input[name="password"]');
  const submitButton = document.querySelector('button[type="submit"]');
  
  if (usernameInput && passwordInput && submitButton) {
    usernameInput.value = 'Gio';
    passwordInput.value = 'Gio123';
    
    // Disparar eventos de cambio
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Hacer click en el botón de submit
    setTimeout(() => {
      submitButton.click();
      
      // Después del login, navegar a la página de equipo
      setTimeout(() => {
        window.location.href = '/team';
      }, 2000);
    }, 500);
  }
}

// Ejecutar cuando la página esté cargada
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoLogin);
} else {
  autoLogin();
}

console.log('Script de auto-login cargado');