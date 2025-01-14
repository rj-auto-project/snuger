const mongoose = require('mongoose');
const REPORT_TYPES = require('./report_types')

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true },
  userId: { type: String, required: true },
  reportType: { type: String, required: true, REPORT_TYPES },
  description: { type: String },
  location: { type: String },
  snugId: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Report', reportSchema);
