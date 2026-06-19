import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createSupportCatalogUnitBodySchema,
  createSupportTenantBodySchema,
  createSupportTenantFarmBodySchema,
  createSupportTenantFieldBodySchema,
  createSupportTenantPermissionBodySchema,
  createSupportTenantUserBodySchema,
  listSupportCatalogUnitsQuerySchema,
  listSupportTenantsQuerySchema,
  resetSupportTenantUserPasswordBodySchema,
  supportCatalogUnitIdParamsSchema,
  supportTenantFarmIdParamsSchema,
  supportTenantFieldIdParamsSchema,
  supportTenantIdParamsSchema,
  supportTenantPermissionIdParamsSchema,
  supportTenantUserIdParamsSchema,
  updateSupportCatalogUnitBodySchema,
  updateSupportTenantBodySchema,
  updateSupportTenantFarmBodySchema,
  updateSupportTenantFieldBodySchema,
  updateSupportTenantPermissionBodySchema,
  updateSupportTenantUserBodySchema,
} from './support-tenants.schemas';
import type { SupportTenantsService } from './support-tenants.service';

export class SupportTenantsController {
  constructor(private readonly supportTenantsService: SupportTenantsService) {}

  listCatalogUnits = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listSupportCatalogUnitsQuerySchema.parse(request.query);
    const data = await this.supportTenantsService.listCatalogUnits(query);

    return reply.send(data);
  };

  createCatalogUnit = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createSupportCatalogUnitBodySchema.parse(request.body);
    const data = await this.supportTenantsService.createCatalogUnit(
      body,
      buildCreateAuditFieldsFromRequest(request),
    );

    return reply.status(201).send({
      data,
    });
  };

  updateCatalogUnit = async (request: FastifyRequest, reply: FastifyReply) => {
    const { unitId } = supportCatalogUnitIdParamsSchema.parse(request.params);
    const body = updateSupportCatalogUnitBodySchema.parse(request.body);
    const data = await this.supportTenantsService.updateCatalogUnit(
      unitId,
      body,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };

  deactivateCatalogUnit = async (request: FastifyRequest, reply: FastifyReply) => {
    const { unitId } = supportCatalogUnitIdParamsSchema.parse(request.params);
    const data = await this.supportTenantsService.deactivateCatalogUnit(
      unitId,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };

  listTenants = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listSupportTenantsQuerySchema.parse(request.query);
    const data = await this.supportTenantsService.listTenants(query);

    return reply.send(data);
  };

  getTenant = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = supportTenantIdParamsSchema.parse(request.params);
    const data = await this.supportTenantsService.getTenantById(tenantId);

    return reply.send({
      data,
    });
  };

  createTenant = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createSupportTenantBodySchema.parse(request.body);
    const data = await this.supportTenantsService.createTenant(
      body,
      buildCreateAuditFieldsFromRequest(request),
    );

    return reply.status(201).send({
      data,
    });
  };

  updateTenant = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = supportTenantIdParamsSchema.parse(request.params);
    const body = updateSupportTenantBodySchema.parse(request.body);
    const data = await this.supportTenantsService.updateTenant(tenantId, body);

    return reply.send({
      data,
    });
  };

  deactivateTenant = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = supportTenantIdParamsSchema.parse(request.params);
    const data = await this.supportTenantsService.deactivateTenant(tenantId);

    return reply.send({
      data,
    });
  };

  createTenantUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = supportTenantIdParamsSchema.parse(request.params);
    const body = createSupportTenantUserBodySchema.parse(request.body);
    const data = await this.supportTenantsService.createTenantUser(
      tenantId,
      body,
      buildCreateAuditFieldsFromRequest(request),
    );

    return reply.status(201).send({
      data,
    });
  };

  updateTenantUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, userId } = supportTenantUserIdParamsSchema.parse(request.params);
    const body = updateSupportTenantUserBodySchema.parse(request.body);
    const data = await this.supportTenantsService.updateTenantUser(
      tenantId,
      userId,
      body,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };

  resetTenantUserPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, userId } = supportTenantUserIdParamsSchema.parse(request.params);
    const body = resetSupportTenantUserPasswordBodySchema.parse(request.body);
    const data = await this.supportTenantsService.resetTenantUserPassword(tenantId, userId, body);

    return reply.send({
      data,
    });
  };

  deactivateTenantUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, userId } = supportTenantUserIdParamsSchema.parse(request.params);
    const data = await this.supportTenantsService.deactivateTenantUser(
      tenantId,
      userId,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };

  createTenantFarm = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = supportTenantIdParamsSchema.parse(request.params);
    const body = createSupportTenantFarmBodySchema.parse(request.body);
    const data = await this.supportTenantsService.createTenantFarm(
      tenantId,
      body,
      buildCreateAuditFieldsFromRequest(request),
    );

    return reply.status(201).send({
      data,
    });
  };

  updateTenantFarm = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, farmId } = supportTenantFarmIdParamsSchema.parse(request.params);
    const body = updateSupportTenantFarmBodySchema.parse(request.body);
    const data = await this.supportTenantsService.updateTenantFarm(
      tenantId,
      farmId,
      body,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };

  deactivateTenantFarm = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, farmId } = supportTenantFarmIdParamsSchema.parse(request.params);
    const data = await this.supportTenantsService.deactivateTenantFarm(
      tenantId,
      farmId,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };

  createTenantField = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = supportTenantIdParamsSchema.parse(request.params);
    const body = createSupportTenantFieldBodySchema.parse(request.body);
    const data = await this.supportTenantsService.createTenantField(
      tenantId,
      body,
      buildCreateAuditFieldsFromRequest(request),
    );

    return reply.status(201).send({
      data,
    });
  };

  updateTenantField = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, fieldId } = supportTenantFieldIdParamsSchema.parse(request.params);
    const body = updateSupportTenantFieldBodySchema.parse(request.body);
    const data = await this.supportTenantsService.updateTenantField(
      tenantId,
      fieldId,
      body,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };

  deactivateTenantField = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, fieldId } = supportTenantFieldIdParamsSchema.parse(request.params);
    const data = await this.supportTenantsService.deactivateTenantField(
      tenantId,
      fieldId,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };

  createTenantPermission = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = supportTenantIdParamsSchema.parse(request.params);
    const body = createSupportTenantPermissionBodySchema.parse(request.body);
    const data = await this.supportTenantsService.createTenantPermission(
      tenantId,
      body,
      buildCreateAuditFieldsFromRequest(request),
    );

    return reply.status(201).send({
      data,
    });
  };

  updateTenantPermission = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, permissionId } = supportTenantPermissionIdParamsSchema.parse(request.params);
    const body = updateSupportTenantPermissionBodySchema.parse(request.body);
    const data = await this.supportTenantsService.updateTenantPermission(
      tenantId,
      permissionId,
      body,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };

  deactivateTenantPermission = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, permissionId } = supportTenantPermissionIdParamsSchema.parse(request.params);
    const data = await this.supportTenantsService.deactivateTenantPermission(
      tenantId,
      permissionId,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data,
    });
  };
}
