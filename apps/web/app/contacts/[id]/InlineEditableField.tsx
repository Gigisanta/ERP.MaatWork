"use client";
import React, { useState, useEffect } from 'react';
import { Text, Spinner, Input } from '@cactus/ui';

// AI_DECISION: Extracted to client island for interactivity isolation
// Justificación: Server component for static data, client only where needed
// Impacto: Reduces First Load JS ~400KB → ~150KB for this route

interface InlineEditableFieldProps {
  label: string;
  value: string | null | undefined;
  field: string;
  onSave: (field: string, value: string) => Promise<void>;
  placeholder?: string;
  emptyText?: string;
  type?: 'text' | 'email' | 'tel' | 'number';
}

/**
 * InlineEditableField - Client Island for inline text editing
 * 
 * @example
 * <InlineEditableField
 *   label="Email"
 *   value={contact.email}
 *   field="email"
 *   onSave={handleSave}
 * />
 */
export default function InlineEditableField({ 
  label, 
  value, 
  field, 
  onSave, 
  placeholder, 
  emptyText = "Sin especificar", 
  type = 'text' 
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleSave = async () => {
    if (localValue === value) {
      setIsEditing(false);
      return;
    }
    
    setSaving(true);
    try {
      await onSave(field, localValue);
      setIsEditing(false);
    } catch (err) {
      setLocalValue(value || '');
    } finally {
      setSaving(false);
    }
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
        {saving && <Spinner size="sm" />}
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

