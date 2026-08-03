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

function dropRelationIfExists(name: string) {
  const row = db
    .prepare(`SELECT type FROM sqlite_master WHERE name = ?`)
    .get(name) as { type: string } | undefined;
  if (!row) return;
  if (row.type === "view") {
    db.exec(`DROP VIEW IF EXISTS "${name}"`);
  } else {
    db.exec(`DROP TABLE IF EXISTS "${name}"`);
  }
}

function dedupeOrdersByColumn(column: "payment_id" | "razorpay_order_id"): number {
  const duplicates = db
    .prepare(
      `
      SELECT ${column} as dup_key
      FROM orders
      WHERE ${column} IS NOT NULL AND ${column} != ''
      GROUP BY ${column}
      HAVING COUNT(*) > 1
    `
    )
    .all() as { dup_key: string }[];

  if (duplicates.length === 0) return 0;

  const selectIds = db.prepare(
    `
    SELECT id FROM orders
    WHERE ${column} = ?
    ORDER BY created_at ASC, rowid ASC
  `
  );
  const deleteItems = db.prepare("DELETE FROM order_items WHERE order_id = ?");
  const deleteOrder = db.prepare("DELETE FROM orders WHERE id = ?");

  let removed = 0;
  const removeDuplicates = db.transaction((keys: string[]) => {
    for (const dupKey of keys) {
      const ids = selectIds.all(dupKey) as { id: string }[];
      for (const row of ids.slice(1)) {
        deleteItems.run(row.id);
        deleteOrder.run(row.id);
        removed++;
      }
    }
  });

  removeDuplicates(duplicates.map((row) => row.dup_key));
  if (removed > 0) {
    console.log(`[SQLite] Removed ${removed} duplicate orders by ${column}`);
  }
  return removed;
}

