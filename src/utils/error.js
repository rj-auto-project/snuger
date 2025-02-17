export function errorHandler(error, request, reply) {
    request.log.error(error);

    if (error.validation) {
      // Validation errors from Fastify schemas
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }
  
    if (error.statusCode) {
      // Handle HTTP errors explicitly thrown in the app
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name || 'Error',
        message: error.message,
      });
    }
  
    // Generic Internal Server Error for unexpected cases
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Something went wrong. Please try again later.',
    });
  }
  



  export class APIError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
