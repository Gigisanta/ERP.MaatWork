# WebSocket Module

Real-time updates for MAATWORK using WebSocket connections.

---

## Overview

The WebSocket module provides real-time event broadcasting for:

- **Contact updates** - Created, updated, deleted
- **Pipeline changes** - Stage movements
- **Dashboard metrics** - Team and personal metrics updates
- **Activity** - New notes, tasks, task completions
- **Notifications** - System and user notifications

---

## Architecture

```
Client → WebSocket Server → Connection Manager → Subscribers
         ↓
    Authentication (JWT)
         ↓
    Authorization (Role-based channels)
         ↓
    Message Broadcasting
```

---

## Features

### 1. **Authentication**
- JWT-based authentication (same as HTTP API)
- Secure token validation
- Role-based authorization

### 2. **Channel Subscriptions**
- Type-safe subscription channels
- Role-based access control
- Dynamic subscribe/unsubscribe

### 3. **Connection Management**
- Automatic cleanup on disconnect
- Heartbeat monitoring (30s interval)
- Connection statistics tracking

### 4. **Message Broadcasting**
- Efficient fan-out to channel subscribers
- Message type validation
- Error handling and logging

---

## WebSocket Messages

### Client → Server

#### Authenticate
```json
{
  "type": "auth_response",
  "payload": {
    "token": "eyJhbGc..."
  },
  "timestamp": 1234567890
}
```

#### Subscribe to Channels
```json
{
  "type": "subscribe",
  "payload": {
    "channels": ["contacts:personal", "metrics:dashboard"]
  },
  "timestamp": 1234567890
}
```

#### Unsubscribe from Channels
```json
{
  "type": "unsubscribe",
  "payload": {
    "channels": ["contacts:personal"]
  },
  "timestamp": 1234567890
}
```

#### Pong
```json
{
  "type": "pong",
  "payload": {
    "timestamp": 1234567890
  },
  "timestamp": 1234567890
}
```

### Server → Client

#### Auth Challenge
```json
{
  "type": "auth_challenge",
  "payload": {
    "nonce": "550e8400-e29b-41d4-a716-446655440000",
    "expiresAt": 1234567890
  },
  "timestamp": 1234567890
}
```

#### Subscription Acknowledgment
```json
{
  "type": "subscription_ack",
  "payload": {
    "channels": ["contacts:personal", "metrics:dashboard"],
    "success": true
  },
  "timestamp": 1234567890
}
```

#### Contact Update
```json
{
  "type": "contact_update",
  "payload": {
    "contactId": "550e8400-e29b-41d4-a716-446655440000",
    "changes": {
      "fullName": "John Doe",
      "email": "john@example.com"
    },
    "updatedAt": 1234567890
  },
  "timestamp": 1234567890
}
```

#### Pipeline Stage Change
```json
{
  "type": "pipeline_stage_change",
  "payload": {
    "contactId": "550e8400-e29b-41d4-a716-446655440000",
    "previousStage": "prospect",
    "newStage": "qualified",
    "changedBy": "550e8400-e29b-41d4-a716-446655440000",
    "changedAt": 1234567890
  },
  "timestamp": 1234567890
}
```

#### Dashboard KPI Update
```json
{
  "type": "dashboard_kpi_update",
  "payload": {
    "kpis": {
      "totalContacts": 1234,
      "activeContacts": 456,
      "conversionRate": 0.37
    },
    "lastUpdated": 1234567890
  },
  "timestamp": 1234567890
}
```

#### Notification
```json
{
  "type": "notification",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "task_assigned",
    "title": "New Task Assigned",
    "message": "You have been assigned a new task",
    "priority": "medium",
    "actionUrl": "/tasks/123",
    "createdAt": 1234567890
  },
  "timestamp": 1234567890
}
```

#### Error
```json
{
  "type": "error",
  "payload": {
    "code": "AUTH_FAILED",
    "message": "Invalid or expired token"
  },
  "timestamp": 1234567890
}
```

---

## Subscription Channels

### Role-Based Access

| Role | Channels |
|------|----------|
| **Admin/Manager** | `contacts:all`, `pipeline:all`, `metrics:team`, `metrics:dashboard`, `activity:notes`, `activity:tasks`, `notifications:all`, `system:health` |
| **Advisor** | `contacts:personal`, `pipeline:team`, `metrics:personal`, `activity:tasks`, `notifications:all` |
| **Other** | `contacts:personal`, `metrics:personal`, `notifications:all` |

### Channel List

