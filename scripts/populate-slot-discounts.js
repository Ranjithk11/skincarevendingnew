const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local if it exists
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// Direct database access
const dbPath = path.join(__dirname, '../data/vending.db');

if (!fs.existsSync(dbPath)) {
  console.error(`ERROR: Database file not found at ${dbPath}`);
  console.error('Please ensure the database file exists');
  process.exit(1);
}

const db = new Database(dbPath);

// External API for product discounts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;

if (!API_BASE) {
  console.error('ERROR: NEXT_PUBLIC_API_URL not set in environment variables');
  console.error('Please set it in .env.local or pass it as environment variable');
  process.exit(1);
}

function getSlots() {
  try {
    const stmt = db.prepare('SELECT * FROM vending_slots');
    const slots = stmt.all();
    return slots || [];
  } catch (e) {
    console.error('Error fetching slots:', e.message);
    return [];
  }
}

// Fetch ALL products from API (paginated) and build a map by ID
async function fetchAllProducts() {
  const productMap = new Map();
  let page = 1;
  const limit = 50;
  let totalFetched = 0;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (DB_TOKEN) {
    headers['x-db-token'] = DB_TOKEN;
  }
  
  console.log(`Fetching all products from ${API_BASE}...`);
  
  while (true) {
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      
      const response = await fetch(`${API_BASE}/product/fetch-by-filter?${params.toString()}`, {
        headers,
        cache: 'no-store',
      });
      
      if (!response.ok) {
        console.error(`API request failed on page ${page}: ${response.status}`);
        break;
      }
      
      const result = await response.json();
      const rawProducts = result?.data?.[0]?.products || result?.data || [];
      
      if (rawProducts.length === 0) {
        break;
      }
      
      for (const p of rawProducts) {
        const id = String(p._id || p.id);
        productMap.set(id, p);
        productMap.set('products/' + id, p);
        if (p.name) {
          productMap.set(p.name.toUpperCase().trim(), p);
        }
      }
      
      totalFetched += rawProducts.length;
      
      if (rawProducts.length < limit) {
        break;
      }
      
      page++;
    } catch (e) {
      console.error(`Error fetching page ${page}:`, e.message);
      break;
    }
  }
  
  console.log(`Fetched ${totalFetched} products from API (${page} pages)`);
  return productMap.size > 0 ? productMap : null;
}

function getDiscountFromMap(productMap, productId, productName) {
  if (!productMap) return null;
  
  // Try exact ID match first
  let product = productMap.get(String(productId));
  
  if (!product && productName) {
    // Try by cleaned name
    const cleanName = productName.toUpperCase().trim();
    product = productMap.get(cleanName);
  }
  
  if (!product) {
    return null;
  }
  
  const discount = product?.discount;
  const discountValue = discount?.value || discount?.percentage || discount;
  
  if (discountValue && Number(discountValue) > 0) {
    return Number(discountValue);
  }
  
  return null;
}

function updateSlotDiscount(slotId, discount) {
  const stmt = db.prepare(`
    UPDATE vending_slots 
    SET discount_value = ? 
    WHERE slot_id = ?
  `);
  return stmt.run(discount, slotId);
}

async function main() {
  console.log('Fetching slots from database...');
  console.log(`Database path: ${dbPath}`);
  const slots = getSlots();
  console.log(`Found ${slots.length} slots`);
  console.log(`Using API: ${API_BASE}`);

  if (slots.length === 0) {
    console.log('No slots found in database. Exiting.');
    db.close();
    return;
  }

  // Fetch all products once
  const productMap = await fetchAllProducts();
  
  if (!productMap) {
    console.error('Failed to fetch products from API. Exiting.');
    db.close();
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let noDiscount = 0;
  
  for (const slot of slots) {
    if (!slot.product_id || !slot.product_name) continue;
    if (slot.discount_value !== null && slot.discount_value !== undefined && slot.discount_value !== 0) {
      skipped++;
      continue;
    }

    const discount = getDiscountFromMap(productMap, slot.product_id, slot.product_name);
    
    if (discount && discount > 0) {
      console.log(`✓ Slot ${slot.slot_id}: Found discount ${discount}% for "${slot.product_name}"`);
      updateSlotDiscount(slot.slot_id, discount);
      updated++;
    } else {
      console.log(`✗ Slot ${slot.slot_id}: No discount for "${slot.product_name}" (id=${slot.product_id})`);
      noDiscount++;
    }
  }

  console.log(`\nDone! Updated ${updated} slots, skipped ${skipped}, no discount found for ${noDiscount}.`);
  db.close();
}

main().catch(console.error);
