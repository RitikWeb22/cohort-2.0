import { userService } from './user.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class UserController {
  async getProfile(req, res) {
    const user = await userService.getProfile(req.user.id);
    return ApiResponse.success(res, user, 'Profile fetched successfully');
  }

  async updateProfile(req, res) {
    const updated = await userService.updateProfile(req.user.id, req.body);
    return ApiResponse.success(res, updated, 'Profile updated successfully');
  }

  async changePassword(req, res) {
    const result = await userService.changePassword(req.user.id, req.body);
    return ApiResponse.success(res, result, 'Password updated successfully');
  }

  async addAddress(req, res) {
    const addresses = await userService.addAddress(req.user.id, req.body);
    return ApiResponse.created(res, addresses, 'Address added successfully');
  }

  // Admin handlers
  async getAllUsers(req, res) {
    const result = await userService.getAllUsers(req.query);
    return ApiResponse.success(res, result.users, 'Users retrieved successfully', 200, result.pagination);
  }

  async updateRole(req, res) {
    const user = await userService.updateUserRole(req.params.id, req.body.role);
    return ApiResponse.success(res, user, `User role updated to ${req.body.role}`);
  }

  async deleteUser(req, res) {
    await userService.deleteUser(req.params.id, req.user.id);
    return ApiResponse.success(res, null, 'User deleted successfully');
  }
}

export const userController = new UserController();
