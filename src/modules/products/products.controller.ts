import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../shared/errors/app-error';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createProductBodySchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  updateProductBodySchema,
} from './products.schemas';
import type { ProductsService } from './products.service';

export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listProductsQuerySchema.parse(request.query);
    const products = await this.productsService.list(query, request.authUser);

    return reply.send(products);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const body = createProductBodySchema.parse(request.body);
    const product = await this.productsService.create(
      body,
      buildCreateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.status(201).send({
      data: product,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const { id } = productIdParamsSchema.parse(request.params);
    const product = await this.productsService.deactivate(
      id,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: product,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const { id } = productIdParamsSchema.parse(request.params);
    const body = updateProductBodySchema.parse(request.body);
    const product = await this.productsService.update(
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: product,
    });
  };
}
