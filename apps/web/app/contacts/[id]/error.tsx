'use client';

import React from 'react';
import { Alert, Stack } from '@cactus/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-4 md:p-6">
      <Stack direction="column" gap="md">
        <Alert variant="error">Ocurrió un error al cargar el contacto.</Alert>
        <button
          type="button"
          className="inline-flex items-center px-3 py-2 rounded bg-gray-800 text-white"
          onClick={() => reset()}
        >
          Reintentar
        </button>
      </Stack>
    </div>
  );
}
