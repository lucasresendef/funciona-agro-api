import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma';
import { ensureAuthenticated, ensurePortalAdmin } from '../auth/auth.plugin';
import { UnitsController } from './units.controller';
import { UnitsRepository } from './units.repository';
import { UnitsService } from './units.service';

export async function unitsRoutes(app: FastifyInstance): Promise<void> {
  const unitsRepository = new UnitsRepository(prisma);
  const unitsService = new UnitsService(unitsRepository);
  const unitsController = new UnitsController(unitsService);

  app.get('/units', { preHandler: ensureAuthenticated }, unitsController.list);
  app.post('/units', { preHandler: ensurePortalAdmin }, unitsController.create);
  app.patch('/units/:id', { preHandler: ensurePortalAdmin }, unitsController.update);
  app.delete('/units/:id', { preHandler: ensurePortalAdmin }, unitsController.deactivate);
}
