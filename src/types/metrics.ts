import { Tag } from './crm';

export interface TeamMetrics {
  id: string;
  teamId: string;
  date: string;
  totalContacts: number;
  activeContacts: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  goalsAchieved: number;
  totalGoals: number;
  activeAdvisors: number;
  avgRevenuePerAdvisor?: number;
}

export interface AdvisorMetrics {
  id: string;
  advisorId: string;
  advisorName: string;
  date: string;
  contactsHandled: number;
  contactsAssigned: number;
  activeContacts: number;
  dealsCompleted: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  performanceScore?: number;
  emailsSent?: number;
  tasksCompleted?: number;
  callsMade?: number;
  performance: {
    score: number;
    rank: number;
    trend: 'up' | 'down' | 'stable';
  };
  goals: {
    revenue: number;
    contacts: number;
    deals: number;
  };
  achievements: string[];
}

// Legacy conversion path type (kept for compatibility)
export type ConversionPath = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';

// Chart colors for consistent styling
export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4'
} as const;

// Status colors for different contact/deal statuses
export const STATUS_COLORS: Record<ContactStatus, string> = {
  'Prospecto': '#6b7280',
  'Contactado': '#3b82f6',
  'Primera Reunion': '#06b6d4',
  'Segunda Reunion': '#f59e0b',
  'Apertura': '#8b5cf6',
  'Cliente': '#10b981',
  'Caido': '#ef4444',
  'Cuenta Vacia': '#ef4444'
} as const;

export interface PerformanceMetrics {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  teamMetrics: TeamMetrics;
  advisorMetrics: AdvisorMetrics[];
  comparisons: {
    previousPeriod: {
      teamMetrics: TeamMetrics;
      advisorMetrics: AdvisorMetrics[];
    };
    yearOverYear?: {
      teamMetrics: TeamMetrics;
      advisorMetrics: AdvisorMetrics[];
    };
  };
}

export interface MetricsTrend {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface GoalProgress {
  goalId: string;
  title: string;
  target: number;
  current: number;
  progress: number;
  deadline: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'approval_request' | 'approval_approved' | 'approval_rejected' | 'system' | 'task_assigned' | 'task_completed' | 'performance_alert' | 'goal_achieved' | 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  read_at?: string;
  read?: boolean;
  timestamp?: string;
}

// Additional types needed by components
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  status: ContactStatus;
  assignedTo?: string;
  value?: number;
  estimatedValue?: number;
  stage: 'initial' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  createdAt: Date;
  updatedAt: Date;
  lastContactDate?: Date;
  lastActivity?: Date;
  notes?: Note[];
  priority?: 'low' | 'medium' | 'high';
  tags?: Tag[];
  products?: string[];
  source?: string;
}

export type ContactStatus = 'Prospecto' | 'Contactado' | 'Primera Reunion' | 'Segunda Reunion' | 'Apertura' | 'Cliente' | 'Caido' | 'Cuenta Vacia';

// Conversion paths for tracking status changes
export const CONVERSION_PATHS = [
  { from: 'Prospecto' as ContactStatus, to: 'Contactado' as ContactStatus },
  { from: 'Contactado' as ContactStatus, to: 'Primera Reunion' as ContactStatus },
  { from: 'Primera Reunion' as ContactStatus, to: 'Segunda Reunion' as ContactStatus },
  { from: 'Segunda Reunion' as ContactStatus, to: 'Apertura' as ContactStatus },
  { from: 'Apertura' as ContactStatus, to: 'Cliente' as ContactStatus },
  { from: 'Contactado' as ContactStatus, to: 'Caido' as ContactStatus },
  { from: 'Primera Reunion' as ContactStatus, to: 'Caido' as ContactStatus },
  { from: 'Segunda Reunion' as ContactStatus, to: 'Caido' as ContactStatus },
  { from: 'Apertura' as ContactStatus, to: 'Caido' as ContactStatus },
  { from: 'Cliente' as ContactStatus, to: 'Cuenta Vacia' as ContactStatus }
] as const;

export type CRMViewType = 'list' | 'kanban' | 'grid';

export interface ContactFilters {
  status?: ContactStatus | 'all';
  assignedTo?: string;
  dateRange?: { start: Date; end: Date };
  searchTerm?: string;
  source?: string;
}

