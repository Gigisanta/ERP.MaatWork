'use client';

/**
 * Lazy Chart Wrapper Components
 *
 * AI_DECISION: Create reusable lazy-loaded wrappers for recharts components
 * Justificación: Recharts es pesado (~80KB), lazy loading reduce First Load JS by 40-60KB
 * Impacto: Mejor performance inicial, charts solo se cargan cuando se necesitan
 * Referencias: PortfolioComparator.tsx usa patrón similar para PerformanceChart
 */

import dynamic from 'next/dynamic';
import { Spinner, Text } from '@maatwork/ui';

/**
 * Loading component shown while chart library loads
 */
function ChartLoader() {
  return (
    <div className="flex items-center justify-center p-8" style={{ minHeight: '300px' }}>
      <Spinner size="md" />
      <Text color="secondary" className="ml-2">
        Cargando gráfico...
      </Text>
    </div>
  );
}

/**
 * Lazy-loaded recharts components
 * Each component is loaded only when needed, reducing initial bundle size
 */

export const LazyLineChart = dynamic(() => import('recharts').then((mod) => mod.LineChart), {
  ssr: false,
  loading: () => <ChartLoader />,
});

export const LazyBarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), {
  ssr: false,
  loading: () => <ChartLoader />,
});

export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  {
    ssr: false,
    loading: () => <ChartLoader />,
  }
);

export const LazyComposedChart = dynamic(
  () => import('recharts').then((mod) => mod.ComposedChart),
  {
    ssr: false,
    loading: () => <ChartLoader />,
  }
);

export const LazyAreaChart = dynamic(() => import('recharts').then((mod) => mod.AreaChart), {
  ssr: false,
  loading: () => <ChartLoader />,
});

// Export non-lazy components for child elements (Line, Bar, etc.)
// These are small and should be bundled with the chart components
export {
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  
  
  
} from 'recharts';
