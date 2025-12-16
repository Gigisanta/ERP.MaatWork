'use client';

/**
 * TechnicalSignals - Display technical indicators and signals
 *
 * AI_DECISION: Client component for technical analysis
 * Justificación: Interactive component with real-time calculations
 * Impacto: Better technical analysis UX
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, Text, Spinner, Alert, Stack, Heading, Badge } from '@cactus/ui';

interface TechnicalSignalsProps {
  symbol: string;
}

export default function TechnicalSignals({ symbol }: TechnicalSignalsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // AI_DECISION: Placeholder para indicadores técnicos (SMA, EMA, RSI, MACD, Bollinger Bands)
    // Justificación: UI lista, cálculos técnicos disponibles en analytics-service (cactus_ingestors/utils/technical.py)
    // Dependencies: Price history en DB, endpoints API para exponer cálculos técnicos
    // Impacto: Mejora análisis técnico una vez conectado con backend
    setLoading(false);
  }, [symbol]);

  if (loading) {
    return <Spinner size="md" />;
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="column" gap="md">
          <Heading level={4}>Technical Signals - {symbol}</Heading>
          <Text color="secondary">
            Technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands) will be displayed here once
            calculations are implemented.
          </Text>
        </Stack>
      </CardContent>
    </Card>
  );
}
