/**
 * Contact Kanban View
 *
 * Displays contacts in a kanban board grouped by pipeline stage
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Badge, Text } from '@cactus/ui';
import type { Contact, PipelineStage } from '@/types';

export interface ContactKanbanViewProps {
  contacts: Contact[];
  pipelineStages: PipelineStage[];
}

export default function ContactKanbanView({ contacts, pipelineStages }: ContactKanbanViewProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
      {pipelineStages.map((stage: PipelineStage) => {
        const stageContacts = contacts.filter((c: Contact) => c.pipelineStageId === stage.id);
        return (
          <Card key={stage.id} className="rounded-md border border-neutral-200" padding="sm">
            <CardHeader className="p-2 md:p-3 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <CardTitle
                    className="text-xs md:text-sm font-semibold"
                    style={{ color: stage.color }}
                  >
                    {stage.name}
                  </CardTitle>
                </div>
                <Badge className="text-xs h-5 px-1.5">{stageContacts.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-3">
              <div className="space-y-1.5">
                {stageContacts.length === 0 ? (
                  <Text color="secondary" className="text-center py-3 text-xs">
                    Sin contactos
                  </Text>
                ) : (
                  stageContacts.map((contact: Contact) => (
                    <div
                      key={contact.id}
                      className="p-2 bg-gray-50 rounded-md border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <Text weight="medium" className="text-xs md:text-sm truncate">
                            {contact.fullName}
                          </Text>
                          {contact.email && (
                            <Text size="xs" color="secondary" className="mt-0.5 truncate">
                              {contact.email}
                            </Text>
                          )}
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex gap-0.5 ml-1 shrink-0">
                            {contact.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag.id}
                                className="text-[9px] px-1 py-0"
                                style={{ backgroundColor: tag.color || '#6B7280', color: 'white' }}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {contact.tags.length > 2 && (
                              <Badge className="text-[9px] px-1 py-0 bg-gray-300 text-gray-700">
                                +{contact.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
