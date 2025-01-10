import AWS from "aws-sdk";
import path from "path";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

interface UploadParams {
  folder: string;
  file: Express.Multer.File;
}

interface DeleteParams {
  key: string;
}

export const uploadToS3 = async ({ folder, file }: UploadParams): Promise<string> => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const fileKey = `${folder}/${Date.now()}${fileExtension}`; // Unique file key

  const params = {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read", // Make the file publicly readable
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location; // Return the file URL
};

export const deleteFromS3 = async ({ key }: DeleteParams): Promise<void> => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  };

  await s3.deleteObject(params).promise();
};
