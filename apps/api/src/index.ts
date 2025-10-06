import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          singleLine: false
        }
      }
    : undefined
});

const app = express();
app.use(express.json());

// CORS config
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true); // allow non-browser or same-origin
    if (!isProduction) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));

// Helmet config (disable CSP by default unless provided)
app.use(helmet({
  contentSecurityPolicy: process.env.CSP_ENABLED === 'true' ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(
  pinoHttp({
    logger,
    autoLogging: true,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
      remove: true
    }
  })
);

app.get('/health', (req, res) => {
  req.log.info({ route: '/health' }, 'healthcheck');
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  logger.info({ port }, 'API listening');
});


