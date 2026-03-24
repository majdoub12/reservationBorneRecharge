const jwt = require('jsonwebtoken');

const SECRET = 'mysecretkey';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // contains vehicleId
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

module.exports = authenticate;