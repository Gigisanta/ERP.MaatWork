import { describe, it, expect, beforeEach } from 'vitest';
import { createLogger, ExtendedLogger } from './index';

describe('logger', () => {
  let logger: ExtendedLogger;

  beforeEach(() => {
    logger = createLogger({ serviceName: 'test-service' });
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should have standard logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should have extended logging methods', () => {
    expect(typeof logger.updateUser).toBe('function');
    expect(typeof logger.logRequest).toBe('function');
    expect(typeof logger.logResponse).toBe('function');
    expect(typeof logger.logNetworkError).toBe('function');
  });
});

