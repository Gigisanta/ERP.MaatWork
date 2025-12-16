import React from 'react';
import PageContainer, { PageHeader, PageContent } from '../components/PageContainer';
import { Heading } from '@cactus/ui';
import NotificationsClient from './NotificationsClient';

export const metadata = {
  title: 'Notificaciones',
  description: 'Centro de notificaciones y alertas',
};

// Default export explicitly defined
export default function NotificationsPage() {
  return (
    <PageContainer size="md">
      <PageHeader>
        <Heading level={1}>Notificaciones</Heading>
      </PageHeader>

      <PageContent>
        <NotificationsClient />
      </PageContent>
    </PageContainer>
  );
}
