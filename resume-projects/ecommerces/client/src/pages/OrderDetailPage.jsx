import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGetOrderByIdQuery } from '../services/api.js';
import { formatPaise } from '../utils/format.js';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export const OrderDetailPage = () => {
  const { id } = useParams();
  const { data: orderResponse, isLoading } = useGetOrderByIdQuery(id);

  const order = orderResponse?.data;

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <p>Retrieving order manifest...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2>Order Not Found</h2>
        <Link to="/orders" className="btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>
      <Link to="/orders" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.82rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--ink-muted)',
        marginBottom: '2rem',
      }}>
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--sand)',
        padding: '3rem',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <CheckCircle2 size={48} color="var(--accent)" style={{ margin: '0 auto 1rem auto' }} />
          <h1 style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>Order Confirmed</h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
            Reference Number: <strong style={{ color: 'var(--ink)' }}>{order.orderNumber}</strong>
          </p>
          <span style={{
            display: 'inline-block',
            marginTop: '0.8rem',
            padding: '0.3rem 0.8rem',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            backgroundColor: 'var(--status-success-bg)',
            color: 'var(--status-success)',
            fontWeight: 600,
          }}>
            State: {order.status}
          </span>
        </div>

        <div className="editorial-divider" />

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>Reserved Pieces</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <img src={item.image} alt={item.productName} style={{ width: '60px', height: '75px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500 }}>{item.productName}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                    {item.fabric} · Size {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <span style={{ fontWeight: 600 }}>{formatPaise(item.totalPaise)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="editorial-divider" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', fontSize: '0.88rem' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
              Dispatch Address
            </h3>
            <p style={{ color: 'var(--ink-muted)' }}>{order.shippingAddress?.street}</p>
            {order.shippingAddress?.apartment && <p style={{ color: 'var(--ink-muted)' }}>{order.shippingAddress?.apartment}</p>}
            <p style={{ color: 'var(--ink-muted)' }}>
              {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
            </p>
            <p style={{ color: 'var(--ink-muted)' }}>{order.shippingAddress?.country}</p>
          </div>

          <div>
            <h3 style={{ fontSize: '0.9rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
              Payment & Security
            </h3>
            <p style={{ color: 'var(--ink-muted)' }}>
              Method: {order.paymentDetails?.method === 'CASH_ON_DELIVERY' || order.paymentDetails?.method === 'COD' ? 'Cash on Delivery' : 'Online Payment (Verified)'}
            </p>
            <p style={{ color: 'var(--ink-muted)' }}>Total Amount: {formatPaise(order.pricing?.grandTotalPaise)}</p>
            <p style={{ color: 'var(--ink-muted)' }}>Status: {order.status}</p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link to="/catalog" className="btn-primary">
            Continue Exploring
          </Link>
        </div>
      </div>
    </div>
  );
};
