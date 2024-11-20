import { Router } from "express";
import { AuthenticatedRequest } from '../types/authenticated-request';
import { authenticate } from "../middleware/authenticate";

const router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve a list of users
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: The user ID.
 *                     example: 1
 *                   name:
 *                     type: string
 *                     description: The user's name.
 *                     example: John Doe
 */
router.get("/users", authenticate,(req: AuthenticatedRequest, res) => {
  res.json([{ id: "1", name: "John Doe" }]);
});

export default router;
