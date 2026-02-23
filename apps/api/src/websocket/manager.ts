/**
 * WebSocket Connection Manager
 *
 * AI_DECISION: Centralized connection management with authentication and subscription tracking
 * Justificación: Single source of truth for WebSocket connections enables efficient broadcasting and proper cleanup
 * Impacto: Better resource management, prevent memory leaks, efficient message routing
 */

import { WebSocketServer as WS, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import type {
  BaseWebSocketMessage,
  WebSocketConnectionContext,
  SubscriptionChannel,
  ClientMessage,
  ServerMessage,
  WebSocketMessageType,
  WebSocketServerConfig,
} from './types';
import { DEFAULT_WS_CONFIG } from './types';

// ==========================================================
// Connection Manager
// ==========================================================

class ConnectionManager {
  private connections: Map<string, WebSocket> = new Map();
  private contexts: Map<string, WebSocketConnectionContext> = new Map();
  private channelSubscriptions: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private config: WebSocketServerConfig) {
    this.startHeartbeat();
  }

  addConnection(ws: WebSocket, context: WebSocketConnectionContext): void {
    const connectionId = context.sessionId;

    this.connections.set(connectionId, ws);
    this.contexts.set(connectionId, context);

    logger.info(
      {
        connectionId,
        userId: context.userId,
        email: context.email,
        teamId: context.teamId,
      },
      'WebSocket connection established'
    );
  }

  removeConnection(connectionId: string): void {
    const context = this.contexts.get(connectionId);

    if (!context) {
      return;
    }

    context.subscriptions.forEach((channel) => {
      this.unsubscribeFromChannel(connectionId, channel);
    });

    this.connections.delete(connectionId);
    this.contexts.delete(connectionId);

    logger.info(
      {
        connectionId,
        userId: context.userId,
      },
      'WebSocket connection removed'
    );
  }

  getConnection(connectionId: string): WebSocket | undefined {
    return this.connections.get(connectionId);
  }

  getContext(connectionId: string): WebSocketConnectionContext | undefined {
    return this.contexts.get(connectionId);
  }

  subscribeToChannel(connectionId: string, channel: string): void {
    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
    }

    this.channelSubscriptions.get(channel)!.add(connectionId);

    const context = this.contexts.get(connectionId);
    if (context) {
      context.subscriptions.add(channel);
    }

    logger.debug(
      {
        connectionId,
        channel,
        totalSubscribers: this.channelSubscriptions.get(channel)!.size,
      },
      'Connection subscribed to channel'
    );
  }

  unsubscribeFromChannel(connectionId: string, channel: string): void {
    const subscribers = this.channelSubscriptions.get(channel);

    if (!subscribers) {
      return;
    }

    subscribers.delete(connectionId);

    if (subscribers.size === 0) {
      this.channelSubscriptions.delete(channel);
    }

    const context = this.contexts.get(connectionId);
    if (context) {
      context.subscriptions.delete(channel);
    }

    logger.debug(
      {
        connectionId,
        channel,
        remainingSubscribers: subscribers.size,
      },
      'Connection unsubscribed from channel'
    );
  }

  broadcastToChannel(channel: string, message: BaseWebSocketMessage): void {
    const subscribers = this.channelSubscriptions.get(channel);

    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const messageString = JSON.stringify(message);

    subscribers.forEach((connectionId) => {
      const ws = this.connections.get(connectionId);

      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageString);
        } catch (error) {
          logger.error(
            {
              connectionId,
              channel,
              error,
            },
            'Failed to send message to connection'
          );
        }
      }
    });

    logger.debug(
      {
        channel,
        messageType: message.type,
        recipientCount: subscribers.size,
      },
      'Broadcasted message to channel'
    );
  }

  sendToConnection(connectionId: string, message: BaseWebSocketMessage): void {
    const ws = this.connections.get(connectionId);
    if (ws) {
      const messageString = JSON.stringify(message);
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageString);
        } catch (error) {
          logger.error({ connectionId, error }, 'Failed to send message to connection');
        }
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getSubscribersCount(channel: string): number {
    return this.channelSubscriptions.get(channel)?.size || 0;
  }

  getActiveChannels(): string[] {
    return Array.from(this.channelSubscriptions.keys());
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((ws, connectionId) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          this.removeConnection(connectionId);
        }
      });
    }, this.config.heartbeatInterval || DEFAULT_WS_CONFIG.heartbeatInterval);

    logger.info('WebSocket heartbeat started');
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('WebSocket heartbeat stopped');
    }
  }

  cleanup(): void {
    this.stopHeartbeat();

    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    this.connections.clear();
    this.contexts.clear();
    this.channelSubscriptions.clear();

    logger.info('WebSocket connection manager cleaned up');
  }
}

export { ConnectionManager };
