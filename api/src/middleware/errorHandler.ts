import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode: number;
  code: number;
}

export const createError = (message: string, statusCode: number = 500, code?: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code ?? statusCode;
  return error;
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (error: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = 'statusCode' in error ? error.statusCode : 500;
  const code = 'code' in error ? error.code : statusCode;
  const message = error.message || 'Internal Server Error';

  console.error('[Error]', error);

  res.status(statusCode).json({
    error: message,
    code,
  });
};

export default errorHandler;
