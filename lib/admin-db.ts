// SQLite database for admin functionality
// Migrated from JSON file persistence to proper SQLite database (like Leafwater V1.2)

import { sqliteDb } from './sqlite-db';

// Re-export types from sqlite-db
export type { Order, OrderItem, VendingSlot, ProductOverride, DispenseHistoryEntry } from './sqlite-db';

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
  setSlotQuantity: sqliteDb.setSlotQuantity.bind(sqliteDb),
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
  getUsersCount: sqliteDb.getUsersCount.bind(sqliteDb),
  getScansCount: sqliteDb.getScansCount.bind(sqliteDb),
  getDashboardStats: sqliteDb.getDashboardStats.bind(sqliteDb),

  // Dispense history tracking
  logDispenseEvent: sqliteDb.logDispenseEvent.bind(sqliteDb),
  getDispenseHistory: sqliteDb.getDispenseHistory.bind(sqliteDb),
  getDispenseHistoryForSlot: sqliteDb.getDispenseHistoryForSlot.bind(sqliteDb),
  getDispenseStats: sqliteDb.getDispenseStats.bind(sqliteDb),

  // Product quantity utilities
  getTotalQuantityForProduct: sqliteDb.getTotalQuantityForProduct.bind(sqliteDb),

  // Users
  saveUser: sqliteDb.saveUser.bind(sqliteDb),
  getUser: sqliteDb.getUser.bind(sqliteDb),

  // Admin users
  createAdminUser: sqliteDb.createAdminUser.bind(sqliteDb),
  verifyAdminCredentials: sqliteDb.verifyAdminCredentials.bind(sqliteDb),

  // App settings
  getSetting: sqliteDb.getSetting.bind(sqliteDb),
  setSetting: sqliteDb.setSetting.bind(sqliteDb),
  getRazorpayMode: sqliteDb.getRazorpayMode.bind(sqliteDb),
  setRazorpayMode: sqliteDb.setRazorpayMode.bind(sqliteDb),

  // Cart
  getCart: sqliteDb.getCart.bind(sqliteDb),
  addToCart: sqliteDb.addToCart.bind(sqliteDb),
  removeFromCart: sqliteDb.removeFromCart.bind(sqliteDb),
  clearCart: sqliteDb.clearCart.bind(sqliteDb),

  // Scan records
  saveScanRecord: sqliteDb.saveScanRecord.bind(sqliteDb),
  getScanRecord: sqliteDb.getScanRecord.bind(sqliteDb),

  // Transactions
  createTransaction: sqliteDb.createTransaction.bind(sqliteDb),
  updateTransactionStatus: sqliteDb.updateTransactionStatus.bind(sqliteDb),

  // Local products
  upsertProduct: sqliteDb.upsertProduct.bind(sqliteDb),
  getProductByExternalId: sqliteDb.getProductByExternalId.bind(sqliteDb),
  getAllLocalProducts: sqliteDb.getAllLocalProducts.bind(sqliteDb),

  // POSIFLY data (read-only access for POSIFLY + save on payment)
  savePosiflyBill: sqliteDb.savePosiflyBill.bind(sqliteDb),
  getPosiflyBills: sqliteDb.getPosiflyBills.bind(sqliteDb),
  getPosiflyBillByNumber: sqliteDb.getPosiflyBillByNumber.bind(sqliteDb),
  getPosiflyItemsByBill: sqliteDb.getPosiflyItemsByBill.bind(sqliteDb),
  getPosiflyPaymentByBill: sqliteDb.getPosiflyPaymentByBill.bind(sqliteDb),
  getPosiflyChargesByBill: sqliteDb.getPosiflyChargesByBill.bind(sqliteDb),
  getPosiflyFullBill: sqliteDb.getPosiflyFullBill.bind(sqliteDb),
  getAllPosiflyData: sqliteDb.getAllPosiflyData.bind(sqliteDb),
};
