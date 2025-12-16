'use client';

/**
 * BloombergMacroWidget - Widget compacto con curvas de tasas e indicadores macro
 *
 * AI_DECISION: Componente compacto para mostrar macro y curvas en espacio reducido
 * Justificación: Versión optimizada de MacroPanel y YieldCurveChart para dashboard
 * Impacto: Mejor uso del espacio, información macro accesible rápidamente
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Grid,
  Text,
  Stack,
  Badge,
  Spinner,
  Alert,
} from '@cactus/ui';
import { getYieldSpreads } from '@/lib/api/bloomberg';
import { useEffect } from 'react';

interface BloombergMacroWidgetProps {
  className?: string;
}

export default function BloombergMacroWidget({ className }: BloombergMacroWidgetProps) {
  const [usSpreads, setUsSpreads] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpreads = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getYieldSpreads('US');
        if (response.success && response.data?.spreads) {
          setUsSpreads(response.data.spreads);
        } else {
          setError(response.error || 'Failed to fetch yield spreads');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSpreads();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSpreads, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const isInverted = usSpreads && usSpreads['2s10s'] && usSpreads['2s10s'] < 0;

  return (
    <Grid cols={1} gap="md" className={`lg:grid-cols-2 ${className}`}>
      {/* US Treasury Spreads */}
      <Card>
        <CardHeader>
          <Stack direction="row" gap="sm" align="center" justify="between">
            <CardTitle>US Treasury Spreads</CardTitle>
            {isInverted && <Badge variant="error">Inverted</Badge>}
          </Stack>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner size="md" />
            </div>
          ) : error ? (
            <Alert variant="error">{error}</Alert>
          ) : usSpreads ? (
            <Stack direction="column" gap="md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text size="sm" color="secondary">
                    2s10s Spread
                  </Text>
                  <Text
                    size="lg"
                    weight="bold"
                    style={{
                      color: usSpreads['2s10s'] && usSpreads['2s10s'] < 0 ? '#ef4444' : '#10b981',
                    }}
                  >
                    {usSpreads['2s10s']?.toFixed(2)}%
                  </Text>
                </div>
                {usSpreads['3m10y'] !== undefined && (
                  <div>
                    <Text size="sm" color="secondary">
                      3m-10y Spread
                    </Text>
                    <Text size="lg" weight="bold">
                      {usSpreads['3m10y'].toFixed(2)}%
                    </Text>
                  </div>
                )}
              </div>
              {isInverted && (
                <Alert variant="warning">
                  <Text size="sm">
                    La curva está invertida (2s10s negativo), indicando expectativas de recesión.
                  </Text>
                </Alert>
              )}
            </Stack>
          ) : (
            <Text color="secondary">No data available</Text>
          )}
        </CardContent>
      </Card>

      {/* Macro Indicators Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Macro Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="md">
            <div>
              <Text size="sm" color="secondary" weight="medium" className="mb-2">
                Argentina
              </Text>
              <Stack direction="column" gap="xs">
                <div className="flex justify-between">
                  <Text size="sm">Badlar</Text>
                  <Text size="sm" color="secondary">
                    N/A
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm">IPC</Text>
                  <Text size="sm" color="secondary">
                    N/A
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm">TC Oficial</Text>
                  <Text size="sm" color="secondary">
                    N/A
                  </Text>
                </div>
              </Stack>
            </div>
            <div>
              <Text size="sm" color="secondary" weight="medium" className="mb-2">
                United States
              </Text>
              <Stack direction="column" gap="xs">
                <div className="flex justify-between">
                  <Text size="sm">CPI</Text>
                  <Text size="sm" color="secondary">
                    N/A
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm">Fed Funds Rate</Text>
                  <Text size="sm" color="secondary">
                    N/A
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm">Unemployment</Text>
                  <Text size="sm" color="secondary">
                    N/A
                  </Text>
                </div>
              </Stack>
            </div>
            <Text size="xs" color="muted" className="mt-2">
              Para datos completos, visita la página de detalle de activos o el panel macro
              completo.
            </Text>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}
