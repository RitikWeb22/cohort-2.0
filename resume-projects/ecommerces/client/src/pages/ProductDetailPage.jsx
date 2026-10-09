import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useGetProductBySlugQuery, useAddToCartMutation } from '../services/api.js';
import { setCartDrawerOpen, openAuthModal, setToast } from '../store/slices/uiSlice.js';
import { formatPaise } from '../utils/format.js';
import { ShoppingBag, Check, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const { data: productResponse, isLoading, isError } = useGetProductBySlugQuery(slug);
  const [addToCartMutation, { isLoading: isAdding }] = useAddToCartMutation();

  const product = productResponse?.data;
  const variants = product?.variants || [];

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0]);
    }
    if (product?.images?.length > 0 && !selectedImage) {
      setSelectedImage(product.images[0].url);
    }
  }, [product, variants]);

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2>Product Not Found</h2>
        <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>This item is currently unavailable or out of stock.</p>
        <button className="btn-primary" onClick={() => navigate('/catalog')}>
          Back to All Products
        </button>
      </div>
    );
  }

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    if (variant.images && variant.images.length > 0) {
      setSelectedImage(variant.images[0].url);
    }
  };

  const handleAddToBag = async () => {
    if (!selectedVariant) return;

    if (!isAuthenticated) {
      dispatch(openAuthModal('login'));
      return;
    }

    try {
      await addToCartMutation({
        productId: product._id,
        variantSku: selectedVariant.sku,
        quantity: 1,
      }).unwrap();

      dispatch(setToast({ message: `Added ${product.name} (Size ${selectedVariant.size}) to your bag`, type: 'success' }));
      dispatch(setCartDrawerOpen(true));
    } catch (err) {
      dispatch(
        setToast({
          message: err.data?.message || 'Unable to reserve piece. Insufficient inventory.',
          type: 'error',
        })
      );
    }
  };

  const isOutOfStock = selectedVariant ? selectedVariant.availableStock <= 0 : false;

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '4rem',
      }}>
        {/* Gallery */}
        <div>
          <div style={{
            height: '580px',
            overflow: 'hidden',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--sand)',
            marginBottom: '1rem',
          }}>
            <img
              src={selectedImage || product.images[0]?.url}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Thumbnails */}
          {product.images?.length > 1 && (
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img.url)}
                  style={{
                    width: '80px',
                    height: '100px',
                    border: selectedImage === img.url ? '2px solid var(--accent)' : '1px solid var(--sand)',
                    overflow: 'hidden',
                  }}
                >
                  <img src={img.url} alt={img.alt || product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Variant Selectors */}
        <div>
          <span className="pill-badge" style={{ marginBottom: '1rem' }}>
            {product.fabricComposition}
          </span>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>{product.name}</h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 600 }}>
              {formatPaise(selectedVariant ? selectedVariant.price : product.price)}
            </span>
            {(selectedVariant?.compareAtPrice || product.compareAtPrice) && (
              <span style={{ fontSize: '1.1rem', color: 'var(--ink-subtle)', textDecoration: 'line-through' }}>
                {formatPaise(selectedVariant?.compareAtPrice || product.compareAtPrice)}
              </span>
            )}
          </div>

          <div className="editorial-divider" style={{ margin: '1.5rem 0' }} />

          {/* Editorial Story */}
          {product.story && (
            <div style={{ marginBottom: '2rem' }}>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '1.1rem',
                lineHeight: '1.7',
                color: 'var(--ink)',
              }}>
                "{product.story}"
              </p>
            </div>
          )}

          {/* Size Selector */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
              <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                Select Size
              </span>
              <span style={{ color: 'var(--ink-muted)' }}>Relaxed Silhouette</span>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              {variants.map((v) => {
                const isSelected = selectedVariant?.sku === v.sku;
                const outOfStock = v.availableStock <= 0;
                return (
                  <button
                    key={v.sku}
                    onClick={() => handleVariantSelect(v)}
                    disabled={outOfStock}
                    style={{
                      width: '56px',
                      height: '46px',
                      border: isSelected ? '2px solid var(--ink)' : '1px solid var(--sand)',
                      backgroundColor: isSelected ? 'var(--ink)' : 'var(--surface)',
                      color: isSelected ? 'var(--surface)' : outOfStock ? 'var(--sand-dark)' : 'var(--ink)',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 400,
                      position: 'relative',
                      opacity: outOfStock ? 0.4 : 1,
                      cursor: outOfStock ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {v.size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Inventory Status Indicator */}
          {selectedVariant && (
            <div style={{ marginBottom: '2rem', fontSize: '0.85rem' }}>
              {selectedVariant.availableStock <= 0 ? (
                <p style={{ color: 'var(--status-danger)' }}>Currently out of stock.</p>
              ) : selectedVariant.availableStock <= 5 ? (
                <p style={{ color: 'var(--status-warning)' }}>
                  Only {selectedVariant.availableStock} items remaining in stock.
                </p>
              ) : (
                <p style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Check size={14} /> In stock and ready to ship
                </p>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '1.2rem', marginBottom: '2.5rem' }}
            disabled={isAdding || isOutOfStock}
            onClick={handleAddToBag}
          >
            <ShoppingBag size={18} />
            {isOutOfStock ? 'Sold Out' : isAdding ? 'Reserving...' : 'Add to Bag'}
          </button>

          {/* Guarantees */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            padding: '1.5rem',
            backgroundColor: 'var(--sand-light)',
            border: '1px solid var(--sand)',
            fontSize: '0.85rem',
          }}>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <ShieldCheck size={20} color="var(--accent)" />
              <span>Complimentary insured courier with signature delivery across India</span>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <RefreshCw size={20} color="var(--accent)" />
              <span>10-day exchange for tailored sizing or store credit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
