// SQLite database for admin functionality
// Migrated from JSON file persistence to proper SQLite database (like Leafwater V1.2)

import { sqliteDb } from './sqlite-db';

// Re-export types from sqlite-db
export type { Order, OrderItem, VendingSlot, ProductOverride } from './sqlite-db';

// Product interface for local products list
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

// Database functions - now using SQLite
// Products are fetched from external API, not stored locally
export const adminDb = {
  // Products - these functions are deprecated, products come from external API
  // Kept for backward compatibility but return empty arrays
  getAllProducts(): Product[] {
    console.warn('[adminDb] getAllProducts is deprecated - products come from external API');
    return [];
  },

  getProduct(id: number): Product | undefined {
    console.warn('[adminDb] getProduct is deprecated - products come from external API');
    return undefined;
  },

  updateProduct(id: number, updates: Partial<Product>): Product | undefined {
    console.warn('[adminDb] updateProduct is deprecated - products come from external API');
    return undefined;
  },

  // Product Overrides - now using SQLite
  setProductOverride: sqliteDb.setProductOverride.bind(sqliteDb),
  getProductOverride: sqliteDb.getProductOverride.bind(sqliteDb),
  getAllProductOverrides: sqliteDb.getAllProductOverrides.bind(sqliteDb),

  // Vending Slots - now using SQLite
  getAllSlots: sqliteDb.getAllSlots.bind(sqliteDb),
  getSlot: sqliteDb.getSlot.bind(sqliteDb),
  assignProductToSlot: sqliteDb.assignProductToSlot.bind(sqliteDb),
  updateSlotQuantity: sqliteDb.updateSlotQuantity.bind(sqliteDb),
  getSlotsForProduct: sqliteDb.getSlotsForProduct.bind(sqliteDb),

  // Sync product quantities (placeholder)
  syncProductQuantities: sqliteDb.syncProductQuantities.bind(sqliteDb),

  // Orders/Sales tracking - now using SQLite
  createOrder: sqliteDb.createOrder.bind(sqliteDb),
  getOrder: sqliteDb.getOrder.bind(sqliteDb),
  updateOrder: sqliteDb.updateOrder.bind(sqliteDb),
  updateOrderItemDispenseStatus: sqliteDb.updateOrderItemDispenseStatus.bind(sqliteDb),
  completeOrder: sqliteDb.completeOrder.bind(sqliteDb),
  getAllOrders: sqliteDb.getAllOrders.bind(sqliteDb),
  getOrdersByStatus: sqliteDb.getOrdersByStatus.bind(sqliteDb),
  getOrdersByDateRange: sqliteDb.getOrdersByDateRange.bind(sqliteDb),
  getSalesStats: sqliteDb.getSalesStats.bind(sqliteDb),
};
