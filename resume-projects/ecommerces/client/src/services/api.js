import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from '../store/slices/authSlice.js';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Avoid re-refresh loop if the failing request was itself /auth/refresh or /auth/login
    const isAuthRoute =
      typeof args === 'string'
        ? args.includes('/auth/')
        : args?.url?.includes('/auth/');

    if (!isAuthRoute) {
      const refreshResult = await rawBaseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
        },
        api,
        extraOptions
      );

      if (refreshResult.data?.data?.accessToken) {
        const { accessToken, user } = refreshResult.data.data;
        api.dispatch(
          setCredentials({
            accessToken,
            user: user || api.getState().auth.user,
          })
        );
        // Retry original request with refreshed token
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        // Refresh token failed or expired
        api.dispatch(logout());
      }
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Category', 'Cart', 'Order', 'Inventory', 'AdminMetrics', 'User', 'Coupon'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Cart', 'User'],
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Cart', 'User'],
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Cart', 'User'],
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    verifyEmail: builder.mutation({
      query: (token) => ({
        url: `/auth/verify-email?token=${encodeURIComponent(token)}`,
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    resendVerification: builder.mutation({
      query: () => ({
        url: '/auth/resend-verification',
        method: 'POST',
      }),
    }),
    forgotPassword: builder.mutation({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),
    getProfile: builder.query({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({
        url: '/users/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    changePassword: builder.mutation({
      query: (body) => ({
        url: '/users/change-password',
        method: 'POST',
        body,
      }),
    }),
    addUserAddress: builder.mutation({
      query: (body) => ({
        url: '/users/addresses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    // Category endpoints
    getCategories: builder.query({
      query: () => '/categories',
      providesTags: ['Category'],
    }),

    // Product endpoints
    getProducts: builder.query({
      query: (params) => ({
        url: '/products',
        params,
      }),
      providesTags: ['Product'],
    }),
    getProductBySlug: builder.query({
      query: (slug) => `/products/slug/${slug}`,
      providesTags: (result, error, slug) => [{ type: 'Product', id: slug }],
    }),

    // Cart endpoints
    getCart: builder.query({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation({
      query: (body) => ({
        url: '/cart/items',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation({
      query: (body) => ({
        url: '/cart/items',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    removeCartItem: builder.mutation({
      query: (sku) => ({
        url: `/cart/items/${sku}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    // Orders & Checkout
    checkout: builder.mutation({
      query: (body) => ({
        url: '/orders/checkout',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart', 'Order', 'Product'],
    }),
    getMyOrders: builder.query({
      query: (params) => ({
        url: '/orders/my-orders',
        params,
      }),
      providesTags: ['Order'],
    }),
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),
    cancelOrder: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/orders/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Order', 'Product'],
    }),

    // Payments
    createPaymentSession: builder.mutation({
      query: (orderId) => ({
        url: '/payments/create-session',
        method: 'POST',
        body: { orderId },
      }),
    }),
    verifyPayment: builder.mutation({
      query: (payload) => ({
        url: '/payments/verify',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Order', 'Cart'],
    }),
    confirmCodPayment: builder.mutation({
      query: (payload) => ({
        url: '/payments/cod-confirm',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Order', 'Cart'],
    }),

    // Admin endpoints
    getAdminMetrics: builder.query({
      query: () => '/admin/metrics',
      providesTags: ['AdminMetrics'],
    }),
    getAdminOrders: builder.query({
      query: (params) => ({
        url: '/orders/admin/all',
        params,
      }),
      providesTags: ['Order'],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ id, status, reason }) => ({
        url: `/orders/admin/${id}/status`,
        method: 'PATCH',
        body: { status, reason },
      }),
      invalidatesTags: ['Order', 'AdminMetrics', 'Product'],
    }),
    getLowStockInventory: builder.query({
      query: () => '/inventory/low-stock',
      providesTags: ['Inventory'],
    }),
    getAllInventory: builder.query({
      query: (params) => ({
        url: '/inventory',
        params,
      }),
      providesTags: ['Inventory'],
    }),
    adjustInventoryStock: builder.mutation({
      query: (body) => ({
        url: '/inventory/adjust',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Inventory', 'Product'],
    }),

    // Admin Product Management
    createProduct: builder.mutation({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product', 'AdminMetrics', 'Inventory'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/products/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Product', 'Inventory'],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product', 'AdminMetrics', 'Inventory'],
    }),

    // Admin User Management
    getAdminUsers: builder.query({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: ['User'],
    }),
    updateUserRole: builder.mutation({
      query: ({ id, role }) => ({
        url: `/users/${id}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: ['User', 'AdminMetrics'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User', 'AdminMetrics'],
    }),

    // Coupons
    validateCoupon: builder.mutation({
      query: (body) => ({
        url: '/coupons/validate',
        method: 'POST',
        body,
      }),
    }),
    getCoupons: builder.query({
      query: () => '/coupons',
      providesTags: ['Coupon'],
    }),
    createCoupon: builder.mutation({
      query: (body) => ({
        url: '/coupons',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Coupon', 'AdminMetrics'],
    }),
    toggleCouponStatus: builder.mutation({
      query: (id) => ({
        url: `/coupons/${id}/toggle`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Coupon'],
    }),
    deleteCoupon: builder.mutation({
      query: (id) => ({
        url: `/coupons/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Coupon', 'AdminMetrics'],
    }),
    uploadImage: builder.mutation({
      query: (data) => ({
        url: '/upload',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useAddUserAddressMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetCategoriesQuery,
  useGetProductsQuery,
  useGetProductBySlugQuery,
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useCheckoutMutation,
  useGetMyOrdersQuery,
  useGetOrderByIdQuery,
  useCancelOrderMutation,
  useCreatePaymentSessionMutation,
  useVerifyPaymentMutation,
  useConfirmCodPaymentMutation,
  useGetAdminMetricsQuery,
  useGetAdminOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetLowStockInventoryQuery,
  useGetAllInventoryQuery,
  useAdjustInventoryStockMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetAdminUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useValidateCouponMutation,
  useGetCouponsQuery,
  useCreateCouponMutation,
  useToggleCouponStatusMutation,
  useDeleteCouponMutation,
  useUploadImageMutation,
} = api;
