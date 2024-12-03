import express, { Request, Response } from "express";
import AWS from "aws-sdk";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

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
    if (!file.mimetype.startsWith("image/")) {
      return cb(null, false);
    }
    cb(null, true);
  },
});

// Route for uploading logo images
router.post(
  "/upload-logo",
  upload.single("logo"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const file = req.file;
      const fileKey = `logos/${uuidv4()}-${file.originalname}`;

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
      res.status(500).json({ error: "Failed to upload logo" });
    }
  }
);

export default router;
