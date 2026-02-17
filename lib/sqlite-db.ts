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

  // Initialize 60 vending slots if they don't exist
  const slotCount = db.prepare('SELECT COUNT(*) as count FROM vending_slots').get() as { count: number };
  if (slotCount.count === 0) {
    const insertSlot = db.prepare('INSERT INTO vending_slots (slot_id, quantity) VALUES (?, 0)');
    for (let i = 1; i <= 60; i++) {
      insertSlot.run(i);
    }
    console.log('Initialized 60 vending slots');
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
    dispenseError?: string
  ): Order | undefined {
    db.prepare(`
      UPDATE order_items 
      SET dispensed = ?, dispense_error = ?
      WHERE order_id = ? AND product_id = ?
    `).run(dispensed ? 1 : 0, dispenseError || null, orderId, productId);

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

  // ==================== UTILITY ====================

  syncProductQuantities(): void {
    // This would sync quantities from slots to products if needed
    console.log('[SQLite] Sync product quantities called');
  },

  // Close database connection (for cleanup)
  close(): void {
    db.close();
  },
};
