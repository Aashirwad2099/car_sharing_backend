import multer from "multer";
import type { Request } from "express";
import { BadRequestError } from "../shared/errors/HttpError.js";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILES        = 5; // max images per upload request
const ALLOWED_TYPES    = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * Multer with in-memory storage.
 * Buffer is passed directly to Cloudinary — no disk writes.
 */
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(
      new BadRequestError(
        `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, HEIC`,
        "INVALID_FILE_TYPE"
      )
    );
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: MAX_FILES,
  },
});