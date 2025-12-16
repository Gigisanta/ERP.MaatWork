import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Contact, PipelineStage, Tag } from '@/types';
import type { Column } from '@cactus/ui';
import InlineStageSelect from '../components/InlineStageSelect';
import InlineTagsEditor from '../components/InlineTagsEditor';
import InlineTextInput from '../components/InlineTextInput';
import { Button, Icon, Text, DropdownMenu, DropdownMenuItem } from '@cactus/ui';

interface UseContactsTableProps {
  pipelineStages: PipelineStage[];
  allTags: Tag[];
  savingContactId: string | null;
  onStageChange: (contactId: string, stageId: string | null) => void;
  onTagsChange: (contactId: string, add: string[], remove: string[]) => void;
  onTextInputSave: (contactId: string, field: string, value: string) => Promise<void>;
  onDeleteClick: (contact: Contact) => void;
  showToast: (title: string, description?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function useContactsTable({
  pipelineStages,
  allTags,
  savingContactId,
  onStageChange,
  onTagsChange,
  onTextInputSave,
  onDeleteClick,
  showToast,
}: UseContactsTableProps) {
  const router = useRouter();

  const columns: Column<Contact>[] = useMemo(
    () => [
      {
        key: 'fullName',
        header: 'Nombre',
        sortable: true,
        render: (contact) => (
          <Link
            href={`/contacts/${contact.id}`}
            className="block hover:opacity-80 transition-opacity"
          >
            <Text weight="medium" className="text-primary cursor-pointer">
              {contact.fullName}
            </Text>
            {contact.email && (
              <Text size="sm" color="secondary">
                {contact.email}
              </Text>
            )}
          </Link>
        ),
      },
      {
        key: 'pipelineStageId',
        header: 'Etapa',
        render: (contact) => (
          <InlineStageSelect
            contact={contact}
            pipelineStages={
              Array.isArray(pipelineStages) ? (pipelineStages as PipelineStage[]) : []
            }
            isSaving={savingContactId === contact.id}
            onStageChange={onStageChange}
            onMutate={() => {}}
            onError={(error: Error) => {
              showToast('Error al avanzar etapa', error.message, 'error');
            }}
          />
        ),
      },
      {
        key: 'tags',
        header: 'Etiquetas',
        render: (contact) => (
          <InlineTagsEditor
            contact={contact}
            allTags={Array.isArray(allTags) ? (allTags as Tag[]) : []}
            isSaving={savingContactId === contact.id}
            onTagsChange={onTagsChange}
            onManageTagsClick={() => {}}
          />
        ),
      },
      {
        key: 'nextStep',
        header: 'Próximo Paso',
        render: (contact) => (
          <InlineTextInput
            contact={contact}
            field="nextStep"
            placeholder="Agregar próximo paso..."
            isSaving={savingContactId === contact.id}
            onSave={onTextInputSave}
          />
        ),
      },
      {
        key: 'meetingStatus',
        header: 'Reuniones',
        render: (contact) => {
          const status = contact.meetingStatus;
          // If no status, show empty placeholders or nothing
          if (!status)
            return (
              <Text size="xs" color="secondary">
                -
              </Text>
            );

          return (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5" title="Primera Reunión">
                <Text size="xs" className="text-[10px] uppercase font-bold text-gray-400">
                  1ª
                </Text>
                {status.firstMeeting?.completed ? (
                  <Icon name="check-circle" size={16} className="text-green-500" />
                ) : status.firstMeeting?.scheduled ? (
                  <Icon name="calendar" size={16} className="text-blue-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5" title="Segunda Reunión">
                <Text size="xs" className="text-[10px] uppercase font-bold text-gray-400">
                  2ª
                </Text>
                {status.secondMeeting?.completed ? (
                  <Icon name="check-circle" size={16} className="text-green-500" />
                ) : status.secondMeeting?.scheduled ? (
                  <Icon name="calendar" size={16} className="text-blue-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                )}
              </div>
            </div>
          );
        },
      },
    ],
    [
      pipelineStages,
      allTags,
      savingContactId,
      onStageChange,
      onTagsChange,
      onTextInputSave,
      onDeleteClick,
      showToast,
      router,
    ]
  ) as Column<Contact>[];

  return { columns };
}
