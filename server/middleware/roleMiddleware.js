const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, missing user identity'
      });
    }

    const normalizedUserRole = req.user.role.toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user.role}) is not authorized to access this resource`
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };
