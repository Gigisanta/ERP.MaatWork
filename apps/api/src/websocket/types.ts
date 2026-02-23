/**
 * WebSocket Types and Event Schemas
 *
 * AI_DECISION: Define type-safe WebSocket events for real-time updates
 * Justificación: Type safety ensures consistent event structure and prevents runtime errors
 * Impacto: Better developer experience, fewer bugs, easier maintenance
 */

// ==========================================================
// WebSocket Message Types
// ==========================================================

export enum WebSocketMessageType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // Authentication
  AUTH_CHALLENGE = 'auth_challenge',
  AUTH_RESPONSE = 'auth_response',

  // Subscription management
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  SUBSCRIPTION_ACK = 'subscription_ack',

  // Real-time updates
  CONTACT_UPDATE = 'contact_update',
  CONTACT_CREATED = 'contact_created',
  CONTACT_DELETED = 'contact_deleted',
  PIPELINE_STAGE_CHANGE = 'pipeline_stage_change',

  // Dashboard metrics
  METRICS_UPDATE = 'metrics_update',
  TEAM_METRICS_UPDATE = 'team_metrics_update',
  DASHBOARD_KPI_UPDATE = 'dashboard_kpi_update',

  // Activity
  NEW_NOTE = 'new_note',
  NEW_TASK = 'new_task',
  TASK_COMPLETED = 'task_completed',

  // Notifications
  NOTIFICATION = 'notification',

  // System events
  HEALTH_CHECK = 'health_check',
  PONG = 'pong',
}

// ==========================================================
// Base Message Interface
// ==========================================================

export interface BaseWebSocketMessage<TPayload = unknown> {
  type: WebSocketMessageType;
  payload?: TPayload;
  timestamp: number;
  requestId?: string;
}

// ==========================================================
// Client → Server Messages
// ==========================================================

export interface AuthResponsePayload {
  token: string;
}

export interface SubscribePayload {
  channels: string[];
}

export interface UnsubscribePayload {
  channels: string[];
}

export interface PongPayload {
  timestamp: number;
}

// ==========================================================
// Server → Client Messages
// ==========================================================

export interface AuthChallengePayload {
  nonce: string;
  expiresAt: number;
}

export interface SubscriptionAckPayload {
  channels: string[];
  success: boolean;
  error?: string;
}

export interface ContactUpdatePayload {
  contactId: string;
  changes: Record<string, unknown>;
  updatedAt: number;
}

export interface ContactCreatedPayload {
  contactId: string;
  contact: Record<string, unknown>;
}

export interface ContactDeletedPayload {
  contactId: string;
  deletedAt: number;
}

export interface PipelineStageChangePayload {
  contactId: string;
  previousStage: string;
  newStage: string;
  changedBy: string;
  changedAt: number;
}

export interface MetricsUpdatePayload {
  type: 'team' | 'personal' | 'pipeline' | 'dashboard';
  teamId?: string;
  userId?: string;
  metrics: Record<string, number>;
}

export interface DashboardKPIUpdatePayload {
  kpis: Record<string, number>;
  lastUpdated: number;
}

export interface NewNotePayload {
  noteId: string;
  contactId: string;
  content: string;
  createdBy: string;
  createdAt: number;
}

export interface NewTaskPayload {
  taskId: string;
  contactId?: string;
  title: string;
  assignedTo: string;
  dueDate?: number;
  createdAt: number;
}

export interface TaskCompletedPayload {
  taskId: string;
  completedBy: string;
  completedAt: number;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  createdAt: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ==========================================================
// Subscription Channels
// ==========================================================

export enum SubscriptionChannel {
  // Contact updates
  CONTACTS_ALL = 'contacts:all',
  CONTACTS_TEAM = 'contacts:team',
  CONTACTS_PERSONAL = 'contacts:personal',
  CONTACT_TEAM = 'contact:{contactId}',

  // Pipeline updates
  PIPELINE_ALL = 'pipeline:all',
  PIPELINE_TEAM = 'pipeline:team',

  // Metrics updates
  METRICS_TEAM = 'metrics:team',
  METRICS_PERSONAL = 'metrics:personal',
  METRICS_DASHBOARD = 'metrics:dashboard',

  // Activity
  ACTIVITY_NOTES = 'activity:notes',
  ACTIVITY_TASKS = 'activity:tasks',

  // Notifications
  NOTIFICATIONS_ALL = 'notifications:all',
  NOTIFICATIONS_TEAM = 'notifications:team',

