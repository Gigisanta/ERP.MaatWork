'use client';

/**
 * RiskMetrics - Display risk metrics and analytics
 * 
 * AI_DECISION: Client component for risk analysis
 * Justificación: Interactive component with risk calculations
 * Impacto: Better risk analysis UX
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, Text, Spinner, Alert, Stack, Heading } from '@cactus/ui';

interface RiskMetricsProps {
  symbol: string;
}

export default function RiskMetrics({ symbol }: RiskMetricsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch risk metrics from API
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
          <Heading level={4}>Risk Metrics - {symbol}</Heading>
          <Text color="secondary">
            Risk metrics (Sharpe, Sortino, Max Drawdown, Beta, Volatility) will be displayed here once calculations are implemented.
          </Text>
        </Stack>
      </CardContent>
    </Card>
  );
}




