import { createLogger } from '@maatwork/logger';

/**
 * Logger singleton para servicios
 * Usar este logger en servicios que no tienen acceso a req.log
 */
export const logger = createLogger({
  serviceName: 'api',
});
