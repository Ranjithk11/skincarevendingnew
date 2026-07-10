"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminDashboard } from "@/containers/admin-dashboard";
import { SlotAssignmentModal, MachineStatusModal, EditProductModal, MachineSettingsModal } from "@/containers/admin-dashboard/components";
import { Snackbar, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import {
  useGetVendingSlotsQuery,
  useGetProductsQuery,
  useSyncProductQuantitiesMutation,
  useAssignProductToSlotMutation,
  useUpdateSlotQuantityMutation,
  useMotorControlMutation,
  useRemoveProductFromSlotMutation,
  VendingSlot,
  Product,
} from "@/redux/api/adminApi";
import {
  normalizeProductId,
  productIdKeys,
  getSlotRetailPriceForProduct,
} from "@/lib/product-slot-utils";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Machine status modal states
  const [homingModalOpen, setHomingModalOpen] = useState(false);
  const [homingStatus, setHomingStatus] = useState<boolean | null>(null);
  const [homingLoading, setHomingLoading] = useState(false);
  
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [dispenseStatus, setDispenseStatus] = useState<boolean | null>(null);
  const [dispenseLoading, setDispenseLoading] = useState(false);

  const [trayDoorModalOpen, setTrayDoorModalOpen] = useState(false);
  const [trayDoorStatus, setTrayDoorStatus] = useState<boolean | null>(null);
  const [trayDoorLoading, setTrayDoorLoading] = useState(false);

  // Edit product modal state
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{
    id: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
  } | null>(null);

  // Success snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  // Machine settings modal state
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Redux queries
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useGetVendingSlotsQuery();
  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useGetProductsQuery();
  
  // State to hold every product fetched from the DB
  const [allCategoryProducts, setAllCategoryProducts] = useState<any[]>([]);
  const [hasFetchedAllProducts, setHasFetchedAllProducts] = useState(false);

  // Backend search results for the slot-assignment modal. The pre-fetched
  // category list may not contain every product (e.g. brand-only products), so
  // when the admin searches we query the backend directly for matches.
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalSearchResults, setModalSearchResults] = useState<any[]>([]);
  const [isModalSearching, setIsModalSearching] = useState(false);
  
  // Fetch EVERY product in the DB by paginating the catalog endpoint.
  // The backend caps `limit` at 100 per page and reports `totalCounts`, so a
  // single request only returns a slice. We page through all of them (no brand
  // / shopify filters) so every product can be assigned to a slot.
  useEffect(() => {
    const fetchAllProducts = async () => {
      if (hasFetchedAllProducts) return;

      const API_BASE = process.env.NEXT_PUBLIC_API_URL;
      if (!API_BASE) return;
      setHasFetchedAllProducts(true);

      const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (DB_TOKEN) headers["x-db-token"] = DB_TOKEN;

      const PAGE_SIZE = 100;

      const fetchPage = async (page: number, attempt = 0): Promise<{ products: any[]; total: number }> => {
        try {
          const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
          const res = await fetch(`${API_BASE}/product/fetch-by-filter?${params}`, {
            headers,
            cache: "no-store",
          });
          if (!res.ok) throw new Error(`page ${page} -> ${res.status}`);
          const result = await res.json();
          const products = result?.data?.[0]?.products || result?.data || [];
          const total = Number(result?.totalCounts ?? 0);
          return { products, total };
        } catch (err) {
          if (attempt < 2) return fetchPage(page, attempt + 1);
          console.error(`[Admin] Failed to fetch products page ${page}:`, err);
          return { products: [], total: 0 };
        }
      };

      try {
        const allProducts: any[] = [];
        const seenIds = new Set<string>();
        const addAll = (list: any[]) =>
          list.forEach((p: any) => {
            const id = p._id || p.id;
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              allProducts.push(p);
            }
          });

        const first = await fetchPage(1);
        addAll(first.products);

        const total = first.total || first.products.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

        if (totalPages > 1) {
          const pages = [];
          for (let page = 2; page <= totalPages; page++) {
            pages.push(fetchPage(page).then((r) => r.products));
          }
          (await Promise.all(pages)).forEach(addAll);
        }

        console.log(`[Admin] Fetched ${allProducts.length} of ${total} products (${totalPages} pages)`);

        // If nothing came back (e.g. network outage), allow a later retry.
        if (allProducts.length === 0) {
          setHasFetchedAllProducts(false);
        } else {
          setAllCategoryProducts(allProducts);
        }
      } catch (err) {
        console.error("[Admin] Error fetching all products:", err);
        setHasFetchedAllProducts(false);
      }
    };

    fetchAllProducts();
  }, [hasFetchedAllProducts]);

  // Debounced backend search for the slot-assignment modal so any product in
  // the DB can be found and assigned, even if it wasn't in the pre-fetched list.
  useEffect(() => {
    const query = modalSearchQuery.trim();
    if (query.length < 2) {
      setModalSearchResults([]);
      setIsModalSearching(false);
      return;
    }

    let cancelled = false;
    setIsModalSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: query, page: "1", limit: "1000" });
        const res = await fetch(`/api/admin/products?${params.toString()}`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const json = await res.json();
        const results = Array.isArray(json) ? json : json?.data?.[0]?.products || [];
        if (!cancelled) setModalSearchResults(results);
      } catch (err) {
        console.error("[Admin] Modal product search error:", err);
        if (!cancelled) setModalSearchResults([]);
      } finally {
        if (!cancelled) setIsModalSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [modalSearchQuery]);

  // Redux mutations
  const [syncQuantities, { isLoading: isSyncing }] = useSyncProductQuantitiesMutation();
  const [assignProduct] = useAssignProductToSlotMutation();
  const [updateQuantity] = useUpdateSlotQuantityMutation();
  const [motorControl] = useMotorControlMutation();
  const [removeProduct] = useRemoveProductFromSlotMutation();

  // Check auth on mount
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("admin_logged_in");
    if (!isLoggedIn) {
      router.push("/admin/login");
    }
  }, [router]);

  // Helper function to get total quantity from slots for a product
  const getProductQuantityFromSlots = (productId: string): number => {
    if (!slotsData) return 0;
    const cleanProductId = normalizeProductId(productId);
    if (!cleanProductId) return 0;

    let totalQuantity = 0;
    Object.values(slotsData).forEach((slot: any) => {
      if (!slot.product_id) return;
      const slotCleanId = normalizeProductId(slot.product_id);
      if (slotCleanId === cleanProductId) {
        totalQuantity += slot.quantity || 0;
      }
    });
    return totalQuantity;
  };

  type InventoryProductRow = {
    id: string;
    name: string;
    category: string;
    retail_price: number;
    discount?: { value: number };
    price: string;
    amount: number;
    image?: string;
  };

  const resolveInventoryPrice = (
    productId: string,
    catalogPrice: number,
    adminMatch?: InventoryProductRow
  ): number => {
    const slotPrice = getSlotRetailPriceForProduct(productId, slotsData);
    if (slotPrice !== undefined) return slotPrice;
    if (adminMatch?.retail_price !== undefined && adminMatch.retail_price !== null) {
      return adminMatch.retail_price;
    }
    return catalogPrice;
  };

  const findAdminProductMatch = (productId: string): InventoryProductRow | undefined => {
    for (const key of productIdKeys(productId)) {
      const match = adminProductsById.get(key);
      if (match) return match;
    }
    return undefined;
  };

  // Transform admin products data for the table
  const adminProducts: InventoryProductRow[] = productsData?.map((product: Product) => {
    const productId = product.id.toString();
    const catalogPrice = Number(product.retail_price ?? 0);
    const retailPrice = resolveInventoryPrice(productId, catalogPrice);
    const slotQty = getProductQuantityFromSlots(productId);
    return {
      id: productId,
      name: product.name,
      category: product.category || "Uncategorized",
      retail_price: retailPrice,
      discount: product.discount || undefined,
      price: `Rs.${retailPrice}`,
      amount: slotQty,
      image: product.image_url,
    };
  }) || [];

  const adminProductsById = new Map<string, InventoryProductRow>();
  adminProducts.forEach((p: InventoryProductRow) => {
    for (const key of productIdKeys(p.id)) {
      adminProductsById.set(key, p);
    }
  });
  
  // Transform ALL browse products (from all categories) and merge with admin products
  const browseProducts = allCategoryProducts.map((p: any) => {
    const productId = p._id || p.id;
    const productName = p.name;
    const catalogPrice = Number(p.retailPrice || p.retail_price || 0);
    const adminMatch = findAdminProductMatch(String(productId));
    const retailPrice = resolveInventoryPrice(String(productId), catalogPrice, adminMatch);
    const slotQty = getProductQuantityFromSlots(String(productId));
    return {
      id: productId,
      name: adminMatch?.name ?? productName,
      category: adminMatch?.category ?? (p.productCategory?.title || p.category || "Uncategorized"),
      retail_price: retailPrice,
      discount: adminMatch?.discount ?? (p.discount || undefined),
      price: `Rs.${retailPrice}`,
      amount: slotQty,
      image: adminMatch?.image ?? (p.images?.[0]?.url || p.image_url || ""),
    };
  });
  
  // One row per product — slot totals and custom prices from machine slots
  const transformedProducts = (() => {
    const byKey = new Map<string, InventoryProductRow>();

    const upsert = (row: InventoryProductRow) => {
      const key = normalizeProductId(row.id);
      if (!key) return;
      const slotQty = getProductQuantityFromSlots(String(row.id));
      const merged: InventoryProductRow = { ...row, amount: slotQty };
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, merged);
        return;
      }
      byKey.set(key, {
        ...existing,
        ...merged,
        amount: slotQty,
        retail_price: merged.retail_price ?? existing.retail_price,
        name: merged.name || existing.name,
        image: merged.image || existing.image,
      });
    };

    browseProducts.forEach(upsert);
    adminProducts.forEach(upsert);

    if (slotsData) {
      Object.values(slotsData).forEach((slot: any) => {
        if (!slot?.product_id || Number(slot.quantity || 0) <= 0) return;
        const productId = String(slot.product_id);
        const key = normalizeProductId(productId);
        if (!key || byKey.has(key)) return;

        const browseMatch = allCategoryProducts.find(
          (p: any) => normalizeProductId(p._id || p.id) === key
        );
        const catalogPrice = Number(
          browseMatch?.retailPrice || browseMatch?.retail_price || slot.retail_price || 0
        );
        const retailPrice = resolveInventoryPrice(productId, catalogPrice);

        upsert({
          id: productId,
          name: slot.product_name || browseMatch?.name || "Product",
          category: slot.category || browseMatch?.productCategory?.title || "Uncategorized",
          retail_price: retailPrice,
          price: `Rs.${retailPrice}`,
          amount: getProductQuantityFromSlots(productId),
          image: slot.image_url || browseMatch?.images?.[0]?.url || "",
        });
      });
    }

    return Array.from(byKey.values());
  })();

  const handleCartClick = () => {
    router.push("/products");
  };

  const handleScanAgainClick = () => {
    localStorage.removeItem("admin_logged_in");
    localStorage.removeItem("admin_name");
    router.push("/");
  };

  const handleDashboardClick = () => {
    refetchSlots();
    refetchProducts();
  };

  const handleHomeMachineClick = async () => {
    setHomingModalOpen(true);
    setHomingLoading(true);
    setHomingStatus(null);
    
    try {
      const result = await motorControl({ command: "HOME" }).unwrap();
      setHomingStatus(result.success);
    } catch (error) {
      console.error("Homing error:", error);
      setHomingStatus(false);
    } finally {
      setHomingLoading(false);
    }
  };

  const handleDispenseClick = async () => {
    setDispenseModalOpen(true);
    setDispenseLoading(true);
    setDispenseStatus(null);
    
    try {
      const result = await motorControl({ command: "REOPEN" }).unwrap();
      setDispenseStatus(result.success);
    } catch (error) {
      console.error("Dispense error:", error);
      setDispenseStatus(false);
    } finally {
      setDispenseLoading(false);
    }
  };

  const handleTrayDoorClick = async () => {
    setTrayDoorModalOpen(true);
    setTrayDoorLoading(true);
    setTrayDoorStatus(null);

    try {
      const result = await motorControl({ command: "REOPEN" }).unwrap();
      setTrayDoorStatus(result.success);
    } catch (error) {
      console.error("Tray door error:", error);
      setTrayDoorStatus(false);
    } finally {
      setTrayDoorLoading(false);
    }
  };

  const handleVoiceClick = () => {
    console.log("Voice clicked");
  };

  const handleTestClick = async () => {
    if (selectedSlot) {
      try {
        await motorControl({ command: `M,${selectedSlot},0` });
      } catch (error) {
        console.error("Test error:", error);
      }
    }
  };

  const handleHideClick = () => {
    console.log("Hide clicked");
  };

  const handleLoadProductsClick = () => {
    refetchProducts();
  };

  const handleSettingsClick = () => {
    setSettingsModalOpen(true);
  };

  const handleSyncClick = async () => {
    try {
      await syncQuantities();
      refetchSlots();
      refetchProducts();
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

  const handleSlotClick = (slotNumber: number) => {
    setSelectedSlot(slotNumber);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setModalSearchQuery("");
    setModalSearchResults([]);
    setIsModalSearching(false);
  };

  const handleAssignProduct = async (
    slotNumber: number,
    productId: string,
    quantity: number,
    retailPrice: number,
    productDetails?: { name?: string; category?: string; image?: string }
  ) => {
    try {
      const targetKey = normalizeProductId(productId);

      // Match against catalog/browse data using normalized IDs so a "products/"
      // prefix mismatch never drops the name (which would make the slot show "none").
      const product = productsData?.find(
        (p: Product) => normalizeProductId(p.id) === targetKey
      );
      const browseProduct = allCategoryProducts.find(
        (p: any) => normalizeProductId(p._id || p.id) === targetKey
      );

      // Prefer the details the modal already resolved (what the admin actually
      // selected), then fall back to catalog/browse lookups.
      const productName =
        productDetails?.name ||
        product?.name ||
        browseProduct?.name;
      const category =
        productDetails?.category ||
        product?.category ||
        browseProduct?.productCategory?.title ||
        browseProduct?.category ||
        "Uncategorized";
      const imageUrl =
        productDetails?.image ||
        product?.image_url ||
        browseProduct?.images?.[0]?.url ||
        browseProduct?.image_url ||
        "";

      let discountValue = product?.discount?.value;
      if (discountValue === undefined && browseProduct?.discount) {
        discountValue =
          browseProduct.discount.value ||
          browseProduct.discount.percentage ||
          browseProduct.discount;
      }

      await assignProduct({
        slotId: slotNumber,
        productId: productId,
        quantity,
        productName: productName,
        category: category,
        retailPrice: retailPrice,
        imageUrl: imageUrl,
        discountValue: discountValue,
      });
      refetchSlots();
      refetchProducts();
    } catch (error) {
      console.error("Assign product error:", error);
    }
  };

  const handleRemoveProduct = async (slotNumber: number) => {
    try {
      await removeProduct({ slotId: slotNumber });
      refetchSlots();
      refetchProducts();
    } catch (error) {
      console.error("Remove product error:", error);
    }
  };

  const handleUpdateSlotQuantity = async (slotNumber: number, quantity: number) => {
    try {
      await updateQuantity({ slotId: slotNumber, quantity });
      refetchSlots();
    } catch (error) {
      console.error("Update quantity error:", error);
    }
  };

  // Get current slot data for modal
  const currentSlotData = selectedSlot ? slotsData?.[selectedSlot] : null;
  // Try to find product in products list, or use slot's stored product info
  let currentProduct = currentSlotData?.product_id 
    ? productsData?.find((p: Product) => p.id.toString() === currentSlotData.product_id?.toString())
    : null;
  
  // If product not found in list but slot has product info, create a product object from slot data
  if (!currentProduct && currentSlotData?.product_id && currentSlotData?.product_name) {
    currentProduct = {
      id: currentSlotData.product_id.toString(),
      name: currentSlotData.product_name,
      category: currentSlotData.category || "",
      retail_price: currentSlotData.retail_price ?? 0,
      image_url: (currentSlotData as any).image_url || "",
      quantity: currentSlotData.quantity || 0,
      in_stock: true,
    };
  } else if (currentProduct && currentSlotData) {
    currentProduct = {
      ...currentProduct,
      retail_price: currentProduct.retail_price ?? currentSlotData.retail_price ?? 0,
    };
  }

  const getCatalogPrice = (productId: string) => {
    const browseProduct = allCategoryProducts.find(
      (p: any) => String(p._id || p.id) === productId || String(p._id || p.id).replace(/^products\//, "") === productId.replace(/^products\//, "")
    );
    return Number(browseProduct?.retailPrice || browseProduct?.retail_price || 0);
  };

  // Transform products for modal - include admin products, browse products, and slot-assigned products
  const apiProducts = productsData?.map((product: Product) => {
    const productId = product.id.toString();
    const catalogPrice = getCatalogPrice(productId) || Number(product.retail_price ?? 0);
    const retailPrice = resolveInventoryPrice(productId, catalogPrice);
    return {
      id: productId,
      name: product.name,
      category: product.category || "Uncategorized",
      price: `₹${retailPrice}`,
      originalPrice: catalogPrice,
      retailPrice,
      amount: product.quantity,
      image: product.image_url,
    };
  }) || [];
  
  // Add browse products (from ALL categories) to modal
  const browseModalProducts = allCategoryProducts.map((p: any) => {
    const productId = String(p._id || p.id);
    const adminMatch = findAdminProductMatch(productId);
    const catalogPrice = Number(p.retailPrice || p.retail_price || 0);
    const effectivePrice = resolveInventoryPrice(productId, catalogPrice, adminMatch);

    return {
      id: productId,
      name: adminMatch?.name ?? p.name,
      category:
        adminMatch?.category ??
        (p.productCategory?.title || p.category || "Uncategorized"),
      price: `₹${effectivePrice}`,
      originalPrice: catalogPrice,
      retailPrice: effectivePrice,
      amount:
        adminMatch?.amount ??
        (p.quantity || 0),
      image:
        adminMatch?.image ??
        (p.images?.[0]?.url || p.image_url || ""),
    };
  });
  
  // Add slot-assigned products that aren't in the API list (for slots 1-10 with local products)
  const slotProducts: typeof apiProducts = [];
  if (slotsData) {
    Object.values(slotsData).forEach((slot: any) => {
      if (slot.product_id && slot.product_name) {
        const existsInApi = apiProducts.some(p => p.id === slot.product_id?.toString());
        const existsInBrowse = browseModalProducts.some((p: any) => p.id === slot.product_id?.toString());
        const existsInSlotProducts = slotProducts.some(p => p.id === slot.product_id?.toString());
        if (!existsInApi && !existsInBrowse && !existsInSlotProducts) {
          slotProducts.push({
            id: slot.product_id.toString(),
            name: slot.product_name,
            category: slot.category || "Uncategorized",
            price: `₹${slot.retail_price ?? 0}`,
            originalPrice: getCatalogPrice(slot.product_id.toString()) || Number(slot.retail_price ?? 0),
            retailPrice: Number(slot.retail_price ?? 0),
            amount: slot.quantity || 0,
            image: slot.image_url || "",
          });
        }
      }
    });
  }
  
  // Products returned by the backend search (covers products missing from the
  // pre-fetched list, e.g. brand-only products) mapped to modal shape.
  const searchModalProducts = modalSearchResults
    .map((p: any) => {
      const productId = String(p.id ?? p._id ?? "");
      if (!productId) return null;
      const adminMatch = findAdminProductMatch(productId);
      const catalogPrice = Number(p.retail_price ?? p.retailPrice ?? 0);
      const effectivePrice = resolveInventoryPrice(productId, catalogPrice, adminMatch);
      return {
        id: productId,
        name: adminMatch?.name ?? p.name,
        category:
          adminMatch?.category ??
          (p.category || p.productCategory?.title || "Uncategorized"),
        price: `₹${effectivePrice}`,
        originalPrice: catalogPrice,
        retailPrice: effectivePrice,
        amount: getProductQuantityFromSlots(productId),
        image: adminMatch?.image ?? (p.image_url || p.images?.[0]?.url || ""),
      };
    })
    .filter(Boolean) as any[];

  // Merge all products - search results first, then browse, admin, slot products
  const allProductIds = new Set<string>();
  const modalProducts: typeof apiProducts = [];

  // Add backend search results first so a searched product is always present
  searchModalProducts.forEach((p: any) => {
    if (!allProductIds.has(p.id)) {
      allProductIds.add(p.id);
      modalProducts.push(p);
    }
  });

  // Add browse products
  browseModalProducts.forEach((p: any) => {
    if (!allProductIds.has(p.id)) {
      allProductIds.add(p.id);
      modalProducts.push(p);
    }
  });
  
  // Add admin products
  apiProducts.forEach((p: any) => {
    if (!allProductIds.has(p.id)) {
      allProductIds.add(p.id);
      modalProducts.push(p);
    }
  });
  
  // Add slot products
  slotProducts.forEach((p: any) => {
    if (!allProductIds.has(p.id)) {
      allProductIds.add(p.id);
      modalProducts.push(p);
    }
  });
  
  // Debug: Log modal products count
  console.log("[Admin] Modal products count:", modalProducts.length, "browse:", browseModalProducts.length, "admin:", apiProducts.length);

  const handleProductEditClick = (productId: string) => {
    const cleanId = normalizeProductId(productId);
    const product = transformedProducts.find((p: any) => {
      const pid = String(p.id ?? "");
      return pid === productId || normalizeProductId(pid) === cleanId;
    });

    if (!product) {
      setSnackbar({
        open: true,
        message: "Could not open this product for editing.",
        severity: "error",
      });
      return;
    }

    setEditingProduct({
      id: cleanId || String(product.id),
      name: product.name,
      category: product.category || "",
      price: Number(product.retail_price ?? 0),
      quantity: Number(product.amount ?? 0),
    });
    setEditProductModalOpen(true);
  };

  const handleSaveProduct = async (data: {
    productId: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
  }) => {
    try {
      // Remove 'products/' prefix if present to avoid duplicate path
      const cleanProductId = data.productId.replace(/^products\//, '');
      // Update product via API (saves to local storage for external products)
      await fetch(`/api/admin/products/${cleanProductId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          category: data.category,
          retail_price: data.price,
        }),
      });
      
      // Refetch products and slots to show updated data
      await refetchProducts();
      await refetchSlots();
      setSnackbar({ open: true, message: "Product updated successfully!", severity: "success" });
    } catch (error) {
      console.error("Error saving product:", error);
      setSnackbar({ open: true, message: "Failed to update product.", severity: "error" });
    }
  };

  // Only wait for slots and admin products, browse products can load async
  if (slotsLoading || productsLoading) {
    return (
      <div style={{ display: "flex",fontSize:"28px", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <AdminDashboard
        products={transformedProducts}
        slots={slotsData}
        isKiosk={false}
        onCartClick={handleCartClick}
        onScanAgainClick={handleScanAgainClick}
        cartCount={0}
        onDashboardClick={handleDashboardClick}
        onHomeMachineClick={handleHomeMachineClick}
        onDispenseClick={handleDispenseClick}
        onTrayDoorClick={handleTrayDoorClick}
        onVoiceClick={handleVoiceClick}
        onTestClick={handleTestClick}
        onHideClick={handleHideClick}
        onLoadProductsClick={handleLoadProductsClick}
        onSettingsClick={handleSettingsClick}
        onSyncClick={handleSyncClick}
        onSlotClick={handleSlotClick}
        onProductEditClick={handleProductEditClick}
        onInventoryUpdated={() => {
          refetchSlots();
          refetchProducts();
        }}
        selectedSlot={selectedSlot}
        isSyncing={isSyncing}
      />
      
      <SlotAssignmentModal
        open={modalOpen}
        onClose={handleModalClose}
        slotNumber={selectedSlot || 1}
        products={modalProducts}
        currentProduct={currentProduct ? {
          id: currentProduct.id.toString(),
          name: currentProduct.name,
          category: currentProduct.category || "Uncategorized",
          price: `₹${currentProduct.retail_price}`,
          amount: currentProduct.quantity,
          image: currentProduct.image_url,
        } : null}
        currentQuantity={currentSlotData?.quantity || 0}
        onAssign={handleAssignProduct}
        onRemove={handleRemoveProduct}
        onUpdateQuantity={handleUpdateSlotQuantity}
        onSearchChange={setModalSearchQuery}
        isSearching={isModalSearching}
      />
      
      {/* Machine Homing Status Modal */}
      <MachineStatusModal
        open={homingModalOpen}
        onClose={() => setHomingModalOpen(false)}
        title="Machine Homing Status"
        isSuccess={homingStatus}
        isLoading={homingLoading}
        successMessage="Homing command sent successfully"
        errorMessage="Error Sending homing command"
        successSubMessage="Connected to machine"
        errorSubMessage="Failed to connect to the machine"
      />
      
      {/* Machine Dispense Status Modal */}
      <MachineStatusModal
        open={dispenseModalOpen}
        onClose={() => setDispenseModalOpen(false)}
        title="Machine Dispense Status"
        isSuccess={dispenseStatus}
        isLoading={dispenseLoading}
        successMessage="Dispense command sent successfully"
        errorMessage="Error Sending dispense command"
        successSubMessage="Connected to machine"
        errorSubMessage="Failed to connect to the machine"
      />

      <MachineStatusModal
        open={trayDoorModalOpen}
        onClose={() => setTrayDoorModalOpen(false)}
        title="Tray Door Status"
        isSuccess={trayDoorStatus}
        isLoading={trayDoorLoading}
        successMessage="Tray door reopened successfully"
        errorMessage="Failed to reopen tray door"
        successSubMessage="The tray door has been reopened"
        errorSubMessage="Failed to connect to the machine"
      />
      {/* Edit Product Modal */}
      <EditProductModal
        open={editProductModalOpen}
        onClose={() => {
          setEditProductModalOpen(false);
          setEditingProduct(null);
        }}
        productId={editingProduct?.id || ""}
        productName={editingProduct?.name || ""}
        category={editingProduct?.category || ""}
        price={editingProduct?.price || 0}
        quantity={editingProduct?.quantity || 0}
        onSave={handleSaveProduct}
      />

      {/* Machine Settings Modal */}
      <MachineSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", fontSize: 18 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
