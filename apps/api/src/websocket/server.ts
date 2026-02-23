/**
 * WebSocket Server
 *
 * AI_DECISION: Standalone WebSocket server on separate port for better scaling and isolation
 * Justificación: Separate WS server prevents HTTP/WS interference, allows independent scaling, cleaner architecture
 * Impacto: Better fault isolation, independent scaling, cleaner separation of concerns
 */

import { createServer as createHttpServer, Server as HttpServer, IncomingMessage } from 'http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'https';
import { readFileSync } from 'fs';
import { WebSocketServer as WS, WebSocket as WSWebSocket } from 'ws';
import { TextEncoder } from 'util';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import type {
  BaseWebSocketMessage,
  WebSocketConnectionContext,
  ClientMessage,
  ServerMessage,
  SubscriptionChannel,
  WebSocketServerConfig,
} from './types';
import { WebSocketRateLimiter, WS_RATE_LIMIT_PRESETS } from './rate-limit';
import { WebSocketMessageType, DEFAULT_WS_CONFIG } from './types';
import { ConnectionManager } from './manager';
import { verifyUserToken } from '../auth/jwt';

const textEncoder = new TextEncoder();

interface ExtendedWebSocket extends WSWebSocket {
  isAlive: boolean;
  _socket?: {
    remoteAddress?: string;
  };
}

export class WebSocketServer {
  private wss: WS | null = null;
  private httpServer: HttpServer | HttpsServer | null = null;
  private connectionManager: ConnectionManager | null = null;
  private rateLimiter: WebSocketRateLimiter | null = null;
  private jwtSecret: string;
  private config: WebSocketServerConfig;
  private useTLS: boolean;

  constructor(config: Partial<WebSocketServerConfig> = {}) {
    this.config = { ...DEFAULT_WS_CONFIG, ...config };

    if (!this.config.corsOrigins && env.CORS_ORIGINS) {
      this.config.corsOrigins = env.CORS_ORIGINS.split(',');
    }

    this.useTLS = !!(this.config.tls?.key && this.config.tls?.cert);

    this.jwtSecret = env.JWT_SECRET || 'dev-insecure-secret';

    if (this.jwtSecret === 'dev-insecure-secret') {
      logger.warn('Using insecure JWT secret for WebSocket. Change in production!');
    }

    if (this.config.rateLimitEnabled !== false) {
      const rateLimitConfig = {
        ...WS_RATE_LIMIT_PRESETS.default,
        ...this.config.rateLimit,
      };
      this.rateLimiter = new WebSocketRateLimiter(rateLimitConfig);
      logger.info({ rateLimitConfig }, 'WebSocket rate limiter initialized');
    }
  }

  start(): void {
    // AI_DECISION: Allow dynamic port assignment via config.env.WS_PORT
    // Justificación: Railway asigna puertos dinámicamente, no hardcodear
    // Impacto: Permite múltiples instancias sin conflictos de puerto
    // Referencias: apps/api/src/config/env.ts (WS_PORT defaults to 3003)
    const { port = process.env.WS_PORT || 3003, path = '/ws' } = this.config;

    if (this.useTLS && this.config.tls && this.config.tls.key && this.config.tls.cert) {
      const tlsOptions = {
        key: readFileSync(this.config.tls.key),
        cert: readFileSync(this.config.tls.cert),
        ca: this.config.tls.ca ? readFileSync(this.config.tls.ca) : undefined,
        rejectUnauthorized: this.config.tls.rejectUnauthorized ?? true,
      };

      this.httpServer = createHttpsServer(tlsOptions);
      logger.info('WebSocket server using TLS/WSS');
    } else {
      this.httpServer = createHttpServer();
      logger.info('WebSocket server using plain HTTP/WS');
    }

    this.connectionManager = new ConnectionManager(this.config);

    this.wss = new WS({
      server: this.httpServer,
      path,
      maxPayload: this.config.maxPayload || DEFAULT_WS_CONFIG.maxPayload,
      clientTracking: this.config.clientTracking ?? DEFAULT_WS_CONFIG.clientTracking,
      verifyClient: this.verifyClient.bind(this),
    });

    this.setupConnectionHandlers();
    this.setupMessageHandlers();

    this.httpServer.listen(port, () => {
      logger.info(
        {
          port,
          path,
          protocol: this.useTLS ? 'wss' : 'ws',
          config: this.config,
        },
        'WebSocket server started'
      );
    });
  }

