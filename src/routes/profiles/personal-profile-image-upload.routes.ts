import express, { Response } from "express";
import multer from "multer";
import AWS from "aws-sdk";
import path from "path";
import { verifyToken } from "../../middleware/authenticate";
import { createOrUpdatePersonalProfile } from "../../models/profile.models";
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
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif"];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(null, false);
    }
    cb(null, true);
  },
});

// Route for uploading user profile images
router.post("/upload-profile-image", verifyToken, upload.single("profileImage"), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const userId = req.user?.id;
    // console.log('userId userId :::::::::', userId);
    

    if (!userId) {
      res.status(400).json({ error: "Not authorized" });
      return;
    }

    const file = req.file;

    // Use the userId directly as the folder name
    const folderPath = `profile-images/${userId}/`;

    // Construct the file key: profile-image + file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const fileKey = `${folderPath}profile-image${fileExtension}`;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read", // Make the file publicly readable
    };

    const uploadResult = await s3.upload(params).promise();

    // Update the user's personal profile with the profile image URL
    await createOrUpdatePersonalProfile(userId, { img_profile_url: uploadResult.Location });

    res.status(200).json({
      message: "Profile image uploaded successfully",
      url: uploadResult.Location, // Public URL of the uploaded file
      key: uploadResult.Key, // S3 key of the uploaded file
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    res.status(500).json({ error: (error as any)?.message || "Failed to upload profile image" });
  }
});

export default router;

/**
 * @swagger
 * tags:
 *     name: Profile Image
 *     description: Upload a profile image for a user
 *
 * /upload-profile-image:
 *   post:
 *     summary: Upload a profile image for a user
 *     tags: [Profile Image]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: The profile image file to upload.
 *             required:
 *               - profileImage
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile image uploaded successfully
 *                 url:
 *                   type: string
 *                   example: https://your-bucket-name.s3.your-region.amazonaws.com/profile-images/123/profile-image.png
 *                 key:
 *                   type: string
 *                   example: profile-images/123/profile-image.png
 *       400:
 *         description: Bad Request - Missing or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: No file uploaded
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to upload profile image
 */
