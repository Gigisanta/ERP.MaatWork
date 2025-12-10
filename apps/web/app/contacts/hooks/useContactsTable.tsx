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
        key: 'actions',
        header: 'Acciones',
        render: (contact) => (
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm">
                <Icon name="more-vertical" size={16} />
              </Button>
            }
          >
            <DropdownMenuItem onClick={() => router.push(`/contacts/${contact.id}`)}>
              <Icon name="edit" size={16} className="mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteClick(contact)}>
              <Icon name="trash-2" size={16} className="mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenu>
        ),
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
