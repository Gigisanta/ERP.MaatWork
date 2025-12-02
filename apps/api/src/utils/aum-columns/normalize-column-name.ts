/**
 * Normalización de nombres de columnas
 *
 * Funciones para normalizar nombres de columnas para comparación flexible
 */

/**
 * Normaliza un nombre de columna para comparación flexible
 * - Convierte a lowercase
 * - Elimina espacios extra y normaliza espacios/guiones
 * - Elimina caracteres especiales comunes
 * - Normaliza acentos y caracteres diacríticos
 */
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres con acentos (é -> e + ´)
    .replace(/[\u0300-\u036f]/g, '') // Elimina marcas diacríticas (acentos)
    .trim()
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .replace(/[-_]/g, ' ') // Normalizar guiones y underscores
    .replace(/[°º]/g, '') // Eliminar símbolos de grado
    .replace(/[^\w\s]/g, '') // Eliminar caracteres especiales excepto letras, números y espacios
    .trim();
}






