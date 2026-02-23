/**
 * WebSocket Module
 *
 * AI_DECISION: Export WebSocket functionality as a separate module for easy integration
 * Justificación: Modular design allows optional WebSocket feature, cleaner separation from HTTP API
 * Impacto: Better code organization, optional real-time features, easier testing
 */

export { WebSocketServer, startWebSocketServer, getWebSocketServer, stopWebSocketServer } from './server';
export { ConnectionManager } from './manager';
export type {
  BaseWebSocketMessage,
  WebSocketConnectionContext,
  AuthResponsePayload,
  SubscribePayload,
  UnsubscribePayload,
  PongPayload,
  AuthChallengePayload,
  SubscriptionAckPayload,
  ContactUpdatePayload,
  ContactCreatedPayload,
  ContactDeletedPayload,
  PipelineStageChangePayload,
  MetricsUpdatePayload,
  DashboardKPIUpdatePayload,
  NewNotePayload,
  NewTaskPayload,
  TaskCompletedPayload,
  NotificationPayload,
  ErrorPayload,
  TypedWebSocketMessage,
  WebSocketMessage,
  ClientMessage,
  ServerMessage,
  WebSocketServerConfig,
} from './types';
export {
  WebSocketMessageType,
  SubscriptionChannel,
  DEFAULT_WS_CONFIG,
} from './types';
