import { Router } from 'express';
import adminController from '../controllers/adminController';
import { verifyTokenMiddleware, requireAdmin } from '../middlewares/verifyToken';
import { validateRequest } from '../utils/validation';
import Joi from 'joi';
import { UserRole } from '../models/User';

const router = Router();

// Validation schemas
const updateRoleSchema = {
  body: Joi.object({
    role: Joi.string().valid(...Object.values(UserRole)).required()
      .messages({
        'any.only': 'Role must be either USER or ADMIN',
        'any.required': 'Role is required'
      })
  }),
  params: Joi.object({
    uid: Joi.string().required()
      .messages({
        'any.required': 'User ID is required'
      })
  })
};

const getUsersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    role: Joi.string().valid(...Object.values(UserRole)).optional(),
    search: Joi.string().min(1).max(100).optional()
  })
};

const userParamsSchema = {
  params: Joi.object({
    uid: Joi.string().required()
      .messages({
        'any.required': 'User ID is required'
      })
  })
};

// Apply authentication and admin role check to all routes
router.use(verifyTokenMiddleware);
router.use(requireAdmin);

// User management routes
router.get('/users', 
  validateRequest(getUsersSchema), 
  adminController.getAllUsers
);

router.get('/users/stats', 
  adminController.getUserStats
);

router.get('/users/:uid', 
  validateRequest(userParamsSchema), 
  adminController.getUserDetails
);

router.put('/users/:uid/role', 
  validateRequest(updateRoleSchema), 
  adminController.updateUserRole
);

router.post('/users/:uid/promote', 
  validateRequest(userParamsSchema), 
  adminController.promoteToAdmin
);

router.post('/users/:uid/demote', 
  validateRequest(userParamsSchema), 
  adminController.demoteFromAdmin
);

router.delete('/users/:uid', 
  validateRequest(userParamsSchema), 
  adminController.deleteUser
);

export default router;