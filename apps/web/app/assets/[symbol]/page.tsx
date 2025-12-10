'use client';

/**
 * Asset Detail Page - Bloomberg Terminal style asset analysis
 *
 * AI_DECISION: Dedicated page for detailed asset analysis
 * Justificación: Full-screen asset analysis with all Bloomberg Terminal features
 * Impacto: Better UX for deep-dive analysis
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '../../auth/useRequireAuth';
import { usePageTitle } from '../../components/PageTitleContext';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Heading,
  Text,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
  Alert,
} from '@cactus/ui';
import AssetSnapshot from '../../components/bloomberg/AssetSnapshot';
// AI_DECISION: Lazy load OHLCVChart to reduce initial bundle size
// Justificación: OHLCVChart includes heavy chart rendering logic, loading it async reduces initial bundle by 40-60KB
// Impacto: Faster initial page load, smaller initial JavaScript bundle
const OHLCVChart = dynamic(() => import('../../components/bloomberg/OHLCVChart'), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Spinner size="md" />
    </div>
  ),
  ssr: false,
});

// AI_DECISION: Lazy load heavy Bloomberg components that are not immediately visible
// Justificación: YieldCurveChart and MacroPanel are at the bottom of the page, lazy loading reduces initial bundle
// Impacto: Reduces initial bundle size by ~50-100KB, faster page load
const YieldCurveChart = dynamic(() => import('../../components/bloomberg/YieldCurveChart'), {
  loading: () => <Spinner size="md" />,
  ssr: false,
});
const MacroPanel = dynamic(() => import('../../components/bloomberg/MacroPanel'), {
  loading: () => <Spinner size="md" />,
  ssr: false,
});

// Lazy load heavy components
const FundamentalsTab = dynamic(() => import('../../components/bloomberg/FundamentalsTab'), {
  loading: () => <Spinner size="md" />,
  ssr: false,
});
const EventsTab = dynamic(() => import('../../components/bloomberg/EventsTab'), {
  loading: () => <Spinner size="md" />,
  ssr: false,
});
const TechnicalSignals = dynamic(() => import('../../components/bloomberg/TechnicalSignals'), {
  loading: () => <Spinner size="md" />,
  ssr: false,
});
const RiskMetrics = dynamic(() => import('../../components/bloomberg/RiskMetrics'), {
  loading: () => <Spinner size="md" />,
  ssr: false,
});
const SocialFeed = dynamic(() => import('../../components/bloomberg/SocialFeed'), {
  loading: () => <Spinner size="md" />,
  ssr: false,
});

export default function AssetDetailPage() {
  const { user, loading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;

  usePageTitle(`${symbol} - Bloomberg Terminal`);

  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!symbol) {
    return (
      <div className="p-8">
        <Alert variant="error">Symbol is required</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/portfolios')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Heading level={2}>{symbol}</Heading>
      </div>

      {/* Asset Snapshot */}
      <AssetSnapshot symbol={symbol.toUpperCase()} />

      {/* Tabs for different views */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="border-b">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="risk">Risk</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="p-6">
              <Stack direction="column" gap="lg">
                <OHLCVChart symbol={symbol.toUpperCase()} height={500} />
                <TechnicalSignals symbol={symbol.toUpperCase()} />
                <RiskMetrics symbol={symbol.toUpperCase()} />
              </Stack>
            </TabsContent>

            <TabsContent value="chart" className="p-6">
              <OHLCVChart symbol={symbol.toUpperCase()} height={600} />
            </TabsContent>

            <TabsContent value="fundamentals" className="p-6">
              <FundamentalsTab symbol={symbol.toUpperCase()} />
            </TabsContent>

            <TabsContent value="events" className="p-6">
              <EventsTab symbol={symbol.toUpperCase()} />
            </TabsContent>

            <TabsContent value="technical" className="p-6">
              <TechnicalSignals symbol={symbol.toUpperCase()} />
            </TabsContent>

            <TabsContent value="risk" className="p-6">
              <RiskMetrics symbol={symbol.toUpperCase()} />
            </TabsContent>

            <TabsContent value="social" className="p-6">
              <SocialFeed symbol={symbol.toUpperCase()} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Macro and Yield Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <YieldCurveChart country="US" />
        <MacroPanel />
      </div>
    </div>
  );
}
