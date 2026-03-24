const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET; // later move to .env

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { generateToken, verifyToken };