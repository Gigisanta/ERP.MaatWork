'use client';

/**
 * EventsTab - Display regulatory events (CNV, SEC, etc.)
 * 
 * AI_DECISION: Client component for events display
 * Justificación: Interactive tab with timeline view
 * Impacto: Better UX for regulatory events
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, Text, Spinner, Alert, Stack, Heading } from '@cactus/ui';

interface EventsTabProps {
  symbol: string;
}

export default function EventsTab({ symbol }: EventsTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // FUTURE_FEATURE: Requires integration with financial events data providers
    // Events needed: Earnings, Dividends, Splits, SEC Filings (CNV Hechos Relevantes)
    // Dependencies: SEC EDGAR integration, CNV API, or third-party data provider
    // Status: Placeholder UI ready, awaiting backend endpoints
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
          <Heading level={4}>Events - {symbol}</Heading>
          <Text color="secondary">
            Regulatory events (CNV Hechos Relevantes, SEC filings) will be displayed here once ingestion is complete.
          </Text>
        </Stack>
      </CardContent>
    </Card>
  );
}




