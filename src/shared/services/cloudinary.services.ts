import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";

// Configure once at module load
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary.
   * @param buffer   - File buffer from multer memoryStorage
   * @param folder   - Cloudinary folder path e.g. "car-sharing/vehicles"
   * @param publicId - Optional stable public_id (for overwrite/replace)
   */
  static async uploadBuffer(
    buffer: Buffer,
    folder: string,
    publicId?: string
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        folder,
        resource_type: "image",
        transformation: [
          { quality: "auto:good" },   // auto compress
          { fetch_format: "auto" },   // serve webp/avif where supported
          { width: 1280, height: 960, crop: "limit" }, // cap max dimensions
        ],
        ...(publicId && { public_id: publicId, overwrite: true }),
      };

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error || !result) {
            return reject(error ?? new Error("Cloudinary upload failed"));
          }
          resolve({
            publicId:  result.public_id,
            secureUrl: result.secure_url,
            width:     result.width,
            height:    result.height,
            format:    result.format,
            bytes:     result.bytes,
          });
        }
      );

      stream.end(buffer);
    });
  }

  /**
   * Delete an image from Cloudinary by its public_id.
   */
  static async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}