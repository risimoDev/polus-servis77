import Fastify from 'fastify';
import cors        from '@fastify/cors';
import rateLimit   from '@fastify/rate-limit';
import multipart   from '@fastify/multipart';
import { env }     from './config/env.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level:     env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport: env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } }
        : undefined,
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
    credentials: true,
  });

  await app.register(rateLimit, {
    global:  false, // per-route opt-in via config.rateLimit
    max:     100,
    timeWindow: '1 minute',
  });

  await app.register(multipart, {
    limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024 },
  });

  // Global error handler
  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    const status = err.statusCode ?? 500;
    reply.code(status).send({ error: status === 500 ? 'Internal server error' : err.message });
  });

  await registerRoutes(app);

  return app;
}
