// Shared TypeScript types and interfaces

// Notion-related shared types
export interface NotionWorkspace {
  id: string;
  workspace_name: string;
  workspace_id: string;
  workspace_icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CRMStats {
  contacts: number;
  deals: number;
  tasks: number;
  completedTasks: number;
  totalValue: number;
  wonDeals: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

// Core domain shared types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: 'admin' | 'manager' | 'advisor';
  is_approved?: boolean;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export type Nullable<T> = T | null;

