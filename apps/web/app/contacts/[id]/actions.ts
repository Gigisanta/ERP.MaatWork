'use server';

import { apiCall } from '@/lib/api-server';

// AI_DECISION: Extract Server Action to separate file for client component access
// Justificación: Server Actions cannot be passed as props, must be imported dynamically
// Impacto: Enables client components to call server actions without prop passing

/**
 * Server Action for updating contact fields
 * 
 * @param contactId - The contact ID to update
 * @param field - The field name to update
 * @param value - The new value for the field (string, string[], or other types)
 */
export async function updateContactField(contactId: string, field: string, value: string | string[] | number | null) {
  // apiCall maneja cookies automáticamente, no necesitamos obtener token manualmente
  return apiCall(`/v1/contacts/${contactId}`, {
    method: 'PATCH',
    body: { fields: [{ field, value }] }
  });
}
