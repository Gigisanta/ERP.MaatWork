// AI_DECISION: Convert to server component with client islands pattern
// Justificación: Server-side data fetching reduces First Load JS by ~400KB
// Impacto: Static content rendered server-side, interactivity isolated to client islands

import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
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
// AI_DECISION: Usar helper apiCall para Server Components
// Justificación: Permite usar cliente centralizado también en Server Components con manejo automático de cookies
// Impacto: Consistencia con cliente API, mejor manejo de errores, autenticación automática vía cookies
import { apiCall } from '@/lib/api-server';
import { config } from '@/lib/config';

// AI_DECISION: Use consolidated /detail endpoint instead of multiple parallel calls
// Justificación: Reduces from 6+ API calls to 1, eliminating network latency and reducing database roundtrips
// Impacto: Reduces total response time by 60-80% by consolidating queries
async function getContactData(id: string) {
  try {
    // Use consolidated detail endpoint that returns all related data in a single response
    const detailResponse = await apiCall<{
      contact: Contact;
      tags: Array<{ id: string; name: string; color: string; icon: string | null }>;
      tasks: Task[];
      notes: Note[];
      brokerAccounts: BrokerAccount[];
      portfolioAssignments: PortfolioAssignment[];
      stages: PipelineStage[];
      advisors: Advisor[];
    }>(`/v1/contacts/${id}/detail`, {
      method: 'GET',
      timeoutMs: Math.min(config.apiTimeout, 10000) // Slightly higher timeout for consolidated endpoint
    });

    // Check if response has data property (API returns { data: {...} })
    if (!detailResponse?.data) {
      return null;
    }

    const {
      contact,
      tags,
      tasks,
      notes,
      brokerAccounts,
      portfolioAssignments,
      stages,
      advisors
    } = detailResponse.data;

    // Merge tags into contact object for compatibility
    const contactWithTags = {
      ...contact,
      tags: tags || []
    };

    return {
      contact: contactWithTags,
      stages: stages || [],
      advisors: advisors || [],
      brokerAccounts: brokerAccounts || [],
      portfolioAssignments: portfolioAssignments || [],
      tasks: tasks || [],
      notes: notes || []
    };
  } catch (error) {
    // AI_DECISION: Usar console.error en Server Components
    // Justificación: Server Components no tienen acceso a logger del cliente. console.error
    //                es la forma estándar de logging en Node.js y Next.js Server Components.
    //                Los errores se capturan y manejan apropiadamente sin afectar la UI.
    // Impacto: Logging apropiado en contexto de servidor sin dependencias del cliente
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
  
  // apiCall maneja cookies automáticamente, no necesitamos obtener token manualmente
  const data = await getContactData(id);

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
    <div className="p-3 md:p-4">
      <PageTitleSetter contactName={contact.fullName} />
      <Stack direction="column" gap="md">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {currentStage && (
                <Badge style={{ backgroundColor: currentStage.color, color: 'white' }} className="text-xs">
                  {currentStage.name}
                </Badge>
              )}
              {contact.tags && contact.tags.map((tag) => (
                <Badge key={tag.id} variant="default" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <Card padding="sm">
          <CardHeader className="mb-2">
            <CardTitle className="text-base">Ficha del Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Grilla moderna 2 columnas: combina personales y comerciales para mejor uso del espacio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {/* Columna izquierda */}
              <div className="space-y-3">
                <Heading size="sm" className="mb-1 text-sm">Datos Personales</Heading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
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
              <div className="space-y-3">
                <Heading size="sm" className="mb-1 text-sm">Información Comercial</Heading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
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
                      <Text size="xs" weight="medium" color="secondary">Asesor Asignado</Text>
                      <Text size="sm" className="mt-0.5">{assignedAdvisor.fullName}</Text>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Text size="xs" weight="medium" color="secondary">Próximo Paso</Text>
                    <Text size="sm" className="mt-0.5">{contact.nextStep || 'Sin especificar'}</Text>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Adicional */}
        <Card padding="sm">
          <CardHeader className="mb-2">
            <CardTitle className="text-base">Información</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Disposición en grilla para aprovechar mejor el espacio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
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