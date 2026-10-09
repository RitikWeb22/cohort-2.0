import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Feather,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react';
import { useGetProductsQuery, useGetCategoriesQuery } from '../services/api.js';
import { formatPaise } from '../utils/format.js';

export const HomePage = () => {
  const { data: productsData, isLoading: isProductsLoading } = useGetProductsQuery({ limit: 4 });
  const { data: categoriesData } = useGetCategoriesQuery();

  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];

  // Carousel slides data
  const slides = [
    {
      id: 1,
      badge: 'New Season · Tailored Menswear',
      title: 'Crafted Menswear.',
      description:
        'Relaxed linen shirts, pleated trousers, structured waistcoats, and pure khadi kurtas tailored for contemporary ease.',
      primaryCta: 'Shop Mens',
      primaryLink: '/catalog?category=men',
      secondaryCta: 'Explore Womens',
      secondaryLink: '/catalog?category=women',
      image:
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&q=80&w=1200',
      label: 'Tailored Linen Collection',
      sublabel: 'Pure European Flax · Mens',
    },
    {
      id: 2,
      badge: 'Graceful Drapes · Pure Mulberry Silk',
      title: 'Artisanal Womenswear.',
      description:
        'Flowing silk maxi dresses, handwoven Chanderi sarees, and delicate mulmul embroidered sets made for quiet luxury.',
      primaryCta: 'Shop Womens',
      primaryLink: '/catalog?category=women',
      secondaryCta: 'View Collections',
      secondaryLink: '/catalog?category=collections',
      image:
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200',
      label: 'Mulberry Silk Draped Dress',
      sublabel: 'Hand-Reeled Silk · Womens',
    },
    {
      id: 3,
      badge: 'Limited Capsules · Handspun Textiles',
      title: 'Signature Collections.',
      description:
        'Heavyweight textured khadi kimono coats, botanical merino capes, and slow-fashion seasonal artisanal pieces.',
      primaryCta: 'Explore Collections',
      primaryLink: '/catalog?category=collections',
      secondaryCta: 'Shop All Pieces',
      secondaryLink: '/catalog',
      image:
        'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1200',
      label: 'Botanical Cape & Coats',
      sublabel: 'Organic Textiles · Collections',
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Auto-play carousel
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  // FAQ Items
  const faqItems = [
    {
      question: 'What fabrics and materials are used in KORA garments?',
      answer:
        'Every piece is crafted exclusively from 100% pure natural fibers: Belgian flax linen, handwoven wild mulberry silk, and organic unbleached cotton. We never use polyester, nylon, or synthetic blends in any part of our clothing.',
    },
    {
      question: 'How do I choose the correct size?',
      answer:
        'Our silhouettes are tailored with a relaxed, contemporary drape. Each product page features a detailed size guide with precise chest, shoulder, waist, and length measurements to help you pick the right fit.',
    },
    {
      question: 'What are your delivery timelines?',
      answer:
        'All orders are processed and packed within 24 to 48 hours. Standard domestic delivery takes 3 to 5 business days across India. Fast express shipping is also available at checkout.',
    },
    {
      question: 'What is your return and exchange policy?',
      answer:
        'We offer a simple 7-day return and exchange policy on all unworn items in original condition with tags attached. You can request an exchange or return directly from your account orders page.',
    },
    {
      question: 'How should I care for natural linen and silk garments?',
      answer:
        'We recommend gentle hand washing in cold water or a delicate machine wash cycle with mild eco-friendly detergent. Line dry in the shade to preserve the natural fiber strength, softness, and rich color.',
    },
  ];

  const activeSlide = slides[currentSlide];

  return (
    <div>
      {/* 1. Hero Section with Interactive Image Carousel */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          position: 'relative',
          backgroundColor: 'var(--sand-light)',
          minHeight: '84vh',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--sand)',
          overflow: 'hidden',
        }}
      >
        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3.5rem',
            alignItems: 'center',
            paddingTop: '3.5rem',
            paddingBottom: '3.5rem',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Slide Text Content */}
          <div style={{ maxWidth: '540px' }}>
            <span
              className="pill-badge"
              style={{
                marginBottom: '1.2rem',
                backgroundColor: 'var(--sand)',
                fontSize: '0.75rem',
              }}
            >
              {activeSlide.badge}
            </span>
            <h1
              key={`title-${activeSlide.id}`}
              style={{
                marginBottom: '1.4rem',
                lineHeight: '1.1',
                animation: 'fadeIn 0.5s ease',
              }}
            >
              {activeSlide.title}
            </h1>
            <p
              key={`desc-${activeSlide.id}`}
              style={{
                fontSize: '1.08rem',
                lineHeight: '1.8',
                marginBottom: '2.5rem',
                color: 'var(--ink-muted)',
                animation: 'fadeIn 0.5s ease',
              }}
            >
              {activeSlide.description}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to={activeSlide.primaryLink} className="btn-primary">
                {activeSlide.primaryCta}
                <ArrowRight size={16} />
              </Link>
              <Link to={activeSlide.secondaryLink} className="btn-secondary">
                {activeSlide.secondaryCta}
              </Link>
            </div>

            {/* Carousel Slide Indicators & Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                marginTop: '3rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--sand)',
              }}
            >
              {/* Previous / Next Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handlePrevSlide}
                  aria-label="Previous Slide"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: '1px solid var(--sand-dark)',
                    backgroundColor: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink)',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--sand)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextSlide}
                  aria-label="Next Slide"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: '1px solid var(--sand-dark)',
                    backgroundColor: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink)',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--sand)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Dot Indicators */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    style={{
                      width: currentSlide === idx ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: currentSlide === idx ? 'var(--accent)' : 'var(--sand-dark)',
                      transition: 'all var(--transition-smooth)',
                      padding: 0,
                    }}
                  />
                ))}
              </div>

              <span
                style={{
                  fontSize: '0.78rem',
                  letterSpacing: '0.08em',
                  color: 'var(--ink-subtle)',
                  marginLeft: 'auto',
                }}
              >
                0{currentSlide + 1} / 0{slides.length}
              </span>
            </div>
          </div>

          {/* Slide Image Box */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--sand)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--sand-light)',
              }}
            >
              <img
                key={`img-${activeSlide.id}`}
                src={activeSlide.image}
                alt={activeSlide.title}
                style={{
                  width: '100%',
                  height: '560px',
                  objectFit: 'cover',
                  display: 'block',
                  animation: 'fadeIn 0.6s ease',
                  transition: 'transform 0.8s ease',
                }}
              />

              {/* Floating Image Badge */}
              <div
                key={`badge-${activeSlide.id}`}
                style={{
                  position: 'absolute',
                  bottom: '1.5rem',
                  left: '1.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.94)',
                  backdropFilter: 'blur(6px)',
                  padding: '0.8rem 1.4rem',
                  border: '1px solid var(--sand)',
                  boxShadow: 'var(--shadow-subtle)',
                  animation: 'fadeIn 0.6s ease',
                }}
              >
                <p
                  style={{
                    fontSize: '0.75rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}
                >
                  {activeSlide.label}
                </p>
                <p
                  style={{
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--ink)',
                  }}
                >
                  {activeSlide.sublabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Ethos Pillars */}
      <section
        style={{
          padding: '4rem 0',
          borderBottom: '1px solid var(--sand)',
          backgroundColor: 'var(--bg)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2.5rem',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <Feather size={26} color="var(--accent)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>100% Pure Natural Fibers</h3>
              <p style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
                Woven from pure Belgian flax linen, mulberry silk, and organic unbleached cotton.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <Sparkles size={26} color="var(--accent)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>Artisanal Craftsmanship</h3>
              <p style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
                Handcrafted by skilled regional weavers using traditional techniques and natural finishes.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <ShieldCheck size={26} color="var(--accent)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>Guaranteed Stock</h3>
              <p style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
                Real-time stock reservation ensures seamless checkout without out-of-stock cancellations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Shop by Fabric Categories */}
      <section style={{ padding: '5rem 0', borderBottom: '1px solid var(--sand)' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: '2.5rem',
            }}
          >
            <div>
              <span className="pill-badge" style={{ marginBottom: '0.5rem' }}>
                Curated Categories
              </span>
              <h2>Shop by Category</h2>
            </div>
            <Link
              to="/catalog"
              style={{
                fontSize: '0.85rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/catalog?category=${cat.slug}`}
                className="editorial-card"
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ height: '320px', overflow: 'hidden' }}>
                  <img
                    src={cat.image}
                    alt={cat.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease',
                    }}
                  />
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)' }}>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>{cat.name}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', lineHeight: '1.5' }}>
                    {cat.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Featured Collection */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--sand)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            <span className="pill-badge" style={{ marginBottom: '0.5rem' }}>
              Featured Collection
            </span>
            <h2>Signature Silhouettes</h2>
            <p style={{ marginTop: '0.8rem', fontSize: '0.95rem' }}>
              Relaxed tunics, pleated shirts, and structured jackets tailored for effortless everyday elegance.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
            }}
          >
            {isProductsLoading ? (
              [1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="editorial-card"
                  style={{
                    height: '480px',
                    backgroundColor: 'var(--sand-light)',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                />
              ))
            ) : products.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                <p>Loading items from the collection...</p>
              </div>
            ) : (
              products.map((item) => (
                <Link
                  key={item._id}
                  to={`/products/${item.slug}`}
                  className="editorial-card"
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ height: '380px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={
                        item.images?.[0]?.url ||
                        'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&q=80&w=1000'
                      }
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.7rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.variants?.length || 3} Sizes
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '1.2rem',
                      backgroundColor: 'var(--surface)',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--accent)',
                          marginBottom: '0.2rem',
                        }}
                      >
                        {item.fabricComposition}
                      </p>
                      <h3 style={{ fontSize: '1.15rem', color: 'var(--ink)' }}>{item.name}</h3>
                    </div>
                    <div
                      style={{
                        marginTop: '1rem',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.6rem',
                      }}
                    >
                      <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                        {formatPaise(item.price)}
                      </span>
                      {item.compareAtPrice && (
                        <span
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--ink-subtle)',
                            textDecoration: 'line-through',
                          }}
                        >
                          {formatPaise(item.compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 5. Minimalist FAQ Section */}
      <section style={{ padding: '5.5rem 0 6rem 0', backgroundColor: 'var(--sand-light)' }}>
        <div className="container" style={{ maxWidth: '840px' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="pill-badge" style={{ marginBottom: '0.5rem', backgroundColor: 'var(--sand)' }}>
              Questions & Answers
            </span>
            <h2 style={{ marginBottom: '0.8rem' }}>Frequently Asked Questions</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--ink-muted)' }}>
              Everything you need to know about our natural fabrics, fit, shipping, and garment care.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--sand)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    transition: 'border-color var(--transition-fast)',
                  }}
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      padding: '1.3rem 1.6rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    aria-expanded={isOpen}
                  >
                    <span
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 500,
                        color: 'var(--ink)',
                        fontFamily: 'var(--font-serif)',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {item.question}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: isOpen ? 'var(--sand)' : 'var(--sand-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ink)',
                        transition: 'background-color var(--transition-fast)',
                      }}
                    >
                      {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: '0 1.6rem 1.4rem 1.6rem',
                        fontSize: '0.92rem',
                        lineHeight: '1.7',
                        color: 'var(--ink-muted)',
                        borderTop: '1px solid var(--sand-light)',
                        paddingTop: '1rem',
                        animation: 'fadeIn 0.25s ease',
                      }}
                    >
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
