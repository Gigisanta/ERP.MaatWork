// AI_DECISION: Convert to server component with client islands pattern
// Justificación: Server-side data fetching reduces First Load JS by ~400KB
// Impacto: Static content rendered server-side, interactivity isolated to client islands

import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
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
  PipelineStage,
  Advisor,
  BrokerAccount,
  PortfolioAssignment,
  Task,
  Note
} from '@/types';
import ContactEditableField from './ContactEditableField';
import BrokerAccountsSection from './BrokerAccountsSection';
import PortfolioSection from './PortfolioSection';
import TasksSection from './TasksSection';
import NotesSection from './NotesSection';
import PageTitleSetter from './PageTitleSetter';
import PrioritiesConcernsSection from './PrioritiesConcernsSection';
import FinancialSummarySection from './FinancialSummarySection';

// Server-side data fetching
// AI_DECISION: Usar helper apiCallWithToken para Server Components
// Justificación: Permite usar cliente centralizado también en Server Components
// Impacto: Consistencia con cliente API, mejor manejo de errores
import { apiCallWithToken } from '@/lib/api-server';
import { config } from '@/lib/config';

async function getContactData(id: string, token: string) {
  try {
    // Usar helper para Server Components
    // apiCallWithToken returns { data: {...} } directly from the API response
    const contactResponse = await apiCallWithToken<Contact>(`/v1/contacts/${id}`, {
      token,
      method: 'GET',
      timeoutMs: Math.min(config.apiTimeout, 8000)
    });

    // Check if response has data property (API returns { data: {...} })
    if (!contactResponse?.data) {
      return null;
    }

    const contact = contactResponse.data;

    // Fetch related data in parallel usando helper
    // Catch errors and return empty arrays wrapped in response structure
    const [stagesResponse, advisorsResponse, brokerAccountsResponse, portfolioResponse, tasksResponse, notesResponse] = await Promise.all([
      apiCallWithToken<PipelineStage[]>('/v1/pipeline/stages', { token, timeoutMs: 8000 }).catch(() => ({ data: [] })),
      apiCallWithToken<Advisor[]>('/v1/users/advisors', { token, timeoutMs: 8000 }).catch(() => ({ data: [] })),
      apiCallWithToken<BrokerAccount[]>(`/v1/broker-accounts?contactId=${id}`, { token, timeoutMs: 8000 }).catch(() => ({ data: [] })),
      apiCallWithToken<PortfolioAssignment[]>(`/v1/portfolios/assignments?contactId=${id}`, { token, timeoutMs: 8000 }).catch(() => ({ data: [] })),
      apiCallWithToken<Task[]>(`/v1/tasks?contactId=${id}`, { token, timeoutMs: 8000 }).catch(() => ({ data: [] })),
      apiCallWithToken<Note[]>(`/v1/notes?contactId=${id}`, { token, timeoutMs: 8000 }).catch(() => ({ data: [] }))
    ]);

    // Extract data from responses (all have { data: [...] } structure)
    const stages = stagesResponse?.data || [];
    const advisors = advisorsResponse?.data || [];
    const brokerAccounts = brokerAccountsResponse?.data || [];
    const portfolioAssignments = portfolioResponse?.data || [];
    const tasks = tasksResponse?.data || [];
    const notes = notesResponse?.data || [];

    return {
      contact,
      stages,
      advisors,
      brokerAccounts,
      portfolioAssignments,
      tasks,
      notes
    };
  } catch (error) {
    // En server components, usar console.error es aceptable
    console.error('Error fetching contact data', { err: error, contactId: id });
    return null;
  }
}

