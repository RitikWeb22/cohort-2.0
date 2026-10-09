import { adminService } from './admin.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class AdminController {
  async getMetrics(req, res) {
    const metrics = await adminService.getDashboardMetrics();
    return ApiResponse.success(res, metrics, 'Admin dashboard metrics retrieved');
  }
}

export const adminController = new AdminController();
