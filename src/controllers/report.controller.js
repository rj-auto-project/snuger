import mongoose from 'mongoose';

// Define the Report schema
const reportSchema = new mongoose.Schema({
    reportId: { type: String, default: () => new mongoose.Types.ObjectId() }, // Generates a unique ID
    userId: { type: String, required: true },
    reportType: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    snugId: { type: String, required: true },
    date: { type: Date, default: Date.now },
  });

// Create the Report model
const Report = mongoose.model('Report', reportSchema);

// Controller function to submit a report
export const submitReport = async (request, reply) => {
  try {
    const { userId, snugId, reportType, description, location } = request.body;

    if (!userId || !snugId || !reportType || !location) {
      reply.status(400).send({ message: 'Required fields are missing' });
      return;
    }

    const report = new Report({ userId, snugId, reportType, description, location });
    await report.save();
    reply.status(201).send({ message: 'Report submitted successfully' });
  } catch (error) {
    reply.status(500).send({ message: 'Internal server error', error });
  }
};
