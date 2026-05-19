/**
 * WealthGenie Global Error Handler
 * Provides structured error logging and safe client responses.
 * Never exposes internal error messages or stack traces to clients.
 */

const ERROR_CATEGORIES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  CONFLICT: 'CONFLICT_ERROR',
  ML_SERVICE: 'ML_SERVICE_ERROR',
  GEMINI: 'GEMINI_API_ERROR',
  MARKET_DATA: 'MARKET_DATA_ERROR',
  DATABASE: 'DATABASE_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

function categoriseError(err) {
  if (err.name === 'ValidationError' || err.isJoi) return ERROR_CATEGORIES.VALIDATION;
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
    return ERROR_CATEGORIES.AUTH;
  if (err.name === 'CastError' && err.kind === 'ObjectId')
    return ERROR_CATEGORIES.VALIDATION;
  if (err.message?.includes('ML service') || err.message?.includes('SHAP'))
    return ERROR_CATEGORIES.ML_SERVICE;
  if (err.message?.includes('Gemini') || err.message?.includes('generativelanguage'))
    return ERROR_CATEGORIES.GEMINI;
  if (err.message?.includes('AMFI') || err.message?.includes('Yahoo') || err.message?.includes('market'))
    return ERROR_CATEGORIES.MARKET_DATA;
  if (err.name === 'MongoServerError' && err.code === 11000)
    return ERROR_CATEGORIES.CONFLICT;
  if (err.name === 'MongoServerError' || err.name === 'MongooseError')
    return ERROR_CATEGORIES.DATABASE;
  return ERROR_CATEGORIES.UNKNOWN;
}

const CLIENT_MESSAGES = {
  [ERROR_CATEGORIES.VALIDATION]: 'Invalid request data.',
  [ERROR_CATEGORIES.AUTH]: 'Authentication failed.',
  [ERROR_CATEGORIES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CATEGORIES.CONFLICT]: 'A resource with this data already exists.',
  [ERROR_CATEGORIES.ML_SERVICE]: 'Recommendation engine temporarily unavailable.',
  [ERROR_CATEGORIES.GEMINI]: 'AI advisory service temporarily unavailable.',
  [ERROR_CATEGORIES.MARKET_DATA]: 'Live market data temporarily unavailable.',
  [ERROR_CATEGORIES.DATABASE]: 'Database operation failed.',
  [ERROR_CATEGORIES.RATE_LIMIT]: 'Too many requests. Please try again later.',
  [ERROR_CATEGORIES.UNKNOWN]: 'An unexpected error occurred.',
};

export function errorHandler(err, req, res, _next) {
  const category = categoriseError(err);
  const status = err.status || err.statusCode || 500;

  // Structured JSON log — easy to grep in production
  const logEntry = {
    timestamp: new Date().toISOString(),
    category,
    status,
    method: req.method,
    path: req.originalUrl || req.path,
    userId: req.user?.userId || 'anonymous',
    requestId: req.headers['x-request-id'] || null,
    message: err.message,
  };

  // Only include stack traces in development
  if (process.env.NODE_ENV === 'development') {
    logEntry.stack = err.stack;
  }

  console.error(JSON.stringify(logEntry));

  // Prevent double-sending if headers already sent
  if (res.headersSent) return;

  // Safe client response — never expose internals
  return res.status(status).json({
    error: err.clientMessage || CLIENT_MESSAGES[category],
    request_id: req.headers['x-request-id'] || null,
  });
}

/**
 * Async route wrapper — catches rejected promises and forwards to error handler.
 * Use this instead of try/catch in every route.
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create an operational error with a specific status code and client message.
 *
 * @param {number} status - HTTP status code
 * @param {string} message - Internal message for logging
 * @param {string} [clientMessage] - Safe message for the client
 * @returns {Error}
 */
export function createError(status, message, clientMessage) {
  const err = new Error(message);
  err.status = status;
  if (clientMessage) err.clientMessage = clientMessage;
  return err;
}

// Catch unhandled promise rejections — prevents silent failures
process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    category: 'UNHANDLED_REJECTION',
    message: String(reason),
    stack: reason?.stack,
  }));
});

// Catch uncaught exceptions — log but don't crash immediately
process.on('uncaughtException', (err) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    category: 'UNCAUGHT_EXCEPTION',
    message: err.message,
    stack: err.stack,
  }));
  // In production, you'd want to do a graceful shutdown here
});
