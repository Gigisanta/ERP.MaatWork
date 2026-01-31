'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Text } from '@maatwork/ui';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface PaperNotesSectionProps {
  contactId: string;
  initialNotes: string | null | undefined;
}

export default function PaperNotesSection({ contactId, initialNotes }: PaperNotesSectionProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with server if props change (e.g. after refresh)
  useEffect(() => {
    setNotes(initialNotes || '');
  }, [initialNotes]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setNotes(newValue);
    setIsSaving(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce save (1s)
    timeoutRef.current = setTimeout(async () => {
      try {
        const { updateContactField } = await import('./actions');
        await updateContactField(contactId, 'notes', newValue);
        setIsSaving(false);
        router.refresh();
      } catch (err) {
        logger.error({ err, contactId }, 'Error saving paper notes');
        setIsSaving(false);
      }
    }, 1000);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Notas</CardTitle>
          <Text size="xs" color={isSaving ? 'warning' : 'muted'}>
            {isSaving ? 'Guardando...' : 'Guardado'}
          </Text>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-[300px]">
        <textarea
          className="w-full h-full p-4 resize-none focus:outline-none bg-gray-50 text-gray-800 font-handwriting text-lg leading-relaxed border-none"
          placeholder="Escribe tus notas aquí..."
          value={notes}
          onChange={handleChange}
          style={{
            minHeight: '300px',
            backgroundColor: '#f9fafb', // gray-50
            backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)', // darker lines for contrast
            backgroundSize: '100% 2rem',
            lineHeight: '2rem',
            paddingTop: '0.5rem',
          }}
        />
      </CardContent>
    </Card>
  );
}
