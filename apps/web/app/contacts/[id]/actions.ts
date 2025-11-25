'use server';

import { cookies } from 'next/headers';
import { apiCallWithToken } from '@/lib/api-server';

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
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    throw new Error('Authentication required for update.');
  }

  return apiCallWithToken(`/contacts/${contactId}`, {
    method: 'PATCH',
    token,
    body: { fields: [{ field, value }] }
  });
}
