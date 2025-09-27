// Script para verificar el estado de autenticación en el navegador
// Ejecutar en la consola del navegador cuando esté en la aplicación

console.log('🔍 Verificando estado de autenticación...');

// Verificar si existe el store de autenticación
if (typeof window !== 'undefined' && window.useAuthStore) {
  const authState = window.useAuthStore.getState();
  console.log('📊 Estado de autenticación:', {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    currentUser: authState.currentUser,
    isLoading: authState.isLoading
  });
} else {
  console.log('❌ Store de autenticación no encontrado en window');
}

// Verificar sesión de Supabase
if (typeof window !== 'undefined' && window.supabase) {
  window.supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.error('❌ Error al obtener sesión:', error);
    } else {
      console.log('📱 Sesión de Supabase:', session ? 'Activa' : 'No activa');
      if (session) {
        console.log('👤 Usuario de sesión:', session.user.email);
      }
    }
  });
} else {
  console.log('❌ Cliente de Supabase no encontrado en window');
}

// Verificar localStorage
const authData = localStorage.getItem('auth-storage');
if (authData) {
  try {
    const parsed = JSON.parse(authData);
    console.log('💾 Datos de autenticación en localStorage:', parsed);
  } catch (e) {
    console.error('❌ Error al parsear datos de localStorage:', e);
  }
} else {
  console.log('❌ No hay datos de autenticación en localStorage');
}

console.log('✅ Verificación completada. Revisa los logs anteriores.');