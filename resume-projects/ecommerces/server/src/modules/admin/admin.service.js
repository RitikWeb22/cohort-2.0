import { Order } from '../orders/order.model.js';
import { User } from '../users/user.model.js';
import { Inventory } from '../inventory/inventory.model.js';
import { Product } from '../products/product.model.js';
import { Coupon } from '../coupons/coupon.model.js';
import { Payment } from '../payments/payment.model.js';

export class AdminService {
  async getDashboardMetrics() {
    const [
      totalOrders,
      paidOrdersCount,
      revenueResult,
      totalCustomers,
      lowStockCount,
      pendingOrdersCount,
      totalProducts,
      totalCoupons,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } }),
      Order.aggregate([
        { $match: { status: { $in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } },
        { $group: { _id: null, totalRevenuePaise: { $sum: '$pricing.grandTotalPaise' } } },
      ]),
      User.countDocuments({ role: 'CUSTOMER' }),
      Inventory.countDocuments({ availableStock: { $lte: 5 } }),
      Order.countDocuments({ status: 'PENDING_PAYMENT' }),
      Product.countDocuments(),
      Coupon.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'name email'),
    ]);

    const totalRevenuePaise = revenueResult[0]?.totalRevenuePaise || 0;
    const averageOrderValuePaise = paidOrdersCount > 0 ? Math.round(totalRevenuePaise / paidOrdersCount) : 0;

    return {
      totalOrders,
      paidOrdersCount,
      totalRevenuePaise,
      averageOrderValuePaise,
      totalCustomers,
      lowStockCount,
      pendingOrdersCount,
      totalProducts,
      totalCoupons,
      recentOrders,
    };
  }
}

export const adminService = new AdminService();
