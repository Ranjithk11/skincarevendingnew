// In-memory database for admin functionality with file persistence
// In production, replace with a real database (PostgreSQL, MongoDB, etc.)

import * as fs from 'fs';
import * as path from 'path';

const SLOTS_FILE = path.join(process.cwd(), 'data', 'slots.json');
const PRODUCT_OVERRIDES_FILE = path.join(process.cwd(), 'data', 'product-overrides.json');

// Product overrides for external products (similar to Flask's SQLite storage)
interface ProductOverride {
  id: string;
  name?: string;
  category?: string;
  retail_price?: number;
  quantity?: number;
  updated_at: string;
}

const productOverrides: Map<string, ProductOverride> = new Map();

// Save product overrides to file
function saveProductOverrides() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const overridesObj: Record<string, ProductOverride> = {};
    productOverrides.forEach((override, key) => {
      overridesObj[key] = override;
    });
    fs.writeFileSync(PRODUCT_OVERRIDES_FILE, JSON.stringify(overridesObj, null, 2));
  } catch (error) {
    console.error('Error saving product overrides:', error);
  }
}

// Load product overrides from file
function loadProductOverrides(): boolean {
  try {
    if (fs.existsSync(PRODUCT_OVERRIDES_FILE)) {
      const data = fs.readFileSync(PRODUCT_OVERRIDES_FILE, 'utf-8');
      const overridesObj = JSON.parse(data);
      Object.entries(overridesObj).forEach(([key, override]) => {
        productOverrides.set(key, override as ProductOverride);
      });
      return true;
    }
  } catch (error) {
    console.error('Error loading product overrides:', error);
  }
  return false;
}

// Initialize product overrides on module load
loadProductOverrides();

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

