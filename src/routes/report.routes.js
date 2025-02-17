import { submitReport } from '../controllers/report.controller.js';

export const reportRoutes = (fastify, opts, done) => {
  fastify.post('/reports', submitReport); // Use a descriptive route path
  done();
};
