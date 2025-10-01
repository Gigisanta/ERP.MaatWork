export interface NotionWorkspace {
  id: string;
  workspace_name: string;
  workspace_id: string;
  access_token: string;
  bot_id: string;
  owner: string;
  workspace_icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MigrationLog {
  id: string;
  migration_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  records_migrated: number;
  total_records: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface CRMStats {
  contacts: number;
  deals: number;
  tasks: number;
  completedTasks: number;
  totalValue: number;
  wonDeals: number;
}

export interface NotionContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface NotionDeal {
  id: string;
  title: string;
  value: number;
  status: string;
  contact_id?: string;
  probability?: number;
  close_date?: string;
  created_at: string;
  updated_at: string;
}

export interface NotionTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  workspace_id: string;
  operation_type: string;
  status: 'started' | 'success' | 'failed';
  details: Record<string, any>;
  created_at: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  error?: string;
  workspaces?: NotionWorkspace[];
  stats?: CRMStats;
}

export interface OAuthState {
  userId: string;
  returnUrl?: string;
  timestamp: number;
}

export interface UserConfiguration {
  custom_crm_url?: string;
  theme?: 'light' | 'dark';
  notifications?: boolean;
  auto_sync?: boolean;
  sync_interval?: number;
}

export interface NotionPageMap {
  id: string;
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  access_token: string;
  contacts_database_id?: string;
  deals_database_id?: string;
  tasks_database_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotionPageMap {
  notion_page_url: string;
  notion_page_id?: string;
  notion_workspace_id?: string;
  encrypted_access_token?: string;
}

export interface UpdateNotionPageMap {
  notion_page_url?: string;
  notion_page_id?: string;
  notion_workspace_id?: string;
  encrypted_access_token?: string;
  is_active?: boolean;
}

export interface NotionUserConfigResponse {
  success: boolean;
  data?: NotionPageMap | null;
  fallback_url?: string;
  message?: string;
}

export interface NotionOAuthApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  redirect_url?: string;
}

export class NotionCRMError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'NotionCRMError';
  }
}

export const NotionErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  API_ERROR: 'API_ERROR',
  INVALID_URL: 'INVALID_URL',
  NETWORK_ERROR: 'NETWORK_ERROR',
  OAUTH_FAILED: 'OAUTH_FAILED',
  NOT_FOUND: 'NOT_FOUND'
} as const;

export const NotionValidators = {
  isValidNotionUrl: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'notion.so' || urlObj.hostname.endsWith('.notion.site');
    } catch {
      return false;
    }
  },
  extractPageId: (url: string): string => {
    const match = url.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    return match ? match[0] : '';
  }
};

export const NOTION_CONSTANTS = {
  DEFAULT_FALLBACK_URL: 'https://giolivosantarelli.notion.site/CRM-Dashboard-27296d1d68a3800e9860d8d8bc746181',
  OAUTH_SCOPES: ['read_content', 'insert_content', 'update_content'],
  OAUTH_STATE_EXPIRY: 10 * 60 * 1000 // 10 minutos
} as const;