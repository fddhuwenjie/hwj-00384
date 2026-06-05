export const createError = (message, statusCode = 500, code) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code ?? statusCode;
    return error;
};
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
export const errorHandler = (error, req, res, next) => {
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
