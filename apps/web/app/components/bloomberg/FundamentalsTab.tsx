'use client';

/**
 * FundamentalsTab - Display SEC EDGAR fundamentals data
 * 
 * AI_DECISION: Client component for fundamentals display
 * Justificación: Interactive tab with data fetching
 * Impacto: Better UX for fundamental analysis
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, Text, Spinner, Alert, Stack, Heading } from '@cactus/ui';

interface FundamentalsTabProps {
  symbol: string;
}

export default function FundamentalsTab({ symbol }: FundamentalsTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // FUTURE_FEATURE: Requires integration with fundamental data providers
    // Metrics needed: P/E, EV/EBITDA, ROE, Revenue Growth, Margins
    // Dependencies: SEC EDGAR XBRL parsing, or third-party fundamentals API (Alpha Vantage, Polygon)
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
          <Heading level={4}>Fundamentals - {symbol}</Heading>
          <Text color="secondary">
            Fundamental data will be displayed here once SEC EDGAR ingestion is complete.
          </Text>
        </Stack>
      </CardContent>
    </Card>
  );
}




