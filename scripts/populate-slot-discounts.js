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

async function getSlots() {
  try {
    const stmt = db.prepare('SELECT * FROM vending_slots');
    const slots = stmt.all();
    return slots || [];
  } catch (e) {
    console.error('Error fetching slots:', e.message);
    return [];
  }
}

async function getProductDiscountFromAPI(productName, productId) {
  try {
    const params = new URLSearchParams();
    params.set('search', productName);
    params.set('limit', '50');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (DB_TOKEN) {
      headers['x-db-token'] = DB_TOKEN;
    }
    
    const response = await fetch(`${API_BASE}/product/fetch-by-filter?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return null;
    }
    
    const result = await response.json();
    const rawProducts = result?.data?.[0]?.products || result?.data || [];
    
    const product = rawProducts.find(p => 
      String(p._id || p.id) === productId ||
      String(p._id || p.id) === productId?.replace('products/', '') ||
      String(p?.name).toUpperCase().includes(productName.toUpperCase().substring(0, 15))
    );
    
    return product?.discount?.value || null;
  } catch (e) {
    console.error(`Error fetching discount for ${productName}:`, e.message);
    return null;
  }
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

  let updated = 0;
  for (const slot of slots) {
    if (!slot.product_id || !slot.product_name) continue;
    if (slot.discount_value !== null && slot.discount_value !== undefined && slot.discount_value !== 0) {
      console.log(`Slot ${slot.slot_id} already has discount: ${slot.discount_value}`);
      continue;
    }

    console.log(`Checking discount for slot ${slot.slot_id}: ${slot.product_name}`);
    const discount = await getProductDiscountFromAPI(slot.product_name, slot.product_id);
    
    if (discount && discount > 0) {
      console.log(`✓ Slot ${slot.slot_id}: Found discount ${discount}%`);
      updateSlotDiscount(slot.slot_id, discount);
      updated++;
    } else {
      console.log(`✗ Slot ${slot.slot_id}: No discount found`);
    }
  }

  console.log(`\nDone! Updated ${updated} slots with discounts.`);
  db.close();
}

main().catch(console.error);
