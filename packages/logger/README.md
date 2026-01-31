# @maatwork/logger

A shared structured logging library based on [Pino](https://github.com/pinojs/pino), designed for consistency across the Monorepo.

## Features

- **Structured JSON**: Default for production.
- **Pretty Printing**: Auto-enabled in development.
- **Extended Interface**: Custom methods for request/response tracking (`logRequest`, `logResponse`).
- **Context Awareness**: Ability to inject user context (`updateUser`).

## Usage

### Basic Initialization

```typescript
import { createLogger } from '@maatwork/logger';

export const logger = createLogger({
  serviceName: 'my-service',
  isProduction: process.env.NODE_ENV === 'production',
});
```

### Logging Methods

Avoid using `console.log`. Use the logger instance:

```typescript
logger.info('System started');
logger.debug({ config }, 'Loaded configuration');
logger.error({ err }, 'Critical failure');
```

### Context & Tracking

The logger supports tracking user context and HTTP requests:

```typescript
// Set user context (e.g., after auth)
logger.updateUser('user-123', 'admin');

// Log HTTP events
logger.logRequest('GET', '/api/users', 'req-id-123');
logger.logResponse('GET', '/api/users', 200, 45, 'req-id-123');
```

## Development

In `NODE_ENV=development`, logs are formatted with `pino-pretty` for readability. In production, they are pure JSON for ingestion systems.
