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
import ContactEditableField from './ContactEditableField';
import BrokerAccountsSection from './BrokerAccountsSection';
import PortfolioSection from './PortfolioSection';
import TasksSection from './TasksSection';
import NotesSection from './NotesSection';

// Types
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  country?: string;
  dni?: string;
  pipelineStageId?: string;
  source?: string;
  riskProfile?: string;
  assignedAdvisorId?: string;
  assignedTeamId?: string;
  nextStep?: string;
  notes?: string;
  customFields?: Record<string, any>;
  contactLastTouchAt?: string;
  pipelineStageUpdatedAt?: string;
  deletedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string; color: string }>;
}

interface BrokerAccount {
  id: string;
  broker: string;
  accountNumber: string;
  holderName?: string;
  contactId: string;
  status: 'active' | 'closed';
  lastSyncedAt?: string;
  createdAt: string;
}

interface PortfolioAssignment {
  id: string;
  contactId: string;
  templateId: string;
  templateName: string;
  status: 'active' | 'paused' | 'ended';
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
}

interface Task {
  id: string;
  contactId: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  priority?: string;
  createdAt: string;
}

interface Note {
  id: string;
  contactId: string;
  authorUserId?: string;
  source: string;
  noteType: string;
  content: string;
  authorName?: string;
  createdAt: string;
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface Advisor {
  id: string;
  fullName: string;
  email: string;
}

// Server-side data fetching
async function getContactData(id: string, token: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Fetch contact data
    const contactResponse = await fetch(`${apiUrl}/contacts/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store' // Ensure fresh data
    });

    if (!contactResponse.ok) {
      return null;
    }

    const contactData = await contactResponse.json();
    const contact = contactData.data;

    // Fetch related data in parallel
    const [stagesResponse, advisorsResponse, brokerAccountsResponse, portfolioResponse, tasksResponse, notesResponse] = await Promise.all([
      fetch(`${apiUrl}/pipeline/stages`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`${apiUrl}/users/advisors`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`${apiUrl}/broker-accounts?contactId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`${apiUrl}/portfolios/assignments?contactId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`${apiUrl}/tasks?contactId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`${apiUrl}/notes?contactId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
    ]);

    const [stagesData, advisorsData, brokerAccountsData, portfolioData, tasksData, notesData] = await Promise.all([
      stagesResponse.ok ? stagesResponse.json() : { data: [] },
      advisorsResponse.ok ? advisorsResponse.json() : { data: [] },
      brokerAccountsResponse.ok ? brokerAccountsResponse.json() : { data: [] },
      portfolioResponse.ok ? portfolioResponse.json() : { data: [] },
      tasksResponse.ok ? tasksResponse.json() : { data: [] },
      notesResponse.ok ? notesResponse.json() : { data: [] }
    ]);

    return {
      contact,
      stages: stagesData.data || [],
      advisors: advisorsData.data || [],
      brokerAccounts: brokerAccountsData.data || [],
      portfolioAssignments: portfolioData.data || [],
      tasks: tasksData.data || [],
      notes: notesData.data || []
    };
  } catch (error) {
    console.error('Error fetching contact data:', error);
    return null;
  }
}

interface ContactDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;
  
  // Get token from cookies
  const cookieStore = await cookies();
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
      <Stack direction="column" gap="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <Heading size="xl">{contact.fullName}</Heading>
            <div className="flex items-center gap-2 mt-2">
              {currentStage && (
                <Badge style={{ backgroundColor: currentStage.color, color: 'white' }}>
                  {currentStage.name}
                </Badge>
              )}
              {contact.tags && contact.tags.map((tag: any) => (
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
            <CardTitle>Información del Contacto</CardTitle>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <Heading size="sm" className="mb-4">Datos Personales</Heading>
                <Stack direction="column" gap="md">
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
                  </Stack>
              </div>
              <div>
                <Heading size="sm" className="mb-4">Información Comercial</Heading>
                <Stack direction="column" gap="md">
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
                    <div>
                      <Text size="sm" weight="medium" color="secondary">Asesor Asignado</Text>
                      <Text className="mt-1">{assignedAdvisor.fullName}</Text>
                    </div>
                  )}
                  <div>
                    <Text size="sm" weight="medium" color="secondary">Próximo Paso</Text>
                    <Text className="mt-1">{contact.nextStep || 'Sin especificar'}</Text>
                  </div>
                </Stack>
                        </div>
                    </div>
                </CardContent>
              </Card>

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