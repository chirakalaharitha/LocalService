const jwt = require('jsonwebtoken');

const getSecret = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
  }
  return process.env.JWT_SECRET || 'localfix_dev_jwt_secret_key';
};

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    getSecret(),
    { expiresIn: '7d' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(
    token,
    getSecret()
  );
};

module.exports = { generateToken, verifyToken };

