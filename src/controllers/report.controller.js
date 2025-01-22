import { Report } from '../model/report.model.js';
import { Report_types } from '../model/report.types.js';

export const submitReport = async (request, reply) => {
  try {
    const { userId, snugId, reportType, description, location } = request.body;

    if (!userId || !snugId || !reportType || !location) {
      return reply.status(400).send({ message: 'Required fields are missing' });
    }

    if (!Report_types.includes(reportType)) {
      return reply.status(400).send({ message: 'Invalid report type' });
    }

    const report = new Report({ userId, snugId, reportType, description, location });
    await report.save();

    return reply.status(201).send({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Error submitting report:', error);
    return reply.status(500).send({ message: 'Internal server error', error });
  }
};
