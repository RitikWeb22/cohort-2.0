import React from 'react';
import { Link } from 'react-router-dom';
import { useGetMyOrdersQuery, useCancelOrderMutation } from '../services/api.js';
import { formatPaise } from '../utils/format.js';
import { Package, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setToast } from '../store/slices/uiSlice.js';

const STATUS_STEPS = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export const OrdersPage = () => {
  const dispatch = useDispatch();
  const { data: ordersResponse, isLoading } = useGetMyOrdersQuery();
  const [cancelOrderMutation] = useCancelOrderMutation();

  const orders = ordersResponse?.data || [];

  const handleCancel = async (orderId) => {
    if (!window.confirm('Are you sure you wish to cancel this order? Stock will be released immediately.')) {
      return;
    }
    try {
      await cancelOrderMutation({ id: orderId, reason: 'Customer requested cancellation' }).unwrap();
      dispatch(setToast({ message: 'Order cancelled successfully', type: 'info' }));
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to cancel order', type: 'error' }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
      case 'DELIVERED':
        return { bg: 'var(--status-success-bg)', color: 'var(--status-success)' };
      case 'PROCESSING':
      case 'SHIPPED':
        return { bg: 'var(--status-warning-bg)', color: 'var(--status-warning)' };
      case 'CANCELLED':
      case 'REFUNDED':
        return { bg: 'var(--status-danger-bg)', color: 'var(--status-danger)' };
      default:
        return { bg: 'var(--sand-light)', color: 'var(--ink-muted)' };
    }
  };

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>
      <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--sand)', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Your Orders</h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem' }}>
          Real-time tracking and delivery updates for all your purchases
        </p>
      </div>

      {isLoading ? (
        <p>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--sand)',
        }}>
          <Package size={36} color="var(--accent)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>No Orders Found</h2>
          <p style={{ color: 'var(--ink-muted)', marginBottom: '1.5rem' }}>You have not placed any orders yet.</p>
          <Link to="/catalog" className="btn-primary">
            Explore Collections
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            const canCancel = order.status === 'PENDING_PAYMENT' || order.status === 'PAID';

            return (
              <div
                key={order._id}
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--sand)',
                  padding: '2rem',
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--sand-light)',
                  paddingBottom: '1rem',
                  marginBottom: '1.5rem',
                  gap: '1rem',
                }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', display: 'block' }}>
                      Order Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-sans)', fontWeight: 600, marginTop: '0.2rem' }}>
                      {order.orderNumber}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span
                      style={{
                        padding: '0.3rem 0.8rem',
                        fontSize: '0.75rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        backgroundColor: badge.bg,
                        color: badge.color,
                        borderRadius: '2px',
                      }}
                    >
                      {order.status}
                    </span>

                    {canCancel && (
                      <button
                        onClick={() => handleCancel(order._id)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>

                {/* State Machine Visual Progression */}
                {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.2rem',
                    backgroundColor: 'var(--bg)',
                    marginBottom: '1.5rem',
                    borderRadius: '2px',
                    overflowX: 'auto',
                  }}>
                    {STATUS_STEPS.map((step, idx) => {
                      const currentIdx = STATUS_STEPS.indexOf(order.status);
                      const isComplete = currentIdx >= idx;
                      return (
                        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isComplete ? 1 : 0.35 }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: isComplete ? 'var(--ink)' : 'var(--sand-dark)',
                            color: 'var(--surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                          }}>
                            {idx + 1}
                          </div>
                          <span style={{ fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: isComplete ? 600 : 400 }}>
                            {step.replace('_', ' ')}
                          </span>
                          {idx < STATUS_STEPS.length - 1 && (
                            <span style={{ margin: '0 0.8rem', color: 'var(--sand-dark)' }}>—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <img
                        src={item.image}
                        alt={item.productName}
                        style={{ width: '60px', height: '75px', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>{item.productName}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                          {item.fabric} · Size {item.size} · Qty {item.quantity}
                        </p>
                      </div>
                      <span style={{ fontWeight: 600 }}>{formatPaise(item.totalPaise)}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Total */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--sand-light)',
                  paddingTop: '1rem',
                  fontSize: '0.9rem',
                }}>
                  <span style={{ color: 'var(--ink-muted)' }}>
                    Shipped to: {order.shippingAddress?.street}, {order.shippingAddress?.city}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                    Total: {formatPaise(order.pricing?.grandTotalPaise)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
