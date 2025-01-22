import mongoose from 'mongoose';
import { Report_types } from './report.types.js';

const reportSchema = new mongoose.Schema({
  reportId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  userId: { type: String, required: true },
  reportType: { type: String, enum: Report_types, required: true },
  description: { type: String, default: '' },
  location: { type: String, required: true },
  snugId: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export const Report = mongoose.model('Report', reportSchema);
