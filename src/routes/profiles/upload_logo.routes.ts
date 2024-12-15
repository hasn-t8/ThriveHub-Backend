import express, { Response } from "express";
import multer from "multer";
import AWS from "aws-sdk";
import path from "path";
import { verifyToken } from "../../middleware/authenticate";
import { validateBusinessProfileOwnership } from "../../models/business-profile";
import { AuthenticatedRequest } from "../../types/authenticated-request";


const router = express.Router();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Configure Multer for file handling
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory for direct upload to S3
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    // Validate file extensions
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif"];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return cb(null, false);
    }

    cb(null, true);
  },
});

// Route for uploading logo images
router.post(
  "/upload-logo",
  verifyToken,
  upload.single("logo"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const userId = req.user?.id;
      const { businessProfileId } = req.body;

      if (!userId) {
        res.status(400).json({ error: "Not authorized" });
        return;
      }

      if (!businessProfileId) {
        res.status(400).json({ error: "Business profile ID is required" });
        return;
      }

      // Validate ownership of the business profile
      const isValidProfile = await validateBusinessProfileOwnership(userId, parseInt(businessProfileId, 10));
      if (!isValidProfile) {
        res.status(403).json({ error: "You do not own this business profile" });
        return;
      }

      const file = req.file;

      // Use the businessProfileId directly as the folder name
      const folderPath = `logos/${businessProfileId}/`;

      // Construct the file key: logo + file extension
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileKey = `${folderPath}logo${fileExtension}`;

      const params = {
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read", // Make the file publicly readable
      };

      const uploadResult = await s3.upload(params).promise();

      res.status(200).json({
        message: "Logo uploaded successfully",
        url: uploadResult.Location, // Public URL of the uploaded file
        key: uploadResult.Key, // S3 key of the uploaded file
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: (error as any)?.message || "Failed to upload logo" });
    }
  }
);

export default router;


/**
 * @swagger
 * /upload-logo:
 *   post:
 *     summary: Upload a logo image for a business profile
 *     tags:
 *       - Logo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: The logo image file to upload.
 *               businessProfileId:
 *                 type: integer
 *                 description: The ID of the business profile to associate the logo with.
 *             required:
 *               - logo
 *               - businessProfileId
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logo uploaded successfully
 *                 url:
 *                   type: string
 *                   example: https://your-bucket-name.s3.your-region.amazonaws.com/logos/123/logo.png
 *                 key:
 *                   type: string
 *                   example: logos/123/logo.png
 *       400:
 *         description: Bad Request - Missing or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Business profile ID is required
 *       403:
 *         description: Forbidden - User does not own the business profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: You do not own this business profile
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to upload logo
 */