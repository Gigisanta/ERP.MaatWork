/**
 * Optimistic locking utilities
 * 
 * AI_DECISION: Centralizar lógica de optimistic locking
 * Justificación: Evita duplicación, asegura manejo consistente de conflictos de versión
 * Impacto: Mejor UX cuando múltiples usuarios editan el mismo recurso
 */

/**
 * Error específico para conflictos de versión (optimistic locking)
 */
export class VersionConflictError extends Error {
  constructor(
    public readonly resourceType: string,
    public readonly resourceId: string,
    public readonly currentVersion: number,
    public readonly expectedVersion: number
  ) {
    super(`Version conflict: ${resourceType} with id ${resourceId} was modified by another user`);
    this.name = 'VersionConflictError';
  }
}

/**
 * Verifica si un error es un VersionConflictError
 */
export function isVersionConflictError(error: unknown): error is VersionConflictError {
  return error instanceof VersionConflictError;
}

/**
 * Resultado de un update con validación de versión
 */
export interface VersionedUpdateResult<T> {
  success: boolean;
  data?: T;
  error?: VersionConflictError;
}

/**
 * Ejecuta un update validando que la versión actual coincida con la esperada
 * 
 * @param updateFn - Función que ejecuta el update (debe incluir versión en where clause)
 * @param resourceType - Tipo de recurso para mensajes de error (ej: 'Contact', 'Task')
 * @param resourceId - ID del recurso
 * @param expectedVersion - Versión esperada del recurso
 * @returns Resultado del update con información de versión
 * 
 * @example
 * ```typescript
 * const result = await updateWithVersion(
 *   async () => {
 *     return await db()
 *       .update(contacts)
 *       .set({ ...data, version: existing.version + 1 })
 *       .where(and(
 *         eq(contacts.id, id),
 *         eq(contacts.version, existing.version) // Validar versión
 *       ))
 *       .returning();
 *   },
 *   'Contact',
 *   id,
 *   existing.version
 * );
 * 
 * if (!result.success) {
 *   return res.status(409).json({
 *     error: 'Version conflict',
 *     message: 'El recurso fue modificado por otro usuario. Por favor recarga la página.'
 *   });
 * }
 * ```
 */
export async function updateWithVersion<T>(
  updateFn: () => Promise<T[]>,
  resourceType: string,
  resourceId: string,
  expectedVersion: number
): Promise<VersionedUpdateResult<T>> {
  try {
    const updated = await updateFn();
    
    // Si no se actualizó ningún registro, significa que la versión no coincidió
    if (updated.length === 0) {
      // Obtener versión actual para el mensaje de error
      // Nota: En la práctica, el caller debería tener esta información
      const error = new VersionConflictError(
        resourceType,
        resourceId,
        expectedVersion + 1, // Asumimos que fue incrementada
        expectedVersion
      );
      
      return {
        success: false,
        error
      };
    }
    
    return {
      success: true,
      data: updated[0]
    };
  } catch (error) {
    // Si es un error de versión, re-throw
    if (isVersionConflictError(error)) {
      throw error;
    }
    
    // Para otros errores, re-throw también
    throw error;
  }
}

/**
 * Helper para crear una respuesta HTTP 409 Conflict estándar
 */
export function createVersionConflictResponse(error: VersionConflictError) {
  return {
    error: 'Version conflict',
    message: 'El recurso fue modificado por otro usuario. Por favor recarga la página.',
    resourceType: error.resourceType,
    resourceId: error.resourceId,
    expectedVersion: error.expectedVersion,
    currentVersion: error.currentVersion
  };
}

