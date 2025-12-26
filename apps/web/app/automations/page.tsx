'use client';

import { useCallback } from 'react';
import { useRequireAuth } from '../auth/useRequireAuth';
import { usePageTitle } from '../components/PageTitleContext';
import { Button, Heading, Text, Stack, Icon, Spinner } from '@maatwork/ui';
import { config } from '@/lib/config';
import WelcomeEmailCard from './components/WelcomeEmailCard';
import SecondMeetingCard from './components/SecondMeetingCard';

export default function AutomationsPage() {
  const { loading } = useRequireAuth();
  usePageTitle('Automatizaciones');

  const handleOpenN8N = useCallback(() => {
    window.open(config.n8nUrl, '_blank', 'noopener,noreferrer');
  }, []);

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenN8N}
            title="Abrir N8N - Automatizaciones"
          >
            <Icon name="Settings" size={16} className="mr-1.5" />
            N8N
          </Button>
        </div>

        {/* Sección Automatizaciones base */}
        <div>
          <Heading level={2} className="text-xl mb-4">
            Automatizaciones base
          </Heading>
          <div className="max-w-2xl space-y-4">
            <SecondMeetingCard />
            <WelcomeEmailCard />
          </div>
        </div>
      </Stack>
    </div>
  );
}
