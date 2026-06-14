import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        error = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (resObj.message !== undefined) {
          message = resObj.message as string | string[];
        }
        if (resObj.error !== undefined) {
          error = resObj.error as string;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Map Prisma error codes to meaningful HTTP responses without leaking internals
      switch (exception.code) {
        case 'P2002': {
          const fields = (exception.meta?.target as string[])?.join(', ') ?? 'field';
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          message = `A record with this ${fields} already exists.`;
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = (exception.meta?.cause as string) ?? 'The requested record was not found.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'A required related record does not exist.';
          break;
        case 'P2014':
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'The change violates a required relation between records.';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          error = 'Database Error';
          message = 'A database error occurred.';
          this.logger.error(`Unhandled Prisma error [${exception.code}]: ${exception.message}`);
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      message = 'Invalid data provided to the database.';
      this.logger.error(`Prisma validation error: ${exception.message}`);
    } else {
      // Unknown / unexpected errors — log but do not leak details
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
