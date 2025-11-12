// AI_DECISION: Server Component para página de detalle de etiqueta
// Justificación: Server-side data fetching reduce First Load JS
// Impacto: Contenido estático renderizado server-side, interactividad aislada en client islands

import React from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Heading,
  Text,
  Stack,
  Breadcrumbs,
  Badge,
  Alert,
  type BreadcrumbItem,
} from '@cactus/ui';
import type {
  Contact,
  ContactTagWithDetails,
} from '@/types';
import TagDetailsForm from './TagDetailsForm';

// Server-side data fetching
import { apiCallWithToken } from '@/lib/api-server';
import { config } from '@/lib/config';

async function getContactTagData(contactId: string, tagId: string, token: string) {
  try {
    // Obtener datos de contacto y relación contacto-etiqueta en paralelo
    const [contactResponse, contactTagResponse] = await Promise.all([
      apiCallWithToken<Contact>(`/v1/contacts/${contactId}`, {
        token,
        method: 'GET',
        timeoutMs: Math.min(config.apiTimeout, 8000)
      }),
      apiCallWithToken<ContactTagWithDetails>(`/v1/tags/contacts/${contactId}/tags/${tagId}`, {
        token,
        method: 'GET',
        timeoutMs: Math.min(config.apiTimeout, 8000)
      })
    ]);

    if (!contactResponse?.data || !contactTagResponse?.data) {
      return null;
    }

    return {
      contact: contactResponse.data,
      contactTag: contactTagResponse.data
    };
  } catch (error) {
    // AI_DECISION: Usar console.error en Server Components
    // Justificación: Server Components no tienen acceso a logger del cliente. console.error
    //                es la forma estándar de logging en Node.js y Next.js Server Components.
    //                Los errores se capturan y manejan apropiadamente sin afectar la UI.
    // Impacto: Logging apropiado en contexto de servidor sin dependencias del cliente
    console.error('Error fetching contact tag data', { err: error, contactId, tagId });
    return null;
  }
}

interface ContactTagDetailPageProps {
  params: {
    id: string;
    tagId: string;
  };
}

export default async function ContactTagDetailPage({ params }: ContactTagDetailPageProps) {
  const { id: contactId, tagId } = params;
  
  // Get token from cookies
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    return <Alert variant="error">Authentication required. Please log in.</Alert>;
  }
  
  const data = await getContactTagData(contactId, tagId, token);

  if (!data) {
    notFound();
  }

  const { contact, contactTag } = data;

  // Validar que la etiqueta tiene businessLine 'zurich'
  if (contactTag.tag.businessLine !== 'zurich') {
    return (
      <div className="p-3 md:p-4">
        <Alert variant="error">
          Esta página solo está disponible para etiquetas con línea de negocio "Zurich".
        </Alert>
      </div>
    );
  }

  // Define breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Contactos', href: '/contacts' },
    { label: contact.fullName, href: `/contacts/${contact.id}` },
    { label: contactTag.tag.name, href: `/contacts/${contactId}/tags/${tagId}` },
  ];

  return (
    <div className="p-3 md:p-4">
      <Stack direction="column" gap="md">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div>
          <Heading level={1}>{contactTag.tag.name}</Heading>
          <Text color="muted" className="mt-1">
            Datos de póliza para {contact.fullName}
          </Text>
        </div>

        {/* Badge de etiqueta */}
        <div>
          <Badge 
            style={{ backgroundColor: contactTag.tag.color, color: 'white' }} 
            className="text-sm px-2.5 py-1"
          >
            {contactTag.tag.name}
          </Badge>
        </div>

        {/* Formulario de datos */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Póliza</CardTitle>
          </CardHeader>
          <CardContent>
            <TagDetailsForm
              contactId={contactId}
              tagId={tagId}
              initialData={{
                monthlyPremium: contactTag.monthlyPremium,
                policyNumber: contactTag.policyNumber
              }}
            />
          </CardContent>
        </Card>
      </Stack>
    </div>
  );
}