- `contacts:all` - All contact updates (admin/manager)
- `contacts:team` - Team contact updates (admin/manager)
- `contacts:personal` - Personal contact updates (all)
- `contact:{contactId}` - Specific contact updates
- `pipeline:all` - All pipeline changes (admin/manager)
- `pipeline:team` - Team pipeline changes (advisor+)
- `metrics:team` - Team metrics updates (admin/manager)
- `metrics:personal` - Personal metrics updates (all)
- `metrics:dashboard` - Dashboard KPI updates (admin/manager)
- `activity:notes` - New note events (admin/manager)
- `activity:tasks` - Task events (advisor+)
- `notifications:all` - All notifications (all)
- `notifications:team` - Team notifications (admin/manager)
- `system:health` - System health updates (admin/manager)

---

## Usage

### Starting the Server

```typescript
import { startWebSocketServer } from './websocket';

const wsServer = startWebSocketServer({
  port: 3002,
  path: '/ws',
  heartbeatInterval: 30000,
  authTimeout: 10000,
});
```

### Broadcasting Events

```typescript
import { getWebSocketServer, SubscriptionChannel } from './websocket';

const wsServer = getWebSocketServer();

// Broadcast contact update
wsServer?.broadcast(SubscriptionChannel.CONTACTS_ALL, {
  type: WebSocketMessageType.CONTACT_UPDATE,
  payload: {
    contactId: '123',
    changes: { fullName: 'John Doe' },
    updatedAt: Date.now(),
  },
});

// Broadcast dashboard KPI update
wsServer?.broadcast(SubscriptionChannel.METRICS_DASHBOARD, {
  type: WebSocketMessageType.DASHBOARD_KPI_UPDATE,
  payload: {
    kpis: { totalContacts: 1234, activeContacts: 456 },
    lastUpdated: Date.now(),
  },
});
```

### Getting Statistics

```typescript
const stats = wsServer?.getStats();
console.log(stats);
// {
//   connections: 15,
//   activeChannels: ['contacts:personal', 'metrics:dashboard'],
//   channelStats: {
//     'contacts:personal': 10,
//     'metrics:dashboard': 15,
//   }
// }
```

---

## Client Connection Example

```typescript
const ws = new WebSocket('ws://localhost:3003/ws', {
  headers: {
    'Origin': 'http://localhost:3000',
  },
});

// 1. Receive auth challenge
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'auth_challenge') {
    // 2. Send auth response
    ws.send(JSON.stringify({
      type: 'auth_response',
      payload: { token: getAuthToken() },
      timestamp: Date.now(),
    }));
  }

  if (message.type === 'connect') {
    console.log('Connected with ID:', message.payload.connectionId);

    // 3. Subscribe to channels
    ws.send(JSON.stringify({
      type: 'subscribe',
      payload: { channels: ['contacts:personal', 'metrics:dashboard'] },
      timestamp: Date.now(),
    }));
  }

  // 4. Handle real-time updates
  if (message.type === 'contact_update') {
    console.log('Contact updated:', message.payload);
  }
};
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | `3003` | WebSocket server port |
| `WS_TLS_KEY` | `undefined` | Path to TLS private key (for WSS) |
| `WS_TLS_CERT` | `undefined` | Path to TLS certificate (for WSS) |
| `WS_TLS_CA` | `undefined` | Path to TLS CA certificate (optional) |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

### Server Options

| Option | Default | Description |
|--------|---------|-------------|
| `port` | `3003` | WebSocket server port |
| `path` | `/ws` | WebSocket endpoint path |
| `clientTracking` | `true` | Track client connections |
| `maxPayload` | `1048576` | Max message size in bytes (1MB) |
| `heartbeatInterval` | `30000` | Heartbeat interval in ms (30s) |
| `authTimeout` | `10000` | Auth timeout in ms (10s) |
| `corsOrigins` | `['http://localhost:3000']` | Allowed WebSocket origins |
| `rateLimitEnabled` | `true` | Enable rate limiting |
| `rateLimit.maxConnectionsPerIP` | `10` | Max connections per IP |
| `rateLimit.maxMessagesPerSecond` | `30` | Max messages per second |
| `rateLimit.windowMs` | `60000` | Rate limit window in ms |
| `rateLimit.burstTokens` | `50` | Burst token capacity |
| `tls.key` | `undefined` | TLS private key path |
| `tls.cert` | `undefined` | TLS certificate path |
| `tls.ca` | `undefined` | TLS CA certificate path |
| `tls.rejectUnauthorized` | `true` | Reject unauthorized client certificates |

### Production Configuration

```typescript
import { startWebSocketServer } from './websocket';

