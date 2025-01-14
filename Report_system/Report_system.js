const auth = require('./middleware/auth');

app.post('/report', auth, async (req, res) => {
  // Existing report logic
});
