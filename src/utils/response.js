export class APIResponse {
    /**
     * Standardized API response utility
     * @param {FastifyReply} reply - Fastify reply object
     * @param {Object} data - Response data
     * @param {string} message - Success message
     * @param {number} statusCode - HTTP status code (default: 200)
     */
    constructor(reply, data = null, message = 'Success', statusCode = 200) {
      this.reply = reply;
      this.data = data;
      this.message = message;
      this.statusCode = statusCode;
    }
  
    /**
     * Send the response
     */
    send() {
      this.reply.status(this.statusCode).send({
        success: true,
        message: this.message,
        data: this.data,
      });
    }
  }
  
  export class APIError extends Error {
    /**
     * Standardized API error utility
     * @param {number} statusCode - HTTP status code
     * @param {string} message - Error message
     */
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true; // Mark as operational error
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Global error handler middleware
   * @param {Error} error - Error object
   * @param {FastifyRequest} request - Fastify request object
   * @param {FastifyReply} reply - Fastify reply object
   */
  export const errorHandler = (error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
  
    reply.status(statusCode).send({
      success: false,
      message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  };