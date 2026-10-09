import bcrypt from 'bcrypt';
import { userRepository } from './user.repository.js';
import { ApiError } from '../../utils/ApiError.js';

export class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async updateProfile(userId, updateData) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const filteredUpdates = {};

    if (updateData.name !== undefined) {
      filteredUpdates.name = updateData.name.trim();
    }

    if (updateData.avatar !== undefined) {
      filteredUpdates.avatar = updateData.avatar;
    }

    if (updateData.email !== undefined && updateData.email.trim().toLowerCase() !== user.email) {
      const targetEmail = updateData.email.trim().toLowerCase();
      const existingUser = await userRepository.findByEmail(targetEmail);
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        throw ApiError.conflict('This email address is already in use by another account', 'EMAIL_ALREADY_EXISTS');
      }
      filteredUpdates.email = targetEmail;
    }

    if (updateData.addresses !== undefined) {
      filteredUpdates.addresses = updateData.addresses;
    }

    const updatedUser = await userRepository.updateById(userId, filteredUpdates);
    if (!updatedUser) {
      throw ApiError.notFound('User not found');
    }
    return updatedUser;
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect', 'INVALID_CREDENTIALS');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return { success: true, message: 'Password updated successfully' };
  }

  async addAddress(userId, addressData) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (addressData.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    } else if (user.addresses.length === 0) {
      addressData.isDefault = true;
    }

    user.addresses.push(addressData);
    await user.save();
    return user.addresses;
  }

  // Admin User Management
  async getAllUsers({ search, role, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (role) {
      filter.role = role.toUpperCase();
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      userRepository.find(filter, skip, limitNum),
      userRepository.count(filter),
    ]);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async updateUserRole(userId, newRole) {
    const validRoles = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(newRole)) {
      throw ApiError.badRequest(`Invalid role. Valid roles: ${validRoles.join(', ')}`);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.role = newRole;
    await user.save();
    return user;
  }

  async deleteUser(userId, currentAdminId) {
    if (userId.toString() === currentAdminId.toString()) {
      throw ApiError.badRequest('You cannot delete your own admin account');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    await userRepository.deleteById(userId);
    return true;
  }
}

export const userService = new UserService();
