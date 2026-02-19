// SQLite database for admin functionality
// Similar to Leafwater V1.2's database.py

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// Database file location
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'vending.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database connection
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL'); // Better performance for concurrent reads

// Initialize database tables
function initDb() {
  // Orders table - main sales records
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      total_amount REAL NOT NULL,
      payment_id TEXT,
      razorpay_order_id TEXT,
      status TEXT DEFAULT 'pending',
      payment_mode TEXT DEFAULT 'test',
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  // Dispense history table - tracks every dispense event
  db.exec(`
    CREATE TABLE IF NOT EXISTS dispense_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT,
      order_item_id INTEGER,
      product_id TEXT NOT NULL,
      product_name TEXT,
      slot_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      success INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // Order items table - individual items in each order
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      price REAL NOT NULL,
      slot_id INTEGER,
      dispensed INTEGER DEFAULT 0,
      dispense_error TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // Vending slots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vending_slots (
      slot_id INTEGER PRIMARY KEY,
      product_id TEXT,
      product_name TEXT,
      category TEXT,
      retail_price REAL,
      quantity INTEGER DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now'))
    )
  `);

  // Product overrides table
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_overrides (
      id TEXT PRIMARY KEY,
      name TEXT,
      category TEXT,
      retail_price REAL,
      quantity INTEGER,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Users table - user profiles
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Admin users table - admin login credentials
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // App settings table - app configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Insert default Razorpay mode setting
  db.exec(`
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value, description)
    VALUES ('razorpay_mode', 'test', 'Razorpay payment mode: test or live')
  `);

  // Products table - full product catalog (local cache)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      retail_price REAL NOT NULL,
      product_use TEXT,
      product_benefits TEXT,
      application TEXT,
      product_type TEXT,
      category TEXT,
      category_sort_order INTEGER,
      image_url TEXT,
      image_tag TEXT,
      in_stock INTEGER DEFAULT 1,
      quantity INTEGER DEFAULT 0,
      min_quantity INTEGER DEFAULT 5,
      skin_types TEXT,
      matching_attributes TEXT,
      matches TEXT,
      discount TEXT,
      shopify_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Cart items table - user shopping cart
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, product_id)
    )
  `);

  // Scan records table - skin analysis results
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      image_url TEXT,
      local_captured_image TEXT,
      skin_type TEXT,
      detected_attributes TEXT,
      detected_lip_attributes TEXT,
      analysis_ai_summary TEXT,
      lip_analysis_summary TEXT,
      diet_plan TEXT,
      captured_images TEXT,
      analysed_images TEXT,
      public_url TEXT,
      recommended_products TEXT,
      recommended_lip_products TEXT,
      recommended_salon_services TEXT,
      recommended_cosmetic_services TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Transactions table - payment transactions
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      product_id TEXT,
      amount REAL NOT NULL,
      payment_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Settings table - additional settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Initialize 60 vending slots if they don't exist
  const slotCount = db.prepare('SELECT COUNT(*) as count FROM vending_slots').get() as { count: number };
  if (slotCount.count === 0) {
    const insertSlot = db.prepare('INSERT INTO vending_slots (slot_id, quantity) VALUES (?, 0)');
    for (let i = 1; i <= 60; i++) {
      insertSlot.run(i);
    }
    console.log('Initialized 60 vending slots');
  }

  // Initialize default admin user if none exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number };
  if (adminCount.count === 0) {
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', 'admin123');
    console.log('Created default admin user: admin/admin123');
  }

  // Initialize default app settings if none exist
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM app_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    db.prepare(`INSERT INTO app_settings (setting_key, setting_value, description) VALUES 
      ('razorpay_mode', 'test', 'Razorpay payment mode: test or live'),
      ('machine_id', 'SKINCARE_VM_001', 'Vending machine identifier'),
      ('auto_dispense', 'true', 'Auto dispense after payment')
    `).run();
    console.log('Initialized default app settings');
  }

  console.log('SQLite database initialized:', DB_FILE);
}

// Initialize on module load
initDb();

// Types
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  slotId?: number;
  dispensed: boolean;
  dispenseError?: string;
}

export interface Order {
  id: string;
  userId?: string;
  items: OrderItem[];
  totalAmount: number;
  paymentId?: string;
  razorpayOrderId?: string;
  status: 'pending' | 'completed' | 'failed' | 'partial';
  paymentMode: 'test' | 'live';
  createdAt: string;
  completedAt?: string;
}

export interface VendingSlot {
  slot_id: number;
  product_id?: string;
  quantity: number;
  product_name?: string;
  category?: string;
  retail_price?: number;
  last_updated?: string;
}

export interface ProductOverride {
  id: string;
  name?: string;
  category?: string;
  retail_price?: number;
  quantity?: number;
  updated_at: string;
}

export interface DispenseHistoryEntry {
  id: number;
  orderId?: string;
  orderItemId?: number;
  productId: string;
  productName?: string;
  slotId: number;
  quantity: number;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

// Database operations
export const sqliteDb = {
  // ==================== ORDERS ====================
  
  createOrder(orderData: {
    userId?: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      slotId?: number;
    }>;
    totalAmount: number;
    paymentId?: string;
    razorpayOrderId?: string;
    paymentMode: 'test' | 'live';
  }): Order {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    // Insert order
    const insertOrder = db.prepare(`
      INSERT INTO orders (id, user_id, total_amount, payment_id, razorpay_order_id, status, payment_mode, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `);
    insertOrder.run(
      orderId,
      orderData.userId || null,
      orderData.totalAmount,
      orderData.paymentId || null,
      orderData.razorpayOrderId || null,
      orderData.paymentMode,
      createdAt
    );

    // Insert order items
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, price, slot_id, dispensed)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    for (const item of orderData.items) {
      insertItem.run(orderId, item.productId, item.productName, item.quantity, item.price, item.slotId || null);
    }

    console.log('[SQLite] Created order:', orderId);
    return this.getOrder(orderId)!;
  },

  getOrder(orderId: string): Order | undefined {
    const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!orderRow) return undefined;

    const itemRows = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as any[];

    return {
      id: orderRow.id,
      userId: orderRow.user_id,
      items: itemRows.map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        price: item.price,
        slotId: item.slot_id,
        dispensed: item.dispensed === 1,
        dispenseError: item.dispense_error,
      })),
      totalAmount: orderRow.total_amount,
      paymentId: orderRow.payment_id,
      razorpayOrderId: orderRow.razorpay_order_id,
      status: orderRow.status,
      paymentMode: orderRow.payment_mode,
      createdAt: orderRow.created_at,
      completedAt: orderRow.completed_at,
    };
  },

  updateOrder(orderId: string, updates: Partial<Order>): Order | undefined {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.paymentId !== undefined) {
      setClauses.push('payment_id = ?');
      values.push(updates.paymentId);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt);
    }

    if (setClauses.length === 0) return this.getOrder(orderId);

    values.push(orderId);
    db.prepare(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    return this.getOrder(orderId);
  },

  updateOrderItemDispenseStatus(
    orderId: string,
    productId: string,
    dispensed: boolean,
    dispenseError?: string,
    slotId?: number
  ): Order | undefined {
    // Get order item details for logging
    const orderItem = db.prepare(`
      SELECT id, product_name, slot_id, quantity FROM order_items 
      WHERE order_id = ? AND product_id = ?
    `).get(orderId, productId) as any;

    const effectiveSlotId = slotId || orderItem?.slot_id;

    // Update order item dispense status
    db.prepare(`
      UPDATE order_items 
      SET dispensed = ?, dispense_error = ?
      WHERE order_id = ? AND product_id = ?
    `).run(dispensed ? 1 : 0, dispenseError || null, orderId, productId);

    // Log dispense event to history
    if (orderItem) {
      this.logDispenseEvent({
        orderId,
        orderItemId: orderItem.id,
        productId,
        productName: orderItem.product_name,
        slotId: effectiveSlotId,
        quantity: orderItem.quantity || 1,
        success: dispensed,
        errorMessage: dispenseError,
      });
    }

    // Auto-decrement slot quantity on successful dispense
    if (dispensed && effectiveSlotId) {
      const quantityToDecrement = orderItem?.quantity || 1;
      this.updateSlotQuantity(effectiveSlotId, -quantityToDecrement);
      console.log(`[SQLite] Auto-decremented slot ${effectiveSlotId} by ${quantityToDecrement}`);
    }

    // Update order status based on items
    const items = db.prepare('SELECT dispensed, dispense_error FROM order_items WHERE order_id = ?').all(orderId) as any[];
    const allDispensed = items.every(item => item.dispensed === 1);
    const anyDispensed = items.some(item => item.dispensed === 1);
    const anyFailed = items.some(item => item.dispense_error);

    let newStatus: string;
    let completedAt: string | null = null;

    if (allDispensed) {
      newStatus = 'completed';
      completedAt = new Date().toISOString();
    } else if (anyFailed && anyDispensed) {
      newStatus = 'partial';
    } else if (anyFailed && !anyDispensed) {
      newStatus = 'failed';
    } else {
      newStatus = 'pending';
    }

    db.prepare('UPDATE orders SET status = ?, completed_at = ? WHERE id = ?').run(newStatus, completedAt, orderId);
    return this.getOrder(orderId);
  },

  completeOrder(orderId: string): Order | undefined {
    const completedAt = new Date().toISOString();
    db.prepare('UPDATE orders SET status = ?, completed_at = ? WHERE id = ?').run('completed', completedAt, orderId);
    return this.getOrder(orderId);
  },

  getAllOrders(limit?: number, offset?: number): { orders: Order[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }).count;

    let query = 'SELECT id FROM orders ORDER BY created_at DESC';
    if (limit !== undefined) {
      query += ` LIMIT ${limit}`;
      if (offset !== undefined) {
        query += ` OFFSET ${offset}`;
      }
    }

    const orderIds = db.prepare(query).all() as { id: string }[];
    const orders = orderIds.map(row => this.getOrder(row.id)!).filter(Boolean);

    return { orders, total };
  },

  getOrdersByStatus(status: Order['status']): Order[] {
    const orderIds = db.prepare('SELECT id FROM orders WHERE status = ? ORDER BY created_at DESC').all(status) as { id: string }[];
    return orderIds.map(row => this.getOrder(row.id)!).filter(Boolean);
  },

  getOrdersByDateRange(startDate: Date, endDate: Date): Order[] {
    const orderIds = db.prepare(`
      SELECT id FROM orders 
      WHERE created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
    `).all(startDate.toISOString(), endDate.toISOString()) as { id: string }[];
    return orderIds.map(row => this.getOrder(row.id)!).filter(Boolean);
  },

  getSalesStats(): {
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    todayOrders: number;
    todayRevenue: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status IN ('completed', 'partial') THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status IN ('completed', 'partial') THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status IN ('completed', 'partial') AND created_at >= ? THEN 1 ELSE 0 END) as today_orders,
        SUM(CASE WHEN status IN ('completed', 'partial') AND created_at >= ? THEN total_amount ELSE 0 END) as today_revenue
      FROM orders
    `).get(todayStr, todayStr) as any;

    return {
      totalOrders: stats.total_orders || 0,
      completedOrders: stats.completed_orders || 0,
      totalRevenue: stats.total_revenue || 0,
      todayOrders: stats.today_orders || 0,
      todayRevenue: stats.today_revenue || 0,
    };
  },

  getUsersCount(): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return result.count || 0;
  },

  getScansCount(): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM scan_records').get() as { count: number };
    return result.count || 0;
  },

  getDashboardStats(): {
    usersCount: number;
    scansCount: number;
    ordersCount: number;
    completedOrders: number;
    totalRevenue: number;
    todayOrders: number;
    todayRevenue: number;
    todayScans: number;
    slotsAssigned: number;
    totalSlots: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const usersCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count || 0;
    const scansCount = (db.prepare('SELECT COUNT(*) as count FROM scan_records').get() as any).count || 0;
    const todayScans = (db.prepare('SELECT COUNT(*) as count FROM scan_records WHERE created_at >= ?').get(todayStr) as any).count || 0;
    
    const orderStats = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status IN ('completed', 'partial') THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status IN ('completed', 'partial') THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today_orders,
        SUM(CASE WHEN status IN ('completed', 'partial') AND created_at >= ? THEN total_amount ELSE 0 END) as today_revenue
      FROM orders
    `).get(todayStr, todayStr) as any;

    const slotStats = db.prepare(`
      SELECT 
        COUNT(*) as total_slots,
        SUM(CASE WHEN product_id IS NOT NULL THEN 1 ELSE 0 END) as slots_assigned
      FROM vending_slots
    `).get() as any;

    return {
      usersCount,
      scansCount,
      ordersCount: orderStats.total_orders || 0,
      completedOrders: orderStats.completed_orders || 0,
      totalRevenue: orderStats.total_revenue || 0,
      todayOrders: orderStats.today_orders || 0,
      todayRevenue: orderStats.today_revenue || 0,
      todayScans,
      slotsAssigned: slotStats.slots_assigned || 0,
      totalSlots: slotStats.total_slots || 60,
    };
  },

  // ==================== VENDING SLOTS ====================

  getAllSlots(): Record<number, VendingSlot> {
    const rows = db.prepare('SELECT * FROM vending_slots ORDER BY slot_id').all() as any[];
    const result: Record<number, VendingSlot> = {};
    for (const row of rows) {
      result[row.slot_id] = {
        slot_id: row.slot_id,
        product_id: row.product_id,
        product_name: row.product_name,
        category: row.category,
        retail_price: row.retail_price,
        quantity: row.quantity,
        last_updated: row.last_updated,
      };
    }
    return result;
  },

  getSlot(slotId: number): VendingSlot | undefined {
    const row = db.prepare('SELECT * FROM vending_slots WHERE slot_id = ?').get(slotId) as any;
    if (!row) return undefined;
    return {
      slot_id: row.slot_id,
      product_id: row.product_id,
      product_name: row.product_name,
      category: row.category,
      retail_price: row.retail_price,
      quantity: row.quantity,
      last_updated: row.last_updated,
    };
  },

  assignProductToSlot(
    slotId: number,
    productId: string | number | null,
    quantity: number = 0,
    productInfo?: { name?: string; category?: string; retail_price?: number }
  ): VendingSlot | undefined {
    const lastUpdated = new Date().toISOString();

    if (productId === null) {
      // Clear the slot
      db.prepare(`
        UPDATE vending_slots 
        SET product_id = NULL, product_name = NULL, category = NULL, retail_price = NULL, quantity = 0, last_updated = ?
        WHERE slot_id = ?
      `).run(lastUpdated, slotId);
    } else {
      db.prepare(`
        UPDATE vending_slots 
        SET product_id = ?, product_name = ?, category = ?, retail_price = ?, quantity = ?, last_updated = ?
        WHERE slot_id = ?
      `).run(
        String(productId),
        productInfo?.name || null,
        productInfo?.category || null,
        productInfo?.retail_price || null,
        quantity,
        lastUpdated,
        slotId
      );
    }

    return this.getSlot(slotId);
  },

  updateSlotQuantity(slotId: number, changeAmount: number): VendingSlot | undefined {
    const lastUpdated = new Date().toISOString();
    db.prepare(`
      UPDATE vending_slots 
      SET quantity = MAX(0, quantity + ?), last_updated = ?
      WHERE slot_id = ?
    `).run(changeAmount, lastUpdated, slotId);
    return this.getSlot(slotId);
  },

  getSlotsForProduct(productId: string | number, productName?: string): Array<{ slot_id: number; quantity: number }> {
    const searchId = String(productId).replace(/^products\//, '');
    
    // First try to match by ID
    let rows = db.prepare(`
      SELECT slot_id, quantity FROM vending_slots 
      WHERE product_id = ? OR product_id = ? OR product_id = ?
      ORDER BY slot_id DESC
    `).all(searchId, `products/${searchId}`, String(productId)) as any[];

    // If no ID match and productName provided, try name match
    if (rows.length === 0 && productName) {
      const searchName = productName.toUpperCase().trim();
      rows = db.prepare(`
        SELECT slot_id, quantity FROM vending_slots 
        WHERE UPPER(product_name) LIKE ?
        ORDER BY slot_id DESC
      `).all(`%${searchName.substring(0, 15)}%`) as any[];
    }

    return rows.map(row => ({ slot_id: row.slot_id, quantity: row.quantity }));
  },

  // ==================== PRODUCT OVERRIDES ====================

  setProductOverride(productId: string, updates: { name?: string; category?: string; retail_price?: number; quantity?: number }): ProductOverride {
    const updatedAt = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO product_overrides (id, name, category, retail_price, quantity, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = COALESCE(excluded.name, name),
        category = COALESCE(excluded.category, category),
        retail_price = COALESCE(excluded.retail_price, retail_price),
        quantity = COALESCE(excluded.quantity, quantity),
        updated_at = excluded.updated_at
    `).run(productId, updates.name || null, updates.category || null, updates.retail_price || null, updates.quantity || null, updatedAt);

    return this.getProductOverride(productId)!;
  },

  getProductOverride(productId: string): ProductOverride | undefined {
    const row = db.prepare('SELECT * FROM product_overrides WHERE id = ?').get(productId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      retail_price: row.retail_price,
      quantity: row.quantity,
      updated_at: row.updated_at,
    };
  },

  getAllProductOverrides(): Record<string, ProductOverride> {
    const rows = db.prepare('SELECT * FROM product_overrides').all() as any[];
    const result: Record<string, ProductOverride> = {};
    for (const row of rows) {
      result[row.id] = {
        id: row.id,
        name: row.name,
        category: row.category,
        retail_price: row.retail_price,
        quantity: row.quantity,
        updated_at: row.updated_at,
      };
    }
    return result;
  },

  // ==================== DISPENSE HISTORY ====================

  logDispenseEvent(event: {
    orderId?: string;
    orderItemId?: number;
    productId: string;
    productName?: string;
    slotId: number;
    quantity?: number;
    success: boolean;
    errorMessage?: string;
  }): DispenseHistoryEntry {
    const createdAt = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO dispense_history (order_id, order_item_id, product_id, product_name, slot_id, quantity, success, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.orderId || null,
      event.orderItemId || null,
      event.productId,
      event.productName || null,
      event.slotId,
      event.quantity || 1,
      event.success ? 1 : 0,
      event.errorMessage || null,
      createdAt
    );

    console.log(`[SQLite] Logged dispense event: slot ${event.slotId}, product ${event.productId}, success: ${event.success}`);
    return this.getDispenseHistoryEntry(result.lastInsertRowid as number)!;
  },

  getDispenseHistoryEntry(id: number): DispenseHistoryEntry | undefined {
    const row = db.prepare('SELECT * FROM dispense_history WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      productId: row.product_id,
      productName: row.product_name,
      slotId: row.slot_id,
      quantity: row.quantity,
      success: row.success === 1,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    };
  },

  getDispenseHistory(limit?: number, offset?: number): { entries: DispenseHistoryEntry[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM dispense_history').get() as { count: number }).count;

    let query = 'SELECT * FROM dispense_history ORDER BY created_at DESC';
    if (limit !== undefined) {
      query += ` LIMIT ${limit}`;
      if (offset !== undefined) {
        query += ` OFFSET ${offset}`;
      }
    }

    const rows = db.prepare(query).all() as any[];
    const entries = rows.map(row => ({
      id: row.id,
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      productId: row.product_id,
      productName: row.product_name,
      slotId: row.slot_id,
      quantity: row.quantity,
      success: row.success === 1,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }));

    return { entries, total };
  },

  getDispenseHistoryForSlot(slotId: number): DispenseHistoryEntry[] {
    const rows = db.prepare('SELECT * FROM dispense_history WHERE slot_id = ? ORDER BY created_at DESC').all(slotId) as any[];
    return rows.map(row => ({
      id: row.id,
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      productId: row.product_id,
      productName: row.product_name,
      slotId: row.slot_id,
      quantity: row.quantity,
      success: row.success === 1,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }));
  },

  getDispenseStats(): {
    totalDispenses: number;
    successfulDispenses: number;
    failedDispenses: number;
    todayDispenses: number;
    todaySuccessful: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_dispenses,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_dispenses,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_dispenses,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today_dispenses,
        SUM(CASE WHEN success = 1 AND created_at >= ? THEN 1 ELSE 0 END) as today_successful
      FROM dispense_history
    `).get(todayStr, todayStr) as any;

    return {
      totalDispenses: stats.total_dispenses || 0,
      successfulDispenses: stats.successful_dispenses || 0,
      failedDispenses: stats.failed_dispenses || 0,
      todayDispenses: stats.today_dispenses || 0,
      todaySuccessful: stats.today_successful || 0,
    };
  },

  // ==================== UTILITY ====================

  syncProductQuantities(): { productId: string; totalQuantity: number }[] {
    // Calculate total quantity for each product by summing all slot quantities
    const results: { productId: string; totalQuantity: number }[] = [];

    const productSlots = db.prepare(`
      SELECT product_id, SUM(quantity) as total_quantity
      FROM vending_slots
      WHERE product_id IS NOT NULL
      GROUP BY product_id
    `).all() as any[];

    for (const row of productSlots) {
      results.push({
        productId: row.product_id,
        totalQuantity: row.total_quantity || 0,
      });
    }

    console.log('[SQLite] Synced product quantities:', results.length, 'products');
    return results;
  },

  getTotalQuantityForProduct(productId: string): number {
    const searchId = String(productId).replace(/^products\//, '');
    const result = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total_quantity
      FROM vending_slots
      WHERE product_id = ? OR product_id = ? OR product_id = ?
    `).get(searchId, `products/${searchId}`, String(productId)) as any;
    return result?.total_quantity || 0;
  },

  // ==================== USERS ====================

  saveUser(userId: string, name: string, phone: string, email: string = ''): string {
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (existing) {
      db.prepare('UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?').run(name, phone, email, userId);
    } else {
      db.prepare('INSERT INTO users (id, name, phone, email) VALUES (?, ?, ?, ?)').run(userId, name, phone, email);
    }
    return userId;
  },

  getUser(userId: string): { id: string; name: string; phone: string; email: string; created_at: string } | undefined {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!row) return undefined;
    return { id: row.id, name: row.name, phone: row.phone, email: row.email, created_at: row.created_at };
  },

  // ==================== ADMIN USERS ====================

  createAdminUser(username: string, passwordHash: string): boolean {
    try {
      db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
      return true;
    } catch {
      return false; // User already exists
    }
  },

  verifyAdminCredentials(username: string, password: string): boolean {
    const user = db.prepare('SELECT id, password_hash FROM admin_users WHERE username = ? AND is_active = 1').get(username) as any;
    if (user && user.password_hash === password) {
      db.prepare('UPDATE admin_users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id);
      return true;
    }
    return false;
  },

  // ==================== APP SETTINGS ====================

  getSetting(key: string, defaultValue: string | null = null): string | null {
    const row = db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get(key) as any;
    return row ? row.setting_value : defaultValue;
  },

  setSetting(key: string, value: string, description?: string): boolean {
    db.prepare(`
      INSERT INTO app_settings (setting_key, setting_value, description, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, description = COALESCE(?, description), updated_at = ?
    `).run(key, value, description || null, new Date().toISOString(), value, description || null, new Date().toISOString());
    return true;
  },

  getRazorpayMode(): 'test' | 'live' {
    return (this.getSetting('razorpay_mode', 'test') as 'test' | 'live') || 'test';
  },

  setRazorpayMode(mode: 'test' | 'live'): boolean {
    return this.setSetting('razorpay_mode', mode, 'Razorpay payment mode: test or live');
  },

  // ==================== CART ====================

  getCart(userId: string): { items: any[]; total: number } {
    const rows = db.prepare(`
      SELECT ci.*, p.name, p.retail_price, p.image_url, p.category
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.external_id
      WHERE ci.user_id = ?
    `).all(userId) as any[];
    
    const total = rows.reduce((sum, item) => sum + (item.quantity * (item.retail_price || 0)), 0);
    return { items: rows, total };
  },

  addToCart(userId: string, productId: string, quantity: number = 1): boolean {
    db.prepare(`
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + ?, updated_at = datetime('now')
    `).run(userId, productId, quantity, quantity);
    return true;
  },

  removeFromCart(userId: string, productId: string): boolean {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(userId, productId);
    return true;
  },

  clearCart(userId: string): boolean {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    return true;
  },

  // ==================== SCAN RECORDS ====================

  saveScanRecord(scanData: {
    userId: string;
    imageUrl?: string;
    localCapturedImage?: string;
    skinType?: string;
    detectedAttributes?: any;
    detectedLipAttributes?: any;
    analysisAiSummary?: any;
    lipAnalysisSummary?: string;
    dietPlan?: any;
    capturedImages?: any;
    analysedImages?: any;
    publicUrl?: string;
    recommendedProducts?: any;
    recommendedLipProducts?: any;
    recommendedSalonServices?: any;
    recommendedCosmeticServices?: any;
  }): number {
    const result = db.prepare(`
      INSERT INTO scan_records (
        user_id, image_url, local_captured_image, skin_type, detected_attributes, detected_lip_attributes,
        analysis_ai_summary, lip_analysis_summary, diet_plan, captured_images, analysed_images, public_url,
        recommended_products, recommended_lip_products, recommended_salon_services, recommended_cosmetic_services
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      scanData.userId,
      scanData.imageUrl || null,
      scanData.localCapturedImage || null,
      scanData.skinType || null,
      JSON.stringify(scanData.detectedAttributes || []),
      JSON.stringify(scanData.detectedLipAttributes || []),
      JSON.stringify(scanData.analysisAiSummary || []),
      scanData.lipAnalysisSummary || null,
      JSON.stringify(scanData.dietPlan || {}),
      JSON.stringify(scanData.capturedImages || []),
      JSON.stringify(scanData.analysedImages || []),
      scanData.publicUrl || null,
      JSON.stringify(scanData.recommendedProducts || {}),
      JSON.stringify(scanData.recommendedLipProducts || []),
      JSON.stringify(scanData.recommendedSalonServices || []),
      JSON.stringify(scanData.recommendedCosmeticServices || [])
    );
    return result.lastInsertRowid as number;
  },

  getScanRecord(scanId: number): any {
    const row = db.prepare('SELECT * FROM scan_records WHERE id = ?').get(scanId) as any;
    if (!row) return undefined;
    
    // Parse JSON fields
    const jsonFields = ['detected_attributes', 'detected_lip_attributes', 'analysis_ai_summary', 'diet_plan', 
                        'captured_images', 'analysed_images', 'recommended_products', 'recommended_lip_products',
                        'recommended_salon_services', 'recommended_cosmetic_services'];
    for (const field of jsonFields) {
      if (row[field]) {
        try { row[field] = JSON.parse(row[field]); } catch { row[field] = []; }
      }
    }
    return row;
  },

  // ==================== TRANSACTIONS ====================

  createTransaction(transactionId: string, userId: string | null, productId: string | null, amount: number, paymentId?: string): boolean {
    db.prepare(`
      INSERT INTO transactions (id, user_id, product_id, amount, payment_id, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(transactionId, userId, productId, amount, paymentId || null);
    return true;
  },

  updateTransactionStatus(transactionId: string, status: string, paymentId?: string): boolean {
    if (paymentId) {
      db.prepare('UPDATE transactions SET status = ?, payment_id = ? WHERE id = ?').run(status, paymentId, transactionId);
    } else {
      db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run(status, transactionId);
    }
    return true;
  },

  // ==================== LOCAL PRODUCTS ====================

  upsertProduct(productData: {
    externalId: string;
    name: string;
    description?: string;
    retailPrice: number;
    category?: string;
    imageUrl?: string;
    quantity?: number;
    skinTypes?: string[];
    matchingAttributes?: string[];
  }): number {
    const existing = db.prepare('SELECT id FROM products WHERE external_id = ?').get(productData.externalId) as any;
    
    if (existing) {
      db.prepare(`
        UPDATE products SET name = ?, description = ?, retail_price = ?, category = ?, image_url = ?,
        quantity = ?, skin_types = ?, matching_attributes = ?, updated_at = datetime('now')
        WHERE external_id = ?
      `).run(
        productData.name,
        productData.description || null,
        productData.retailPrice,
        productData.category || null,
        productData.imageUrl || null,
        productData.quantity || 0,
        JSON.stringify(productData.skinTypes || []),
        JSON.stringify(productData.matchingAttributes || []),
        productData.externalId
      );
      return existing.id;
    } else {
      const result = db.prepare(`
        INSERT INTO products (external_id, name, description, retail_price, category, image_url, quantity, skin_types, matching_attributes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        productData.externalId,
        productData.name,
        productData.description || null,
        productData.retailPrice,
        productData.category || null,
        productData.imageUrl || null,
        productData.quantity || 0,
        JSON.stringify(productData.skinTypes || []),
        JSON.stringify(productData.matchingAttributes || [])
      );
      return result.lastInsertRowid as number;
    }
  },

  getProductByExternalId(externalId: string): any {
    return db.prepare('SELECT * FROM products WHERE external_id = ?').get(externalId);
  },

  getAllLocalProducts(): any[] {
    return db.prepare('SELECT * FROM products ORDER BY name').all();
  },

  // Close database connection (for cleanup)
  close(): void {
    db.close();
  },
};
