import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

/**
 * Middleware to sanitize string inputs in request body to prevent XSS attacks
 * Applies XSS filtering to all string values in the request body
 */
export function sanitizeInputs(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Sanitize string values using XSS library
        obj[key] = xss(value, {
          whiteList: {}, // Remove all HTML tags by default
          stripIgnoreTag: true, // Remove ignored tags entirely
          stripIgnoreTagBody: ['script'], // Remove script tag contents
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitizeObject(value);
      } else if (Array.isArray(value)) {
        // Sanitize array elements
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            sanitizeObject(item);
          }
        });
      }
    }
  }
}

/**
 * Sanitize a single string value
 * Can be used for individual string sanitization outside of middleware
 */
export function sanitizeString(input: string): string {
  return xss(input, {
    whiteList: {}, // Remove all HTML tags
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script'],
  });
}