  stop(): void {
    if (this.rateLimiter) {
      this.rateLimiter.destroy();
      this.rateLimiter = null;
    }

    if (this.connectionManager) {
      this.connectionManager.cleanup();
      this.connectionManager = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    logger.info('WebSocket server stopped');
  }

  broadcast(channel: string, message: Omit<BaseWebSocketMessage, 'timestamp'>): void {
    if (!this.connectionManager) {
      return;
    }

    const fullMessage: BaseWebSocketMessage = {
      ...message,
      timestamp: Date.now(),
    };

    this.connectionManager.broadcastToChannel(channel, fullMessage);
  }

  getStats(): {
    connections: number;
    activeChannels: string[];
    channelStats: Record<string, number>;
    rateLimit?: {
      totalConnections: number;
      activeMessageBuckets: number;
    };
  } {
    if (!this.connectionManager) {
      return {
        connections: 0,
        activeChannels: [],
        channelStats: {},
      };
    }

    const activeChannels = this.connectionManager.getActiveChannels();
    const channelStats: Record<string, number> = {};

    activeChannels.forEach((channel) => {
      channelStats[channel] = this.connectionManager!.getSubscribersCount(channel);
    });

    const stats = {
      connections: this.connectionManager.getConnectionCount(),
      activeChannels,
      channelStats,
    } as {
      connections: number;
      activeChannels: string[];
      channelStats: Record<string, number>;
      rateLimit?: {
        totalConnections: number;
        activeMessageBuckets: number;
      };
    };

    if (this.rateLimiter) {
      stats.rateLimit = this.rateLimiter.getStats();
    }

    return stats;
  }

  private setupConnectionHandlers(): void {
    if (!this.wss) {
      return;
    }

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));
  }

  private setupMessageHandlers(): void {}

  private async handleConnection(ws: ExtendedWebSocket): Promise<void> {
    const connectionId = this.generateConnectionId();
    const ip = ws._socket?.remoteAddress;

    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data: Buffer) => {
      if (this.rateLimiter && !this.rateLimiter.checkMessageLimit(connectionId)) {
        this.sendError(ws, 'RATE_LIMIT', 'Message rate limit exceeded');
        return;
      }
      await this.handleMessage(ws, connectionId, data);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(connectionId, ip, code, reason.toString());
    });

    ws.on('error', (error: Error) => {
      logger.error(
        {
          connectionId,
          error: error.message,
          stack: error.stack,
        },
        'WebSocket connection error'
      );
    });

    this.sendMessage(ws, {
      type: WebSocketMessageType.AUTH_CHALLENGE,
      payload: {
        nonce: this.generateNonce(),
        expiresAt: Date.now() + (this.config.authTimeout ?? DEFAULT_WS_CONFIG.authTimeout ?? 10000),
      },
      timestamp: Date.now(),
    });
  }

  private async handleMessage(
    ws: ExtendedWebSocket,
    connectionId: string,
    data: Buffer
  ): Promise<void> {
    try {
      const message: BaseWebSocketMessage = JSON.parse(data.toString());

      if (!this.isValidMessageType(message.type)) {
        logger.warn(
          {
            connectionId,
            messageType: message.type,
          },
          'Invalid WebSocket message type'
        );
        return;
      }

      switch (message.type) {
        case 'auth_response':
          await this.handleAuth(ws, connectionId, message as ClientMessage);
          break;

        case 'subscribe':
          await this.handleSubscribe(connectionId, message as ClientMessage);
          break;

        case 'unsubscribe':
          await this.handleUnsubscribe(connectionId, message as ClientMessage);
          break;

        case 'pong':
          this.handlePong(connectionId);
          break;

        default:
          logger.debug(
            {
              connectionId,
              messageType: message.type,
            },
            'Unhandled WebSocket message type'
          );
      }
    } catch (error) {
      logger.error(
        {
          connectionId,
          error,
          data: data.toString(),
        },
        'Failed to parse WebSocket message'
      );
    }
  }

  private async handleAuth(
    ws: ExtendedWebSocket,
    connectionId: string,
    message: ClientMessage
  ): Promise<void> {
    try {
      const payload = message.payload;

      if (!payload || typeof payload !== 'object' || !('token' in payload) || !payload.token) {
        this.sendError(ws, 'MISSING_TOKEN', 'Authentication token is required');
        ws.close(1008, 'Missing token');
        return;
      }

      const authUser = await verifyUserToken(payload.token);

      const context: WebSocketConnectionContext = {
        userId: authUser.id,
        email: authUser.email,
        role: authUser.role,
        sessionId: connectionId,
        connectedAt: Date.now(),
        subscriptions: new Set(),
      };

      if (this.connectionManager) {
        this.connectionManager.addConnection(ws, context);
      }

      this.sendMessage(ws, {
        type: WebSocketMessageType.CONNECT,
        payload: {
          userId: context.userId,
        },
        timestamp: Date.now(),
      });

      logger.info(
        {
          connectionId,
          userId: context.userId,
          email: context.email,
        },
        'WebSocket connection authenticated'
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.sendError(ws, 'AUTH_FAILED', errorMessage);
      ws.close(1008, 'Authentication failed');

      logger.warn(
        {
          connectionId,
          error: errorMessage,
        },
        'WebSocket authentication failed'
      );
    }
  }

  private async handleSubscribe(connectionId: string, message: ClientMessage): Promise<void> {
    const context = this.connectionManager?.getContext(connectionId);

    if (!context) {
      logger.warn(
        {
          connectionId,
        },
        'Subscribe attempt from unauthenticated connection'
      );
      return;
    }

    const payload = message.payload;

    if (
      !payload ||
      typeof payload !== 'object' ||
      !('channels' in payload) ||
      !Array.isArray(payload.channels)
    ) {
      this.sendErrorToConnection(connectionId, 'INVALID_CHANNELS', 'Channels must be an array');
      return;
    }

    const channels = payload.channels;
    const authorizedChannels = this.getAuthorizedChannels(context);
    const unauthorizedChannels = channels.filter(
      (channel) => !authorizedChannels.includes(channel)
    );

    if (unauthorizedChannels.length > 0) {
      logger.warn(
        {
          connectionId,
          userId: context.userId,
          unauthorizedChannels,
        },
        'Unauthorized channel subscription attempt'
      );
      return;
    }

    channels.forEach((channel) => {
      this.connectionManager?.subscribeToChannel(connectionId, channel);
    });

    const ws = this.connectionManager?.getConnection(connectionId);
    if (ws) {
      this.sendMessageToWs(ws, {
        type: WebSocketMessageType.SUBSCRIPTION_ACK,
        payload: {
          channels,
          success: true,
        },
        timestamp: Date.now(),
      });
    }
  }

  private async handleUnsubscribe(connectionId: string, message: ClientMessage): Promise<void> {
    const payload = message.payload;

    if (
      !payload ||
      typeof payload !== 'object' ||
      !('channels' in payload) ||
      !Array.isArray(payload.channels)
    ) {
      this.sendErrorToConnection(connectionId, 'INVALID_CHANNELS', 'Channels must be an array');
      return;
    }

    const channels = payload.channels;
    channels.forEach((channel) => {
      this.connectionManager?.unsubscribeFromChannel(connectionId, channel);
    });

    logger.debug(
      {
        connectionId,
        channels,
      },
      'Unsubscribed from channels'
    );
  }

  private handlePong(connectionId: string): void {
    logger.debug({ connectionId }, 'Received pong from client');
  }

  private handleDisconnection(
    connectionId: string,
    ip: string | undefined,
    code: number,
    reason: string
  ): void {
    if (this.rateLimiter) {
      if (ip) {
        this.rateLimiter.releaseConnection(ip);
      }
      this.rateLimiter.removeConnectionBucket(connectionId);
    }

    if (this.connectionManager) {
      this.connectionManager.removeConnection(connectionId);
    }

    logger.info(
      {
        connectionId,
        code,
        reason,
      },
      'WebSocket connection closed'
    );
  }

  private handleServerError(error: Error): void {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
      },
      'WebSocket server error'
    );
  }

  private sendMessage(ws: ExtendedWebSocket, message: ServerMessage | BaseWebSocketMessage): void {
    if (ws.readyState === WSWebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to send WebSocket message'
        );
      }
    }
  }

  private sendMessageToWs(ws: WSWebSocket, message: ServerMessage | BaseWebSocketMessage): void {
    if (ws.readyState === WSWebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to send WebSocket message'
        );
      }
    }
  }

  private sendMessageToConnection(connectionId: string, message: ServerMessage): void {
    const ws = this.connectionManager?.getConnection(connectionId);

    if (ws) {
      this.sendMessageToWs(ws, message);
    }
  }

  private sendError(ws: ExtendedWebSocket, code: string, message: string): void {
    const errorMessage: ServerMessage = {
      type: WebSocketMessageType.ERROR,
      payload: {
        code,
        message,
      },
      timestamp: Date.now(),
    };
    this.sendMessage(ws, errorMessage);
  }

  private sendErrorToConnection(connectionId: string, code: string, message: string): void {
    const ws = this.connectionManager?.getConnection(connectionId);

    if (ws) {
      const errorMessage: ServerMessage = {
        type: WebSocketMessageType.ERROR,
        payload: {
          code,
          message,
        },
        timestamp: Date.now(),
      };
      this.sendMessageToWs(ws, errorMessage);
    }
  }

  private isValidMessageType(type: string): type is WebSocketMessageType {
    const validTypes = Object.values(WebSocketMessageType) as WebSocketMessageType[];
    return validTypes.includes(type as WebSocketMessageType);
  }

  private verifyClient(
    info: { origin: string; secure: boolean; req: IncomingMessage },
    callback: (result: boolean, code?: number, message?: string) => void
  ): void {
    const allowedOrigins = this.config.corsOrigins ?? DEFAULT_WS_CONFIG.corsOrigins!;
    const origin = info.origin;
    const ip = info.req.socket.remoteAddress;

    if (!origin) {
      callback(false, 403, 'Origin header is required');
      logger.warn({ origin: 'none' }, 'WebSocket connection rejected: missing Origin header');
      return;
    }

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      if (this.rateLimiter && ip) {
        if (!this.rateLimiter.checkConnectionLimit(ip)) {
          callback(false, 429, 'Too many connections');
          logger.warn({ ip }, 'WebSocket connection rejected: rate limit exceeded');
          return;
        }
      }
      callback(true);
      logger.debug({ origin }, 'WebSocket connection allowed');
      return;
    }

    callback(false, 403, 'Origin not allowed');
    logger.warn(
      { origin, allowedOrigins },
      'WebSocket connection rejected: origin not in allowed list'
    );
  }

  private generateConnectionId(): string {
    return uuidv4();
  }

  private generateNonce(): string {
    return uuidv4();
  }

  private getAuthorizedChannels(context: WebSocketConnectionContext): string[] {
    const channels: string[] = [];

    const channelMap = {
      CONTACTS_ALL: 'contacts:all',
      CONTACTS_TEAM: 'contacts:team',
      CONTACTS_PERSONAL: 'contacts:personal',
      CONTACT_TEAM: 'contact:{contactId}',
      PIPELINE_ALL: 'pipeline:all',
      PIPELINE_TEAM: 'pipeline:team',
      METRICS_TEAM: 'metrics:team',
      METRICS_PERSONAL: 'metrics:personal',
      METRICS_DASHBOARD: 'metrics:dashboard',
      ACTIVITY_NOTES: 'activity:notes',
      ACTIVITY_TASKS: 'activity:tasks',
      NOTIFICATIONS_ALL: 'notifications:all',
      NOTIFICATIONS_TEAM: 'notifications:team',
      SYSTEM_HEALTH: 'system:health',
    };

    switch (context.role) {
      case 'admin':
      case 'manager':
        channels.push(
          channelMap.CONTACTS_ALL,
          channelMap.PIPELINE_ALL,
          channelMap.METRICS_TEAM,
          channelMap.METRICS_DASHBOARD,
          channelMap.ACTIVITY_NOTES,
          channelMap.ACTIVITY_TASKS,
          channelMap.NOTIFICATIONS_ALL,
          channelMap.SYSTEM_HEALTH
        );
        break;

      case 'advisor':
        channels.push(
          channelMap.CONTACTS_PERSONAL,
          channelMap.PIPELINE_TEAM,
          channelMap.METRICS_PERSONAL,
          channelMap.ACTIVITY_TASKS,
          channelMap.NOTIFICATIONS_ALL
        );
        break;

      default:
        channels.push(
          channelMap.CONTACTS_PERSONAL,
          channelMap.METRICS_PERSONAL,
          channelMap.NOTIFICATIONS_ALL
        );
    }

    return channels;
  }
}

let wsServerInstance: WebSocketServer | null = null;

export function startWebSocketServer(config?: Partial<WebSocketServerConfig>): WebSocketServer {
  if (wsServerInstance) {
    logger.warn('WebSocket server already running');
    return wsServerInstance;
  }

  wsServerInstance = new WebSocketServer(config);
  wsServerInstance.start();

  return wsServerInstance;
}

export function getWebSocketServer(): WebSocketServer | null {
  return wsServerInstance;
}

export function stopWebSocketServer(): void {
  if (wsServerInstance) {
    wsServerInstance.stop();
    wsServerInstance = null;
  }
}
