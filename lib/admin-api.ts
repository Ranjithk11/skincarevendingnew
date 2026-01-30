const FLASK_API_BASE = process.env.NEXT_PUBLIC_FLASK_API_URL || "http://localhost:5000";

export interface Product {
  id: number;
  external_id?: string;
  name: string;
  description?: string;
  retail_price: number;
  product_use?: string;
  product_benefits?: string;
  application?: string;
  product_type?: string;
  category?: string;
  category_sort_order?: number;
  image_url?: string;
  image_tag?: string;
  in_stock: boolean;
  quantity: number;
  min_quantity?: number;
  skin_types?: string;
  matching_attributes?: string;
  matches?: string;
  discount?: string;
  shopify_url?: string;
  created_at?: string;
  updated_at?: string;
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

export interface SlotInfo {
  slot_id: number;
  quantity: number;
  product_id?: number;
  product_name?: string;
  category?: string;
  retail_price?: number;
  image_url?: string;
}

export async function adminLogin(username: string, password: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ username, password }),
      credentials: "include",
    });

    if (response.ok) {
      return { success: true, message: "Login successful" };
    }
    return { success: false, message: "Invalid credentials" };
  } catch (error) {
    console.error("Admin login error:", error);
    return { success: false, message: "Failed to connect to server" };
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch(`${FLASK_API_BASE}/admin/logout`, {
      credentials: "include",
    });
  } catch (error) {
    console.error("Admin logout error:", error);
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/api/products`, {
      credentials: "include",
    });
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (error) {
    console.error("Get products error:", error);
    return [];
  }
}

export async function getVendingSlots(): Promise<Record<number, VendingSlot>> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/api/vending-slots`, {
      credentials: "include",
    });
    if (response.ok) {
      return await response.json();
    }
    return {};
  } catch (error) {
    console.error("Get vending slots error:", error);
    return {};
  }
}

export async function getSlotInfo(slotId: number): Promise<SlotInfo | null> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/admin/get-slot-info/${slotId}`, {
      credentials: "include",
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Get slot info error:", error);
    return null;
  }
}

export async function assignProductToSlot(
  slotId: number,
  productId: number | null,
  quantity: number = 0
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/admin/assign-product-to-slot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        slot_id: slotId.toString(),
        product_id: productId?.toString() || "",
        quantity: quantity.toString(),
      }),
      credentials: "include",
    });

    if (response.ok) {
      return { success: true, message: `Slot ${slotId} updated successfully` };
    }
    return { success: false, message: "Failed to assign product to slot" };
  } catch (error) {
    console.error("Assign product to slot error:", error);
    return { success: false, message: "Failed to connect to server" };
  }
}

export async function updateSlotQuantity(
  slotId: number,
  changeAmount: number
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/admin/update-slot-quantity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        slot_id: slotId.toString(),
        change_amount: changeAmount.toString(),
      }),
      credentials: "include",
    });

    if (response.ok) {
      return { success: true, message: `Slot ${slotId} quantity updated successfully` };
    }
    return { success: false, message: "Failed to update slot quantity" };
  } catch (error) {
    console.error("Update slot quantity error:", error);
    return { success: false, message: "Failed to connect to server" };
  }
}

export async function syncProductQuantities(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/admin/sync-product-quantities`, {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      return { success: true, message: "Product quantities synchronized successfully" };
    }
    return { success: false, message: "Failed to sync product quantities" };
  } catch (error) {
    console.error("Sync product quantities error:", error);
    return { success: false, message: "Failed to connect to server" };
  }
}

export async function getSlotsForProduct(productId: number): Promise<SlotInfo[]> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/admin/get-all-slots-for-product/${productId}`, {
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      return data.slots || [];
    }
    return [];
  } catch (error) {
    console.error("Get slots for product error:", error);
    return [];
  }
}

export async function motorControl(command: string): Promise<{ success: boolean; message: string; response?: string }> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/admin/motor-control`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Motor control error:", error);
    return { success: false, message: "Failed to connect to server" };
  }
}

export async function getProductsWithSlots(): Promise<Product[]> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/api/products-with-slots`, {
      credentials: "include",
    });
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (error) {
    console.error("Get products with slots error:", error);
    return [];
  }
}

export async function getProductsWithoutSlots(): Promise<Product[]> {
  try {
    const response = await fetch(`${FLASK_API_BASE}/api/products-without-slots`, {
      credentials: "include",
    });
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (error) {
    console.error("Get products without slots error:", error);
    return [];
  }
}
