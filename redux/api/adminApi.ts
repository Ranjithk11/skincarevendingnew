import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Product {
  id: number;
  name: string;
  description?: string;
  retail_price: number;
  category?: string;
  image_url?: string;
  quantity: number;
  in_stock: boolean;
}

export interface VendingSlot {
  slot_id: number;
  product_id?: number;
  quantity: number;
  product_name?: string;
  category?: string;
  retail_price?: number;
  last_updated?: string;
}

export interface SlotInfo {
  slot_id: number;
  quantity: number;
  product_id?: number;
  product_name?: string;
  category?: string;
  retail_price?: number;
  image_url?: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  user?: {
    username: string;
  };
}

export interface AssignProductRequest {
  slotId: number;
  productId?: number | null;
  quantity?: number;
}

export interface UpdateSlotQuantityRequest {
  slotId: number;
  changeAmount: number;
}

export interface SyncResponse {
  success: boolean;
  message: string;
}

export interface MotorControlRequest {
  command: string;
}

export interface MotorControlResponse {
  success: boolean;
  message: string;
  response?: string;
}

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/admin",
    credentials: "include",
  }),
  tagTypes: ["Slots", "Products", "SlotInfo"],
  endpoints: (builder) => ({
    // Admin Login
    adminLogin: builder.mutation<AdminLoginResponse, AdminLoginRequest>({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
    }),

    // Get all vending slots
    getVendingSlots: builder.query<Record<number, VendingSlot>, void>({
      query: () => "/slots",
      providesTags: ["Slots"],
    }),

    // Get slot info by ID
    getSlotInfo: builder.query<SlotInfo, number>({
      query: (slotId) => `/slots/${slotId}`,
      providesTags: (_result, _error, slotId) => [{ type: "SlotInfo", id: slotId }],
    }),

    // Assign product to slot
    assignProductToSlot: builder.mutation<SyncResponse, AssignProductRequest>({
      query: ({ slotId, productId, quantity = 0 }) => ({
        url: "/slots",
        method: "POST",
        body: { slot_id: slotId, product_id: productId, quantity },
      }),
      invalidatesTags: ["Slots", "Products"],
    }),

    // Update slot quantity
    updateSlotQuantity: builder.mutation<SyncResponse, UpdateSlotQuantityRequest>({
      query: ({ slotId, changeAmount }) => ({
        url: `/slots/${slotId}`,
        method: "PATCH",
        body: { change_amount: changeAmount },
      }),
      invalidatesTags: (_result, _error, { slotId }) => [
        "Slots",
        { type: "SlotInfo", id: slotId },
      ],
    }),

    // Get all products
    getProducts: builder.query<Product[], void>({
      query: () => "/products",
      providesTags: ["Products"],
    }),

    // Sync product quantities
    syncProductQuantities: builder.mutation<SyncResponse, void>({
      query: () => ({
        url: "/sync",
        method: "POST",
      }),
      invalidatesTags: ["Slots", "Products"],
    }),

    // Motor control
    motorControl: builder.mutation<MotorControlResponse, MotorControlRequest>({
      query: (body) => ({
        url: "/motor",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useAdminLoginMutation,
  useGetVendingSlotsQuery,
  useLazyGetVendingSlotsQuery,
  useGetSlotInfoQuery,
  useLazyGetSlotInfoQuery,
  useAssignProductToSlotMutation,
  useUpdateSlotQuantityMutation,
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useSyncProductQuantitiesMutation,
  useMotorControlMutation,
} = adminApi;
