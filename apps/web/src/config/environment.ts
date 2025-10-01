// Configuración de entorno para el sistema CRM Cactus Dashboard

// IMPORTANTE: Cambiar a 'production' antes del despliegue final
export const ENVIRONMENT = 'production' as 'development' | 'production';

// Configuración de datos iniciales
export const CONFIG = {
  // En desarrollo: usar datos mock
  // En producción: sistema limpio sin datos
  USE_MOCK_DATA: ENVIRONMENT === 'development',
  
  // Usuario administrador por defecto (disponible en desarrollo y producción)
  DEFAULT_ADMIN: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Gio',
    username: 'Gio',
    email: 'gio@admin.com',
    role: 'admin' as const,

    phone: '+54 11 0000-0000',
    department: 'Administración',
    team_id: '550e8400-e29b-41d4-a716-446655440001',
    isApproved: true,
    createdAt: new Date().toISOString()
  },
  
  // Credenciales por defecto (disponible en desarrollo y producción)
  DEFAULT_ADMIN_PASSWORD: 'Gio123',
  
  // Configuración de la aplicación
  APP_NAME: 'CRM Cactus Dashboard',
  VERSION: '1.0.0',
  
  // Mensajes para producción
  PRODUCTION_MESSAGES: {
    WELCOME: 'Sistema CRM listo para usar.',
    NO_DATA: 'No hay datos disponibles. Comience agregando información.'
  }
};

// Función para verificar si estamos en modo producción
export const isProduction = () => ENVIRONMENT === 'production';

// Función para verificar si estamos en modo desarrollo
export const isDevelopment = () => ENVIRONMENT === 'development';



// Advertencia para desarrolladores
if (isDevelopment()) {
  console.warn(
    '🚨 MODO DESARROLLO ACTIVO 🚨\n' +
    'El sistema está usando datos de prueba.\n' +
    'Cambiar ENVIRONMENT a "production" antes del despliegue.\n' +
    'Archivo: src/config/environment.ts'
  );
}