'use server';

import { cookies } from 'next/headers';

// AI_DECISION: Extract Server Action to separate file for client component access
// Justificación: Server Actions cannot be passed as props, must be imported dynamically
// Impacto: Enables client components to call server actions without prop passing

/**
 * Server Action for updating contact fields
 * 
 * @param contactId - The contact ID to update
 * @param field - The field name to update
 * @param value - The new value for the field
 */
export async function updateContactField(contactId: string, field: string, value: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    throw new Error('Authentication required for update.');
  }

  const res = await fetch(`${apiUrl}/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      fields: [{ field, value }] 
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update ${field}`);
  }

  return await res.json();
}
