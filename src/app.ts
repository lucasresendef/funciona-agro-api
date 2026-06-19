import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { registerAuth } from './modules/auth/auth.plugin';
import { env } from './shared/config/env';
import { prisma } from './shared/database/prisma';
import { registerErrorHandler, registerNotFoundHandler } from './shared/errors/error-handler';
import { registerAppRoutes } from './shared/http/register-routes';
import { sanitizeForLog } from './shared/utils/log-sanitizer';

export function buildApp() {
  const isTest = env.NODE_ENV === 'test';
  const isDevelopment = env.NODE_ENV === 'development';
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const app = Fastify({
    requestTimeout: 120_000,
    keepAliveTimeout: 72_000,
    logger: isTest
      ? false
      : isDevelopment
        ? {
            level: 'debug',
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                ignore: 'pid,hostname',
                singleLine: false,
              },
            },
          }
        : {
            level: 'info',
          },
  });

  void app.register(helmet);
  void app.register(cors, {
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  void app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  app.addHook('preHandler', async (request) => {
    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        params: sanitizeForLog(request.params ?? {}),
        query: sanitizeForLog(request.query ?? {}),
        body: sanitizeForLog(request.body ?? null),
      },
      'Incoming request payload',
    );
  });

  registerAuth(app);
  registerErrorHandler(app);
  registerNotFoundHandler(app);

  app.register(registerAppRoutes);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}
