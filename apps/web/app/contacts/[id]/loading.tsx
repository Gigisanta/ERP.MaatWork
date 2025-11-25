import React from 'react';
import { Stack, Card, CardHeader, CardTitle, CardContent, Heading, Text } from '@cactus/ui';

export default function Loading() {
  return (
    <div className="p-4 md:p-6">
      <Stack direction="column" gap="lg">
        <div>
          <Heading size="xl">Cargando contacto…</Heading>
          <Text className="mt-2" color="secondary">Por favor espera</Text>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Información del Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-24 bg-gray-100 rounded" />
              <div className="h-24 bg-gray-100 rounded" />
            </div>
          </CardContent>
        </Card>
      </Stack>
    </div>
  );
}


