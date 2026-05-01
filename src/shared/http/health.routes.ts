import type { FastifyInstance } from 'fastify';
import { prisma } from '../database/prisma';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/ready', async (_request, reply) => {
    await prisma.$queryRaw`SELECT 1`;
    reply.status(200);
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });
}
