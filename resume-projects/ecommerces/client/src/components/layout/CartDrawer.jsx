import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { setCartDrawerOpen } from '../../store/slices/uiSlice.js';
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
} from '../../services/api.js';
import { formatPaise } from '../../utils/format.js';

export const CartDrawer = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isCartDrawerOpen } = useSelector((state) => state.ui);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const { data: cartResponse, isLoading } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();

  const cart = cartResponse?.data;
  const items = cart?.items || [];

  if (!isCartDrawerOpen) return null;

  const handleQuantity = async (variantSku, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      await removeCartItem(variantSku);
    } else {
      await updateCartItem({ variantSku, quantity: newQty });
    }
  };

  const handleCheckout = () => {
    dispatch(setCartDrawerOpen(false));
    navigate('/checkout');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(31, 29, 26, 0.4)',
      backdropFilter: 'blur(4px)',
    }}>
      {/* Backdrop click */}
      <div
        style={{ flex: 1 }}
        onClick={() => dispatch(setCartDrawerOpen(false))}
      />

      {/* Drawer content */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'var(--surface)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-modal)',
        animation: 'slideIn 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--sand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.05em',
          }}>
            Shopping Bag ({items.length})
          </h2>
          <button
            onClick={() => dispatch(setCartDrawerOpen(false))}
            style={{ color: 'var(--ink-muted)', padding: '0.25rem' }}
            aria-label="Close cart drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Item List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}>
          {!isAuthenticated ? (
            <div style={{ textAlign: 'center', margin: 'auto', padding: '2rem' }}>
              <p style={{ marginBottom: '1rem' }}>Please sign in to view and save items in your bag.</p>
              <button
                className="btn-primary"
                onClick={() => {
                  dispatch(setCartDrawerOpen(false));
                  navigate('/login');
                }}
              >
                Sign In
              </button>
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', padding: '2rem' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                Your bag is empty.
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1.5rem' }}>
                Explore our curated hand-loomed raw fabric pieces.
              </p>
              <button
                className="btn-secondary"
                onClick={() => {
                  dispatch(setCartDrawerOpen(false));
                  navigate('/catalog');
                }}
              >
                Explore Collections
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.variantSku}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid var(--sand-light)',
                }}
              >
                <img
                  src={item.image}
                  alt={item.productName}
                  style={{
                    width: '80px',
                    height: '100px',
                    objectFit: 'cover',
                    backgroundColor: 'var(--sand-light)',
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-serif)' }}>
                      {item.productName}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '0.2rem' }}>
                      {item.fabric} · Size {item.size}
                    </p>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.4rem' }}>
                      {formatPaise(item.pricePaise)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Quantity controls */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: '1px solid var(--sand)',
                    }}>
                      <button
                        onClick={() => handleQuantity(item.variantSku, item.quantity, -1)}
                        style={{ padding: '0.3rem 0.6rem' }}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '0.8rem', padding: '0 0.5rem', minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantity(item.variantSku, item.quantity, 1)}
                        style={{ padding: '0.3rem 0.6rem' }}
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeCartItem(item.variantSku)}
                      style={{ color: 'var(--ink-subtle)', padding: '0.25rem' }}
                      title="Remove piece"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with server-calculated totals */}
        {isAuthenticated && items.length > 0 && (
          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid var(--sand)',
            backgroundColor: 'var(--bg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span>Subtotal</span>
              <span>{formatPaise(cart?.subtotalPaise)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
              <span>Standard Shipping</span>
              <span>{cart?.shippingPaise === 0 ? 'Complimentary' : formatPaise(cart?.shippingPaise)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
              <span>Estimated Tax (5% GST)</span>
              <span>{formatPaise(cart?.taxPaise)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              fontWeight: 600,
              fontSize: '1.1rem',
              borderTop: '1px solid var(--sand)',
              paddingTop: '0.8rem',
            }}>
              <span>Total</span>
              <span>{formatPaise(cart?.grandTotalPaise)}</span>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '1rem' }}
              onClick={handleCheckout}
            >
              Proceed to Checkout
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
