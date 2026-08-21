import { authenticateJWT } from './authMiddleware.js';

/**
 * Middleware wrapper to check if the authenticated user has the required role(s).
 * Must be used after authenticating the JWT (or it can handle it natively).
 * @param {string|string[]} allowedRoles - A single role or array of roles allowed to access the route.
 */
export const requireRole = (allowedRoles) => {
  return [
    authenticateJWT, // Ensure user is authenticated first
    (req, res, next) => {
      const user = req.user;
      
      if (!user || !user.role) {
        return res.status(401).json({ error: 'Unauthorized: No user or role found in token.' });
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: `Forbidden: Requires one of these roles: ${roles.join(', ')}` });
      }

      next();
    }
  ];
};
