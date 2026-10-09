import { Payment } from './payment.model.js';
import { PaymentEvent } from './paymentEvent.model.js';

export class PaymentRepository {
  async create(data) {
    return Payment.create(data);
  }

  async findByOrderId(orderId) {
    return Payment.findOne({ orderId });
  }

  async findByProviderOrderId(providerOrderId) {
    return Payment.findOne({ providerOrderId });
  }

  async updateStatus(id, status, extraFields = {}) {
    return Payment.findByIdAndUpdate(
      id,
      {
        status,
        ...extraFields,
      },
      { new: true }
    );
  }

  async recordEvent({ providerEventId, eventType, payloadSummary, status = 'RECEIVED' }) {
    return PaymentEvent.create({
      providerEventId,
      eventType,
      payloadSummary,
      status,
    });
  }

  async findEvent(providerEventId) {
    return PaymentEvent.findOne({ providerEventId });
  }

  async updateEventStatus(providerEventId, status) {
    return PaymentEvent.findOneAndUpdate(
      { providerEventId },
      { status, processedAt: new Date() },
      { new: true }
    );
  }
}

export const paymentRepository = new PaymentRepository();
