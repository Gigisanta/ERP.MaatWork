'use client';
import React, { useState, useEffect, useTransition } from 'react';
import { Text, Spinner, Input } from '@maatwork/ui';
import { useRouter } from 'next/navigation';
import { logger, toLogContext } from '@/lib/logger';

// AI_DECISION: Client wrapper for Server Action to avoid prop passing
// Justificación: Server Actions cannot be passed as props to Client Components
// Impacto: Maintains server-side data mutation while enabling client interactivity

interface ContactEditableFieldProps {
  label: string;
  value: string | null | undefined;
  field: string;
  contactId: string;
  placeholder?: string;
  emptyText?: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'textarea';
  maxLength?: number;
}

/**
 * ContactEditableField - Client wrapper for inline contact field editing
 *
 * Handles Server Action calls internally to avoid prop passing issues
 *
 * @example
 * <ContactEditableField
 *   label="Email"
 *   value={contact.email}
 *   field="email"
 *   contactId={contact.id}
 * />
 */
export default function ContactEditableField({
  label,
  value,
  field,
  contactId,
  placeholder,
  emptyText = 'Sin especificar',
  type = 'text',
  maxLength,
}: ContactEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleSave = async () => {
    if (localValue === value) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      try {
        // Import and call Server Action dynamically
        const { updateContactField } = await import('./actions');
        await updateContactField(contactId, field, localValue);
        setIsEditing(false);
        // Revalidate the page data to show updated values
        router.refresh();
      } catch (err) {
        logger.error(
          toLogContext({ err, contactId, field, value }),
          'Error updating contact field'
        );
        setLocalValue(value || '');
      }
    });
  };

  const handleCancel = () => {
    setLocalValue(value || '');
    setIsEditing(false);
  };

  if (isEditing) {
    if (type === 'textarea') {
      return (
        <div className="space-y-2">
          <textarea
            value={localValue}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Escape') handleCancel();
              // Ctrl/Cmd + Enter to save
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
            }}
            {...(placeholder ? { placeholder } : {})}
            {...(maxLength ? { maxLength } : {})}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            autoFocus
          />
          <div className="flex items-center justify-between">
            {maxLength && (
              <Text size="xs" color="muted">
                {localValue.length} / {maxLength}
              </Text>
            )}
            <div className="flex items-center gap-1.5">
              {isPending && <Spinner size="sm" />}
              <Text size="xs" color="muted">
                Ctrl+Enter guardar, Esc cancelar
              </Text>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Input
          type={type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'text'}
          value={localValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          {...(placeholder ? { placeholder } : {})}
          className="flex-1"
          autoFocus
          size="sm"
        />
        {isPending && <Spinner size="sm" />}
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-gray-50 px-1.5 py-0.5 rounded"
      onClick={() => setIsEditing(true)}
    >
      <Text size="xs" weight="medium" color="secondary">
        {label}
      </Text>
      {type === 'textarea' ? (
        <Text size="sm" className="mt-0.5 whitespace-pre-wrap">
          {value || <span className="text-gray-400">{emptyText}</span>}
        </Text>
      ) : (
        <Text size="sm" className="mt-0.5">
          {value || <span className="text-gray-400">{emptyText}</span>}
        </Text>
      )}
    </div>
  );
}
