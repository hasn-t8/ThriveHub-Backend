import { Router, Request, Response } from "express";
import pool from "../../config/db";

const router = Router();

// Increment views for a business profile
router.post(
  "/analytics/profile-business/:id/view",
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      // Increment the view count
      const result = await pool.query(
        "UPDATE profiles_business SET views = views + 1 WHERE profile_id = $1 RETURNING views",
        [id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Business profile not found" });
        return;
      }

      res.status(200).json({ message: "View count incremented", views: result.rows[0].views });
    } catch (error) {
      console.error("Error incrementing view count:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get views for a business profile
router.get(
  "/analytics/profile-business/:id/views",
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    

    try {
      // Retrieve the view count
      const result = await pool.query(
        "SELECT views FROM profiles_business WHERE profile_id = $1",
        [id]
      );      

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Business profile not found" });
        return;
      }

      res.status(200).json({ views: result.rows[0].views });
    } catch (error) {
      console.error("Error retrieving view count:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
/**
 * @swagger
 * tags:
 *   - name: Analytics Business Profiles
 *     description: Endpoints for managing business profiles
 * 
 * /analytics/profile-business/{id}/view:
 *   post:
 *     summary: Increment the view count of a business profile
 *     tags:
 *       - Analytics Business Profiles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business profile
 *     responses:
 *       200:
 *         description: View count incremented successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: View count incremented
 *                 views:
 *                   type: integer
 *                   description: The updated view count
 *       404:
 *         description: Business profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Business profile not found
 *       500:
 *         description: Internal server error
 * 
 * /analytics/profile-business/{id}/views:
 *   get:
 *     summary: Retrieve the view count of a business profile
 *     tags:
 *       - Analytics Business Profiles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business profile
 *     responses:
 *       200:
 *         description: View count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 views:
 *                   type: integer
 *                   description: The total view count
 *       404:
 *         description: Business profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Business profile not found
 *       500:
 *         description: Internal server error
 */
