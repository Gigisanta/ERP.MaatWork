'use client';

import { useRequireAuth } from '../auth/useRequireAuth';
import { usePageTitle } from '../components/PageTitleContext';
import { Heading, Stack, Spinner, Text } from '@maatwork/ui';
import EmailAutomationCard from './components/EmailAutomationCard';

export default function AutomationsPage() {
  const { loading } = useRequireAuth();
  usePageTitle('Automatizaciones');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Stack direction="column" gap="md" align="center">
          <Spinner size="lg" />
          <Text color="secondary">Verificando autenticación...</Text>
        </Stack>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4">
      <Stack direction="column" gap="lg">
        <div className="flex items-center justify-between">
          <Heading level={1}>Automatizaciones</Heading>
        </div>

        {/* Sección Automatizaciones base */}
        <div>
          <Heading level={2} className="text-xl mb-4">
            Emails Automáticos
          </Heading>
          <div className="max-w-2xl space-y-4">
            <EmailAutomationCard
              automationName="segunda_reunion_webhook" // Keeping ID for continuity, though functionality changed
              displayName="Email Segunda Reunión"
              description="Envía un email automático cuando un contacto pasa a la etapa 'Segunda reunion'."
              triggerStageName="Segunda reunion"
              defaultSubject="Confirmación Segunda Reunión"
              defaultBody="<p>Hola {contact.firstName},</p><p>Te confirmamos la segunda reunión...</p>"
            />
            
            <EmailAutomationCard
              automationName="mail_bienvenida"
              displayName="Email de Bienvenida (Cliente)"
              description="Envía un email automático cuando un contacto pasa a la etapa 'Cliente'."
              triggerStageName="Cliente"
              defaultSubject="Bienvenido a Cactus"
              defaultBody="<p>Hola {contact.firstName},</p><p>Bienvenido a bordo...</p>"
            />
          </div>
        </div>
      </Stack>
    </div>
  );
}
