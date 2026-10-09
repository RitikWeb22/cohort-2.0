import { uploadService } from './upload.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class UploadController {
  async uploadImage(req, res) {
    const { image, filename } = req.body;
    const result = await uploadService.saveBase64Image(image, filename);
    return ApiResponse.success(res, result, 'Image uploaded successfully');
  }
}

export const uploadController = new UploadController();
