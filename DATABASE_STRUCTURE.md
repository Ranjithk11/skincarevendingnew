# Skincare Vending Machine - Database Structure

This document explains the SQLite database structure used by the Skincare Vending Machine application.

**Database Location:** `data/vending.db`

---

## Tables Overview

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin login credentials |
| `app_settings` | App configuration (e.g., Razorpay mode) |
| `cart_items` | User shopping cart |
| `dispense_history` | Log of every dispense event (success/failure) |
| `order_items` | Individual products within each order |
| `orders` | Main sales/order records |
| `product_overrides` | Local overrides for external product data |
| `products` | Full product catalog (local cache) |
| `scan_records` | Skin analysis results |
| `settings` | Additional settings |
| `transactions` | Payment transactions |
| `users` | User profiles (name, phone, email) |
| `vending_slots` | Physical slot → product mapping (60 slots) |

---

## Table Details

### 1. `orders`
Stores all sales/order records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique order ID (e.g., `order_1708345678_abc123`) |
| `user_id` | TEXT | User identifier (optional) |
| `total_amount` | REAL | Total order amount in INR |
| `payment_id` | TEXT | Razorpay payment ID |
| `razorpay_order_id` | TEXT | Razorpay order ID |
| `status` | TEXT | Order status: `pending`, `completed`, `failed`, `partial` |
| `payment_mode` | TEXT | `test` or `live` (Razorpay mode) |
| `created_at` | TEXT | ISO timestamp when order was created |
| `completed_at` | TEXT | ISO timestamp when order was completed |

**Status meanings:**
- `pending` — Order created, awaiting dispense
- `completed` — All items dispensed successfully
- `partial` — Some items dispensed, some failed
- `failed` — All items failed to dispense

---

### 2. `order_items`
Individual products within each order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `order_id` | TEXT (FK) | References `orders.id` |
| `product_id` | TEXT | External product ID (e.g., `products/30963943`) |
| `product_name` | TEXT | Product name at time of purchase |
| `quantity` | INTEGER | Number of units ordered |
| `price` | REAL | Unit price at time of purchase |
| `slot_id` | INTEGER | Which slot the product was dispensed from |
| `dispensed` | INTEGER | 0 = not dispensed, 1 = dispensed |
| `dispense_error` | TEXT | Error message if dispense failed |

---

### 3. `vending_slots`
Maps physical vending machine slots to products. The machine has **60 slots** (slot_id 1–60).

| Column | Type | Description |
|--------|------|-------------|
| `slot_id` | INTEGER (PK) | Physical slot number (1–60) |
| `product_id` | TEXT | External product ID assigned to this slot |
| `product_name` | TEXT | Product name (cached for display) |
| `category` | TEXT | Product category |
| `retail_price` | REAL | Product price |
| `quantity` | INTEGER | Current stock in this slot |
| `last_updated` | TEXT | ISO timestamp of last update |

**Example:**
| slot_id | product_id | product_name | quantity |
|---------|------------|--------------|----------|
| 23 | products/30963943 | CETAPHIL OILY SKIN CLEANSER 125ML | 10 |
| 24 | products/30964422 | CETAPHIL GENTLE SKIN CLEANSER 125ML | 8 |

**Notes:**
- A slot with `product_id = NULL` is empty
- When `quantity` reaches 0 after dispense, the slot is cleared (product_id set to NULL)
- Same product can be assigned to multiple slots

---

### 4. `users`
User profiles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique user ID |
| `name` | TEXT | User's name |
| `phone` | TEXT | Phone number |
| `email` | TEXT | Email address |
| `created_at` | TEXT | ISO timestamp when user was created |

---

### 5. `admin_users`
Admin login credentials.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `username` | TEXT (UNIQUE) | Admin username |
| `password_hash` | TEXT | Password (hashed) |
| `is_active` | INTEGER | 1 = active, 0 = disabled |
| `last_login` | TEXT | ISO timestamp of last login |
| `created_at` | TEXT | ISO timestamp when created |

---

### 6. `app_settings`
App configuration settings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `setting_key` | TEXT (UNIQUE) | Setting name (e.g., `razorpay_mode`) |
| `setting_value` | TEXT | Setting value (e.g., `test` or `live`) |
| `description` | TEXT | Description of the setting |
| `updated_at` | TEXT | ISO timestamp of last update |

**Default settings:**
- `razorpay_mode` = `test` — Razorpay payment mode

---

### 7. `products`
Full product catalog (local cache of external API data).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `external_id` | TEXT (UNIQUE) | External product ID (e.g., `products/30963943`) |
| `name` | TEXT | Product name |
| `description` | TEXT | Product description |
| `retail_price` | REAL | Price in INR |
| `product_use` | TEXT | How to use |
| `product_benefits` | TEXT | Benefits |
| `application` | TEXT | Application instructions |
| `product_type` | TEXT | Type of product |
| `category` | TEXT | Product category |
| `category_sort_order` | INTEGER | Sort order within category |
| `image_url` | TEXT | Product image URL |
| `image_tag` | TEXT | Image tag |
| `in_stock` | INTEGER | 1 = in stock, 0 = out of stock |
| `quantity` | INTEGER | Total quantity available |
| `min_quantity` | INTEGER | Minimum quantity threshold |
| `skin_types` | TEXT (JSON) | Compatible skin types |
| `matching_attributes` | TEXT (JSON) | Matching skin attributes |
| `matches` | TEXT | Match data |
| `discount` | TEXT | Discount info |
| `shopify_url` | TEXT | Shopify product URL |
| `created_at` | TEXT | ISO timestamp when created |
| `updated_at` | TEXT | ISO timestamp of last update |

