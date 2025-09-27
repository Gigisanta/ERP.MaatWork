// TypeScript types for historical data visualization system
// Based on enhanced database schema

export type Granularity = 'daily' | 'monthly';

export type ThresholdType = 'above' | 'below' | 'change';

// Enhanced Historical Metrics interface
export interface HistoricalMetricsEnhanced {
  id: string;
  user_id?: string;
  team_id?: string;
  date: string; // ISO date string
  granularity: Granularity;
  
  // Contact metrics
  total_contacts: number;
  new_contacts: number;
  active_contacts: number;
  pipeline_contacts: number;
  
  // Conversion metrics
  converted_contacts: number;
  conversion_rate: number;
  average_conversion_time: number;
  
  // Value metrics
  pipeline_value: number;
  closed_value: number;
  average_deal_size: number;
  total_value: number;
  
  // Metadata
  calculated_at: string; // ISO timestamp
  data_quality_score: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Data Retention Configuration interface
export interface DataRetentionConfig {
  id: string;
  user_id: string;
  daily_retention_days: number;
  monthly_retention_months: number;
  auto_archive_enabled: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Metric Alerts interface
export interface MetricAlert {
  id: string;
  user_id: string;
  metric_name: string;
  threshold_type: ThresholdType;
  threshold_value: number;
  is_active: boolean;
  last_triggered_at?: string; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Request/Response types for API calls
export interface HistoricalMetricsRequest {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  userId?: string;
  granularity: Granularity;
  metricType?: string;
}

export interface HistoricalMetricsResponse {
  success: boolean;
  data: HistoricalMetricsEnhanced[];
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Chart data types for visualization
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MetricTrend {
  metric_name: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
  data_points: ChartDataPoint[];
}

// Time navigation types
export interface TimeNavigationState {
  currentPeriod: string; // ISO date string
  granularity: Granularity;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

// Modal state types
export interface HistoricalDataModalState {
  isOpen: boolean;
  selectedMetric?: string;
  timeNavigation: TimeNavigationState;
  loading: boolean;
  error?: string;
}

// Store state types
export interface HistoricalMetricsStore {
  // State
  metrics: HistoricalMetricsEnhanced[];
  trends: MetricTrend[];
  retentionConfig?: DataRetentionConfig;
  alerts: MetricAlert[];
  loading: boolean;
  error?: string;
  
  // Actions
  fetchHistoricalMetrics: (request: HistoricalMetricsRequest) => Promise<void>;
  calculateTrends: (metricName: string, period: number) => Promise<MetricTrend>;
  updateRetentionConfig: (config: Partial<DataRetentionConfig>) => Promise<void>;
  createAlert: (alert: Omit<MetricAlert, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAlert: (id: string, alert: Partial<MetricAlert>) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  clearError: () => void;
}

// Component props types
export interface HistoricalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricType: string;
  metricTitle: string;
  onExport?: (data: any) => void;
  onRefresh?: () => void;
}

export interface TimeNavigationProps {
  granularity: Granularity;
  currentPeriod: string;
  onGranularityChange: (granularity: Granularity) => void;
  onPeriodChange: (period: string) => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
}

export interface MetricChartProps {
  data: ChartDataPoint[];
  metricName: string;
  granularity: Granularity;
  height?: number;
  showTrend?: boolean;
}

// Utility types
export type MetricKey = keyof Pick<HistoricalMetricsEnhanced, 
  'total_contacts' | 'new_contacts' | 'active_contacts' | 'pipeline_contacts' |
  'converted_contacts' | 'conversion_rate' | 'average_conversion_time' |
  'pipeline_value' | 'closed_value' | 'average_deal_size' | 'total_value'
>;

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  format: 'number' | 'percentage' | 'currency' | 'time';
  color: string;
  icon: string;
}

// Trend calculation types
export interface TrendCalculation {
  current: number;
  previous: number;
  change: number;
  percentageChange: number;
  direction: 'up' | 'down' | 'stable';
  confidence: number;
}

// Error types
export interface HistoricalMetricsError {
  code: string;
  message: string;
  details?: any;
}