// Vending machine products data (from Python project CSV)
const products: Product[] = [
  { id: 1, name: "PILGRIM RED VINE NIGHT GEL CREME", category: "Night Cream", retail_price: 650, quantity: 15, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/red+vine+face+wash.jpg" },
  { id: 2, name: "10% NIACINAMIDE FACE SERUM", category: "Face Serum", retail_price: 595, quantity: 40, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/10%25+niacinamide+face+serum.jpg" },
  { id: 3, name: "10%VITAMIN C FACE SERUM", category: "Face Serum", retail_price: 545, quantity: 20, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/PILGRIM+SECRETS+OF+JEJU+ISLAND+NATURAL+VIT+C+FACE+SERUM+20%25+30ML.jpeg" },
  { id: 4, name: "2% KOJIC ACID SERUM", category: "Face Serum", retail_price: 495, quantity: 59, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/oil+control+serum.jpg" },
  { id: 5, name: "CETAPHIL OPTIMAL HYDRATION SERUM", category: "Face Serum", retail_price: 849, quantity: 25, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/cetaphil-optimal-hydration-serum-30ml.jpg" },
  { id: 6, name: "CETAPHIL BRIGHT RADIANCE SERUM", category: "Face Serum", retail_price: 2299, quantity: 18, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/cetaphil-bright-healthy-radiance-perfecting-serum-30ml.jpg" },
  { id: 7, name: "CETAPHIL GENTLE SKIN CLEANSER", category: "Cleanser", retail_price: 429, quantity: 30, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/cetaphil-gentle-skin-cleanser-125ml.jpg" },
  { id: 8, name: "CETAPHIL OILY SKIN CLEANSER", category: "Cleanser", retail_price: 699, quantity: 22, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/cetaphil-oily-skin-cleanser-125ml.jpg" },
  { id: 9, name: "CETAPHIL SUNSCREEN SPF 50+", category: "Sunscreen", retail_price: 1182, quantity: 35, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/cetaphil+spf+50.jpg" },
  { id: 10, name: "CETAPHIL DAILY ADVANCE LOTION", category: "Lotion", retail_price: 250, quantity: 28, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/Cetaphil-Daily-Advance-Ultra-Hydrating-Lotion-30gm.jpg" },
  { id: 11, name: "CETAPHIL BRIGHT RADIANCE DAY CREAM", category: "Moisturiser", retail_price: 1080, quantity: 15, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/Cetaphil-Bright-Healthy-Radiance-Brightening-day-protection-Cream-spf15-50g.jpg" },
  { id: 12, name: "CETAPHIL BRIGHT RADIANCE NIGHT CREAM", category: "Night Cream", retail_price: 1035, quantity: 12, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/Cetaphil-Bright-Healthy-Radiance-Brightening-Night-Comfort-Cream-50g.jpg" },
  { id: 13, name: "PILGRIM SWISS AQUA RUSH 12HA SERUM", category: "Face Serum", retail_price: 795, quantity: 20, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/swiss+aqua+rush+12ha+serum.jpg" },
  { id: 14, name: "PILGRIM LIFT & FIRM SERUM", category: "Face Serum", retail_price: 650, quantity: 18, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/Lift+%26+firm+Serum.jpg" },
  { id: 15, name: "PILGRIM TEA TREE PURIFYING TONER", category: "Toner", retail_price: 300, quantity: 25, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/tea+tree+purifying+toner.jpg" },
  { id: 16, name: "O3+ VITAMIN C SERUM GLOW", category: "Face Serum", retail_price: 920, quantity: 15, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/O3%2B+Vit+C+serum.jpg" },
  { id: 17, name: "O3+ NIACINAMIDE FACE SERUM", category: "Face Serum", retail_price: 740, quantity: 20, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/O3+%2B+Niacinamide+serum.jpg" },
  { id: 18, name: "LOREAL REVITALIFT EYE SERUM", category: "Eye Serum", retail_price: 899, quantity: 12, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/LOREAL+REVITALIFT+EYE+SERUM+20ML.jpg" },
  { id: 19, name: "LOTUS VITAMIN C MATTE SUNSCREEN SPF 50", category: "Sunscreen", retail_price: 475, quantity: 30, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/LOTUS+SAFE+SUN+VITAMIN+C+MATTE+GEL+DAILY+SUNSCREEN+SPF+50+75GM.jpg" },
  { id: 20, name: "THE DERMA CO 1% HYALURONIC SUNSCREEN", category: "Sunscreen", retail_price: 499, quantity: 25, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/THE+DERMA+CO+1%25+HYALURONIC+SUNSCREEN+AQUA+GEL+50ML.jpg" },
  { id: 21, name: "CERAVE PM FACIAL LOTION", category: "Moisturiser", retail_price: 1790, quantity: 10, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/CERAVE+PM+FACIAL+LOTION+52ML.jpg" },
  { id: 22, name: "DOT & KEY VITAMIN C+E FACE SERUM", category: "Face Serum", retail_price: 695, quantity: 18, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/DOT%26KEY+5%25+NIACINAMIDE+10%25+VITAMIN+C%2BE+SUPER+BRIGHT+FACE+SERUM+30ML.webp" },
  { id: 23, name: "SHAHNAZ HUSAIN MOISTURISING DAY CREAM", category: "Moisturiser", retail_price: 745, quantity: 15, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/SHAHANAZ+HUSAIN+SHA+TAJ+MOISTURIZING+CREAM+40GM.jpeg" },
  { id: 24, name: "SHAHNAZ HUSAIN OXYGEN PLUS CREAM", category: "Cream", retail_price: 450, quantity: 20, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/SHAHANAZ+HUSAIN+OXYGEN+PLUS+CREAM+50GM.webp" },
  { id: 25, name: "URBAN VEDA RADIANCE NIGHT CREAM", category: "Night Cream", retail_price: 3199, quantity: 8, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/Urban+Veda+-+Radiance+R+Night+Cream+.jpg" },
  { id: 26, name: "URBAN VEDA SOOTHING NIGHT CREAM", category: "Night Cream", retail_price: 2599, quantity: 10, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/Urban+Veda+-+Soothing+Clarifying+Night+Cream.jpg" },
  { id: 27, name: "CETAPHIL SYNDET BAR", category: "Bar", retail_price: 200, quantity: 40, in_stock: true, image_url: "https://skin-care--products.s3.eu-north-1.amazonaws.com/3Brands/cetaphil+cleansing+%26+moisturising+syndet+bar.jpg" },
  { id: 28, name: "SKINSKA DEWSKA BABY SOAP", category: "Bar", retail_price: 189, quantity: 35, in_stock: true, image_url: "https://skinskaproducts.s3.eu-north-1.amazonaws.com/dewska+baby+soap.jpg" },
  { id: 29, name: "SKINSKA DEWSKA MOISTURISING SOAP", category: "Bar", retail_price: 169, quantity: 30, in_stock: true, image_url: "https://skinskaproducts.s3.eu-north-1.amazonaws.com/dewska+moisturising+soap.jpg" },
  { id: 30, name: "SKINSKA OATMEAL ORANGE PAPAYA SOAP", category: "Bar", retail_price: 229, quantity: 25, in_stock: true, image_url: "https://skinskaproducts.s3.eu-north-1.amazonaws.com/skinska-naturals-sn-oatmeal+orange+papaya+soap.jpg" },
  { id: 31, name: "SKINSKA DEWSKA ANTI BACTERIAL SOAP", category: "Bar", retail_price: 179, quantity: 28, in_stock: true, image_url: "https://skinskaproducts.s3.eu-north-1.amazonaws.com/dewska+anti+bacterial+soap.jpg" },
];

// Initialize vending slots (60 slots)
const vendingSlots: Map<number, VendingSlot> = new Map();

// Save slots to file
function saveSlots() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const slotsObj: Record<number, VendingSlot> = {};
    vendingSlots.forEach((slot, key) => {
      slotsObj[key] = slot;
    });
    fs.writeFileSync(SLOTS_FILE, JSON.stringify(slotsObj, null, 2));
  } catch (error) {
    console.error('Error saving slots:', error);
  }
}

// Load slots from file
function loadSlots(): boolean {
  try {
    if (fs.existsSync(SLOTS_FILE)) {
      const data = fs.readFileSync(SLOTS_FILE, 'utf-8');
      const slotsObj = JSON.parse(data);
      Object.entries(slotsObj).forEach(([key, slot]) => {
        vendingSlots.set(parseInt(key), slot as VendingSlot);
      });
      return true;
    }
  } catch (error) {
    console.error('Error loading slots:', error);
  }
  return false;
}

// Initialize slots with some products assigned
function initializeSlots() {
  // Try to load from file first
  if (loadSlots()) {
    console.log('Loaded slots from file');
    return;
  }

  // Initialize fresh slots if no saved data
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
  saveSlots();
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

  // Product Overrides for external products
  setProductOverride(productId: string, updates: { name?: string; category?: string; retail_price?: number; quantity?: number }): ProductOverride {
    const override: ProductOverride = {
      id: productId,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    productOverrides.set(productId, override);
    saveProductOverrides();
    return override;
  },

  getProductOverride(productId: string): ProductOverride | undefined {
    return productOverrides.get(productId);
  },

  getAllProductOverrides(): Record<string, ProductOverride> {
    const result: Record<string, ProductOverride> = {};
    productOverrides.forEach((override, key) => {
      result[key] = override;
    });
    return result;
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

  assignProductToSlot(
    slotId: number, 
    productId: string | number | null, 
    quantity: number = 0,
    productInfo?: { name?: string; category?: string; retail_price?: number }
  ): VendingSlot | undefined {
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
      // First try to find in local products (for backward compatibility)
      const localProduct = products.find((p) => p.id === productId || p.id === parseInt(String(productId)));
      
      if (localProduct) {
        slot.product_id = localProduct.id;
        slot.product_name = localProduct.name;
        slot.category = localProduct.category;
        slot.retail_price = localProduct.retail_price;
        slot.quantity = quantity;
      } else if (productInfo) {
        // Use provided product info for external products (from main API)
        slot.product_id = productId as any;
        slot.product_name = productInfo.name;
        slot.category = productInfo.category;
        slot.retail_price = productInfo.retail_price;
        slot.quantity = quantity;
      } else {
        // Just store the product ID and quantity
        slot.product_id = productId as any;
        slot.quantity = quantity;
      }
    }

    slot.last_updated = new Date().toISOString();
    vendingSlots.set(slotId, slot);
    saveSlots();
    return slot;
  },

  updateSlotQuantity(slotId: number, changeAmount: number): VendingSlot | undefined {
    const slot = vendingSlots.get(slotId);
    if (!slot) return undefined;

    slot.quantity = Math.max(0, slot.quantity + changeAmount);
    slot.last_updated = new Date().toISOString();
    vendingSlots.set(slotId, slot);
    saveSlots();
    return slot;
  },

  // Get all slots for a specific product
  getSlotsForProduct(productId: string | number, productName?: string): Array<{ slot_id: number; quantity: number }> {
    const slots: Array<{ slot_id: number; quantity: number }> = [];
    const searchId = typeof productId === 'string' ? productId : productId.toString();
    // Clean the product ID (remove 'products/' prefix if present)
    const cleanSearchId = searchId.replace(/^products\//, '');
    const searchName = productName?.toUpperCase().trim();
    
    vendingSlots.forEach((slot) => {
      if (slot.product_id !== undefined || slot.product_name) {
        const slotProductId = slot.product_id !== undefined 
          ? (typeof slot.product_id === 'string' ? slot.product_id : slot.product_id.toString())
          : '';
        const cleanSlotProductId = slotProductId.replace(/^products\//, '');
        const slotProductName = slot.product_name?.toUpperCase().trim();
        
        // Match by ID (with or without 'products/' prefix)
        const idMatch = cleanSlotProductId === cleanSearchId || slotProductId === searchId;
        
        // Match by product name (partial match - first 15 chars or full name contains)
        let nameMatch = false;
        if (searchName && slotProductName) {
          // Check if names match (partial match for flexibility)
          const searchPrefix = searchName.substring(0, 15);
          const slotPrefix = slotProductName.substring(0, 15);
          nameMatch = slotProductName.includes(searchPrefix) || 
                      searchName.includes(slotPrefix) ||
                      slotProductName === searchName;
        }
        
        if (idMatch || nameMatch) {
          slots.push({
            slot_id: slot.slot_id,
            quantity: slot.quantity,
          });
        }
      }
    });
    
    // Sort by slot_id descending (prioritize higher slots like the Flask version)
    slots.sort((a, b) => b.slot_id - a.slot_id);
    
    return slots;
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
