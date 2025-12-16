/**
 * Calendar Page - Server Component
 *
 * Página dedicada para gestión del calendario personal del usuario
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api-server';
import { CalendarClient } from './components/CalendarClient';
import { Heading, Stack } from '@cactus/ui';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  // Verificar autenticación
  const userResponse = await getCurrentUser();
  if (!userResponse.success || !userResponse.data) {
    redirect('/login');
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
      <Stack direction="column" gap="lg">
        <Heading level={1}>Mi Calendario</Heading>
        <CalendarClient userId={userResponse.data.id} />
      </Stack>
    </main>
  );
}
