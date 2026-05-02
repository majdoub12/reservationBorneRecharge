const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const client = jwksClient({
  jwksUri: 'http://localhost:8080/realms/vehicle-app/protocol/openid-connect/certs',
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  // Try Keycloak first (RS256)
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (!err) {
      req.user = decoded;
      req.user.isKeycloak = true;
      return next();
    }

    // Fall back to custom JWT (foreign vehicles)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.user.isKeycloak = false;
      return next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  });
};