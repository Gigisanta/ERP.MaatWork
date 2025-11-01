"use client";
import React, { useState, useEffect, useTransition } from 'react';
import { Text, Spinner, Input } from '@cactus/ui';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

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
  type?: 'text' | 'email' | 'tel' | 'number';
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
  emptyText = "Sin especificar", 
  type = 'text' 
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
        logger.error('Error updating contact field', { err, contactId, field, value });
        setLocalValue(value || '');
      }
    });
  };

  const handleCancel = () => {
    setLocalValue(value || '');
    setIsEditing(false);
  };

  if (isEditing) {
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
      className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
      onClick={() => setIsEditing(true)}
    >
      <Text size="sm" weight="medium" color="secondary">{label}</Text>
      <Text className="mt-1">{value || <span className="text-gray-400">{emptyText}</span>}</Text>
    </div>
  );
}
