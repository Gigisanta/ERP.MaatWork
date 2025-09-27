/**
 * Utilidades para validación y manejo seguro de UUIDs
 * Previene errores "invalid input syntax for type uuid: undefined"
 */

const crypto = require('crypto');

/**
 * Valida si una cadena es un UUID válido
 * @param {string} uuid - La cadena a validar
 * @returns {boolean} - true si es un UUID válido
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Genera un UUID v4 válido
 * @returns {string} - UUID v4 generado
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Valida y sanitiza un UUID, generando uno nuevo si es inválido
 * @param {string} uuid - UUID a validar
 * @param {string} fallbackPrefix - Prefijo para logging en caso de fallback
 * @returns {string} - UUID válido
 */
function validateOrGenerateUUID(uuid, fallbackPrefix = 'fallback') {
  if (isValidUUID(uuid)) {
    return uuid;
  }
  
  console.warn(`⚠️ UUID inválido detectado: "${uuid}". Generando UUID de respaldo para ${fallbackPrefix}`);
  return generateUUID();
}

/**
 * Obtiene el UUID del usuario autenticado de forma segura
 * @param {object} supabaseClient - Cliente de Supabase autenticado
 * @returns {Promise<string|null>} - UUID del usuario o null si no está autenticado
 */
async function getSafeUserUUID(supabaseClient) {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (error) {
      console.error('Error obteniendo usuario:', error.message);
      return null;
    }
    
    if (!user || !user.id) {
      console.warn('Usuario no autenticado o sin ID');
      return null;
    }
    
    if (!isValidUUID(user.id)) {
      console.error(`UUID de usuario inválido: "${user.id}"`);
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.error('Error en getSafeUserUUID:', error.message);
    return null;
  }
}

/**
 * Valida que un objeto tenga UUIDs válidos en campos específicos
 * @param {object} obj - Objeto a validar
 * @param {string[]} uuidFields - Campos que deben contener UUIDs válidos
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
function validateObjectUUIDs(obj, uuidFields) {
  const errors = [];
  
  for (const field of uuidFields) {
    const value = obj[field];
    
    if (value !== null && value !== undefined && !isValidUUID(value)) {
      errors.push(`Campo "${field}" contiene UUID inválido: "${value}"`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitiza un objeto reemplazando UUIDs inválidos con valores seguros
 * @param {object} obj - Objeto a sanitizar
 * @param {string[]} uuidFields - Campos que contienen UUIDs
 * @param {object} options - Opciones de sanitización
 * @returns {object} - Objeto sanitizado
 */
function sanitizeObjectUUIDs(obj, uuidFields, options = {}) {
  const { 
    generateFallback = false, 
    setNullOnInvalid = true,
    logWarnings = true 
  } = options;
  
  const sanitized = { ...obj };
  
  for (const field of uuidFields) {
    const value = sanitized[field];
    
    if (value !== null && value !== undefined && !isValidUUID(value)) {
      if (logWarnings) {
        console.warn(`⚠️ Sanitizando UUID inválido en campo "${field}": "${value}"`);
      }
      
      if (generateFallback) {
        sanitized[field] = generateUUID();
      } else if (setNullOnInvalid) {
        sanitized[field] = null;
      } else {
        delete sanitized[field];
      }
    }
  }
  
  return sanitized;
}

/**
 * Wrapper seguro para operaciones de base de datos que involucran UUIDs
 * @param {Function} operation - Función que realiza la operación de BD
 * @param {object} data - Datos para la operación
 * @param {string[]} uuidFields - Campos UUID a validar
 * @returns {Promise<object>} - Resultado de la operación
 */
async function safeUUIDOperation(operation, data, uuidFields = []) {
  try {
    // Validar UUIDs antes de la operación
    const validation = validateObjectUUIDs(data, uuidFields);
    
    if (!validation.isValid) {
      throw new Error(`UUIDs inválidos detectados: ${validation.errors.join(', ')}`);
    }
    
    return await operation(data);
  } catch (error) {
    // Si el error es de sintaxis UUID, intentar sanitizar y reintentar
    if (error.message.includes('invalid input syntax for type uuid')) {
      console.warn('⚠️ Error de sintaxis UUID detectado, intentando sanitizar...');
      
      const sanitizedData = sanitizeObjectUUIDs(data, uuidFields, {
        generateFallback: false,
        setNullOnInvalid: true,
        logWarnings: true
      });
      
      return await operation(sanitizedData);
    }
    
    throw error;
  }
}

module.exports = {
  isValidUUID,
  generateUUID,
  validateOrGenerateUUID,
  getSafeUserUUID,
  validateObjectUUIDs,
  sanitizeObjectUUIDs,
  safeUUIDOperation
};