---

### 8. `cart_items`
User shopping cart.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `user_id` | TEXT (FK) | References `users.id` |
| `product_id` | TEXT | Product ID |
| `quantity` | INTEGER | Quantity in cart |
| `created_at` | TEXT | ISO timestamp when added |
| `updated_at` | TEXT | ISO timestamp of last update |

**Constraint:** `UNIQUE(user_id, product_id)` — one cart entry per product per user

---

### 9. `scan_records`
Skin analysis results from AI scanning.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `user_id` | TEXT (FK) | References `users.id` |
| `image_url` | TEXT | Uploaded image URL |
| `local_captured_image` | TEXT | Local file path of captured image |
| `skin_type` | TEXT | Detected skin type |
| `detected_attributes` | TEXT (JSON) | Detected skin attributes |
| `detected_lip_attributes` | TEXT (JSON) | Detected lip attributes |
| `analysis_ai_summary` | TEXT (JSON) | AI analysis summary |
| `lip_analysis_summary` | TEXT | Lip analysis summary |
| `diet_plan` | TEXT (JSON) | Recommended diet plan |
| `captured_images` | TEXT (JSON) | List of captured images |
| `analysed_images` | TEXT (JSON) | List of analysed images |
| `public_url` | TEXT | Public URL for results |
| `recommended_products` | TEXT (JSON) | Recommended products |
| `recommended_lip_products` | TEXT (JSON) | Recommended lip products |
| `recommended_salon_services` | TEXT (JSON) | Recommended salon services |
| `recommended_cosmetic_services` | TEXT (JSON) | Recommended cosmetic services |
| `created_at` | TEXT | ISO timestamp when created |

---

### 10. `transactions`
Payment transactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Transaction ID |
| `user_id` | TEXT (FK) | References `users.id` |
| `product_id` | TEXT | Product ID |
| `amount` | REAL | Transaction amount in INR |
| `payment_id` | TEXT | Payment gateway ID |
| `status` | TEXT | Status: `pending`, `completed`, `failed` |
| `created_at` | TEXT | ISO timestamp when created |

---

### 11. `settings`
Additional app settings (key-value store).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `key` | TEXT (UNIQUE) | Setting key |
| `value` | TEXT | Setting value |
| `updated_at` | TEXT | ISO timestamp of last update |

---

### 12. `product_overrides`
Local overrides for product data fetched from external API.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Product ID |
| `name` | TEXT | Override name (optional) |
| `category` | TEXT | Override category (optional) |
| `retail_price` | REAL | Override price (optional) |
| `quantity` | INTEGER | Override quantity (optional) |
| `updated_at` | TEXT | ISO timestamp of last update |

**Use case:** If the external API has incorrect data, you can override it locally.

---

### 5. `dispense_history`
Logs every dispense event for tracking and debugging.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `order_id` | TEXT (FK) | References `orders.id` |
| `order_item_id` | INTEGER | References `order_items.id` |
| `product_id` | TEXT | Product that was dispensed |
| `product_name` | TEXT | Product name |
| `slot_id` | INTEGER | Slot from which product was dispensed |
| `quantity` | INTEGER | Number of units dispensed |
| `success` | INTEGER | 0 = failed, 1 = success |
| `error_message` | TEXT | Error message if failed |
| `created_at` | TEXT | ISO timestamp of dispense event |

---

## How It Works

### Order Flow
1. **Customer pays** → `orders` record created with `status = 'pending'`
2. **Order items added** → `order_items` records created with `dispensed = 0`
3. **Product dispensed** → 
   - `order_items.dispensed` set to 1
   - `vending_slots.quantity` decremented automatically
   - `dispense_history` entry created
4. **All items dispensed** → `orders.status` set to `'completed'`

### Slot Management
- Admin assigns products to slots via dashboard
- When a product is dispensed, slot quantity decreases
- When quantity reaches 0, slot is cleared (ready for new product)
- Same product can exist in multiple slots (for high-demand items)

### Quantity Calculation
- Total product quantity = SUM of quantities across all slots containing that product
- Use `syncProductQuantities()` to get totals for all products
- Use `getTotalQuantityForProduct(productId)` for a single product

---

## API Functions (lib/sqlite-db.ts)

### Orders
- `createOrder(orderData)` — Create new order with items
- `getOrder(orderId)` — Get order by ID
- `updateOrder(orderId, updates)` — Update order status/payment
- `completeOrder(orderId)` — Mark order as completed
- `getAllOrders(limit, offset)` — Paginated order list
- `getSalesStats()` — Revenue and order statistics

### Dispense
- `updateOrderItemDispenseStatus(orderId, productId, dispensed, error, slotId)` — Mark item as dispensed (auto-decrements slot)
- `logDispenseEvent(event)` — Manually log a dispense
- `getDispenseHistory(limit, offset)` — Paginated dispense log
- `getDispenseStats()` — Success/failure statistics

### Slots
- `getAllSlots()` — Get all 60 slots
- `getSlot(slotId)` — Get single slot
- `assignProductToSlot(slotId, productId, quantity, productInfo)` — Assign product
- `updateSlotQuantity(slotId, changeAmount)` — Adjust quantity (+/-)
- `getSlotsForProduct(productId)` — Find all slots containing a product

### Utilities
- `syncProductQuantities()` — Calculate total quantity per product
- `getTotalQuantityForProduct(productId)` — Get total for one product

---

## Database Location

```
skincareVending/
├── data/
│   └── vending.db    ← SQLite database file
├── lib/
│   ├── sqlite-db.ts  ← Database operations
│   └── admin-db.ts   ← Admin API wrapper
```

The database is created automatically on first run if it doesn't exist.
