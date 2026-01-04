import { Response } from 'express';
import { ZodError } from 'zod';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: string[];
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly isOperational: boolean;

  constructor(message: string, status: number = 500, code?: string, isOperational: boolean = true) {
    super(message);
    this.status = status;
    this.code = code;
    this.isOperational = isOperational;

    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    // This clips the constructor invocation from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export function handleError(error: unknown, res: Response): void {
  console.error('Error occurred:', error);
  const requestId = (res as any)?.locals?.requestId || res.getHeader?.('X-Request-Id');

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      requestId
    });
    return;
  }

  // Handle our custom AppError
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: sanitizeErrorMessage(error.message, error.status),
      code: error.code,
      requestId
    });
    return;
  }

  // Handle known errors
  if (error instanceof Error) {
    const status = getStatusFromError(error);
    res.status(status).json({
      error: sanitizeErrorMessage(error.message, status),
      requestId
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    error: sanitizeErrorMessage('Unknown error occurred', 500),
    requestId
  });
}

function getStatusFromError(error: Error): number {
  // Check for common error patterns
  if (error.message.toLowerCase().includes('not found')) {
    return 404;
  }
  
  if (error.message.toLowerCase().includes('unauthorized') || 
      error.message.toLowerCase().includes('access denied')) {
    return 403;
  }
  
  if (error.message.toLowerCase().includes('validation') || 
      error.message.toLowerCase().includes('invalid')) {
    return 400;
  }

  return 500;
}

function sanitizeErrorMessage(message: string, status: number): string {
  if (process.env.NODE_ENV === 'production') {
    // Return generic messages in production
    switch (status) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 413:
        return 'Payload Too Large';
      case 429:
        return 'Too Many Requests';
      case 500:
      default:
        return 'Internal Server Error';
    }
  }
  
  return message;
}

// Common error factory functions
export const errors = {
  notFound: (resource: string = 'Resource') => 
    new AppError(`${resource} not found`, 404, 'not_found'),
  
  unauthorized: (message: string = 'Unauthorized') => 
    new AppError(message, 401, 'unauthorized'),
  
  forbidden: (message: string = 'Access denied') => 
    new AppError(message, 403, 'forbidden'),
  
  validation: (message: string) => 
    new AppError(message, 400, 'validation_error'),
  
  conflict: (message: string) => 
    new AppError(message, 409, 'conflict'),
  
  tooLarge: (message: string = 'Payload too large') => 
    new AppError(message, 413, 'payload_too_large'),
  
  rateLimit: (message: string = 'Too many requests') => 
    new AppError(message, 429, 'rate_limit_exceeded'),
  
  internal: (message: string = 'Internal server error') => 
    new AppError(message, 500, 'internal_error')
};
