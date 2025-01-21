// src/routes/report.routes.js
import { submitReport } from '../controllers/report.controller.js';

export const reportRoutes = (fastify, opts, done) => {
  fastify.post('/', submitReport);  // Make sure the POST route is defined like this
  done();
};
