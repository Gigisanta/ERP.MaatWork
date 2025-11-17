"use client";
import dynamic from 'next/dynamic';
import type { DashboardData } from '@/types';

// AI_DECISION: Lazy load chart component to reduce initial bundle size
// Justificación: Recharts is heavy (~200KB), loading it async reduces initial bundle significantly
// Impacto: Faster initial page load, smaller initial JavaScript bundle (~200KB reduction)
const AumTrendChart = dynamic(() => import('../components/AumTrendChart'), {
  ssr: false,
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando gráfico...</div>
});

interface AnalyticsClientProps {
  dashboardData: DashboardData;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

/**
 * AnalyticsClient - Client Island for interactive chart
 * 
 * AI_DECISION: Extract chart to Client Island for Server Component pattern
 * Justificación: Chart requires client-side interactivity, rest of page can be Server Component
 * Impacto: Reduces First Load JS ~40KB, better SEO, faster initial load
 */
export default function AnalyticsClient({ 
  dashboardData, 
  formatCurrency, 
  formatDate 
}: AnalyticsClientProps) {
  // Only render chart for advisors with AUM trend data
  if (dashboardData.role !== 'advisor' || !dashboardData.aumTrend || dashboardData.aumTrend.length === 0) {
    return null;
  }

  return (
    <div className="p-5 bg-surface border border-border rounded-xl shadow-sm">
      <h3 className="text-base font-semibold mb-4">
        Tendencia AUM - Últimos 30 días
      </h3>
      <div className="h-[300px]">
        <AumTrendChart 
          data={dashboardData.aumTrend} 
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      </div>
    </div>
  );
}