function orderIdFromBillNumber(billNumber: string): string | null {
  const match = billNumber.match(/(order_[A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

function deletePosiflyBillData(billNumber: string): void {
  const run = db.transaction(() => {
    db.prepare("DELETE FROM _posifly_item_data WHERE billNumber = ?").run(billNumber);
    db.prepare("DELETE FROM _posifly_payment_data WHERE billNumber = ?").run(billNumber);
    db.prepare("DELETE FROM _posifly_charges_data WHERE billNumber = ?").run(billNumber);
    db.prepare("DELETE FROM _posifly_bill_data WHERE billNumber = ?").run(billNumber);
  });
  run();
}

function cleanupOrphanPosiflyBills(): number {
  const bills = db
    .prepare("SELECT billNumber FROM _posifly_bill_data")
    .all() as { billNumber: string }[];
  let removed = 0;
  for (const { billNumber } of bills) {
    const orderId = orderIdFromBillNumber(billNumber) || billNumber;
    const order = db.prepare("SELECT id FROM orders WHERE id = ?").get(orderId);
    if (!order) {
      deletePosiflyBillData(billNumber);
      removed++;
    }
  }
  return removed;
}

function dedupePosiflyBillsBySaleSignature(): number {
  const dupGroups = db
    .prepare(
      `
      SELECT billDate, billTime, billValue, outletRefId
      FROM _posifly_bill_data
      GROUP BY billDate, billTime, billValue, outletRefId
      HAVING COUNT(*) > 1
    `
    )
    .all() as {
    billDate: string;
    billTime: string;
    billValue: number;
    outletRefId: string;
  }[];

  let removed = 0;
  const selectBills = db.prepare(
    `
    SELECT billNumber FROM _posifly_bill_data
    WHERE billDate = ? AND billTime = ? AND billValue = ? AND outletRefId = ?
    ORDER BY rowid ASC
  `
  );

  for (const group of dupGroups) {
    const bills = selectBills.all(
      group.billDate,
      group.billTime,
      group.billValue,
      group.outletRefId
    ) as { billNumber: string }[];
    for (const row of bills.slice(1)) {
      deletePosiflyBillData(row.billNumber);
      removed++;
    }
  }
  return removed;
}

function dedupeTransactionsByPaymentId(): number {
  const duplicates = db
    .prepare(
      `
      SELECT payment_id as dup_key
      FROM transactions
      WHERE payment_id IS NOT NULL AND payment_id != ''
      GROUP BY payment_id
      HAVING COUNT(*) > 1
    `
    )
    .all() as { dup_key: string }[];

  if (duplicates.length === 0) return 0;

  const selectIds = db.prepare(
    `
    SELECT id FROM transactions
    WHERE payment_id = ?
    ORDER BY created_at ASC, rowid ASC
  `
  );
  const deleteTxn = db.prepare("DELETE FROM transactions WHERE id = ?");

  let removed = 0;
  const removeDuplicates = db.transaction((keys: string[]) => {
    for (const dupKey of keys) {
      const ids = selectIds.all(dupKey) as { id: string }[];
      for (const row of ids.slice(1)) {
        deleteTxn.run(row.id);
        removed++;
      }
    }
  });

  removeDuplicates(duplicates.map((row) => row.dup_key));
  return removed;
}

export interface SalesDuplicatePreview {
  duplicateOrderRows: { byPaymentId: number; byRazorpayOrderId: number };
  orphanPosiflyBills: number;
  duplicatePosiflyBillGroups: number;
  duplicatePosiflyBillRows: number;
  duplicateTransactionRows: number;
}

function countExtraOrderRows(column: "payment_id" | "razorpay_order_id"): number {
  const row = db
    .prepare(
      `
      SELECT COALESCE(SUM(cnt - 1), 0) as extra
      FROM (
        SELECT COUNT(*) as cnt
        FROM orders
        WHERE ${column} IS NOT NULL AND ${column} != ''
        GROUP BY ${column}
        HAVING COUNT(*) > 1
      )
    `
    )
    .get() as { extra: number };
  return row?.extra ?? 0;
}

function countOrphanPosiflyBills(): number {
  const bills = db
    .prepare("SELECT billNumber FROM _posifly_bill_data")
    .all() as { billNumber: string }[];
  let count = 0;
  for (const { billNumber } of bills) {
    const orderId = orderIdFromBillNumber(billNumber) || billNumber;
    const order = db.prepare("SELECT id FROM orders WHERE id = ?").get(orderId);
    if (!order) count++;
  }
  return count;
}

export interface SalesDedupeResult extends SalesDuplicatePreview {
  removed: {
    ordersByPaymentId: number;
    ordersByRazorpayOrderId: number;
    orphanPosiflyBills: number;
    duplicatePosiflyBills: number;
    transactionsByPaymentId: number;
  };
}

function previewSalesDuplicates(): SalesDuplicatePreview {
  const orphanPosiflyBills = countOrphanPosiflyBills();

  const posiflyDupStats = db
    .prepare(
      `
      SELECT
        COUNT(*) as duplicate_posifly_bill_groups,
        COALESCE(SUM(cnt - 1), 0) as duplicate_posifly_bill_rows
      FROM (
        SELECT COUNT(*) as cnt
        FROM _posifly_bill_data
        GROUP BY billDate, billTime, billValue, outletRefId
        HAVING COUNT(*) > 1
      )
    `
    )
    .get() as {
    duplicate_posifly_bill_groups: number;
    duplicate_posifly_bill_rows: number;
  };

  const duplicateTransactionRows = (
    db
      .prepare(
        `
        SELECT COALESCE(SUM(cnt - 1), 0) as extra
        FROM (
          SELECT COUNT(*) as cnt
          FROM transactions
          WHERE payment_id IS NOT NULL AND payment_id != ''
          GROUP BY payment_id
          HAVING COUNT(*) > 1
        )
      `
      )
      .get() as { extra: number }
  ).extra;

  return {
    duplicateOrderRows: {
      byPaymentId: countExtraOrderRows("payment_id"),
      byRazorpayOrderId: countExtraOrderRows("razorpay_order_id"),
    },
    orphanPosiflyBills,
    duplicatePosiflyBillGroups: posiflyDupStats.duplicate_posifly_bill_groups ?? 0,
    duplicatePosiflyBillRows: posiflyDupStats.duplicate_posifly_bill_rows ?? 0,
    duplicateTransactionRows,
  };
}

function ensureOrderIdempotencyIndexes() {
  dedupeOrdersByColumn("payment_id");
  dedupeOrdersByColumn("razorpay_order_id");

  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_id_unique
        ON orders(payment_id)
        WHERE payment_id IS NOT NULL AND payment_id != ''
    `);
  } catch (err: any) {
    console.warn(
      "[SQLite] Could not create payment_id unique index:",
      err?.message || err
    );
  }

  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
        ON orders(razorpay_order_id)
        WHERE razorpay_order_id IS NOT NULL AND razorpay_order_id != ''
    `);
  } catch (err: any) {
    console.warn(
      "[SQLite] Could not create razorpay_order_id unique index:",
      err?.message || err
    );
  }
}

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

  ensureOrderIdempotencyIndexes();

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
      image_url TEXT,
      quantity INTEGER DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now'))
    )
  `);

  const slotCols = db.prepare("PRAGMA table_info(vending_slots)").all() as any[];
  const hasImageUrlCol = slotCols.some((c) => String(c?.name) === "image_url");
  if (!hasImageUrlCol) {
    db.exec("ALTER TABLE vending_slots ADD COLUMN image_url TEXT");
  }
  const hasDiscountCol = slotCols.some((c) => String(c?.name) === "discount_value");
  if (!hasDiscountCol) {
    db.exec("ALTER TABLE vending_slots ADD COLUMN discount_value REAL");
  }

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

  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_payment_id_unique
        ON transactions(payment_id)
        WHERE payment_id IS NOT NULL AND payment_id != ''
    `);
  } catch (err: any) {
    console.warn(
      "[SQLite] Could not create transactions payment_id unique index:",
      err?.message || err
    );
  }

  // One-time claim keys so analytics /sync is never posted twice for the same bill.
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_sync_claims (
      claim_key TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Stable invoice numbers per payment/order (LW/MM/YY/NNN).
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_allocations (
      source_key TEXT PRIMARY KEY,
      invoice_no TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_invoice_allocations_invoice_no
      ON invoice_allocations(invoice_no)
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

  // ==================== POSIFLY INTERNAL BACKING TABLES ====================
  // These internal tables store enriched POSIFLY data from the push-sale flow.
  // The POSIFLY-facing views (below) merge data from these + orders/order_items.

  db.exec(`
    CREATE TABLE IF NOT EXISTS _posifly_bill_data (
      billNumber TEXT PRIMARY KEY,
      outletRefId TEXT NOT NULL,
      posTerminalId TEXT NOT NULL,
      billDate TEXT NOT NULL,
      billTime TEXT NOT NULL,
      billType TEXT NOT NULL DEFAULT 'SALE',
      billValue TEXT NOT NULL,
      netAmount TEXT NOT NULL,
      taxAmount TEXT NOT NULL,
      billDiscountValue REAL DEFAULT 0.00,
      ShiftNumber TEXT DEFAULT '',
      businessDate TEXT DEFAULT '',
      billStatus TEXT NOT NULL DEFAULT 'COMPLETED',
      isComplementBill INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      customerName TEXT DEFAULT '',
      customerMobile TEXT DEFAULT '',
      salesPersonName TEXT DEFAULT '',
      flightNumber TEXT DEFAULT '',
      PNRNumber TEXT DEFAULT '',
      journeyFrom TEXT DEFAULT '',
      journeyTo TEXT DEFAULT '',
      gateNumber TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS _posifly_item_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billNumber TEXT NOT NULL,
      outletRefId TEXT NOT NULL,
      itemRefId TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT DEFAULT '',
      barcode TEXT DEFAULT '',
      category TEXT DEFAULT '',
      subcategory TEXT DEFAULT '',
      hsnCode TEXT DEFAULT '',
      uom TEXT NOT NULL DEFAULT 'UNIT',
      uomValue INTEGER NOT NULL DEFAULT 1,
      mrp REAL NOT NULL,
      sp REAL NOT NULL,
      discountValue REAL DEFAULT 0.0,
      quantity INTEGER NOT NULL,
      taxes TEXT DEFAULT '[]',
      FOREIGN KEY (billNumber) REFERENCES _posifly_bill_data(billNumber)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS _posifly_payment_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billNumber TEXT NOT NULL,
      outletRefId TEXT NOT NULL,
      paymentModes TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (billNumber) REFERENCES _posifly_bill_data(billNumber)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS _posifly_charges_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billNumber TEXT NOT NULL,
      outletRefId TEXT NOT NULL,
      charges TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (billNumber) REFERENCES _posifly_bill_data(billNumber)
    )
  `);

  // ==================== POSIFLY READ-ONLY VIEWS ====================
  // View names match EXACTLY the POSIFLY Solution Specification Document.
  // Views are inherently read-only in SQLite.
  // POSIFLY agent queries these views directly from vending.db.
  // Foreign key relationship: billNumber links all views.

  // Migration: drop old views and old tables that conflict with spec view names.
  // Disable FK checks so we can drop in any order, then re-enable.
  db.exec(`PRAGMA foreign_keys = OFF`);
  db.exec(`DROP VIEW IF EXISTS bill_details_view`);
  db.exec(`DROP VIEW IF EXISTS item_details_view`);
  db.exec(`DROP VIEW IF EXISTS payment_details_view`);
  db.exec(`DROP VIEW IF EXISTS charges_details_view`);
  for (const relation of ["bill_details", "item_details", "payment_details", "charges_details"]) {
    dropRelationIfExists(relation);
  }
  db.exec(`PRAGMA foreign_keys = ON`);

  // View: bill_details (spec C.2.1)
  db.exec(`DROP VIEW IF EXISTS bill_details`);
  db.exec(`
    CREATE VIEW bill_details AS
    SELECT
      o.id                                                    AS billNumber,
      COALESCE(pb.outletRefId, 'LEAFWATER_001')               AS outletRefId,
      COALESCE(pb.posTerminalId, 'VENDING_01')                AS posTerminalId,
      COALESCE(pb.billDate, strftime('%d/%m/%Y', o.created_at)) AS billDate,
      COALESCE(pb.billTime, strftime('%H:%M', o.created_at))  AS billTime,
      'SALE'                                                  AS billType,
      CAST(o.total_amount AS TEXT)                             AS billValue,
      CAST(ROUND(o.total_amount / 1.18, 2) AS TEXT)           AS netAmount,
      CAST(ROUND(o.total_amount - (o.total_amount / 1.18), 2) AS TEXT) AS taxAmount,
      COALESCE(pb.billDiscountValue, 0.00)                    AS billDiscountValue,
      COALESCE(pb.ShiftNumber, '')                             AS ShiftNumber,
      COALESCE(pb.businessDate, strftime('%d/%m/%Y', o.created_at)) AS businessDate,
      CASE
        WHEN o.status = 'completed' THEN 'COMPLETED'
        WHEN o.status = 'failed'    THEN 'CANCELED'
        ELSE 'COMPLETED'
      END                                                     AS billStatus,
      COALESCE(pb.isComplementBill, 0)                        AS isComplementBill,
      'INR'                                                   AS currency,
      COALESCE(pb.customerName, '')                            AS customerName,
      COALESCE(pb.customerMobile, '')                          AS customerMobile,
      COALESCE(pb.salesPersonName, '')                         AS salesPersonName,
      COALESCE(pb.flightNumber, '')                            AS flightNumber,
      COALESCE(pb.PNRNumber, '')                               AS PNRNumber,
      COALESCE(pb.journeyFrom, '')                             AS journeyFrom,
      COALESCE(pb.journeyTo, '')                               AS journeyTo,
      COALESCE(pb.gateNumber, '')                              AS gateNumber,
      o.created_at
    FROM orders o
    LEFT JOIN _posifly_bill_data pb ON pb.billNumber = o.id
  `);

  // View: item_details (spec C.2.2)
  db.exec(`DROP VIEW IF EXISTS item_details`);
  db.exec(`
    CREATE VIEW item_details AS
    SELECT
      oi.order_id                                             AS billNumber,
      'LEAFWATER_001'                                         AS outletRefId,
      oi.product_id                                           AS itemRefId,
      oi.product_name                                         AS name,
      ''                                                      AS brand,
      ''                                                      AS barcode,
      COALESCE(vs.category, 'Skincare')                       AS category,
      ''                                                      AS subcategory,
      ''                                                      AS hsnCode,
      'UNIT'                                                  AS uom,
      1                                                       AS uomValue,
      CAST(oi.price AS REAL)                                  AS mrp,
      CAST(oi.price AS REAL)                                  AS sp,
      0.0                                                     AS discountValue,
      oi.quantity                                             AS quantity,
      json_array(
        json_object('name', 'CGST', 'value', '9'),
        json_object('name', 'SGST', 'value', '9')
      )                                                       AS taxes
    FROM order_items oi
    LEFT JOIN vending_slots vs ON oi.slot_id = vs.slot_id
  `);

  // View: payment_details (spec C.2.3)
  db.exec(`DROP VIEW IF EXISTS payment_details`);
  db.exec(`
    CREATE VIEW payment_details AS
    SELECT
      o.id                                                    AS billNumber,
      'LEAFWATER_001'                                         AS outletRefId,
      json_array(
        json_object('mode', 'UPI', 'value', CAST(o.total_amount AS REAL))
      )                                                       AS paymentModes
    FROM orders o
    WHERE o.status IN ('completed', 'pending')
  `);

  // View: charges_details (spec C.2.4)
  db.exec(`DROP VIEW IF EXISTS charges_details`);
  db.exec(`
    CREATE VIEW charges_details AS
    SELECT
      o.id                                                    AS billNumber,
      'LEAFWATER_001'                                         AS outletRefId,
      '[]'                                                    AS charges
    FROM orders o
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
      ('machine_name', 'LeafWater_Default', 'Machine name/location for backend identification'),
      ('auto_dispense', 'true', 'Auto dispense after payment')
    `).run();
    console.log('Initialized default app settings');
  }

  // Ensure machine_name setting exists (for existing databases) - only insert if not exists
  db.prepare(`
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value, description) 
    VALUES ('machine_name', 'LeafWater_Default', 'Machine name/location for backend identification')
  `).run();

  console.log('SQLite database initialized:', DB_FILE);
}

