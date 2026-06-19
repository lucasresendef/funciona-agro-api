import { Prisma } from '../database/prisma-client';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { sanitizeForLog } from '../utils/log-sanitizer';
import { AppError } from './app-error';

type ValidationIssueLog = {
  field: string;
  code: string;
  message: string;
  expected?: string;
  received?: string;
};

function formatZodIssues(error: ZodError): ValidationIssueLog[] {
  return error.issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join('.') : 'root';

    return {
      field,
      code: issue.code,
      message: issue.message,
      expected: 'expected' in issue ? String(issue.expected) : undefined,
      received: 'received' in issue ? String(issue.received) : undefined,
    };
  });
}

function buildValidationSummary(issues: ValidationIssueLog[]): string {
  return issues.map((issue) => `${issue.field}: ${issue.message}`).join(' | ');
}

function buildRequestPayload(request: FastifyRequest): Record<string, unknown> {
  return {
    params: sanitizeForLog(request.params ?? {}),
    query: sanitizeForLog(request.query ?? {}),
    body: sanitizeForLog(request.body ?? null),
  };
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const genericStatusCode =
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? Number((error as { statusCode: number }).statusCode)
        : null;

    if (error instanceof AppError) {
      request.log.warn(
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          statusCode: error.statusCode,
          details: error.details ?? null,
        },
        error.message,
      );

      reply.status(error.statusCode).send({
        message: error.message,
        details: error.details ?? null,
      });
      return;
    }

    if (error instanceof ZodError) {
      const issues = formatZodIssues(error);
      const validationSummary = buildValidationSummary(issues);
      const requestPayload = buildRequestPayload(request);

      request.log.warn(
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          requestPayload,
          validationSummary,
          issues,
        },
        'Request validation failed',
      );

      reply.status(400).send({
        message: 'Validation failed.',
        details: {
          fields: issues,
        },
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      request.log.error(
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          prismaCode: error.code,
          message: error.message,
          meta: error.meta ?? null,
        },
        'Prisma request error',
      );

      if (error.code === 'P2002') {
        reply.status(409).send({
          message: 'A record with the same unique field already exists.',
        });
        return;
      }

      if (error.code === 'P2025') {
        reply.status(404).send({
          message: 'Record not found.',
        });
        return;
      }

      if (error.code === 'P2003') {
        reply.status(409).send({
          message: 'Operation violates relational integrity constraints.',
        });
        return;
      }
    }

    if (genericStatusCode && genericStatusCode >= 400 && genericStatusCode < 500) {
      const genericMessage =
        error instanceof Error ? error.message : 'Request failed.';

      request.log.warn(
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          statusCode: genericStatusCode,
          message: genericMessage,
        },
        'Request failed with client error',
      );

      reply.status(genericStatusCode).send({
        message: genericMessage,
      });
      return;
    }

    request.log.error(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        err: error,
      },
      'Unhandled request error',
    );

    reply.status(500).send({
      message: 'Internal server error.',
    });
  });
}

export function registerNotFoundHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      message: 'Route not found.',
    });
  });
}
