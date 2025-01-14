const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Report = require('./Report');

const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/socialMediaApp', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.json());

// Route to submit a report
app.post('/report', async (req, res) => {
  try {
    const { userId, snugId, reportType, description, location } = req.body;

    if (!userId || !snugId || !reportType || !location) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const report = new Report({ userId, snugId, reportType, description, location });
    await report.save();
    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
});

// Route to retrieve reports (for admin)
// app.get('/reports', async (req, res) => {
//   try {
//     const reports = await Report.find();
//     res.status(200).json(reports);
//   } catch (error) {
//     res.status(500).json({ message: 'Internal server error', error });
//   }
// });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
