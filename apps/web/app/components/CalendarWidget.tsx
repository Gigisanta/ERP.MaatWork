"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Spinner, Alert, Text, Stack, Button } from '@cactus/ui';
import Link from 'next/link';

interface CalendarWidgetProps {
  calendarUrl: string;
  className?: string;
}

/**
 * Convierte una URL de Google Calendar al formato de embed si es necesario
 * Si la URL ya es de embed, la devuelve tal cual con vista semanal por defecto
 * Si es una URL de visualización con cid, la convierte a embed con vista semanal
 */
function normalizeCalendarUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Si ya es una URL de embed, agregar/actualizar el parámetro mode=week
    if (urlObj.pathname.includes('/embed')) {
      urlObj.searchParams.set('mode', 'week');
      return urlObj.toString();
    }
    
    // Si tiene parámetro cid, convertir a embed con vista semanal
    const cid = urlObj.searchParams.get('cid');
    if (cid) {
      return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(cid)}&mode=week`;
    }
    
    // Si tiene parámetro src, asegurar que sea embed con vista semanal
    const src = urlObj.searchParams.get('src');
    if (src) {
      return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(src)}&mode=week`;
    }
    
    // Si no se puede convertir, devolver la URL original
    return url;
  } catch {
    // Si no es una URL válida, devolverla tal cual
    return url;
  }
}

export default function CalendarWidget({ calendarUrl, className }: CalendarWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const embedUrl = useMemo(() => normalizeCalendarUrl(calendarUrl), [calendarUrl]);

  useEffect(() => {
    // Reset states when URL changes
    setLoading(true);
    setError(null);

    // Set a timeout to detect if iframe fails to load
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          // Still loading after timeout, but don't set error - let iframe try
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => clearTimeout(timeout);
  }, [embedUrl]);

  const handleIframeLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('No se pudo cargar el calendario. Verifica que la URL sea correcta y que el calendario esté compartido públicamente.');
  };

  // Detectar errores 403 mediante mensaje de error en el iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Google Calendar puede enviar mensajes de error
      if (event.origin.includes('google.com') && event.data?.type === 'error') {
        setLoading(false);
        setError('Error 403: El calendario no está configurado como público o la URL no es correcta. Ve a tu perfil para configurar la URL correcta.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Calendario del Equipo</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="error">
            <Stack direction="column" gap="md">
              <div>
                <Text weight="medium">Error al cargar el calendario</Text>
                <Text size="sm" color="secondary" className="mt-2 block">{error}</Text>
              </div>
              <div>
                <Text size="sm" weight="medium" className="mb-2 block">Solución:</Text>
                <Text size="sm" color="secondary" className="mb-3 block">
                  1. Ve a Google Calendar → Configuración del calendario<br />
                  2. En "Compartir este calendario", marca "Hacer público este calendario"<br />
                  3. En "Integrar calendario", copia la URL de "Código para incrustar"<br />
                  4. La URL debe tener el formato: https://calendar.google.com/calendar/embed?src=...
                </Text>
                <Link href="/profile">
                  <Button variant="outline" size="sm">
                    Configurar calendario en Perfil
                  </Button>
                </Link>
              </div>
            </Stack>
          </Alert>
        ) : (
          <div className="relative w-full" style={{ minHeight: '400px' }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                <Stack direction="column" gap="md" align="center">
                  <Spinner size="lg" />
                  <Text size="sm" color="secondary">Cargando calendario...</Text>
                </Stack>
              </div>
            )}
            <iframe
              src={embedUrl}
              width="100%"
              height="400"
              frameBorder="0"
              scrolling="no"
              loading="lazy"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{
                border: 'none',
                borderRadius: '8px',
                minHeight: '400px'
              }}
              title="Calendario del Equipo"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

