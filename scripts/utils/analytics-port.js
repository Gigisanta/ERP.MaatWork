const { spawnSync } = require('node:child_process');

const DEFAULT_ANALYTICS_PORT = 3002;
const PORT_PROBE_RANGE = 20;

const ensureNumberPort = (value) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isPortBusy = (port) => {
  const probeScript = `
    const net = require('node:net');
    const server = net.createServer();
    const finalize = (result) => {
      try {
        process.stdout.write(result);
      } finally {
        process.exit(0);
      }
    };
    server.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        finalize('BUSY');
      } else {
        finalize('ERROR');
      }
    });
    server.listen(${port}, '0.0.0.0', () => {
      server.close(() => finalize('FREE'));
    });
    setTimeout(() => finalize('BUSY'), 2000);
  `;

  try {
    const { stdout } = spawnSync(process.execPath, ['-e', probeScript], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return (stdout || '').trim() !== 'FREE';
  } catch {
    // Conservatively assume the port is busy if we cannot probe it
    return true;
  }
};

const resolveAnalyticsPort = (options = {}) => {
  const envOverride =
    ensureNumberPort(process.env.ANALYTICS_PORT) ??
    ensureNumberPort(process.env.ANALYTICS_SERVICE_PORT);

  if (envOverride) {
    return envOverride;
  }

  const preferred = ensureNumberPort(options.preferredPort) ?? DEFAULT_ANALYTICS_PORT;

  if (!isPortBusy(preferred)) {
    return preferred;
  }

  const scanRange = ensureNumberPort(options.scanRange) ?? PORT_PROBE_RANGE;

  for (let offset = 1; offset <= scanRange; offset += 1) {
    const candidate = preferred + offset;
    if (!isPortBusy(candidate)) {
      return candidate;
    }
  }

  return preferred;
};

const buildAnalyticsServiceUrl = (port) => `http://localhost:${port}`;

module.exports = {
  DEFAULT_ANALYTICS_PORT,
  resolveAnalyticsPort,
  buildAnalyticsServiceUrl,
};
