const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access Denied' });

  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    console.log(token)
    request.user = decoded;
    console.log(decoded)
  } catch (error) {
    res.status(400).json({ message: 'Invalid Token' });
  }
};
