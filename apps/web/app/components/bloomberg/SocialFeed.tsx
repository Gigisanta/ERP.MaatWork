'use client';

/**
 * SocialFeed - Display social media posts (Reddit/X) filtered by symbol
 * 
 * AI_DECISION: Client component for social listening
 * Justificación: Interactive feed with filtering
 * Impacto: Better social sentiment analysis
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, Text, Spinner, Alert, Stack, Heading } from '@cactus/ui';

interface SocialFeedProps {
  symbol: string;
}

export default function SocialFeed({ symbol }: SocialFeedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // FUTURE_FEATURE: Requires social media API integrations
    // Would need: Twitter/X API, Reddit API, or StockTwits
    // Dependencies: API keys and rate limit management for social platforms
    // Status: Low priority - placeholder for potential future social sentiment feature
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
          <Heading level={4}>Social Feed - {symbol}</Heading>
          <Text color="secondary">
            Social media posts (Reddit, X/Twitter) will be displayed here once social ingestion is complete.
          </Text>
        </Stack>
      </CardContent>
    </Card>
  );
}




