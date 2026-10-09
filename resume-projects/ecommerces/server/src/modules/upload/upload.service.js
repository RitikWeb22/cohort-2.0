import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { ApiError } from '../../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');

export class UploadService {
  constructor() {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  async saveBase64Image(base64Data, originalFilename = 'image.jpg') {
    if (!base64Data) {
      throw ApiError.badRequest('No image data provided', 'IMAGE_MISSING');
    }

    // Match data URI pattern: data:image/png;base64,....
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9-+.]+);base64,(.+)$/);
    let ext = 'jpg';
    let buffer;

    if (matches && matches.length === 3) {
      ext = matches[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      // Plain base64 string
      buffer = Buffer.from(base64Data, 'base64');
      const extMatch = originalFilename.match(/\.([0-9a-z]+)$/i);
      if (extMatch) ext = extMatch[1].toLowerCase();
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw ApiError.badRequest('Image file exceeds 5MB size limit', 'FILE_TOO_LARGE');
    }

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) ? ext : 'jpg';
    const filename = `prod_${Date.now()}_${uniqueId}.${safeExt}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.promises.writeFile(filePath, buffer);

    return {
      filename,
      url: `/uploads/${filename}`,
      size: buffer.length,
      mimeType: `image/${safeExt}`,
    };
  }
}

export const uploadService = new UploadService();
