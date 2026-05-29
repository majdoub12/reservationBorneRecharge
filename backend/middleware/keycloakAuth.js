const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const jwks = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
});

function getKeycloakSigningKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    const signingKey = key ? key.getPublicKey() : null;
    callback(err, signingKey);
  });
}

const keycloakAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(
    token,
    getKeycloakSigningKey,
    {
      algorithms: ['RS256'],
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    },
    (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      
      // Extract immatricule from token (username field)
      req.user = {
        immatricule: decoded.preferred_username || decoded.sub,
        keycloakId: decoded.sub,
        email: decoded.email,
      };
      
      next();
    }
  );
};

module.exports = keycloakAuth;