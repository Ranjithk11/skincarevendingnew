// In-memory database for admin functionality
// In production, replace with a real database (PostgreSQL, MongoDB, etc.)

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

// Sample products data
const products: Product[] = [
  { id: 1, name: "Cetaphil Gentle Skin Cleanser", category: "Cleanser", retail_price: 450, quantity: 10, in_stock: true, image_url: "/products/cetaphil.jpg" },
  { id: 2, name: "Neutrogena Hydro Boost", category: "Moisturizer", retail_price: 650, quantity: 8, in_stock: true, image_url: "/products/neutrogena.jpg" },
  { id: 3, name: "La Roche-Posay Effaclar", category: "Cleanser", retail_price: 850, quantity: 5, in_stock: true, image_url: "/products/laroche.jpg" },
  { id: 4, name: "CeraVe Moisturizing Cream", category: "Moisturizer", retail_price: 550, quantity: 12, in_stock: true, image_url: "/products/cerave.jpg" },
  { id: 5, name: "The Ordinary Niacinamide", category: "Serum", retail_price: 350, quantity: 15, in_stock: true, image_url: "/products/ordinary.jpg" },
  { id: 6, name: "Bioderma Sensibio H2O", category: "Cleanser", retail_price: 750, quantity: 7, in_stock: true, image_url: "/products/bioderma.jpg" },
  { id: 7, name: "Pilgrim Red Vine Night Gel", category: "Night Cream", retail_price: 650, quantity: 6, in_stock: true, image_url: "/products/pilgrim.jpg" },
  { id: 8, name: "Minimalist Salicylic Acid", category: "Serum", retail_price: 399, quantity: 9, in_stock: true, image_url: "/products/minimalist.jpg" },
  { id: 9, name: "Dot & Key Vitamin C Serum", category: "Serum", retail_price: 695, quantity: 4, in_stock: true, image_url: "/products/dotkey.jpg" },
  { id: 10, name: "Plum Green Tea Face Wash", category: "Cleanser", retail_price: 345, quantity: 11, in_stock: true, image_url: "/products/plum.jpg" },
];

// Initialize vending slots (60 slots)
const vendingSlots: Map<number, VendingSlot> = new Map();

// Initialize slots with some products assigned
function initializeSlots() {
  for (let i = 1; i <= 60; i++) {
    const slot: VendingSlot = {
      slot_id: i,
      quantity: 0,
      last_updated: new Date().toISOString(),
    };

    // Assign some products to first few slots
    if (i <= 10) {
      const product = products[i - 1];
      slot.product_id = product.id;
      slot.product_name = product.name;
      slot.category = product.category;
      slot.retail_price = product.retail_price;
      slot.quantity = Math.floor(Math.random() * 5) + 1;
    }

    vendingSlots.set(i, slot);
  }
}

// Initialize on module load
initializeSlots();

// Database functions
export const adminDb = {
  // Products
  getAllProducts(): Product[] {
    return [...products];
  },

  getProduct(id: number): Product | undefined {
    return products.find((p) => p.id === id);
  },

  updateProduct(id: number, updates: Partial<Product>): Product | undefined {
    const index = products.findIndex((p) => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      return products[index];
    }
    return undefined;
  },

  // Vending Slots
  getAllSlots(): Record<number, VendingSlot> {
    const result: Record<number, VendingSlot> = {};
    vendingSlots.forEach((slot, key) => {
      result[key] = slot;
    });
    return result;
  },

  getSlot(slotId: number): VendingSlot | undefined {
    return vendingSlots.get(slotId);
  },

  assignProductToSlot(slotId: number, productId: number | null, quantity: number = 0): VendingSlot | undefined {
    const slot = vendingSlots.get(slotId);
    if (!slot) return undefined;

    if (productId === null) {
      // Clear the slot
      slot.product_id = undefined;
      slot.product_name = undefined;
      slot.category = undefined;
      slot.retail_price = undefined;
      slot.quantity = 0;
    } else {
      const product = products.find((p) => p.id === productId);
      if (product) {
        slot.product_id = product.id;
        slot.product_name = product.name;
        slot.category = product.category;
        slot.retail_price = product.retail_price;
        slot.quantity = quantity;
      }
    }

    slot.last_updated = new Date().toISOString();
    vendingSlots.set(slotId, slot);
    return slot;
  },

  updateSlotQuantity(slotId: number, changeAmount: number): VendingSlot | undefined {
    const slot = vendingSlots.get(slotId);
    if (!slot) return undefined;

    slot.quantity = Math.max(0, slot.quantity + changeAmount);
    slot.last_updated = new Date().toISOString();
    vendingSlots.set(slotId, slot);
    return slot;
  },

  // Sync product quantities from slots
  syncProductQuantities(): void {
    // Calculate total quantity per product from all slots
    const productQuantities: Map<number, number> = new Map();

    vendingSlots.forEach((slot) => {
      if (slot.product_id) {
        const current = productQuantities.get(slot.product_id) || 0;
        productQuantities.set(slot.product_id, current + slot.quantity);
      }
    });

    // Update product quantities
    productQuantities.forEach((quantity, productId) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        product.quantity = quantity;
        product.in_stock = quantity > 0;
      }
    });
  },
};
