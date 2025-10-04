import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import usersRouter from './routes/users';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

const app = express();
app.use(express.json());
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

app.use('/users', usersRouter);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  logger.info({ port }, 'API listening');
});


