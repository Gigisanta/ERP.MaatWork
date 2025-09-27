import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Contact, ContactStatus } from '../types/crm';
import { useCRMStore } from '../store/crmStore';
import { Phone, Mail, Building, User, Calendar } from 'lucide-react';
import { cn } from '../utils/cn';
// import { LayoutConfig } from '../config/layoutConfig';

interface KanbanBoardProps {
  contacts: Contact[];
  onStatusChange: (contactId: string, newStatus: ContactStatus) => void;
}

const KANBAN_COLUMNS: { status: ContactStatus; title: string; color: string }[] = [
  { status: 'Prospecto', title: 'Prospecto', color: 'bg-cactus-50 dark:bg-cactus-900/20 border border-cactus-200 dark:border-cactus-800' },
  { status: 'Contactado', title: 'Contactado', color: 'bg-cactus-50 dark:bg-cactus-900/20 border border-cactus-200 dark:border-cactus-800' },
  { status: 'Primera Reunion', title: 'Primera Reunión', color: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' },
  { status: 'Segunda Reunion', title: 'Segunda Reunión', color: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' },
  { status: 'Apertura', title: 'Apertura', color: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' },
  { status: 'Cliente', title: 'Cliente', color: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' },
  { status: 'Caido', title: 'Caído', color: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' },
  { status: 'Cuenta Vacia', title: 'Cuenta Vacía', color: 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800' }
];

const ContactCard: React.FC<{ contact: Contact; index: number }> = ({ contact, index }) => {
  const formatCurrency = (value?: number) => {
    if (!value) return 'Sin valor';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Draggable draggableId={contact.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-4 cursor-move transition-all duration-200 flex-shrink-0 w-full mb-3',
            snapshot.isDragging && "shadow-lg rotate-2 scale-105",
            "hover:shadow-md"
          )}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm leading-tight">
                  {contact.name}
                </h3>

              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-blue-600">
                  {formatCurrency(contact.value)}
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-1">
              <div className="flex items-center text-xs text-neutral-600 dark:text-neutral-400">
                <Mail size={12} className="mr-2 text-neutral-400 dark:text-neutral-500" />
                <span className="truncate">{contact.email}</span>
              </div>
              <div className="flex items-center text-xs text-neutral-600 dark:text-neutral-400">
                <Phone size={12} className="mr-2 text-neutral-400 dark:text-neutral-500" />
                <span>{contact.phone}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center text-xs text-neutral-600 dark:text-neutral-400">
                <User size={12} className="mr-1" />
                <span>{contact.assignedTo}</span>
              </div>
              <div className="flex items-center text-xs text-neutral-600 dark:text-neutral-400">
                <Calendar size={12} className="mr-1" />
                <span>{formatDate(contact.lastContactDate)}</span>
              </div>
            </div>

            {/* Notes indicator */}
            {contact.notes.length > 0 && (
              <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                {contact.notes.length} nota{contact.notes.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

const KanbanColumn: React.FC<{
  column: typeof KANBAN_COLUMNS[0];
  contacts: Contact[];
}> = ({ column, contacts }) => {
  return (
    <div className={cn("rounded-lg border-2 border-dashed p-4 min-h-[500px] min-w-[280px]", column.color)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm mb-1">{column.title}</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">{contacts.length} contacto{contacts.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      
      <Droppable droppableId={column.status} direction="vertical" type="CONTACT">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex flex-col gap-3 overflow-y-auto pb-2 min-h-[120px] transition-colors duration-200",
              snapshot.isDraggingOver && 'bg-neutral-50 dark:bg-neutral-700 rounded-lg'
            )}
          >
            {contacts.map((contact, index) => (
              <ContactCard key={contact.id} contact={contact} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ contacts, onStatusChange }) => {
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Cambiar el estado del contacto
    const newStatus = destination.droppableId as ContactStatus;
    onStatusChange(draggableId, newStatus);
  };

  // Organizar contactos por estado
  const contactsByStatus = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.status] = contacts.filter(contact => contact.status === column.status);
    return acc;
  }, {} as Record<ContactStatus, Contact[]>);

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-6">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-4 h-full overflow-x-auto">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              column={column}
              contacts={contactsByStatus[column.status] || []}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;