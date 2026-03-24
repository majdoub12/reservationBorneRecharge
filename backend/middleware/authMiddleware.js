const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  if (!SECRET) {
    console.error('JWT_SECRET is not set in environment');
    return res.status(500).json({ message: 'Server misconfiguration' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // contains vehicleId
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authenticate;