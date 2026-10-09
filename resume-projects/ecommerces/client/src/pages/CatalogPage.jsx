import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useGetProductsQuery, useGetCategoriesQuery } from '../services/api.js';
import { formatPaise } from '../utils/format.js';
import { Filter, SlidersHorizontal } from 'lucide-react';

export const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const searchQuery = searchParams.get('search') || '';

  const { data: categoriesData } = useGetCategoriesQuery();
  const categories = categoriesData?.data || [];

  // Match category slug with id (resilient to singular/plural)
  const activeCatObj = categories.find(
    (c) =>
      c.slug === selectedCategory ||
      (selectedCategory === 'mens' && c.slug === 'men') ||
      (selectedCategory === 'womens' && c.slug === 'women') ||
      (selectedCategory === 'collection' && c.slug === 'collections')
  );

  const { data: productsData, isLoading } = useGetProductsQuery({
    category: activeCatObj?._id,
    sort: currentSort,
    search: searchQuery,
    limit: 24,
  });

  const products = productsData?.data || [];

  const handleCategorySelect = (slug) => {
    if (slug === selectedCategory) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  const handleSortChange = (e) => {
    searchParams.set('sort', e.target.value);
    setSearchParams(searchParams);
  };

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--sand)', paddingBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '0.4rem' }}>
          {activeCatObj ? activeCatObj.name : 'All Products'}
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
          {activeCatObj
            ? activeCatObj.description
            : 'Handcrafted clothing made from pure Belgian linen, soft mulmul, and natural mulberry silk.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '3rem' }}>
        {/* Filters Sidebar */}
        <aside>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
            <SlidersHorizontal size={18} />
            <span style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Filter & Refine</span>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.8rem', color: 'var(--ink-muted)' }}>
              Fabric Weave
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <button
                  onClick={() => handleCategorySelect('')}
                  style={{
                    fontSize: '0.85rem',
                    color: !selectedCategory ? 'var(--accent)' : 'var(--ink)',
                    fontWeight: !selectedCategory ? 600 : 400,
                  }}
                >
                  All Collections
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat._id}>
                  <button
                    onClick={() => handleCategorySelect(cat.slug)}
                    style={{
                      fontSize: '0.85rem',
                      color: selectedCategory === cat.slug ? 'var(--accent)' : 'var(--ink)',
                      fontWeight: selectedCategory === cat.slug ? 600 : 400,
                      textAlign: 'left',
                    }}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Product Grid */}
        <main>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            fontSize: '0.85rem',
          }}>
            <p style={{ color: 'var(--ink-muted)' }}>
              Showing {products.length} {products.length === 1 ? 'piece' : 'pieces'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span>Sort by</span>
              <select
                value={currentSort}
                onChange={handleSortChange}
                className="input-field"
                style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.82rem' }}
              >
                <option value="newest">New Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '2rem',
            }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="editorial-card" style={{ height: '460px', backgroundColor: 'var(--sand-light)', animation: 'pulse 1.5s infinite ease-in-out' }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--sand)',
            }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                No pieces match this selection.
              </p>
              <button
                className="btn-secondary"
                onClick={() => setSearchParams({})}
                style={{ marginTop: '1rem' }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '2rem',
            }}>
              {products.map((item) => (
                <Link
                  key={item._id}
                  to={`/products/${item.slug}`}
                  className="editorial-card"
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ height: '360px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={item.images[0]?.url}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '1.2rem', backgroundColor: 'var(--surface)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.2rem' }}>
                        {item.fabricComposition}
                      </p>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>{item.name}</h3>
                    </div>
                    <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 600 }}>{formatPaise(item.price)}</span>
                      {item.compareAtPrice && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--ink-subtle)', textDecoration: 'line-through' }}>
                          {formatPaise(item.compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