interface ContactDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = params;
  
  // Get token from cookies
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    return <Alert variant="error">Authentication required. Please log in.</Alert>;
  }
  
  const data = await getContactData(id, token);

  if (!data) {
    notFound();
  }

  const { contact, stages, advisors, brokerAccounts, portfolioAssignments, tasks, notes } = data;

  // Find related data
  const currentStage = stages.find((stage: PipelineStage) => stage.id === contact.pipelineStageId);
  const assignedAdvisor = advisors.find((advisor: Advisor) => advisor.id === contact.assignedAdvisorId);

  // Define breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Contactos', href: '/contacts' },
    { label: contact.fullName, href: `/contacts/${contact.id}` },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageTitleSetter contactName={contact.fullName} />
      <Stack direction="column" gap="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mt-2">
              {currentStage && (
                <Badge style={{ backgroundColor: currentStage.color, color: 'white' }}>
                  {currentStage.name}
                </Badge>
              )}
              {contact.tags && contact.tags.map((tag: { id: string; name: string; color?: string }) => (
                <Badge key={tag.id} variant="default">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Ficha del Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Grilla moderna 2 columnas: combina personales y comerciales para mejor uso del espacio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna izquierda */}
              <div className="space-y-4">
                <Heading size="sm" className="mb-1">Datos Personales</Heading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ContactEditableField 
                    label="Email" 
                    value={contact.email} 
                    field="email"
                    contactId={contact.id}
                    type="email"
                  />
                  <ContactEditableField 
                    label="Teléfono" 
                    value={contact.phone} 
                    field="phone"
                    contactId={contact.id}
                    type="tel"
                  />
                  <ContactEditableField
                    label="País"
                    value={contact.country}
                    field="country"
                    contactId={contact.id}
                  />
                  <ContactEditableField 
                    label="DNI" 
                    value={contact.dni} 
                    field="dni"
                    contactId={contact.id}
                  />
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-4">
                <Heading size="sm" className="mb-1">Información Comercial</Heading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ContactEditableField 
                    label="Fuente" 
                    value={contact.source} 
                    field="source"
                    contactId={contact.id}
                    placeholder="Ej: Referido, Web, Evento..."
                  />
                  <ContactEditableField 
                    label="Perfil de Riesgo" 
                    value={contact.riskProfile} 
                    field="riskProfile"
                    contactId={contact.id}
                    placeholder="Ej: Conservador, Moderado, Agresivo..."
                  />
                  {assignedAdvisor && (
                    <div className="sm:col-span-2">
                      <Text size="sm" weight="medium" color="secondary">Asesor Asignado</Text>
                      <Text className="mt-1">{assignedAdvisor.fullName}</Text>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Text size="sm" weight="medium" color="secondary">Próximo Paso</Text>
                    <Text className="mt-1">{contact.nextStep || 'Sin especificar'}</Text>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Adicional */}
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Disposición en grilla para aprovechar mejor el espacio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ContactEditableField 
                label="A qué se dedica" 
                value={contact.queSeDedica} 
                field="queSeDedica"
                contactId={contact.id}
                type="textarea"
                maxLength={2000}
                placeholder="Describe a qué se dedica el contacto..."
              />
              <ContactEditableField 
                label="Familia" 
                value={contact.familia} 
                field="familia"
                contactId={contact.id}
                type="textarea"
                maxLength={2000}
                placeholder="Información sobre la familia del contacto..."
              />
              <ContactEditableField 
                label="Expectativas" 
                value={contact.expectativas} 
                field="expectativas"
                contactId={contact.id}
                type="textarea"
                maxLength={2000}
                placeholder="Expectativas del contacto..."
              />
              <ContactEditableField 
                label="Objetivos" 
                value={contact.objetivos} 
                field="objetivos"
                contactId={contact.id}
                type="textarea"
                maxLength={2000}
                placeholder="Objetivos del contacto..."
              />
              <div className="md:col-span-2">
                <ContactEditableField 
                  label="¿Qué tendría que tener tu planificación para que avancemos?" 
                  value={contact.requisitosPlanificacion} 
                  field="requisitosPlanificacion"
                  contactId={contact.id}
                  type="textarea"
                  maxLength={2000}
                  placeholder="Requisitos o condiciones para avanzar con la planificación..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Financiero */}
        <FinancialSummarySection
          contactId={contact.id}
          ingresos={contact.ingresos}
          gastos={contact.gastos}
          excedente={contact.excedente}
        />

        {/* Prioridades y Preocupaciones */}
        <PrioritiesConcernsSection
          contactId={contact.id}
          prioridades={contact.prioridades || []}
          preocupaciones={contact.preocupaciones || []}
        />

        {/* Client Islands for Interactive Sections */}
        <BrokerAccountsSection 
          contactId={contact.id} 
          initialBrokerAccounts={brokerAccounts}
        />
        
        <PortfolioSection 
          contactId={contact.id} 
          initialPortfolioAssignments={portfolioAssignments}
        />
        
        <TasksSection 
          contactId={contact.id} 
          initialTasks={tasks}
        />
        
        <NotesSection 
          contactId={contact.id} 
          initialNotes={notes}
        />
      </Stack>
    </div>
  );
}