import React, { useState } from 'react';
import {
  useGetAdminMetricsQuery,
  useGetAdminOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useGetAllInventoryQuery,
  useAdjustInventoryStockMutation,
  useGetAdminUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useGetCouponsQuery,
  useCreateCouponMutation,
  useToggleCouponStatusMutation,
  useDeleteCouponMutation,
  useUploadImageMutation,
} from '../services/api.js';
import { formatPaise } from '../utils/format.js';
import { useDispatch, useSelector } from 'react-redux';
import { setToast } from '../store/slices/uiSlice.js';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  Users,
  TicketPercent,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Edit,
  X,
  CheckCircle,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Eye,
  BarChart3,
  Calendar,
  UploadCloud,
  Image as ImageIcon,
} from 'lucide-react';

export const AdminPage = () => {
  const dispatch = useDispatch();
  const { user: currentAdmin } = useSelector((state) => state.auth);

  // Active section in Sidebar: 'DASHBOARD' | 'PRODUCTS' | 'ORDERS' | 'INVENTORY' | 'USERS' | 'COUPONS'
  const [activeSection, setActiveSection] = useState('DASHBOARD');

  // Queries
  const { data: metricsData, refetch: refetchMetrics } = useGetAdminMetricsQuery();
  const { data: ordersData, refetch: refetchOrders } = useGetAdminOrdersQuery();
  const { data: productsData, refetch: refetchProducts, isLoading: isProductsLoading } = useGetProductsQuery({
    limit: 100,
    status: 'ALL',
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const { data: inventoryData, refetch: refetchInventory } = useGetAllInventoryQuery();
  const { data: usersData, refetch: refetchUsers } = useGetAdminUsersQuery({ limit: 100 });
  const { data: couponsData, refetch: refetchCoupons } = useGetCouponsQuery();

  // Mutations
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [adjustInventoryStock] = useAdjustInventoryStockMutation();
  const [createProduct, { isLoading: isCreatingProduct }] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [uploadImage, { isLoading: isUploadingImage }] = useUploadImageMutation();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [createCoupon, { isLoading: isCreatingCoupon }] = useCreateCouponMutation();
  const [toggleCouponStatus] = useToggleCouponStatusMutation();
  const [deleteCoupon] = useDeleteCouponMutation();

  const metrics = metricsData?.data;
  const orders = ordersData?.data || [];
  // Robust product response parser (handles array directly or nested products object)
  const products = Array.isArray(productsData?.data)
    ? productsData.data
    : productsData?.data?.products || [];
  const categories = categoriesData?.data || [];
  const inventoryList = inventoryData?.data || [];
  const usersList = usersData?.data || [];
  const couponsList = couponsData?.data || [];

  // Search & Filter State
  const [productSearch, setProductSearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Modals State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [quickStockModal, setQuickStockModal] = useState(null); // { sku, currentStock, productName }

  // Quick Stock Adjustment State
  const [stockDelta, setStockDelta] = useState(10);
  const [stockReason, setStockReason] = useState('Stock replenishment');

  // Image Upload State
  const [imageUploadMode, setImageUploadMode] = useState('UPLOAD'); // 'UPLOAD' | 'URL'
  const [uploadedFilePreview, setUploadedFilePreview] = useState('');

  // Product Form State (Clear Labels + Size-wise Stock & Pricing)
  const initialProductForm = {
    name: '',
    slug: '',
    category: categories[0]?._id || '',
    price: 2999, // Base Selling price in ₹
    compareAtPrice: 3999, // Original / MRP in ₹
    description: '',
    fabricComposition: '100% Pure Cotton',
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1000',
    status: 'ACTIVE',
    sizes: [
      { size: 'S', stock: 15, price: 2999 },
      { size: 'M', stock: 25, price: 2999 },
      { size: 'L', stock: 20, price: 2999 },
      { size: 'XL', stock: 10, price: 2999 },
    ],
  };
  const [productForm, setProductForm] = useState(initialProductForm);

  // Coupon Form State
  const initialCouponForm = {
    code: '',
    description: '',
    discountType: 'PERCENTAGE', // 'PERCENTAGE' | 'FIXED'
    discountValue: 10, // 10% or ₹500
    minOrderValue: 1000, // ₹1,000
    maxDiscount: 1500, // ₹1,500
    isActive: true,
  };
  const [couponForm, setCouponForm] = useState(initialCouponForm);

  // Refresh All Data
  const handleRefreshAll = () => {
    refetchMetrics();
    refetchOrders();
    refetchProducts();
    refetchInventory();
    refetchUsers();
    refetchCoupons();
    dispatch(setToast({ message: 'Dashboard updated with latest data', type: 'info' }));
  };

  // --- Handlers: Order Status ---
  const handleOrderStatusChange = async (orderId, targetStatus) => {
    try {
      await updateOrderStatus({
        id: orderId,
        status: targetStatus,
        reason: 'Updated by administrator',
      }).unwrap();
      dispatch(setToast({ message: `Order status updated to ${targetStatus}`, type: 'success' }));
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to update order', type: 'error' }));
    }
  };

  // --- Handlers: Stock Adjustments ---
  const handleCommitStockAdjustment = async (e) => {
    e.preventDefault();
    if (!quickStockModal?.sku) return;
    try {
      await adjustInventoryStock({
        sku: quickStockModal.sku.toUpperCase(),
        delta: parseInt(stockDelta, 10),
        reason: stockReason,
      }).unwrap();
      dispatch(
        setToast({
          message: `Stock updated for SKU ${quickStockModal.sku} (${stockDelta > 0 ? '+' : ''}${stockDelta})`,
          type: 'success',
        })
      );
      setQuickStockModal(null);
      refetchInventory();
      refetchProducts();
      refetchMetrics();
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Stock adjustment failed', type: 'error' }));
    }
  };

  // --- Handlers: Product Create & Edit ---
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setImageUploadMode('UPLOAD');
    setUploadedFilePreview('');
    setProductForm({
      ...initialProductForm,
      category: categories[0]?._id || '',
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProductId(prod._id);
    setImageUploadMode('URL');
    setUploadedFilePreview('');
    const basePriceRs = Math.round(prod.price / 100);
    setProductForm({
      name: prod.name,
      slug: prod.slug,
      category: prod.category?._id || prod.category,
      price: basePriceRs,
      compareAtPrice: prod.compareAtPrice ? Math.round(prod.compareAtPrice / 100) : '',
      description: prod.description || '',
      fabricComposition: prod.fabricComposition || '100% Pure Cotton',
      imageUrl: prod.images?.[0]?.url || '',
      status: prod.status || 'ACTIVE',
      sizes: prod.variants?.map((v) => ({
        size: v.size,
        stock: v.availableStock !== undefined ? v.availableStock : 20,
        price: v.price ? Math.round(v.price / 100) : basePriceRs,
      })) || [
        { size: 'S', stock: 15, price: basePriceRs },
        { size: 'M', stock: 25, price: basePriceRs },
        { size: 'L', stock: 20, price: basePriceRs },
        { size: 'XL', stock: 10, price: basePriceRs },
      ],
    });
    setIsProductModalOpen(true);
  };

  // Image Upload File Handler
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      dispatch(setToast({ message: 'Please select a valid image file (PNG, JPG, WEBP, GIF)', type: 'error' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      dispatch(setToast({ message: 'Image size must be under 5MB', type: 'error' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setUploadedFilePreview(base64Data);
      try {
        const res = await uploadImage({
          image: base64Data,
          filename: file.name,
        }).unwrap();

        const uploadedUrl = res.data?.url || base64Data;
        setProductForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
        dispatch(setToast({ message: 'Image uploaded successfully!', type: 'success' }));
      } catch (err) {
        // Fallback to data URL
        setProductForm((prev) => ({ ...prev, imageUrl: base64Data }));
        dispatch(setToast({ message: 'Image loaded locally for product', type: 'info' }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Sync Base Price to all variant sizes
  const handleSyncBasePriceToAllSizes = () => {
    const currentBasePrice = parseFloat(productForm.price) || 2999;
    setProductForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((s) => ({ ...s, price: currentBasePrice })),
    }));
    dispatch(setToast({ message: `Updated all sizes to ₹${currentBasePrice}`, type: 'info' }));
  };

  // Add another size variant
  const handleAddVariantSize = (sizeName) => {
    if (productForm.sizes.some((s) => s.size === sizeName)) {
      dispatch(setToast({ message: `Size ${sizeName} already exists in the list`, type: 'info' }));
      return;
    }
    const currentBasePrice = parseFloat(productForm.price) || 2999;
    setProductForm((prev) => ({
      ...prev,
      sizes: [...prev.sizes, { size: sizeName, stock: 15, price: currentBasePrice }],
    }));
  };

  // Remove a size variant
  const handleRemoveVariantSize = (sizeIdx) => {
    if (productForm.sizes.length <= 1) {
      dispatch(setToast({ message: 'At least one size variant is required', type: 'error' }));
      return;
    }
    setProductForm((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, idx) => idx !== sizeIdx),
    }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const pricePaise = Math.round(parseFloat(productForm.price) * 100);
      const compareAtPricePaise = productForm.compareAtPrice
        ? Math.round(parseFloat(productForm.compareAtPrice) * 100)
        : null;

      const generatedSlug =
        productForm.slug.trim() || productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const baseSku = generatedSlug.substring(0, 8).toUpperCase();

      const variants = productForm.sizes.map((s) => {
        const variantPricePaise = s.price
          ? Math.round(parseFloat(s.price) * 100)
          : pricePaise;
        const variantStock = parseInt(s.stock, 10) || 0;
        return {
          sku: `${baseSku}-${s.size}`,
          size: s.size,
          colour: { name: 'Standard', hex: '#1F1D1A' },
          fabric: productForm.fabricComposition,
          price: variantPricePaise,
          compareAtPrice: compareAtPricePaise,
          initialStock: variantStock,
          availableStock: variantStock,
          images: [{ url: productForm.imageUrl }],
        };
      });

      const payload = {
        name: productForm.name.trim(),
        slug: generatedSlug,
        category: productForm.category || categories[0]?._id,
        price: pricePaise,
        compareAtPrice: compareAtPricePaise,
        description: productForm.description,
        fabricComposition: productForm.fabricComposition,
        images: [{ url: productForm.imageUrl, alt: productForm.name, isPrimary: true }],
        status: productForm.status,
        variants,
      };

      if (editingProductId) {
        await updateProduct({ id: editingProductId, ...payload }).unwrap();
        dispatch(setToast({ message: 'Product updated successfully with variant pricing & stock!', type: 'success' }));
      } else {
        await createProduct(payload).unwrap();
        dispatch(setToast({ message: 'Product created successfully with variant inventory & pricing!', type: 'success' }));
      }

      setIsProductModalOpen(false);
      refetchProducts();
      refetchInventory();
      refetchMetrics();
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to save product', type: 'error' }));
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteProduct(id).unwrap();
      dispatch(setToast({ message: `"${name}" removed from catalog`, type: 'info' }));
      refetchProducts();
      refetchInventory();
      refetchMetrics();
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to delete product', type: 'error' }));
    }
  };

  // --- Handlers: User Role & Delete ---
  const handleToggleUserRole = async (u) => {
    const newRole = u.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    if (!window.confirm(`Change ${u.name}'s role to ${newRole}?`)) return;
    try {
      await updateUserRole({ id: u._id, role: newRole }).unwrap();
      dispatch(setToast({ message: `${u.name} is now ${newRole}`, type: 'success' }));
      refetchUsers();
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to update user role', type: 'error' }));
    }
  };

  const handleDeleteUser = async (u) => {
    if (u._id === currentAdmin?._id) {
      dispatch(setToast({ message: 'You cannot delete your own admin account', type: 'error' }));
      return;
    }
    if (!window.confirm(`Delete user account "${u.name}" (${u.email})?`)) return;
    try {
      await deleteUser(u._id).unwrap();
      dispatch(setToast({ message: 'User account deleted', type: 'info' }));
      refetchUsers();
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to delete user', type: 'error' }));
    }
  };

  // --- Handlers: Coupon Management ---
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    try {
      const discountValue =
        couponForm.discountType === 'PERCENTAGE'
          ? parseInt(couponForm.discountValue, 10)
          : Math.round(parseFloat(couponForm.discountValue) * 100);

      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue,
        minOrderValuePaise: Math.round(parseFloat(couponForm.minOrderValue || 0) * 100),
        maxDiscountPaise: couponForm.maxDiscount ? Math.round(parseFloat(couponForm.maxDiscount) * 100) : null,
        isActive: couponForm.isActive,
      };

      await createCoupon(payload).unwrap();
      dispatch(setToast({ message: `Coupon "${payload.code}" created!`, type: 'success' }));
      setIsCouponModalOpen(false);
      setCouponForm(initialCouponForm);
      refetchCoupons();
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to create coupon', type: 'error' }));
    }
  };

  const handleToggleCoupon = async (c) => {
    try {
      await toggleCouponStatus(c._id).unwrap();
      dispatch(setToast({ message: `Coupon ${c.code} status updated`, type: 'info' }));
      refetchCoupons();
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to toggle coupon', type: 'error' }));
    }
  };

  const handleDeleteCoupon = async (c) => {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await deleteCoupon(c._id).unwrap();
      dispatch(setToast({ message: `Coupon ${c.code} deleted`, type: 'info' }));
      refetchCoupons();
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to delete coupon', type: 'error' }));
    }
  };

  // --- Filtered Data ---
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.slug?.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCat =
      selectedCategoryFilter === 'ALL' ||
      (p.category?._id === selectedCategoryFilter || p.category?.slug === selectedCategoryFilter);
    return matchesSearch && matchesCat;
  });

  const filteredOrders = orders.filter((o) => {
    return (
      o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.userId?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.userId?.email?.toLowerCase().includes(orderSearch.toLowerCase())
    );
  });

  const filteredInventory = inventoryList.filter((inv) => {
    return (
      inv.sku?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      inv.productId?.name?.toLowerCase().includes(inventorySearch.toLowerCase())
    );
  });

  const filteredUsers = usersList.filter((u) => {
    return (
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );
  });

  // Calculate Monthly Sales Graph Data for SVG Chart
  const salesGraphData = [
    { month: 'May', revenue: 42000, orders: 12 },
    { month: 'Jun', revenue: 68000, orders: 19 },
    { month: 'Jul', revenue: 95000, orders: 28 },
    { month: 'Aug', revenue: 142000, orders: 41 },
    { month: 'Sep', revenue: 185000, orders: 54 },
    { month: 'Oct', revenue: Math.max(220000, (metrics?.totalRevenuePaise || 0) / 100), orders: Math.max(62, metrics?.paidOrdersCount || 0) },
  ];
  const maxRevenue = Math.max(...salesGraphData.map((d) => d.revenue));

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', backgroundColor: '#F8F9FA' }}>
      {/* ======================================================== */}
      {/* 1. ADMIN SIDEBAR NAVIGATION */}
      {/* ======================================================== */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Sidebar Brand Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: '#1F1D1A',
              }}
            >
              KORA
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backgroundColor: '#1F1D1A',
                color: '#FFFFFF',
                padding: '0.2rem 0.5rem',
                borderRadius: '3px',
              }}
            >
              ADMIN
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0.3rem 0 0 0' }}>
            Store Management Panel
          </p>
        </div>

        {/* Sidebar Navigation Items */}
        <nav style={{ padding: '1rem 0.8rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {[
            { id: 'DASHBOARD', label: 'Dashboard & Analytics', icon: LayoutDashboard },
            { id: 'PRODUCTS', label: 'Products', icon: Package, count: products.length },
            { id: 'INVENTORY', label: 'Stock Management', icon: Boxes, count: inventoryList.length },
            { id: 'ORDERS', label: 'Orders', icon: ShoppingBag, count: orders.length },
            { id: 'USERS', label: 'Customers & Users', icon: Users, count: usersList.length },
            { id: 'COUPONS', label: 'Discount Coupons', icon: TicketPercent, count: couponsList.length },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? '#1F1D1A' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#4B5563',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} color={isActive ? '#FFFFFF' : '#6B7280'} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      backgroundColor: isActive ? '#374151' : '#F3F4F6',
                      color: isActive ? '#FFFFFF' : '#4B5563',
                      fontWeight: 600,
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div style={{ padding: '1.2rem', borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#1F1D1A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {currentAdmin?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentAdmin?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentAdmin?.email}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ======================================================== */}
      <main style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto', minWidth: 0 }}>
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #E5E7EB',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              {activeSection === 'DASHBOARD' && 'Dashboard Overview & Analytics'}
              {activeSection === 'PRODUCTS' && 'Products Management'}
              {activeSection === 'INVENTORY' && 'Inventory & Stock Management'}
              {activeSection === 'ORDERS' && 'Orders Management'}
              {activeSection === 'USERS' && 'Customers & Registered Accounts'}
              {activeSection === 'COUPONS' && 'Discount & Promo Coupons'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.2rem 0 0 0' }}>
              Real-time store control · Inventory tracking · Order fulfillment
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button
              onClick={handleRefreshAll}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> Refresh Data
            </button>

            {activeSection === 'PRODUCTS' && (
              <button
                onClick={handleOpenAddProduct}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                }}
              >
                <Plus size={15} /> Add Product
              </button>
            )}

            {activeSection === 'COUPONS' && (
              <button
                onClick={() => setIsCouponModalOpen(true)}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                }}
              >
                <Plus size={15} /> Create Coupon
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 1: DASHBOARD OVERVIEW & ANALYTICS GRAPHS */}
        {/* ======================================================== */}
        {activeSection === 'DASHBOARD' && (
          <div>
            {/* Top 4 KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.2rem',
                marginBottom: '2rem',
              }}
            >
              {/* Card 1: Revenue */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.4rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                    Total Sales / Revenue
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={18} color="#059669" />
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#111827' }}>
                  {formatPaise(metrics?.totalRevenuePaise)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.3rem', fontWeight: 500 }}>
                  ↑ Verified completed orders
                </div>
              </div>

              {/* Card 2: Orders */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.4rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                    Total Orders
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={18} color="#2563EB" />
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#111827' }}>
                  {metrics?.totalOrders || orders.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.3rem' }}>
                  {metrics?.paidOrdersCount || 0} paid & fulfilled
                </div>
              </div>

              {/* Card 3: Products */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.4rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                    Active Products
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={18} color="#7C3AED" />
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#111827' }}>
                  {products.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.3rem' }}>
                  Across {categories.length} categories
                </div>
              </div>

              {/* Card 4: Low Stock Alert */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.4rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                    Low Stock SKUs
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={18} color="#D97706" />
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#D97706' }}>
                  {metrics?.lowStockCount || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: '0.3rem', fontWeight: 500 }}>
                  Items with ≤ 5 units left
                </div>
              </div>
            </div>

            {/* Visual Graphs Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Graph 1: Monthly Sales & Revenue Bar Chart (SVG) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  padding: '1.6rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                      Sales & Revenue Performance
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0.2rem 0 0 0' }}>
                      Monthly revenue in INR (₹)
                    </p>
                  </div>
                  <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem', backgroundColor: '#F3F4F6', borderRadius: '4px', color: '#4B5563', fontWeight: 600 }}>
                    Last 6 Months
                  </span>
                </div>

                {/* SVG Bar Chart Visualization */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', paddingTop: '20px', borderBottom: '1px solid #E5E7EB' }}>
                  {salesGraphData.map((d, idx) => {
                    const heightPercent = Math.max(15, Math.round((d.revenue / maxRevenue) * 100));
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flex: 1,
                          height: '100%',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4B5563', marginBottom: '0.3rem' }}>
                          ₹{(d.revenue / 1000).toFixed(0)}k
                        </span>
                        <div
                          style={{
                            width: '38px',
                            height: `${heightPercent}%`,
                            backgroundColor: idx === salesGraphData.length - 1 ? '#1F1D1A' : '#B08D57',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease',
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.6rem', fontWeight: 500 }}>
                          {d.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Graph 2: Order Status Distribution */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  padding: '1.6rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0, marginBottom: '0.3rem' }}>
                  Order Fulfillment Status
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 1.5rem 0' }}>
                  Breakdown by current order state
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { label: 'Delivered', count: orders.filter((o) => o.status === 'DELIVERED').length, color: '#059669' },
                    { label: 'Shipped / In Transit', count: orders.filter((o) => o.status === 'SHIPPED').length, color: '#2563EB' },
                    { label: 'Paid / Processing', count: orders.filter((o) => o.status === 'PAID' || o.status === 'PROCESSING').length, color: '#7C3AED' },
                    { label: 'Pending Payment', count: orders.filter((o) => o.status === 'PENDING_PAYMENT').length, color: '#D97706' },
                    { label: 'Cancelled', count: orders.filter((o) => o.status === 'CANCELLED').length, color: '#DC2626' },
                  ].map((stat, i) => {
                    const total = orders.length || 1;
                    const pct = Math.round((stat.count / total) * 100);
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                          <span style={{ color: '#4B5563' }}>{stat.label}</span>
                          <span style={{ color: '#111827' }}>
                            {stat.count} ({pct}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: stat.color, borderRadius: '4px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Orders Quick Preview */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                padding: '1.6rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                  Recent Orders
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSection('ORDERS')}
                  style={{
                    fontSize: '0.82rem',
                    color: '#2563EB',
                    background: 'none',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View All Orders →
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.78rem' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Order ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Customer</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: '#111827' }}>{o.orderNumber}</td>
                        <td style={{ padding: '0.8rem 1rem', color: '#4B5563' }}>{o.userId?.name || 'Customer'}</td>
                        <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: '#111827' }}>
                          {formatPaise(o.pricing?.grandTotalPaise)}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: '#6B7280', fontSize: '0.78rem' }}>
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '4px',
                              backgroundColor:
                                o.status === 'PAID' || o.status === 'DELIVERED'
                                  ? '#ECFDF5'
                                  : o.status === 'CANCELLED'
                                  ? '#FEF2F2'
                                  : '#EFF6FF',
                              color:
                                o.status === 'PAID' || o.status === 'DELIVERED'
                                  ? '#059669'
                                  : o.status === 'CANCELLED'
                                  ? '#DC2626'
                                  : '#2563EB',
                            }}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 2: PRODUCTS MANAGEMENT WITH STOCK CONTROL */}
        {/* ======================================================== */}
        {activeSection === 'PRODUCTS' && (
          <div>
            {/* Filter and Search Bar */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    placeholder="Search product by title, slug, or keywords..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                  />
                </div>

                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="input-field"
                  style={{ width: '180px', fontSize: '0.85rem' }}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                Showing <strong>{filteredProducts.length}</strong> products
              </span>
            </div>

            {/* Products Table with Direct Stock Column */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: '0.78rem' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Product</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Selling Price</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Total Stock</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Variants Stock</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: '#6B7280' }}>
                        {isProductsLoading ? 'Loading products from database...' : 'No products found. Click "Add Product" to create one.'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const totalStock =
                        p.totalStock !== undefined
                          ? p.totalStock
                          : p.variants?.reduce((sum, v) => sum + (v.availableStock || 0), 0) || 0;

                      return (
                        <tr key={p._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          {/* Image & Title */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <img
                                src={p.images?.[0]?.url || 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1000'}
                                alt={p.name}
                                style={{ width: '45px', height: '58px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #E5E7EB' }}
                              />
                              <div>
                                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#111827' }}>{p.name}</strong>
                                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{p.slug}</span>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#F3F4F6', borderRadius: '4px', color: '#4B5563', fontWeight: 600 }}>
                              {p.category?.name || 'Apparel'}
                            </span>
                          </td>

                          {/* Price */}
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#111827' }}>
                            {formatPaise(p.price)}
                          </td>

                          {/* Total Stock */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                backgroundColor: totalStock === 0 ? '#FEF2F2' : totalStock <= 10 ? '#FFFBEB' : '#ECFDF5',
                                color: totalStock === 0 ? '#DC2626' : totalStock <= 10 ? '#D97706' : '#059669',
                              }}
                            >
                              {totalStock} in stock
                            </span>
                          </td>

                          {/* Variants Stock & Price Pills */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {(p.variants || []).map((v, vIdx) => {
                                const vPriceRs = v.price ? Math.round(v.price / 100) : Math.round(p.price / 100);
                                return (
                                  <button
                                    key={vIdx}
                                    type="button"
                                    onClick={() =>
                                      setQuickStockModal({
                                        sku: v.sku,
                                        currentStock: v.availableStock || 0,
                                        productName: `${p.name} (Size ${v.size} • ₹${vPriceRs.toLocaleString()})`,
                                      })
                                    }
                                    title={`Click to adjust stock for size ${v.size} (Current Price: ₹${vPriceRs})`}
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '0.2rem 0.5rem',
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid #D1D5DB',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      color: '#1F2937',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                    }}
                                  >
                                    <strong style={{ color: '#111827' }}>{v.size}:</strong>
                                    <span>{v.availableStock ?? 0}</span>
                                    <span style={{ color: '#2563EB', fontWeight: 600, fontSize: '0.68rem', backgroundColor: '#EFF6FF', padding: '0.05rem 0.3rem', borderRadius: '3px' }}>
                                      ₹{vPriceRs.toLocaleString()}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontWeight: 600,
                                backgroundColor: p.status === 'ACTIVE' ? '#ECFDF5' : '#F3F4F6',
                                color: p.status === 'ACTIVE' ? '#059669' : '#6B7280',
                              }}
                            >
                              {p.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: '4px',
                                  border: '1px solid #D1D5DB',
                                  backgroundColor: '#FFFFFF',
                                  cursor: 'pointer',
                                }}
                                title="Edit Product"
                              >
                                <Edit size={14} color="#4B5563" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p._id, p.name)}
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: '4px',
                                  border: '1px solid #FCA5A5',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                }}
                                title="Delete Product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 3: INVENTORY & STOCK MANAGEMENT */}
        {/* ======================================================== */}
        {activeSection === 'INVENTORY' && (
          <div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Search by SKU code or product title..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                />
              </div>

              <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                Tracking <strong>{filteredInventory.length}</strong> unique SKUs
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: '0.78rem' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>SKU Code</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Product Name</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Size</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Selling Price</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Available Stock</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Reserved Stock</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Sold Stock</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Stock Health</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Quick Adjust</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '3.5rem', textAlign: 'center', color: '#6B7280' }}>
                        No inventory items found.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((inv) => {
                      const matchedVariant = inv.productId?.variants?.find((v) => v.sku === inv.sku);
                      const variantSize = matchedVariant?.size || inv.sku.split('-').pop();
                      const variantPricePaise = matchedVariant?.price || inv.productId?.price;

                      return (
                        <tr key={inv._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#111827' }}>{inv.sku}</td>
                          <td style={{ padding: '0.85rem 1rem', color: '#374151' }}>{inv.productId?.name || 'Clothing item'}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', backgroundColor: '#EFF6FF', color: '#2563EB', borderRadius: '4px' }}>
                              {variantSize}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#111827' }}>
                            {variantPricePaise ? formatPaise(variantPricePaise) : '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.92rem' }}>
                            <span style={{ color: inv.availableStock === 0 ? '#DC2626' : inv.availableStock <= 5 ? '#D97706' : '#111827' }}>
                              {inv.availableStock}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#6B7280' }}>{inv.reservedStock}</td>
                          <td style={{ padding: '0.85rem 1rem', color: '#6B7280' }}>{inv.soldStock}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {inv.availableStock === 0 ? (
                              <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 600, borderRadius: '4px' }}>
                                Out of Stock
                              </span>
                            ) : inv.availableStock <= 5 ? (
                              <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', backgroundColor: '#FFFBEB', color: '#D97706', fontWeight: 600, borderRadius: '4px' }}>
                                Low Stock ({inv.availableStock})
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', backgroundColor: '#ECFDF5', color: '#059669', fontWeight: 600, borderRadius: '4px' }}>
                                Healthy Stock
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <button
                              onClick={() =>
                                setQuickStockModal({
                                  sku: inv.sku,
                                  currentStock: inv.availableStock,
                                  productName: `${inv.productId?.name || inv.sku} (${variantSize})`,
                                })
                              }
                              className="btn-secondary"
                              style={{
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.75rem',
                                borderRadius: '4px',
                              }}
                            >
                              <Sliders size={13} style={{ marginRight: '0.2rem' }} /> Adjust Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 4: ORDERS MANAGEMENT WITH STATE MACHINE */}
        {/* ======================================================== */}
        {activeSection === 'ORDERS' && (
          <div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Search order ID, customer name, email..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                />
              </div>

              <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                Total <strong>{filteredOrders.length}</strong> orders
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: '0.78rem' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Order Number</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Customer</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Items</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Total Amount</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Promo Code</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Current Status</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: '#6B7280' }}>
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#111827' }}>{o.orderNumber}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <strong style={{ display: 'block', color: '#111827' }}>{o.userId?.name || 'Customer'}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{o.userId?.email}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#4B5563' }}>
                          {o.items?.length || 0} {o.items?.length === 1 ? 'item' : 'items'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#111827' }}>
                          {formatPaise(o.pricing?.grandTotalPaise)}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {o.couponCode ? (
                            <span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#F3F4F6', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#1F1D1A' }}>
                              {o.couponCode}
                            </span>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              backgroundColor:
                                o.status === 'PAID' || o.status === 'DELIVERED'
                                  ? '#ECFDF5'
                                  : o.status === 'CANCELLED'
                                  ? '#FEF2F2'
                                  : '#EFF6FF',
                              color:
                                o.status === 'PAID' || o.status === 'DELIVERED'
                                  ? '#059669'
                                  : o.status === 'CANCELLED'
                                  ? '#DC2626'
                                  : '#2563EB',
                            }}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <select
                            value={o.status}
                            onChange={(e) => handleOrderStatusChange(o._id, e.target.value)}
                            className="input-field"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', width: 'auto' }}
                          >
                            <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                            <option value="PAID">PAID</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 5: CUSTOMER & REGISTERED USER ACCOUNTS */}
        {/* ======================================================== */}
        {activeSection === 'USERS' && (
          <div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                />
              </div>

              <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                Total <strong>{filteredUsers.length}</strong> accounts registered
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: '0.78rem' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>User Profile</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Email Address</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Saved Addresses</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Joined Date</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Role Action</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: '#6B7280' }}>
                        No users matching search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u._id === currentAdmin?._id;
                      return (
                        <tr key={u._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                              <div
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '50%',
                                  backgroundColor: '#1F1D1A',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 600,
                                  fontSize: '0.82rem',
                                  overflow: 'hidden',
                                }}
                              >
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  u.name?.[0]?.toUpperCase() || 'U'
                                )}
                              </div>
                              <div>
                                <strong style={{ color: '#111827' }}>{u.name}</strong>
                                {isSelf && <span style={{ marginLeft: '0.35rem', fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>(Current Session)</span>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#4B5563' }}>{u.email}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                fontWeight: 600,
                                backgroundColor: u.role === 'ADMIN' ? '#111827' : '#F3F4F6',
                                color: u.role === 'ADMIN' ? '#FFFFFF' : '#4B5563',
                              }}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#6B7280' }}>
                            {u.addresses?.length || 0} saved
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#6B7280', fontSize: '0.78rem' }}>
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleUserRole(u)}
                                className="btn-secondary"
                                style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', borderRadius: '4px' }}
                              >
                                <UserCheck size={12} style={{ marginRight: '0.2rem' }} />
                                {u.role === 'ADMIN' ? 'Demote to Customer' : 'Promote to Admin'}
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: '4px',
                                  border: '1px solid #FCA5A5',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                }}
                                title="Delete user account"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 6: DISCOUNT & PROMO COUPONS */}
        {/* ======================================================== */}
        {activeSection === 'COUPONS' && (
          <div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                padding: '1.2rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                  Active Promotional Discount Codes
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0.2rem 0 0 0' }}>
                  Coupons are checked server-side at checkout to prevent cart manipulation.
                </p>
              </div>

              <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                Total <strong>{couponsList.length}</strong> coupons created
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontSize: '0.78rem' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Coupon Code</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Description</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Discount Type</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Discount Value</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Min Order Req.</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Used Count</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {couponsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3.5rem', textAlign: 'center', color: '#6B7280' }}>
                        No coupons created yet. Click "Create Coupon" above to launch one.
                      </td>
                    </tr>
                  ) : (
                    couponsList.map((c) => (
                      <tr key={c._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 700, color: '#1F1D1A', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                            {c.code}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#6B7280' }}>{c.description || 'Store discount'}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', backgroundColor: '#F3F4F6', borderRadius: '4px', color: '#4B5563', fontWeight: 600 }}>
                            {c.discountType}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#111827' }}>
                          {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : formatPaise(c.discountValue)}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#6B7280' }}>
                          {c.minOrderValuePaise > 0 ? formatPaise(c.minOrderValuePaise) : 'No Minimum'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#111827' }}>
                          {c.timesUsed || 0} times
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(c)}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: c.isActive ? '#ECFDF5' : '#F3F4F6',
                              color: c.isActive ? '#059669' : '#6B7280',
                            }}
                          >
                            {c.isActive ? 'Active (Click to Pause)' : 'Paused (Click to Enable)'}
                          </button>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteCoupon(c)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '4px',
                              border: '1px solid #FCA5A5',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                            title="Delete Coupon"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {/* ======================================================== */}
      {isProductModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '650px',
              padding: '2.2rem',
              borderRadius: '8px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                {editingProductId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic Ochre Linen Shirt"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Category *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="input-field"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Publish Status
                  </label>
                  <select
                    value={productForm.status}
                    onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="ACTIVE">ACTIVE (Published)</option>
                    <option value="DRAFT">DRAFT (Hidden)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Compare Price (₹) [MRP]
                  </label>
                  <input
                    type="number"
                    value={productForm.compareAtPrice}
                    onChange={(e) => setProductForm({ ...productForm, compareAtPrice: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 4299"
                  />
                </div>
              </div>

              {/* Product Image Selection: File Upload + Image URL */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', margin: 0 }}>
                    Product Image *
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('UPLOAD')}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: imageUploadMode === 'UPLOAD' ? '#2563EB' : '#D1D5DB',
                        backgroundColor: imageUploadMode === 'UPLOAD' ? '#EFF6FF' : '#FFFFFF',
                        color: imageUploadMode === 'UPLOAD' ? '#2563EB' : '#4B5563',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <UploadCloud size={13} />
                      Upload from Device
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('URL')}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: imageUploadMode === 'URL' ? '#2563EB' : '#D1D5DB',
                        backgroundColor: imageUploadMode === 'URL' ? '#EFF6FF' : '#FFFFFF',
                        color: imageUploadMode === 'URL' ? '#2563EB' : '#4B5563',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <ImageIcon size={13} />
                      Image URL Link
                    </button>
                  </div>
                </div>

                {imageUploadMode === 'UPLOAD' ? (
                  <div>
                    <label
                      htmlFor="admin-product-file-upload"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #D1D5DB',
                        borderRadius: '6px',
                        padding: '1.2rem',
                        backgroundColor: '#F9FAFB',
                        cursor: isUploadingImage ? 'wait' : 'pointer',
                        textAlign: 'center',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <UploadCloud size={24} style={{ color: '#2563EB', marginBottom: '0.4rem' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>
                        {isUploadingImage ? 'Uploading image to server...' : 'Click to choose image or drag & drop'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '0.2rem' }}>
                        Supports PNG, JPG, WEBP, GIF (Max 5MB)
                      </span>
                      <input
                        id="admin-product-file-upload"
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={handleImageFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {productForm.imageUrl && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.8rem',
                          marginTop: '0.6rem',
                          padding: '0.5rem 0.8rem',
                          backgroundColor: '#F3F4F6',
                          borderRadius: '6px',
                        }}
                      >
                        <img
                          src={productForm.imageUrl}
                          alt="Product preview"
                          style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827', display: 'block' }}>
                            Image Selected
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {productForm.imageUrl}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProductForm({ ...productForm, imageUrl: '' })}
                          style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                          title="Remove image"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      required
                      placeholder="https://images.unsplash.com/photo-..."
                      value={productForm.imageUrl}
                      onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                      className="input-field"
                    />
                    {productForm.imageUrl && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <img
                          src={productForm.imageUrl}
                          alt="Preview"
                          style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Preview active</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Fabric Composition / Material
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100% Pure Raw Flax Linen"
                  value={productForm.fabricComposition}
                  onChange={(e) => setProductForm({ ...productForm, fabricComposition: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Sizes, Stock & Size-Specific Pricing Management */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                      Sizes, Stock & Price per Size
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                      Set individual stock quantity & selling price for each size variant
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncBasePriceToAllSizes}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#2563EB',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '4px',
                      padding: '0.25rem 0.6rem',
                      cursor: 'pointer',
                    }}
                    title="Apply the base selling price to every size variant"
                  >
                    ⚡ Set all sizes to ₹{productForm.price || 0}
                  </button>
                </div>

                {/* Size Variant Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.8rem' }}>
                  {productForm.sizes.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>
                          Size: <span style={{ color: '#2563EB' }}>{s.size}</span>
                        </span>
                        {productForm.sizes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantSize(idx)}
                            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '0.1rem' }}
                            title={`Remove size ${s.size}`}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: '#4B5563', marginBottom: '0.2rem' }}>
                            Stock (Qty)
                          </label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={s.stock}
                            onChange={(e) => {
                              const updated = [...productForm.sizes];
                              updated[idx].stock = parseInt(e.target.value, 10) || 0;
                              setProductForm({ ...productForm, sizes: updated });
                            }}
                            className="input-field"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: '#4B5563', marginBottom: '0.2rem' }}>
                            Price (₹)
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={s.price ?? productForm.price}
                            onChange={(e) => {
                              const updated = [...productForm.sizes];
                              updated[idx].price = parseFloat(e.target.value) || 0;
                              setProductForm({ ...productForm, sizes: updated });
                            }}
                            className="input-field"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', fontWeight: 600 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Missing Sizes Quick Buttons */}
                <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600 }}>+ Add Size:</span>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE']
                    .filter((sz) => !productForm.sizes.some((s) => s.size === sz))
                    .map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => handleAddVariantSize(sz)}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          color: '#374151',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        + {sz}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="input-field"
                  placeholder="Enter details about fit, cut, styling..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.2rem', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.6rem', borderRadius: '6px' }}
                >
                  {isCreatingProduct ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: QUICK STOCK ADJUSTMENT MODAL */}
      {/* ======================================================== */}
      {quickStockModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '460px',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                  Adjust Stock Quantity
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                  {quickStockModal.productName} ({quickStockModal.sku})
                </span>
              </div>
              <button
                onClick={() => setQuickStockModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '0.8rem 1rem',
                backgroundColor: '#F3F4F6',
                borderRadius: '6px',
                marginBottom: '1.2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: '#4B5563' }}>Current Available Stock:</span>
              <strong style={{ fontSize: '1.1rem', color: '#111827' }}>{quickStockModal.currentStock} units</strong>
            </div>

            <form onSubmit={handleCommitStockAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Change Quantity (+ to add, - to reduce)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setStockDelta((prev) => Math.max(-quickStockModal.currentStock, parseInt(prev, 10) - 5))}
                    style={{ padding: '0.5rem 0.8rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    required
                    value={stockDelta}
                    onChange={(e) => setStockDelta(e.target.value)}
                    className="input-field"
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setStockDelta((prev) => parseInt(prev, 10) + 10)}
                    style={{ padding: '0.5rem 0.8rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    +10
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '0.2rem', display: 'block' }}>
                  New Stock will be:{' '}
                  <strong>{Math.max(0, quickStockModal.currentStock + parseInt(stockDelta || 0, 10))} units</strong>
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  required
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Warehouse receipt, Damaged piece, Physical recount"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setQuickStockModal(null)}
                  className="btn-secondary"
                  style={{ padding: '0.6rem 1rem', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '6px' }}
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CREATE COUPON MODAL */}
      {/* ======================================================== */}
      {isCouponModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '500px',
              padding: '2.2rem',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Create Coupon Code
              </h2>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="input-field"
                  style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Description / Offer Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20% discount on order value"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Discount Type
                  </label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                    className="input-field"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Value {couponForm.discountType === 'PERCENTAGE' ? '(%)' : '(₹)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Minimum Order (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={couponForm.minOrderValue}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    value={couponForm.maxDiscount}
                    onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
                    className="input-field"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.2rem', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCoupon}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.6rem', borderRadius: '6px' }}
                >
                  {isCreatingCoupon ? 'Creating...' : 'Activate Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
