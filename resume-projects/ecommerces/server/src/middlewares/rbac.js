import { ApiError } from '../utils/ApiError.js';

export const rbac = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      ApiError.forbidden(
        `Access denied. Role '${req.user.role}' lacks permission for this resource.`,
        'FORBIDDEN_ROLE'
      )
    );
  }

  next();
};

export const authorize = rbac;
