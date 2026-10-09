import { User } from './user.model.js';

export class UserRepository {
  async findById(id, projection = null) {
    return User.findById(id).select(projection);
  }

  async findByEmail(email, includePassword = false) {
    const query = User.findOne({ email });
    if (includePassword) {
      query.select('+password +refreshToken');
    }
    return query.exec();
  }

  async create(userData) {
    return User.create(userData);
  }

  async updateById(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  async updateRefreshToken(id, refreshToken) {
    return User.findByIdAndUpdate(id, { refreshToken }, { new: true });
  }

  async findByIdWithRefreshToken(id) {
    return User.findById(id).select('+refreshToken');
  }

  async findByIdWithPassword(id) {
    return User.findById(id).select('+password');
  }

  async findByVerificationToken(token) {
    return User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiresAt: { $gt: new Date() },
    });
  }

  async findByPasswordResetToken(token) {
    return User.findOne({
      passwordResetToken: token,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+password');
  }

  async count(query = {}) {
    return User.countDocuments(query);
  }

  async find(query = {}, skip = 0, limit = 20) {
    return User.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
  }

  async deleteById(id) {
    return User.findByIdAndDelete(id);
  }
}

export const userRepository = new UserRepository();