  // System
  SYSTEM_HEALTH = 'system:health',
}

// ==========================================================
// Connection Context
// ==========================================================

export interface WebSocketConnectionContext {
  userId: string;
  email: string;
  role: string;
  teamId?: string;
  sessionId: string;
  connectedAt: number;
  subscriptions: Set<string>;
}

// ==========================================================
// Event Payload Types Map
// ==========================================================

type PayloadMap = Record<WebSocketMessageType, unknown> & {
  [WebSocketMessageType.AUTH_CHALLENGE]: AuthChallengePayload;
  [WebSocketMessageType.AUTH_RESPONSE]: AuthResponsePayload;
  [WebSocketMessageType.SUBSCRIBE]: SubscribePayload;
  [WebSocketMessageType.UNSUBSCRIBE]: UnsubscribePayload;
  [WebSocketMessageType.SUBSCRIPTION_ACK]: SubscriptionAckPayload;
  [WebSocketMessageType.CONTACT_UPDATE]: ContactUpdatePayload;
  [WebSocketMessageType.CONTACT_CREATED]: ContactCreatedPayload;
  [WebSocketMessageType.CONTACT_DELETED]: ContactDeletedPayload;
  [WebSocketMessageType.PIPELINE_STAGE_CHANGE]: PipelineStageChangePayload;
  [WebSocketMessageType.METRICS_UPDATE]: MetricsUpdatePayload;
  [WebSocketMessageType.DASHBOARD_KPI_UPDATE]: DashboardKPIUpdatePayload;
  [WebSocketMessageType.NEW_NOTE]: NewNotePayload;
  [WebSocketMessageType.NEW_TASK]: NewTaskPayload;
  [WebSocketMessageType.TASK_COMPLETED]: TaskCompletedPayload;
  [WebSocketMessageType.NOTIFICATION]: NotificationPayload;
  [WebSocketMessageType.ERROR]: ErrorPayload;
  [WebSocketMessageType.PONG]: PongPayload;
};

// ==========================================================
// Helper Types
// ==========================================================

export type TypedWebSocketMessage<T extends WebSocketMessageType> = BaseWebSocketMessage<PayloadMap[T]>;

export type WebSocketMessage = BaseWebSocketMessage<unknown>;

export type ClientMessage =
  | TypedWebSocketMessage<WebSocketMessageType.AUTH_RESPONSE>
  | TypedWebSocketMessage<WebSocketMessageType.SUBSCRIBE>
  | TypedWebSocketMessage<WebSocketMessageType.UNSUBSCRIBE>
  | TypedWebSocketMessage<WebSocketMessageType.PONG>;

export type ServerMessage =
  | TypedWebSocketMessage<WebSocketMessageType.AUTH_CHALLENGE>
  | TypedWebSocketMessage<WebSocketMessageType.SUBSCRIPTION_ACK>
  | TypedWebSocketMessage<WebSocketMessageType.CONTACT_UPDATE>
  | TypedWebSocketMessage<WebSocketMessageType.CONTACT_CREATED>
  | TypedWebSocketMessage<WebSocketMessageType.CONTACT_DELETED>
  | TypedWebSocketMessage<WebSocketMessageType.PIPELINE_STAGE_CHANGE>
  | TypedWebSocketMessage<WebSocketMessageType.METRICS_UPDATE>
  | TypedWebSocketMessage<WebSocketMessageType.DASHBOARD_KPI_UPDATE>
  | TypedWebSocketMessage<WebSocketMessageType.NEW_NOTE>
  | TypedWebSocketMessage<WebSocketMessageType.NEW_TASK>
  | TypedWebSocketMessage<WebSocketMessageType.TASK_COMPLETED>
  | TypedWebSocketMessage<WebSocketMessageType.NOTIFICATION>
  | BaseWebSocketMessage<ErrorPayload>;

// ==========================================================
// WebSocket Configuration
// ==========================================================

export interface WebSocketServerConfig {
  port?: number;
  path?: string;
  clientTracking?: boolean;
  maxPayload?: number;
  heartbeatInterval?: number;
  authTimeout?: number;
  corsOrigins?: string[];
  rateLimitEnabled?: boolean;
  rateLimit?: {
    maxConnectionsPerIP?: number;
    maxMessagesPerSecond?: number;
    windowMs?: number;
    burstTokens?: number;
  };
  tls?: {
    key?: string;
    cert?: string;
    ca?: string;
    rejectUnauthorized?: boolean;
  };
}

const DEFAULT_WS_CONFIG_VALUE: WebSocketServerConfig = {
  port: 3003,
  path: '/ws',
  clientTracking: true,
  maxPayload: 1048576, //1MB
  heartbeatInterval: 30000, // 30 seconds
  authTimeout: 10000, // 10 seconds
  corsOrigins: ['http://localhost:3000'],
};

export const DEFAULT_WS_CONFIG = DEFAULT_WS_CONFIG_VALUE;
