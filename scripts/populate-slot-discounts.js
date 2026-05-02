const API_BASE = 'http://localhost:3000';

async function getSlots() {
  const res = await fetch(`${API_BASE}/api/admin/slots`);
  if (!res.ok) throw new Error('Failed to fetch slots');
  const data = await res.json();
  // Handle both array and object formats
  return Array.isArray(data) ? data : Object.values(data);
}

async function getProductDiscount(productName, productId) {
  try {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '50');
    params.set('search', productName);

    const res = await fetch(`${API_BASE}/api/admin/products?${params.toString()}`);
    if (!res.ok) return null;

    const json = await res.json();
    const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

    const product = arr.find(p => 
      String(p?.id || p?._id) === productId ||
      String(p?.id || p?._id) === productId?.replace('products/', '') ||
      String(p?.name).toUpperCase().includes(productName.toUpperCase().substring(0, 15))
    );

    return product?.discount?.value || null;
  } catch (e) {
    console.error(`Error fetching discount for ${productName}:`, e.message);
    return null;
  }
}

async function updateSlotDiscount(slotId, discount) {
  const slot = await getSlotById(slotId);
  if (!slot) return;

  const res = await fetch(`${API_BASE}/api/admin/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slot_id: slot.slot_id,
      product_id: slot.product_id,
      quantity: slot.quantity,
      product_name: slot.product_name,
      category: slot.category,
      retail_price: slot.retail_price,
      image_url: slot.image_url,
      discount_value: discount,
    }),
  });

  if (!res.ok) {
    console.error(`Failed to update slot ${slotId}`);
  }
}

async function getSlotById(slotId) {
  const slots = await getSlots();
  return slots.find(s => s.slot_id === slotId);
}

async function main() {
  console.log('Fetching slots...');
  const slots = await getSlots();
  console.log(`Found ${slots.length} slots`);

  let updated = 0;
  for (const slot of slots) {
    if (!slot.product_id || !slot.product_name) continue;
    if (slot.discount_value !== null && slot.discount_value !== undefined) {
      console.log(`Slot ${slot.slot_id} already has discount: ${slot.discount_value}`);
      continue;
    }

    console.log(`Checking discount for slot ${slot.slot_id}: ${slot.product_name}`);
    const discount = await getProductDiscount(slot.product_name, slot.product_id);
    
    if (discount && discount > 0) {
      console.log(`✓ Slot ${slot.slot_id}: Found discount ${discount}%`);
      await updateSlotDiscount(slot.slot_id, discount);
      updated++;
    } else {
      console.log(`✗ Slot ${slot.slot_id}: No discount found`);
    }
  }

  console.log(`\nDone! Updated ${updated} slots with discounts.`);
}

main().catch(console.error);
