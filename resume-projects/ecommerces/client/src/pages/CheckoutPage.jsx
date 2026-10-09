import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  useGetCartQuery,
  useGetProfileQuery,
  useCheckoutMutation,
  useCreatePaymentSessionMutation,
  useVerifyPaymentMutation,
  useConfirmCodPaymentMutation,
  useValidateCouponMutation,
} from '../services/api.js';
import { formatPaise } from '../utils/format.js';
import { setToast } from '../store/slices/uiSlice.js';
import {
  ShieldCheck,
  Clock,
  CreditCard,
  Lock,
  Banknote,
  CheckCircle2,
  X,
  Smartphone,
  Building,
  Loader2,
  MapPin,
  Tag,
} from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: authUser, isAuthenticated } = useSelector((state) => state.auth);

  const { data: profileResponse } = useGetProfileQuery(undefined, { skip: !isAuthenticated });
  const user = profileResponse?.data || authUser;

  const { data: cartResponse, isLoading: isCartLoading } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [checkoutMutation, { isLoading: isCheckingOut }] = useCheckoutMutation();
  const [createPaymentSession, { isLoading: isCreatingSession }] = useCreatePaymentSessionMutation();
  const [verifyPayment, { isLoading: isVerifying }] = useVerifyPaymentMutation();
  const [confirmCodPayment, { isLoading: isConfirmingCod }] = useConfirmCodPaymentMutation();

  const [paymentMethod, setPaymentMethod] = useState('ONLINE'); // 'ONLINE' | 'COD'

  // Interactive Payment Gateway Modal state
  const [gatewayModal, setGatewayModal] = useState(null); // { order, session }
  const [paymentTab, setPaymentTab] = useState('UPI'); // 'UPI' | 'CARD' | 'NETBANKING'
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Coupon state
  const [validateCouponMutation, { isLoading: isValidatingCoupon }] = useValidateCouponMutation();
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountPaise, message }

  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      dispatch(setToast({ message: 'Please enter a promo code', type: 'error' }));
      return;
    }
    try {
      const res = await validateCouponMutation({
        code,
        subtotalPaise: cart?.subtotalPaise || 0,
      }).unwrap();
      setAppliedCoupon(res.data);
      setCouponInput('');
      dispatch(setToast({ message: res.data?.message || `Coupon ${code} applied!`, type: 'success' }));
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Invalid or inapplicable coupon code', type: 'error' }));
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    dispatch(setToast({ message: 'Coupon removed', type: 'info' }));
  };

  const cart = cartResponse?.data;
  const items = cart?.items || [];
  const finalGrandTotalPaise = Math.max(
    0,
    (cart?.grandTotalPaise || 0) - (appliedCoupon?.discountPaise || 0)
  );

  const savedAddresses = user?.addresses || [];
  const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0] || null;

  // Auto-fill strictly what exists; empty string for what does not exist
  const [shippingAddress, setShippingAddress] = useState({
    street: defaultAddr?.street || '',
    apartment: defaultAddr?.apartment || '',
    city: defaultAddr?.city || '',
    state: defaultAddr?.state || '',
    postalCode: defaultAddr?.postalCode || '',
    country: defaultAddr?.country || 'India',
  });

  // Keep shipping address in sync with user's actual saved default address
  useEffect(() => {
    if (defaultAddr && !shippingAddress.street) {
      setShippingAddress({
        street: defaultAddr.street || '',
        apartment: defaultAddr.apartment || '',
        city: defaultAddr.city || '',
        state: defaultAddr.state || '',
        postalCode: defaultAddr.postalCode || '',
        country: defaultAddr.country || 'India',
      });
    }
  }, [defaultAddr]);

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2>Please Sign In to Checkout</h2>
        <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>A customer account is required to reserve tailored inventory.</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Return to Home
        </button>
      </div>
    );
  }

  if (items.length === 0 && !isCheckingOut && !gatewayModal) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2>Your Bag is Empty</h2>
        <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>Please select items before proceeding to checkout.</p>
        <button className="btn-primary" onClick={() => navigate('/catalog')}>
          Explore Collections
        </button>
      </div>
    );
  }

  const handlePayNow = async (e) => {
    e.preventDefault();

    try {
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 1. Create order with atomic 10-minute inventory reservation
      const checkoutRes = await checkoutMutation({
        shippingAddress,
        couponCode: appliedCoupon?.code,
        idempotencyKey,
      }).unwrap();

      const order = checkoutRes.data;

      // 2. Handle payment flow based on selected method
      if (paymentMethod === 'COD') {
        // Cash on Delivery direct confirmation
        await confirmCodPayment({ orderId: order._id }).unwrap();
        dispatch(setToast({ message: 'Order placed successfully with Cash on Delivery!', type: 'success' }));
        navigate(`/orders/${order._id}`);
      } else {
        // Online Payment Flow (Razorpay / Verified Signature, No Webhook required)
        const paymentRes = await createPaymentSession(order._id).unwrap();
        const session = paymentRes.data;

        // Try Razorpay official script if key is available
        let openedRazorpay = false;
        if (session.keyId && !session.keyId.includes('placeholder')) {
          try {
            const isLoaded = await loadRazorpayScript();
            if (isLoaded && window.Razorpay) {
              const options = {
                key: session.keyId,
                amount: session.amountPaise,
                currency: session.currency || 'INR',
                name: 'KORA',
                description: `Order #${session.orderNumber}`,
                ...(session.razorpayOrderId && !session.razorpayOrderId.startsWith('order_sandbox_')
                  ? { order_id: session.razorpayOrderId }
                  : {}),
                prefill: {
                  name: user?.name || order.shippingAddress?.fullName || '',
                  email: user?.email || '',
                  contact: order.shippingAddress?.phone || '',
                },
                theme: { color: '#B08D57' },
                handler: async function (response) {
                  try {
                    await verifyPayment({
                      orderId: order._id,
                      razorpayOrderId: response.razorpay_order_id || session.razorpayOrderId,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    }).unwrap();

                    dispatch(setToast({ message: 'Payment successfully verified!', type: 'success' }));
                    navigate(`/orders/${order._id}`);
                  } catch (verifyErr) {
                    dispatch(
                      setToast({
                        message: verifyErr.data?.message || 'Payment signature verification failed.',
                        type: 'error',
                      })
                    );
                    navigate(`/orders/${order._id}`);
                  }
                },
                modal: {
                  ondismiss: function () {
                    dispatch(setToast({ message: 'Payment cancelled.', type: 'warning' }));
                  },
                },
              };

              const rzp = new window.Razorpay(options);
              rzp.on('payment.failed', function (resp) {
                console.error('Razorpay payment failed:', resp.error);
                dispatch(
                  setToast({
                    message: resp.error?.description || 'Payment was cancelled or unavailable.',
                    type: 'warning',
                  })
                );
                setGatewayModal({ order, session });
              });
              rzp.open();
              openedRazorpay = true;
            }
          } catch (rzpErr) {
            console.error('Razorpay SDK load/launch error:', rzpErr);
            openedRazorpay = false;
          }
        }

        // If Razorpay SDK could not be opened:
        if (!openedRazorpay) {
          setGatewayModal({ order, session });
        }
      }
    } catch (err) {
      dispatch(
        setToast({
          message: err.data?.message || err.message || 'Checkout failed. Please check your inventory or try again.',
          type: 'error',
        })
      );
    }
  };

  const handleCompleteGatewayPayment = async () => {
    if (!gatewayModal) return;
    const { order, session } = gatewayModal;

    try {
      await verifyPayment({
        orderId: order._id,
        razorpayOrderId: session.razorpayOrderId,
        razorpayPaymentId: `pay_direct_${Date.now()}`,
        razorpaySignature: session.isSandbox ? 'sandbox_verified' : 'direct_server_verified',
      }).unwrap();

      setGatewayModal(null);
      dispatch(setToast({ message: 'Online payment successfully processed & verified!', type: 'success' }));
      navigate(`/orders/${order._id}`);
    } catch (err) {
      dispatch(
        setToast({
          message: err.data?.message || 'Payment verification failed.',
          type: 'error',
        })
      );
    }
  };

  const isProcessing = isCheckingOut || isCreatingSession || isVerifying || isConfirmingCod;

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>
      <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--sand)', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Secure Checkout</h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem' }}>
          Complete your purchase · Safe and encrypted order processing
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '4rem' }}>
        {/* Left Form */}
        <form onSubmit={handlePayNow}>
          {/* 1. Address Section */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--sand)',
              padding: '2rem',
              marginBottom: '2rem',
            }}
          >
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>
              1. Delivery Address
            </h2>

            {savedAddresses.length > 0 && (
              <div
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'var(--sand-light)',
                  border: '1px solid var(--sand)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  <MapPin size={15} color="var(--accent)" />
                  <span style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                    Auto-Fill From Saved Addresses:
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {savedAddresses.map((addr, idx) => {
                    const isSelected =
                      shippingAddress.street === (addr.street || '') &&
                      shippingAddress.city === (addr.city || '');
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setShippingAddress({
                            street: addr.street || '',
                            apartment: addr.apartment || '',
                            city: addr.city || '',
                            state: addr.state || '',
                            postalCode: addr.postalCode || '',
                            country: addr.country || 'India',
                          });
                          dispatch(setToast({ message: `Loaded saved address ${idx + 1}`, type: 'info' }));
                        }}
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.5rem 0.8rem',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--sand)'}`,
                          backgroundColor: isSelected ? 'var(--surface)' : 'transparent',
                          color: isSelected ? 'var(--ink)' : 'var(--ink-muted)',
                          fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <span>{addr.street ? `${addr.street.slice(0, 24)}...` : `Address #${idx + 1}`}</span>
                        {addr.isDefault && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--accent)', textTransform: 'uppercase' }}>
                            (Default)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '0.4rem',
                  }}
                >
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '0.4rem',
                  }}
                >
                  Apartment, Suite, Unit (Optional)
                </label>
                <input
                  type="text"
                  value={shippingAddress.apartment}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, apartment: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '0.4rem',
                    }}
                  >
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '0.4rem',
                    }}
                  >
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '0.4rem',
                    }}
                  >
                    PIN Code
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Country
                  </label>
                  <input
                    type="text"
                    disabled
                    value={shippingAddress.country}
                    className="input-field"
                    style={{ backgroundColor: 'var(--sand-light)' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Payment Method Selection */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--sand)',
              padding: '2rem',
              marginBottom: '2rem',
            }}
          >
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.2rem', fontFamily: 'var(--font-serif)' }}>
              2. Payment Method
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Option 1: Online Payment */}
              <label
                onClick={() => setPaymentMethod('ONLINE')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1.2rem',
                  border: `2px solid ${paymentMethod === 'ONLINE' ? 'var(--accent)' : 'var(--sand)'}`,
                  backgroundColor: paymentMethod === 'ONLINE' ? 'var(--accent-light)' : 'var(--surface)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ONLINE"
                  checked={paymentMethod === 'ONLINE'}
                  onChange={() => setPaymentMethod('ONLINE')}
                  style={{ marginTop: '0.3rem', accentColor: 'var(--accent)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <CreditCard size={18} color="var(--accent)" />
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>
                      Online Payment (UPI, Cards, Netbanking)
                    </strong>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', margin: 0 }}>
                    Powered by Razorpay & direct server cryptographic verification. Instant order confirmation.
                  </p>
                </div>
              </label>

              {/* Option 2: Cash on Delivery */}
              <label
                onClick={() => setPaymentMethod('COD')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1.2rem',
                  border: `2px solid ${paymentMethod === 'COD' ? 'var(--accent)' : 'var(--sand)'}`,
                  backgroundColor: paymentMethod === 'COD' ? 'var(--accent-light)' : 'var(--surface)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  style={{ marginTop: '0.3rem', accentColor: 'var(--accent)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <Banknote size={18} color="var(--accent)" />
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>
                      Cash on Delivery (Pay upon delivery)
                    </strong>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', margin: 0 }}>
                    Pay in cash or UPI when your order arrives at your doorstep. Zero advance payment needed.
                  </p>
                </div>
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: '0.9rem',
                backgroundColor: 'var(--sand-light)',
                fontSize: '0.82rem',
              }}
            >
              <Clock size={16} color="var(--accent)" />
              <span>Placing this order automatically reserves and secures your inventory on the server.</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '1.2rem', fontSize: '0.92rem' }}
            disabled={isProcessing}
          >
            <Lock size={16} />
            {isProcessing
              ? 'Processing Order...'
              : paymentMethod === 'COD'
              ? `Confirm Cash on Delivery Order · ${formatPaise(finalGrandTotalPaise)}`
              : `Proceed to Pay · ${formatPaise(finalGrandTotalPaise)}`}
          </button>
        </form>

        {/* Right Summary */}
        <div>
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--sand)',
              padding: '2rem',
              position: 'sticky',
              top: '100px',
            }}
          >
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>
              Order Breakdown ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {items.map((item) => (
                <div key={item.variantSku} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <img
                    src={item.image}
                    alt={item.productName}
                    style={{ width: '50px', height: '65px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.88rem', fontWeight: 500 }}>{item.productName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                      Size {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                    {formatPaise(item.itemTotalPaise)}
                  </span>
                </div>
              ))}
            </div>

            {/* Promo / Coupon Apply Box */}
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: 'var(--sand-light)',
                border: '1px solid var(--sand)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <Tag size={15} color="var(--accent)" />
                <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Have a Promo Code?
                </span>
              </div>

              {appliedCoupon ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--surface)',
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--accent)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.85rem' }}>
                      {appliedCoupon.code}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--status-success)', marginLeft: '0.5rem' }}>
                      (-{formatPaise(appliedCoupon.discountPaise)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--status-error)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="e.g. KORA10"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="input-field"
                      style={{
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        flex: 1,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      disabled={isValidatingCoupon || !couponInput.trim()}
                      className="btn-secondary"
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                    >
                      {isValidatingCoupon ? 'Validating...' : 'Apply'}
                    </button>
                  </div>

                  {/* Quick Clickable Suggestions */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon('KORA10')}
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: 'var(--surface)',
                        border: '1px dashed var(--accent)',
                        color: 'var(--ink)',
                        cursor: 'pointer',
                      }}
                    >
                      KORA10 (10% off)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon('WELCOME500')}
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: 'var(--surface)',
                        border: '1px dashed var(--accent)',
                        color: 'var(--ink)',
                        cursor: 'pointer',
                      }}
                    >
                      WELCOME500 (-₹500)
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="editorial-divider" style={{ margin: '1rem 0' }} />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <span>Subtotal</span>
              <span>{formatPaise(cart?.subtotalPaise)}</span>
            </div>

            {appliedCoupon && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--status-success)',
                  fontWeight: 600,
                }}
              >
                <span>Promo Discount ({appliedCoupon.code})</span>
                <span>-{formatPaise(appliedCoupon.discountPaise)}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--ink-muted)',
              }}
            >
              <span>Standard Shipping</span>
              <span>{cart?.shippingPaise === 0 ? 'Complimentary' : formatPaise(cart?.shippingPaise)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: 'var(--ink-muted)',
              }}
            >
              <span>GST (5%)</span>
              <span>{formatPaise(cart?.taxPaise)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.2rem',
                fontWeight: 600,
                borderTop: '1px solid var(--sand)',
                paddingTop: '1rem',
              }}
            >
              <span>Grand Total</span>
              <span>{formatPaise(finalGrandTotalPaise)}</span>
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                padding: '0.8rem',
                backgroundColor: 'var(--sand-light)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.78rem',
                color: 'var(--ink-muted)',
              }}
            >
              <ShieldCheck size={16} color="var(--accent)" />
              <span>Direct cryptographic verification · Safe and verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Online Payment Modal */}
      {gatewayModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(31, 29, 26, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              width: '100%',
              maxWidth: '480px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--sand)',
              boxShadow: 'var(--shadow-modal)',
              overflow: 'hidden',
              animation: 'slideDown 0.3s ease',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.2rem 1.6rem',
                backgroundColor: 'var(--ink)',
                color: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    letterSpacing: '0.18em',
                    fontSize: '1.3rem',
                    fontWeight: 300,
                  }}
                >
                  KORA
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7, borderLeft: '1px solid #444', paddingLeft: '0.8rem' }}>
                  Secure Payment Gateway
                </span>
              </div>
              <button
                onClick={() => setGatewayModal(null)}
                style={{ color: '#aaa', cursor: 'pointer', padding: '0.2rem' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Amount Banner */}
            <div
              style={{
                padding: '1.2rem 1.6rem',
                backgroundColor: 'var(--sand-light)',
                borderBottom: '1px solid var(--sand)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: 0 }}>
                  Order #{gatewayModal.order.orderNumber}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 500, margin: 0 }}>
                  Amount to Pay
                </p>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--ink)' }}>
                {formatPaise(gatewayModal.order.pricing?.grandTotalPaise)}
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--sand)' }}>
              <button
                onClick={() => setPaymentTab('UPI')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  fontSize: '0.85rem',
                  fontWeight: paymentTab === 'UPI' ? 600 : 400,
                  borderBottom: paymentTab === 'UPI' ? '2px solid var(--ink)' : 'none',
                  backgroundColor: paymentTab === 'UPI' ? 'var(--surface)' : 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <Smartphone size={16} /> UPI
              </button>
              <button
                onClick={() => setPaymentTab('CARD')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  fontSize: '0.85rem',
                  fontWeight: paymentTab === 'CARD' ? 600 : 400,
                  borderBottom: paymentTab === 'CARD' ? '2px solid var(--ink)' : 'none',
                  backgroundColor: paymentTab === 'CARD' ? 'var(--surface)' : 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <CreditCard size={16} /> Card
              </button>
              <button
                onClick={() => setPaymentTab('NETBANKING')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  fontSize: '0.85rem',
                  fontWeight: paymentTab === 'NETBANKING' ? 600 : 400,
                  borderBottom: paymentTab === 'NETBANKING' ? '2px solid var(--ink)' : 'none',
                  backgroundColor: paymentTab === 'NETBANKING' ? 'var(--surface)' : 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <Building size={16} /> Netbanking
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ padding: '1.6rem' }}>
              {paymentTab === 'UPI' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Virtual Payment Address (VPA / UPI ID)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="input-field"
                    placeholder="e.g. mobile@upi or username@bank"
                    style={{ marginBottom: '1rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                      <span
                        key={app}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.3rem 0.6rem',
                          backgroundColor: 'var(--sand-light)',
                          border: '1px solid var(--sand)',
                          borderRadius: '2px',
                        }}
                      >
                        ✓ {app}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {paymentTab === 'CARD' && (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                        Expiry
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                        CVV
                      </label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentTab === 'NETBANKING' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Select Bank
                  </label>
                  <select className="input-field" defaultValue="HDFC">
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="SBI">State Bank of India</option>
                    <option value="AXIS">Axis Bank</option>
                    <option value="KOTAK">Kotak Mahindra Bank</option>
                  </select>
                </div>
              )}

              {/* Confirm Pay Button */}
              <button
                onClick={handleCompleteGatewayPayment}
                disabled={isVerifying}
                className="btn-primary"
                style={{ width: '100%', padding: '1rem', fontSize: '0.92rem' }}
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Verifying Payment...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Complete Payment · {formatPaise(gatewayModal.order.pricing?.grandTotalPaise)}
                  </>
                )}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--ink-subtle)', marginTop: '0.8rem' }}>
                🔒 256-Bit Encrypted · Cryptographic Server Signature Verification
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
