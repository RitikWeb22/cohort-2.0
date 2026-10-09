import { Order } from './order.model.js';

export class OrderRepository {
  async create(orderData) {
    return Order.create(orderData);
  }

  async findById(id) {
    return Order.findById(id).populate('userId', 'name email');
  }

  async findByOrderNumber(orderNumber) {
    return Order.findOne({ orderNumber }).populate('userId', 'name email');
  }

  async findByRazorpayOrderId(razorpayOrderId) {
    return Order.findOne({ 'paymentDetails.razorpayOrderId': razorpayOrderId });
  }

  async findByIdempotencyKey(key) {
    return Order.findOne({ idempotencyKey: key });
  }

  async findByUserId(userId, skip = 0, limit = 20) {
    return Order.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  async countByUserId(userId) {
    return Order.countDocuments({ userId });
  }

  async findAll(filter = {}, skip = 0, limit = 20) {
    return Order.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async count(filter = {}) {
    return Order.countDocuments(filter);
  }

  async save(order) {
    return order.save();
  }
}

export const orderRepository = new OrderRepository();