export interface CRMState {
  contacts: Contact[];
  selectedContact: Contact | null;
  filters: ContactFilters;
  isLoading: boolean;
  viewType: CRMViewType;
  error: string | null;
  hasMoreContacts: boolean;
  tags: any[];
  addContact: (contactData: Partial<Contact>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  updateContactStatus: (id: string, status: ContactStatus) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  setSelectedContact: (contact: Contact | null) => void;
  setFilters: (filters: Partial<ContactFilters>) => void;
  setViewType: (viewType: CRMViewType) => void;
  getFilteredContacts: () => Contact[];
  loadContacts: (page?: number, pageSize?: number) => Promise<void>;
  addNote: (contactId: string, note: Omit<Note, 'id' | 'createdAt'>) => Promise<Note>;
  updateNote: (contactId: string, noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (contactId: string, noteId: string) => Promise<boolean>;
  clearError: () => void;
  startContactsSubscription?: () => Promise<void>;
  stopContactsSubscription?: () => Promise<void>;
}

export interface ConversionEvent {
  id: string;
  contactId: string;
  userId: string;
  fromStatus: ContactStatus;
  toStatus: ContactStatus;
  timestamp: Date;
  value?: number;
  notes?: string;
}

export type TimeFrame = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface MetricsSnapshot {
  id: string;
  userId?: string;
  totalContacts: number;
  activeProspects: number;
  conversionsThisMonth: number;
  conversionRate: number;
  averageTimeToConvert: number;
  pipelineDistribution: PipelineData[];
  calculatedAt: Date;
  timeframe: TimeFrame;
}

export interface HistoricalMetric {
  id: string;
  userId?: string;
  date: string;
  totalContacts: number;
  conversions: number;
  conversionRate: number;
  revenue?: number;
  pipelineValue?: number;
  createdAt: Date;
}

export interface PipelineData {
  status: ContactStatus;
  count: number;
  percentage: number;
  averageTimeInStatus: number;
}

export interface PerformanceIndicators {
  totalContacts: number;
  activeProspects: number;
  conversionsThisMonth: number;
  conversionRate: number;
  averageTimeToConvert: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  topPerformingStatus: ContactStatus;
}

export interface MetricsState {
  currentMetrics: MetricsSnapshot | null;
  historicalMetrics: MetricsSnapshot[];
  conversions: ConversionEvent[];
  isCalculating: boolean;
  calculateMetrics: (userId?: string, timeframe?: TimeFrame) => Promise<MetricsSnapshot>;
  recordConversion: (conversion: ConversionEvent) => Promise<void>;
  getConversionRate: (fromStatus: ContactStatus, toStatus: ContactStatus) => number;
  getTrendData: (timeframe: TimeFrame) => ChartDataPoint[];
  getPerformanceIndicators: (userId?: string) => PerformanceIndicators;
  refreshMetrics: () => Promise<void>;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

// Note type for CRM notes
export interface Note {
  id: string;
  content: string;
  type: 'call' | 'meeting' | 'email' | 'general';
  author: string;
  date: Date;
  createdAt: Date;
  createdBy: string;
  priority?: 'low' | 'medium' | 'high';
  isPrivate?: boolean;
  metadata?: Record<string, any>;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyGrowth: number;
  conversionRate: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  totalContacts: number;
  totalDeals: number;
  pipelineValue: number;
  winRate: number;
  averageDealSize: number;
  salesCycleLength: number;
  topPerformers: Array<{
    id: string;
    name: string;
    value: number;
    change: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
}

// Dashboard state interface
export interface DashboardState {
  metrics: DashboardMetrics;
  isLoading: boolean;
  lastUpdated: Date;
  selectedTimeRange: TimeFrame;
  chartData: Record<string, ChartDataPoint[]>;
  notifications: Notification[];
  refreshInterval: number;
  isRefreshing: boolean;
  refreshDashboard: () => Promise<void>;
  getChartData: (chartType: ChartType, timeframe?: TimeFrame) => ChartDataPoint[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  clearNotifications: () => void;
  markNotificationAsRead: (id: string) => void;
  setRefreshInterval: (interval: number) => void;
}

// Chart types
export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'conversion-trend' | 'pipeline-distribution' | 'recent-activity';

// Widget types
export interface Widget {
  id: string;
  type: ChartType;
  title: string;
  data: ChartDataPoint[];
  config?: Record<string, any>;
}