// Initialize on module load
try {
  initDb();
} catch (err) {
  console.error("[SQLite] Database initialization failed:", err);
}

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
  image_url?: string;
  quantity: number;
  product_name?: string;
  category?: string;
  retail_price?: number;
  discount_value?: number;
  last_updated?: string;
}

export interface ProductOverride {
  id: string;
  name?: string;
  category?: string;
  retail_price?: number;
  quantity?: number;
  discount?: { value: number } | null;
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
    const paymentId = orderData.paymentId?.trim() || "";
    const razorpayOrderId = orderData.razorpayOrderId?.trim() || "";

    if (paymentId) {
      const existing = this.getOrderByPaymentId(paymentId);
      if (existing) {
        console.log('[SQLite] Reusing existing order for paymentId:', paymentId, existing.id);
        return existing;
      }
    }

    if (razorpayOrderId) {
      const existing = this.getOrderByRazorpayOrderId(razorpayOrderId);
      if (existing) {
        console.log('[SQLite] Reusing existing order for razorpayOrderId:', razorpayOrderId, existing.id);
        return existing;
      }
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    const insertOrder = db.prepare(`
      INSERT INTO orders (id, user_id, total_amount, payment_id, razorpay_order_id, status, payment_mode, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, price, slot_id, dispensed)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);

    try {
      insertOrder.run(
        orderId,
        orderData.userId || null,
        orderData.totalAmount,
        paymentId || null,
        razorpayOrderId || null,
        orderData.paymentMode,
        createdAt
      );

      for (const item of orderData.items) {
        insertItem.run(orderId, item.productId, item.productName, item.quantity, item.price, item.slotId || null);
      }
    } catch (err: any) {
      const message = String(err?.message || err || "");
      if (message.includes("UNIQUE constraint failed")) {
        if (paymentId) {
          const existing = this.getOrderByPaymentId(paymentId);
          if (existing) return existing;
        }
        if (razorpayOrderId) {
          const existing = this.getOrderByRazorpayOrderId(razorpayOrderId);
          if (existing) return existing;
        }
      }
      throw err;
    }

    console.log('[SQLite] Created order:', orderId);
    return this.getOrder(orderId)!;
  },

  getOrderByPaymentId(paymentId: string): Order | undefined {
    const normalized = paymentId.trim();
    if (!normalized) return undefined;
    const orderRow = db
      .prepare(`SELECT id FROM orders WHERE payment_id = ? ORDER BY created_at ASC LIMIT 1`)
      .get(normalized) as { id: string } | undefined;
    if (!orderRow) return undefined;
    return this.getOrder(orderRow.id);
  },

  getOrderByRazorpayOrderId(razorpayOrderId: string): Order | undefined {
    const normalized = razorpayOrderId.trim();
    if (!normalized) return undefined;
    const orderRow = db
      .prepare(`SELECT id FROM orders WHERE razorpay_order_id = ? ORDER BY created_at ASC LIMIT 1`)
      .get(normalized) as { id: string } | undefined;
    if (!orderRow) return undefined;
    return this.getOrder(orderRow.id);
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
        discount_value: row.discount_value ?? undefined,
        image_url: row.image_url,
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
      discount_value: row.discount_value ?? undefined,
      image_url: row.image_url,
      quantity: row.quantity,
      last_updated: row.last_updated,
    };
  },

  assignProductToSlot(
    slotId: number,
    productId: string | number | null,
    quantity: number = 0,
    productInfo?: { name?: string; category?: string; retail_price?: number; image_url?: string; discount_value?: number }
  ): VendingSlot | undefined {
    const lastUpdated = new Date().toISOString();

    if (productId === null) {
      // Clear the slot
      db.prepare(`
        UPDATE vending_slots 
        SET product_id = NULL, product_name = NULL, category = NULL, retail_price = NULL, image_url = NULL, discount_value = NULL, quantity = 0, last_updated = ?
        WHERE slot_id = ?
      `).run(lastUpdated, slotId);
    } else {
      db.prepare(`
        UPDATE vending_slots 
        SET product_id = ?, product_name = ?, category = ?, retail_price = ?, image_url = ?, discount_value = COALESCE(?, discount_value), quantity = ?, last_updated = ?
        WHERE slot_id = ?
      `).run(
        String(productId),
        productInfo?.name || null,
        productInfo?.category || null,
        productInfo?.retail_price ?? null,
        productInfo?.image_url || null,
        productInfo?.discount_value ?? null,
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

  setSlotQuantity(slotId: number, quantity: number): VendingSlot | undefined {
    const lastUpdated = new Date().toISOString();
    const q = Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0;
    db.prepare(`
      UPDATE vending_slots
      SET quantity = ?, last_updated = ?
      WHERE slot_id = ?
    `).run(q, lastUpdated, slotId);
    return this.getSlot(slotId);
  },

  getSlotsForProduct(productId: string | number, productName?: string): Array<{ slot_id: number; quantity: number }> {
    const searchId = String(productId).replace(/^products\//, '');
    
    console.log("[getSlotsForProduct] searchId:", searchId, "productName:", productName);
    
    // First try to match by ID
    let rows = db.prepare(`
      SELECT slot_id, quantity, product_id, product_name FROM vending_slots 
      WHERE product_id = ? OR product_id = ? OR product_id = ?
      ORDER BY slot_id DESC
    `).all(searchId, `products/${searchId}`, String(productId)) as any[];

    console.log("[getSlotsForProduct] ID match rows:", rows);

    // If no ID match and productName provided, try exact name match only
    if (rows.length === 0 && productName) {
      const searchName = productName.toUpperCase().trim();
      console.log("[getSlotsForProduct] Trying exact name match with:", searchName);
      rows = db.prepare(`
        SELECT slot_id, quantity, product_id, product_name FROM vending_slots 
        WHERE UPPER(TRIM(product_name)) = ?
        ORDER BY slot_id DESC
      `).all(searchName) as any[];
      console.log("[getSlotsForProduct] Exact name match rows:", rows);
    }

    return rows.map(row => ({ slot_id: row.slot_id, quantity: row.quantity }));
  },

  // ==================== PRODUCT OVERRIDES ====================

  setProductOverride(productId: string, updates: { name?: string; category?: string; retail_price?: number; quantity?: number }): ProductOverride {
    const updatedAt = new Date().toISOString();
    const cleanId = String(productId).replace(/^products\//, '');
    const retailPrice = updates.retail_price !== undefined ? updates.retail_price : null;
    const quantity = updates.quantity !== undefined ? updates.quantity : null;

    db.prepare(`
      INSERT INTO product_overrides (id, name, category, retail_price, quantity, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = COALESCE(excluded.name, name),
        category = COALESCE(excluded.category, category),
        retail_price = COALESCE(excluded.retail_price, retail_price),
        quantity = COALESCE(excluded.quantity, quantity),
        updated_at = excluded.updated_at
    `).run(cleanId, updates.name ?? null, updates.category ?? null, retailPrice, quantity, updatedAt);

    return this.getProductOverride(cleanId)!;
  },

  updateSlotsRetailPriceForProduct(productId: string, retailPrice: number, productName?: string): void {
    const searchId = String(productId).replace(/^products\//, '');
    const lastUpdated = new Date().toISOString();

    db.prepare(`
      UPDATE vending_slots
      SET retail_price = ?, last_updated = ?
      WHERE product_id = ? OR product_id = ? OR product_id = ?
    `).run(retailPrice, lastUpdated, searchId, `products/${searchId}`, String(productId));

    if (productName) {
      const exactName = productName.toUpperCase().trim();
      db.prepare(`
        UPDATE vending_slots
        SET retail_price = ?, last_updated = ?
        WHERE UPPER(TRIM(product_name)) = ?
      `).run(retailPrice, lastUpdated, exactName);
    }
  },

  syncProductInventoryFromSlots(productId: string, productName?: string): number {
    const cleanId = String(productId).replace(/^products\//, '');
    const totalQuantity = this.getTotalQuantityForProduct(cleanId);
    const updatedAt = new Date().toISOString();

    const existing = this.getProductOverride(cleanId);
    if (existing) {
      db.prepare(`
        UPDATE product_overrides
        SET quantity = ?, updated_at = ?
        WHERE id = ?
      `).run(totalQuantity, updatedAt, cleanId);
    } else if (totalQuantity > 0) {
      db.prepare(`
        INSERT INTO product_overrides (id, name, quantity, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(cleanId, productName ?? null, totalQuantity, updatedAt);
    }

    return totalQuantity;
  },

  getProductOverride(productId: string): ProductOverride | undefined {
    const row = db.prepare('SELECT * FROM product_overrides WHERE id = ?').get(productId) as any;
    if (!row) return undefined;
    // Parse discount if stored as JSON string
    let discount = row.discount;
    if (typeof discount === 'string') {
      try {
        discount = JSON.parse(discount);
      } catch {
        // If it's a number string like "10", convert to { value: 10 }
        const num = parseFloat(discount);
        if (!isNaN(num)) discount = { value: num };
      }
    }
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      retail_price: row.retail_price,
      quantity: row.quantity,
      discount: discount,
      updated_at: row.updated_at,
    };
  },

  getAllProductOverrides(): Record<string, ProductOverride> {
    const rows = db.prepare('SELECT * FROM product_overrides').all() as any[];
    const result: Record<string, ProductOverride> = {};
    for (const row of rows) {
      // Parse discount if stored as JSON string
      let discount = row.discount;
      if (typeof discount === 'string') {
        try {
          discount = JSON.parse(discount);
        } catch {
          const num = parseFloat(discount);
          if (!isNaN(num)) discount = { value: num };
        }
      }
      result[row.id] = {
        id: row.id,
        name: row.name,
        category: row.category,
        retail_price: row.retail_price,
        quantity: row.quantity,
        discount: discount,
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
    const results: { productId: string; totalQuantity: number }[] = [];
    const syncedIds = new Set<string>();

    const productSlots = db.prepare(`
      SELECT product_id, SUM(quantity) as total_quantity
      FROM vending_slots
      WHERE product_id IS NOT NULL
      GROUP BY product_id
    `).all() as any[];

    for (const row of productSlots) {
      const cleanId = String(row.product_id).replace(/^products\//, '');
      const totalQuantity = this.syncProductInventoryFromSlots(cleanId);
      syncedIds.add(cleanId);
      results.push({ productId: cleanId, totalQuantity });
    }

    const overrideRows = db.prepare(`
      SELECT id FROM product_overrides
      WHERE quantity IS NOT NULL AND quantity > 0
    `).all() as any[];

    for (const row of overrideRows) {
      const cleanId = String(row.id).replace(/^products\//, '');
      if (syncedIds.has(cleanId)) continue;
      const totalQuantity = this.syncProductInventoryFromSlots(cleanId);
      results.push({ productId: cleanId, totalQuantity });
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

  getMachineName(): string {
    return this.getSetting('machine_name', 'LeafWater_Default') || 'LeafWater_Default';
  },

  setMachineName(name: string): boolean {
    return this.setSetting('machine_name', name, 'Machine name/location for backend identification');
  },

  getMachineId(): string | null {
    return this.getSetting('machine_id');
  },

  setMachineId(id: string): boolean {
    return this.setSetting('machine_id', id, 'Machine ID for analytics backend');
  },

  getMachineLocation(): string | null {
    return this.getSetting('machine_location');
  },

  setMachineLocation(location: string): boolean {
    return this.setSetting('machine_location', location, 'Machine physical location');
  },

  /**
   * Allocate a unique tax-invoice number for a payment/order.
   * Format: LW/MM/YY/NNN (monthly sequence, 3+ digits).
   * Idempotent for the same source keys (orderId / paymentId / qrCodeId).
   */
  allocateInvoiceNo(sourceKeys: string | string[]): string {
    const keys = (Array.isArray(sourceKeys) ? sourceKeys : [sourceKeys])
      .map((k) => String(k || "").trim())
      .filter(Boolean);
    const uniqueKeys = [...new Set(keys)];
    if (uniqueKeys.length === 0) {
      uniqueKeys.push(
        `anon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      );
    }

    const run = db.transaction(() => {
      for (const key of uniqueKeys) {
        const existing = db
          .prepare(
            `SELECT invoice_no FROM invoice_allocations WHERE source_key = ?`
          )
          .get(key) as { invoice_no: string } | undefined;
        if (existing?.invoice_no) {
          const insertIgnore = db.prepare(`
            INSERT OR IGNORE INTO invoice_allocations (source_key, invoice_no)
            VALUES (?, ?)
          `);
          for (const k of uniqueKeys) {
            insertIgnore.run(k, existing.invoice_no);
          }
          return existing.invoice_no;
        }
      }

      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2);
      const counterKey = `invoice_seq_${yy}${mm}`;
      const row = db
        .prepare(
          `SELECT setting_value FROM app_settings WHERE setting_key = ?`
        )
        .get(counterKey) as { setting_value: string } | undefined;
      const next = (parseInt(row?.setting_value || "0", 10) || 0) + 1;
      const nowIso = now.toISOString();

      db.prepare(`
        INSERT INTO app_settings (setting_key, setting_value, description, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_at = excluded.updated_at
      `).run(
        counterKey,
        String(next),
        `Invoice sequence for ${mm}/${yy}`,
        nowIso
      );

      const invoiceNo = `LW/${mm}/${yy}/${String(next).padStart(3, "0")}`;
      const insert = db.prepare(`
        INSERT INTO invoice_allocations (source_key, invoice_no)
        VALUES (?, ?)
      `);
      for (const k of uniqueKeys) {
        insert.run(k, invoiceNo);
      }
      return invoiceNo;
    });

    return run();
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
    // Ensure user exists before inserting scan record (foreign key constraint)
    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(scanData.userId);
    if (!existingUser) {
      db.prepare('INSERT INTO users (id) VALUES (?)').run(scanData.userId);
    }

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
    const result = db.prepare(`
      INSERT OR IGNORE INTO transactions (id, user_id, product_id, amount, payment_id, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(transactionId, userId, productId, amount, paymentId || null);

    // Same Razorpay payment must not create a second local transaction row.
    if (result.changes === 0 && paymentId) {
      const existing = db
        .prepare("SELECT id FROM transactions WHERE payment_id = ? OR id = ? LIMIT 1")
        .get(paymentId, transactionId) as { id?: string } | undefined;
      if (existing?.id) {
        console.log("[SQLite] Duplicate transaction ignored:", paymentId);
        return false;
      }
    }

    return result.changes > 0;
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

  // ==================== POSIFLY DATA ====================

  savePosiflyBill(data: {
    billDetails: {
      billNumber: string;
      outletRefId: string;
      posTerminalId: string;
      billDate: string;
      billTime: string;
      billType: string;
      billValue: string;
      netAmount: string;
      taxAmount: string;
      billDiscountValue?: number;
      ShiftNumber?: string;
      businessDate?: string;
      billStatus: string;
      isComplementBill?: boolean;
      currency?: string;
      customerName?: string;
      customerMobile?: string;
      salesPersonName?: string;
      flightNumber?: string;
      PNRNumber?: string;
      journeyFrom?: string;
      journeyTo?: string;
      gateNumber?: string;
    };
    items: Array<{
      billNumber: string;
      outletRefId: string;
      itemRefId: string;
      name: string;
      brand?: string;
      barcode?: string;
      category?: string;
      subcategory?: string;
      hsnCode?: string;
      uom: string;
      uomValue: number;
      mrp: number;
      sp: number;
      discountValue?: number;
      quantity: number;
      taxes: Array<{ name: string; value: string }>;
    }>;
    paymentDetails: {
      billNumber: string;
      outletRefId: string;
      paymentModes: Array<{ mode: string; value: number }>;
    };
    chargesDetails: {
      billNumber: string;
      outletRefId: string;
      charges: Array<{ mode: string; value: number }>;
    };
  }): { billNumber: string; created: boolean } {
    const txn = db.transaction(() => {
      const bd = data.billDetails;
      const insertBill = db.prepare(`
        INSERT OR IGNORE INTO _posifly_bill_data (
          billNumber, outletRefId, posTerminalId, billDate, billTime,
          billType, billValue, netAmount, taxAmount, billDiscountValue,
          ShiftNumber, businessDate, billStatus, isComplementBill, currency,
          customerName, customerMobile, salesPersonName, flightNumber,
          PNRNumber, journeyFrom, journeyTo, gateNumber
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bd.billNumber, bd.outletRefId, bd.posTerminalId, bd.billDate, bd.billTime,
        bd.billType, bd.billValue, bd.netAmount, bd.taxAmount, bd.billDiscountValue ?? 0,
        bd.ShiftNumber ?? '', bd.businessDate ?? '', bd.billStatus, bd.isComplementBill ? 1 : 0,
        bd.currency ?? 'INR', bd.customerName ?? '', bd.customerMobile ?? '',
        bd.salesPersonName ?? '', bd.flightNumber ?? '', bd.PNRNumber ?? '',
        bd.journeyFrom ?? '', bd.journeyTo ?? '', bd.gateNumber ?? ''
      );

      if (insertBill.changes === 0) {
        return { billNumber: bd.billNumber, created: false };
      }

      // Fresh bill — clear any orphan line items then insert once.
      db.prepare("DELETE FROM _posifly_item_data WHERE billNumber = ?").run(bd.billNumber);
      db.prepare("DELETE FROM _posifly_payment_data WHERE billNumber = ?").run(bd.billNumber);
      db.prepare("DELETE FROM _posifly_charges_data WHERE billNumber = ?").run(bd.billNumber);

      const insertItem = db.prepare(`
        INSERT INTO _posifly_item_data (
          billNumber, outletRefId, itemRefId, name, brand, barcode,
          category, subcategory, hsnCode, uom, uomValue, mrp, sp,
          discountValue, quantity, taxes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of data.items) {
        insertItem.run(
          item.billNumber, item.outletRefId, item.itemRefId, item.name,
          item.brand ?? '', item.barcode ?? '', item.category ?? '',
          item.subcategory ?? '', item.hsnCode ?? '', item.uom, item.uomValue,
          item.mrp, item.sp, item.discountValue ?? 0, item.quantity,
          JSON.stringify(item.taxes)
        );
      }

      const pd = data.paymentDetails;
      db.prepare(`
        INSERT INTO _posifly_payment_data (billNumber, outletRefId, paymentModes)
        VALUES (?, ?, ?)
      `).run(pd.billNumber, pd.outletRefId, JSON.stringify(pd.paymentModes));

      const cd = data.chargesDetails;
      db.prepare(`
        INSERT INTO _posifly_charges_data (billNumber, outletRefId, charges)
        VALUES (?, ?, ?)
      `).run(cd.billNumber, cd.outletRefId, JSON.stringify(cd.charges));

      return { billNumber: bd.billNumber, created: true };
    });

    const result = txn();
    console.log('[SQLite] Saved POSIFLY bill:', result);
    return result;
  },

  /**
   * Atomically claim an analytics push. Returns false if this bill was already claimed
   * (so callers must not POST /sync again).
   */
  claimAnalyticsSync(kind: "vending" | "pos", billNumber: string): boolean {
    if (!billNumber) return false;
    const key = `${kind}:${billNumber}`;
    const result = db
      .prepare(
        "INSERT OR IGNORE INTO analytics_sync_claims (claim_key) VALUES (?)"
      )
      .run(key);
    return result.changes > 0;
  },

  // Read-only queries for POSIFLY (using spec-named VIEWS)
  getPosiflyBills(limit = 100, offset = 0): any[] {
    return db.prepare('SELECT * FROM bill_details ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  },

  getPosiflyBillByNumber(billNumber: string): any {
    return db.prepare('SELECT * FROM bill_details WHERE billNumber = ?').get(billNumber);
  },

  /** True only when a bill was saved to _posifly_bill_data (not the merged bill_details view). */
  hasSavedPosiflyBill(billNumber: string): boolean {
    const row = db
      .prepare('SELECT billNumber FROM _posifly_bill_data WHERE billNumber = ?')
      .get(billNumber) as { billNumber?: string } | undefined;
    return !!row?.billNumber;
  },

  getPosiflyItemsByBill(billNumber: string): any[] {
    const rows = db.prepare('SELECT * FROM item_details WHERE billNumber = ?').all(billNumber) as any[];
    return rows.map(row => ({
      ...row,
      taxes: typeof row.taxes === 'string' ? JSON.parse(row.taxes || '[]') : row.taxes,
    }));
  },

  getPosiflyPaymentByBill(billNumber: string): any {
    const row = db.prepare('SELECT * FROM payment_details WHERE billNumber = ?').get(billNumber) as any;
    if (!row) return null;
    return { ...row, paymentModes: typeof row.paymentModes === 'string' ? JSON.parse(row.paymentModes || '[]') : row.paymentModes };
  },

  getPosiflyChargesByBill(billNumber: string): any {
    const row = db.prepare('SELECT * FROM charges_details WHERE billNumber = ?').get(billNumber) as any;
    if (!row) return null;
    return { ...row, charges: typeof row.charges === 'string' ? JSON.parse(row.charges || '[]') : row.charges };
  },

  getPosiflyFullBill(billNumber: string): any {
    const bill = this.getPosiflyBillByNumber(billNumber);
    if (!bill) return null;
    return {
      bill_details: bill,
      item_details: this.getPosiflyItemsByBill(billNumber),
      payment_details: this.getPosiflyPaymentByBill(billNumber),
      charges_details: this.getPosiflyChargesByBill(billNumber),
    };
  },

  getAllPosiflyData(limit = 100, offset = 0): any[] {
    const bills = this.getPosiflyBills(limit, offset);
    return bills.map((bill: any) => ({
      bill_details: bill,
      item_details: this.getPosiflyItemsByBill(bill.billNumber),
      payment_details: this.getPosiflyPaymentByBill(bill.billNumber),
      charges_details: this.getPosiflyChargesByBill(bill.billNumber),
    }));
  },

  previewSalesDuplicates(): SalesDuplicatePreview {
    return previewSalesDuplicates();
  },

  dedupeAllSalesData(): SalesDedupeResult {
    const removedOrdersByPaymentId = dedupeOrdersByColumn("payment_id");
    const removedOrdersByRazorpayOrderId = dedupeOrdersByColumn("razorpay_order_id");
    const removedOrphanPosiflyBills = cleanupOrphanPosiflyBills();
    const removedDuplicatePosiflyBills = dedupePosiflyBillsBySaleSignature();
    const removedTransactions = dedupeTransactionsByPaymentId();
    ensureOrderIdempotencyIndexes();

    const result: SalesDedupeResult = {
      ...previewSalesDuplicates(),
      removed: {
        ordersByPaymentId: removedOrdersByPaymentId,
        ordersByRazorpayOrderId: removedOrdersByRazorpayOrderId,
        orphanPosiflyBills: removedOrphanPosiflyBills,
        duplicatePosiflyBills: removedDuplicatePosiflyBills,
        transactionsByPaymentId: removedTransactions,
      },
    };

    console.log("[SQLite] Sales dedupe complete:", result);
    return result;
  },
};