const wsConfig = {
  port: 3003,
  corsOrigins: ['https://app.example.com'],
  rateLimitEnabled: true,
  rateLimit: {
    maxConnectionsPerIP: 10,
    maxMessagesPerSecond: 30,
    windowMs: 60000,
    burstTokens: 50,
  },
  tls: {
    key: '/path/to/ssl/key.pem',
    cert: '/path/to/ssl/cert.pem',
    ca: '/path/to/ssl/ca.pem',
  },
};

startWebSocketServer(wsConfig);
```

For load balancing configuration, see [LOAD_BALANCING.md](./LOAD_BALANCING.md).

---

## Security

1. **Authentication** - All connections must authenticate with valid JWT
2. **Authorization** - Role-based channel access control
3. **Rate Limiting** - Built-in token bucket rate limiting
   - Connection limit: 10 per IP (configurable)
   - Message rate: 30 messages/second (configurable)
   - Burst capacity: 50 tokens (configurable)
4. **CORS Origin Validation** - Verify Origin header against allowed list
5. **TLS/WSS Support** - Secure WebSocket connections in production
6. **Message Size Limits** - Configurable max payload size (1MB default)

### Rate Limiting Presets

```typescript
import { WS_RATE_LIMIT_PRESETS } from './websocket/rate-limit';

// Default: 10 connections, 30 msg/sec, 50 burst tokens
startWebSocketServer({ rateLimit: WS_RATE_LIMIT_PRESETS.default });

// Strict: 5 connections, 10 msg/sec, 20 burst tokens
startWebSocketServer({ rateLimit: WS_RATE_LIMIT_PRESETS.strict });

// Loose: 20 connections, 60 msg/sec, 100 burst tokens
startWebSocketServer({ rateLimit: WS_RATE_LIMIT_PRESETS.loose });
```

---

## Error Handling

The server sends error messages for:

| Code | Description |
|------|-------------|
| `MISSING_TOKEN` | No authentication token provided |
| `AUTH_FAILED` | Invalid or expired token |
| `INVALID_CHANNELS` | Invalid channel subscription request |
| `UNAUTHORIZED_CHANNEL` | Channel access denied based on role |

---

## Monitoring

### Connection Statistics

```typescript
const stats = wsServer?.getStats();
```

### Metrics

The WebSocket server logs:
- Connection establish/close events
- Authentication success/failure
- Channel subscription/unsubscription
- Message broadcast counts
- Error events

### Health Check

The system broadcasts `system:health` events for monitoring connection health.

---

## Testing

```typescript
import { WebSocketServer } from './websocket';

describe('WebSocket Server', () => {
  let wsServer: WebSocketServer;

  beforeEach(() => {
    wsServer = new WebSocketServer({ port: 3010 });
    wsServer.start();
  });

  afterEach(() => {
    wsServer.stop();
  });

  it('should authenticate connections', async () => {
    // Test authentication logic
  });

  it('should handle subscriptions', async () => {
    // Test subscription logic
  });

  it('should broadcast messages', async () => {
    // Test broadcasting
  });
});
```

---

## Troubleshooting

### Connection Fails

1. Check JWT_SECRET is set
2. Verify token is valid and not expired
3. Check port is not in use
4. Review logs for specific error

### Messages Not Received

1. Verify subscription to correct channel
2. Check role-based channel access
3. Review server logs for broadcast errors
4. Ensure connection is authenticated

### High Memory Usage

1. Check connection count
2. Verify subscription cleanup on disconnect
3. Review heartbeat intervals
4. Check for connection leaks

---

## Performance Considerations

1. **Connection Pooling** - Reuse connections when possible
2. **Message Batching** - Batch updates when possible
3. **Channel Granularity** - Balance between channels and message frequency
4. **Heartbeat Interval** - Adjust based on network conditions
5. **Payload Size** - Keep messages under maxPayload limit

---

## Future Enhancements

- [ ] Message persistence and replay
- [ ] Compression for large payloads
- [ ] Cluster support with Redis pub/sub for multi-instance broadcasting
- [ ] Message acknowledgment and retry

---

## Related Documentation

- [MAATWORK API](../../README.md)
- [Authentication](../auth/README.md)
- [Real-time Architecture](../../../docs/ARCHITECTURE.md)
- [Load Balancing](./LOAD_BALANCING.md)

## Related Documentation

- [MAATWORK API](../../README.md)
- [Authentication](../auth/README.md)
- [Real-time Architecture](../../../docs/ARCHITECTURE.md)
