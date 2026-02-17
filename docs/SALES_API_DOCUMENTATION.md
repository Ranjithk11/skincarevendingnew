# Sales/Orders API Documentation

This document describes the API endpoints for accessing sales and order data from the Leafwater Vending Machine.

## Base URL
```
http://<kiosk-ip>:3000/api/admin
```

---

## Data Schema

### Order
```typescript
interface Order {
  id: string;                    // Unique order ID (e.g., "order_1708123456789_abc123")
  userId?: string;               // User who made the purchase
  items: OrderItem[];            // Array of products purchased
  totalAmount: number;           // Total amount paid (in INR)
  paymentId?: string;            // Razorpay payment ID
  razorpayOrderId?: string;      // Razorpay order ID
  status: 'pending' | 'completed' | 'failed' | 'partial';
  paymentMode: 'test' | 'live';  // Payment mode used
  createdAt: string;             // ISO timestamp
  completedAt?: string;          // ISO timestamp when completed
}
```

### OrderItem
```typescript
interface OrderItem {
  productId: string;             // Product ID
  productName: string;           // Product name at time of purchase
  quantity: number;              // Quantity purchased
  price: number;                 // Price per unit (in INR)
  slotId?: number;               // Vending machine slot used
  dispensed: boolean;            // Whether item was dispensed
  dispenseError?: string;        // Error message if dispense failed
}
```

---

## API Endpoints

### 1. List All Orders
**GET** `/api/admin/orders`

Query parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max number of orders to return |
| `offset` | number | Number of orders to skip (for pagination) |
| `status` | string | Filter by status: `pending`, `completed`, `failed`, `partial` |

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "order_1708123456789_abc123",
      "userId": "user_xyz",
      "items": [
        {
          "productId": "products/123",
          "productName": "CETAPHIL GENTLE SKIN CLEANSER",
          "quantity": 1,
          "price": 429,
          "slotId": 5,
          "dispensed": true
        }
      ],
      "totalAmount": 429,
      "paymentId": "pay_ABC123XYZ",
      "razorpayOrderId": "order_DEF456",
      "status": "completed",
      "paymentMode": "live",
      "createdAt": "2026-02-17T12:30:00.000Z",
      "completedAt": "2026-02-17T12:30:15.000Z"
    }
  ],
  "total": 150
}
```

**Example:**
```bash
# Get all orders
curl http://localhost:3000/api/admin/orders

# Get completed orders only
curl http://localhost:3000/api/admin/orders?status=completed

# Paginated (first 10)
curl http://localhost:3000/api/admin/orders?limit=10&offset=0
```

---

### 2. Get Single Order
**GET** `/api/admin/orders/{orderId}`

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_1708123456789_abc123",
    "items": [...],
    "totalAmount": 429,
    "status": "completed",
    ...
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/admin/orders/order_1708123456789_abc123
```

---

### 3. Get Sales Statistics
**GET** `/api/admin/orders/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalOrders": 150,
    "completedOrders": 142,
    "totalRevenue": 85430,
    "todayOrders": 12,
    "todayRevenue": 5670
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/admin/orders/stats
```

---

### 4. Create Order (Internal - called after payment)
**POST** `/api/admin/orders`

**Request Body:**
```json
{
  "userId": "user_xyz",
  "items": [
    {
      "productId": "products/123",
      "productName": "CETAPHIL GENTLE SKIN CLEANSER",
      "quantity": 1,
      "price": 429,
      "slotId": 5
    }
  ],
  "totalAmount": 429,
  "paymentId": "pay_ABC123XYZ",
  "razorpayOrderId": "order_DEF456",
  "paymentMode": "live"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_1708123456789_abc123",
    ...
  }
}
```

---

### 5. Update Order / Dispense Status
**PATCH** `/api/admin/orders/{orderId}`

**Request Body (update dispense status):**
```json
{
  "productId": "products/123",
  "dispensed": true,
  "dispenseError": null
}
```

**Request Body (mark complete):**
```json
{
  "complete": true
}
```

**Response:**
```json
{
  "success": true,
  "order": { ... }
}
```

---

## Data Storage

Orders are persisted in:
```
/data/orders.json
```

This file is automatically created and updated. For Python integration, you can:

1. **Read directly from file:**
```python
import json

with open('data/orders.json', 'r') as f:
    orders = json.load(f)
    
for order in orders:
    print(f"Order {order['id']}: ₹{order['totalAmount']} - {order['status']}")
```

2. **Call the API:**
```python
import requests

response = requests.get('http://localhost:3000/api/admin/orders')
data = response.json()

for order in data['orders']:
    print(f"Order {order['id']}: ₹{order['totalAmount']}")
```

---

## Other Useful Endpoints

### Vending Slots
- `GET /api/admin/slots` - Get all slot assignments
- `POST /api/admin/slots/assign` - Assign product to slot
- `POST /api/admin/slots/update-quantity` - Update slot quantity

### Products
- `GET /api/admin/products` - Get all products
- `GET /api/admin/products/{productId}/slots` - Get slots for a product

### STM32 Dispense
- `POST /api/stm32/dispense` - Dispense products (sends commands to vending machine)

---

## Notes for Python Wrapper

If you're writing a Python wrapper to sync with your backend:

```python
import requests
import json
from datetime import datetime

class VendingMachineAPI:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
    
    def get_all_orders(self, status=None, limit=None, offset=None):
        params = {}
        if status:
            params['status'] = status
        if limit:
            params['limit'] = limit
        if offset:
            params['offset'] = offset
        
        response = requests.get(f"{self.base_url}/api/admin/orders", params=params)
        return response.json()
    
    def get_order(self, order_id):
        response = requests.get(f"{self.base_url}/api/admin/orders/{order_id}")
        return response.json()
    
    def get_sales_stats(self):
        response = requests.get(f"{self.base_url}/api/admin/orders/stats")
        return response.json()
    
    def get_slots(self):
        response = requests.get(f"{self.base_url}/api/admin/slots")
        return response.json()

# Usage
api = VendingMachineAPI("http://192.168.1.100:3000")
orders = api.get_all_orders(status="completed")
stats = api.get_sales_stats()
```

---

## Contact

For questions about the API, refer to the source code:
- `app/api/admin/orders/route.ts` - Orders list/create
- `app/api/admin/orders/[orderId]/route.ts` - Single order operations
- `app/api/admin/orders/stats/route.ts` - Sales statistics
- `lib/admin-db.ts` - Database functions
- `types/admin.ts` - TypeScript types
