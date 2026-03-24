const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET; // later move to .env

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

module.exports = { generateToken };