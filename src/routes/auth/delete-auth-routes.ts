import { Router, Request, Response } from "express";
import { deleteProfile } from "../../models/profile.models";
import { deleteUser } from "../../models/user.models";
import { AuthenticatedRequest } from '../../types/authenticated-request';
import { verifyToken } from '../../middleware/authenticate';
import { check, validationResult } from 'express-validator';

const router = Router();

// Validation for ID parameter
const validateId = [
  check('id')
    .isInt({ gt: 0 })
    .withMessage('ID must be a positive integer')
];

// Helper function for handling deletion
const handleDelete = async (req: AuthenticatedRequest, res: Response, deleteFunc: Function): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { id } = req.params;
  const entityId = Number(id);

  try {
    await deleteFunc(entityId);
    res.status(200).json({ message: `${req.path.includes('profile') ? 'Profile' : 'User'} deleted successfully` });
  } catch (error) {
    console.error(`${req.path.includes('profile') ? 'Profile' : 'User'} deletion failed:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : "An unexpected error occurred" });
  }
};

// Route for deleting a profile
router.delete(
  "/profile/:id",
  verifyToken,
  validateId,
  (req: AuthenticatedRequest, res: Response) => handleDelete(req, res, deleteProfile)
);

// Route for deleting a user
router.delete(
  "/user/:id",
  verifyToken,
  validateId,
  (req: AuthenticatedRequest, res: Response) => handleDelete(req, res, deleteUser)
);

/**
 * @swagger
 * tags:
 *   - name: Delete
 *     description: Endpoints for deleting profile and users
 *
 * paths:
 *   /api/profile/{id}:
 *     delete:
 *       summary: Delete a user profile
 *       description: Deletes a profile by its ID.
 *       operationId: deleteProfile
 *       tags:
 *         - Delete
 *       parameters:
 *         - name: id
 *           in: path
 *           required: true
 *           description: The ID of the profile to delete.
 *           schema:
 *             type: integer
 *             format: int64
 *         - name: Authorization
 *           in: header
 *           required: true
 *           description: Bearer token for authentication (JWT token).
 *           schema:
 *             type: string
 *             example: "Bearer <JWT_Token>"
 *       responses:
 *         '200':
 *           description: Profile deleted successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: Profile deleted successfully
 *         '400':
 *           description: Invalid profile ID or validation failed
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   errors:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         msg:
 *                           type: string
 *                           example: ID must be a positive integer
 *                         param:
 *                           type: string
 *                           example: id
 *                         location:
 *                           type: string
 *                           example: params
 *         '500':
 *           description: Server error when deleting profile
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   error:
 *                     type: string
 *                     example: An unexpected error occurred
 *   
 *   /api/user/{id}:
 *     delete:
 *       summary: Delete a user
 *       description: Deletes a user by their ID.
 *       operationId: deleteUser
 *       tags:
 *         - Delete
 *       parameters:
 *         - name: id
 *           in: path
 *           required: true
 *           description: The ID of the user to delete.
 *           schema:
 *             type: integer
 *             format: int64
 *         - name: Authorization
 *           in: header
 *           required: true
 *           description: Bearer token for authentication (JWT token).
 *           schema:
 *             type: string
 *             example: "Bearer <JWT_Token>"
 *       responses:
 *         '200':
 *           description: User deleted successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: User deleted successfully
 *         '400':
 *           description: Invalid user ID or validation failed
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   errors:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         msg:
 *                           type: string
 *                           example: ID must be a positive integer
 *                         param:
 *                           type: string
 *                           example: id
 *                         location:
 *                           type: string
 *                           example: params
 *         '500':
 *           description: Server error when deleting user
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   error:
 *                     type: string
 *                     example: An unexpected error occurred
 */

export default router;
