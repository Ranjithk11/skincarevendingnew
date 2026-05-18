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
import { useGetFilteredProductsQuery, useGetProductCategoriesQuery } from "@/redux/api/products";

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
  
  // Fetch product categories
  const { data: categoriesData } = useGetProductCategoriesQuery({});
  
  // Fetch Browse Products (same as /products page) - auto-fetches on mount
  const { data: browseProductsData, isLoading: browseProductsLoading } = useGetFilteredProductsQuery({
    page: 1,
    limit: 1000,
    hasBrand: true,
    isShopifyAvailable: true,
  });
  
  // State to hold all products from all categories
  const [allCategoryProducts, setAllCategoryProducts] = useState<any[]>([]);
  const [hasFetchedAllProducts, setHasFetchedAllProducts] = useState(false);
  
  // Fetch products for each category and merge them - runs only once when data is ready
  useEffect(() => {
    const fetchAllCategoryProducts = async () => {
      // Only fetch once when categories and browse products are loaded
      if (hasFetchedAllProducts || !categoriesData?.data || !browseProductsData) return;
      
      setHasFetchedAllProducts(true);
      const categories = categoriesData.data.filter((cat: any) => cat._id !== "all");
      const allProducts: any[] = [];
      const seenIds = new Set<string>();
      
      // Add products from the main query first
      const mainProducts = browseProductsData?.data?.[0]?.products || [];
      mainProducts.forEach((p: any) => {
        const id = p._id || p.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          allProducts.push(p);
        }
      });
      
      // Fetch products for each category
      const API_BASE = process.env.NEXT_PUBLIC_API_URL;
      const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;
      
      for (const category of categories) {
        try {
          const params = new URLSearchParams({
            page: "1",
            limit: "500",
            hasBrand: "true",
            isShopifyAvailable: "true",
            catId: category._id || category._key,
          });
          
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (DB_TOKEN) headers["x-db-token"] = DB_TOKEN;
          
          const response = await fetch(`${API_BASE}/product/fetch-by-filter?${params}`, { headers });
          if (response.ok) {
            const result = await response.json();
            const categoryProducts = result?.data?.[0]?.products || [];
            
            categoryProducts.forEach((p: any) => {
              const id = p._id || p.id;
              if (!seenIds.has(id)) {
                seenIds.add(id);
                allProducts.push(p);
              }
            });
          }
        } catch (err) {
          console.error(`Error fetching category ${category.title}:`, err);
        }
      }
      
      console.log("[Admin] Total products from all categories:", allProducts.length);
      console.log("[Admin] Categories fetched:", categories.length);
      console.log("[Admin] Main products count:", mainProducts.length);
      setAllCategoryProducts(allProducts);
    };
    
    fetchAllCategoryProducts();
  }, [categoriesData, browseProductsData, hasFetchedAllProducts]);

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
  const getProductQuantityFromSlots = (productId: string, productName: string): number => {
    if (!slotsData) return 0;
    let totalQuantity = 0;
    const cleanProductId = productId.replace(/^products\//, '');
    const searchName = productName?.toUpperCase().trim();
    
    Object.values(slotsData).forEach((slot: any) => {
      if (!slot.product_id) return;
      const slotProductId = slot.product_id?.toString().replace(/^products\//, '');
      const slotProductName = slot.product_name?.toUpperCase().trim();
      
      // Match by ID or by name prefix
      const idMatch = slotProductId === cleanProductId || slot.product_id?.toString() === productId;
      let nameMatch = false;
      if (searchName && slotProductName) {
        const searchPrefix = searchName.substring(0, 15);
        const slotPrefix = slotProductName.substring(0, 15);
        nameMatch = slotProductName.includes(searchPrefix) || searchName.includes(slotPrefix);
      }
      
      if (idMatch || nameMatch) {
        totalQuantity += slot.quantity || 0;
      }
    });
    return totalQuantity;
  };

  // Transform admin products data for the table
  const adminProducts = productsData?.map((product: Product) => ({
    id: product.id.toString(),
    name: product.name,
    category: product.category || "Uncategorized",
    retail_price: product.retail_price,
    discount: product.discount || null,
    price: `Rs.${product.retail_price}`,
    amount: product.quantity || getProductQuantityFromSlots(product.id.toString(), product.name),
    image: product.image_url,
  })) || [];

  const adminProductsById = new Map<string, (typeof adminProducts)[number]>();
  adminProducts.forEach((p) => {
    adminProductsById.set(p.id, p);
    adminProductsById.set(String(p.id).replace(/^products\//, ""), p);
  });
  
  // Transform ALL browse products (from all categories) and merge with admin products
  const browseProducts = allCategoryProducts.map((p: any) => {
    const productId = p._id || p.id;
    const productName = p.name;
    const adminMatch = adminProductsById.get(String(productId)) || adminProductsById.get(String(productId).replace(/^products\//, ""));
    return {
      id: productId,
      name: adminMatch?.name ?? productName,
      category: adminMatch?.category ?? (p.productCategory?.title || p.category || "Uncategorized"),
      retail_price: adminMatch?.retail_price ?? (p.retailPrice || p.retail_price || 0),
      discount: adminMatch?.discount ?? (p.discount || null),
      price: adminMatch?.price ?? `Rs.${p.retailPrice || p.retail_price || 0}`,
      amount: adminMatch?.amount ?? getProductQuantityFromSlots(productId, productName),
      image: adminMatch?.image ?? (p.images?.[0]?.url || p.image_url || ""),
    };
  });
  
  // Merge products - browse products first, then admin products (avoiding duplicates)
  const adminProductIds = new Set(adminProducts.map((p: any) => p.id));
  const uniqueBrowseProducts = browseProducts.filter((p: any) => !adminProductIds.has(p.id));
  const transformedProducts = [...browseProducts, ...adminProducts.filter((p: any) => !browseProducts.some((bp: any) => bp.id === p.id))];

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
    // Check if a slot is selected first
    if (!selectedSlot) {
      alert("Please select a slot first before dispensing");
      return;
    }
    
    setDispenseModalOpen(true);
    setDispenseLoading(true);
    setDispenseStatus(null);
    
    try {
      const command = `M,${selectedSlot},1`;
      const result = await motorControl({ command }).unwrap();
      setDispenseStatus(result.success);
      if (result.success) {
        refetchSlots();
      }
    } catch (error) {
      console.error("Dispense error:", error);
      setDispenseStatus(false);
    } finally {
      setDispenseLoading(false);
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
  };

  const handleAssignProduct = async (slotNumber: number, productId: string, quantity: number) => {
    try {
      // Find the product in admin products first
      let product = productsData?.find((p: Product) => p.id.toString() === productId);

      // If not found, search in browse products (allCategoryProducts)
      let productName = product?.name;
      let category = product?.category;
      let retailPrice = product?.retail_price;
      let imageUrl = product?.image_url;
      let discountValue = product?.discount?.value;

      if (!product) {
        const browseProduct = allCategoryProducts.find((p: any) => (p._id || p.id) === productId);
        if (browseProduct) {
          productName = browseProduct.name;
          category = browseProduct.productCategory?.title || browseProduct.category || "Uncategorized";
          retailPrice = browseProduct.retailPrice || browseProduct.retail_price || 0;
          imageUrl = browseProduct.images?.[0]?.url || browseProduct.image_url || "";
          // Extract discount from browse product
          if (browseProduct.discount) {
            discountValue = browseProduct.discount.value || browseProduct.discount.percentage || browseProduct.discount;
          }
        }
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
      retail_price: currentSlotData.retail_price || 0,
      image_url: (currentSlotData as any).image_url || "",
      quantity: currentSlotData.quantity || 0,
      in_stock: true,
    };
  }

  // Transform products for modal - include admin products, browse products, and slot-assigned products
  const apiProducts = productsData?.map((product: Product) => ({
    id: product.id.toString(),
    name: product.name,
    category: product.category || "Uncategorized",
    price: `₹${product.retail_price}`,
    amount: product.quantity,
    image: product.image_url,
  })) || [];
  
  // Add browse products (from ALL categories) to modal
  const browseModalProducts = allCategoryProducts.map((p: any) => ({
    id: p._id || p.id,
    name:
      (adminProductsById.get(String(p._id || p.id)) ||
        adminProductsById.get(String(p._id || p.id).replace(/^products\//, "")))?.name ?? p.name,
    category:
      (adminProductsById.get(String(p._id || p.id)) ||
        adminProductsById.get(String(p._id || p.id).replace(/^products\//, "")))?.category ??
      (p.productCategory?.title || p.category || "Uncategorized"),
    price:
      (adminProductsById.get(String(p._id || p.id)) ||
        adminProductsById.get(String(p._id || p.id).replace(/^products\//, "")))?.price ??
      `₹${p.retailPrice || p.retail_price || 0}`,
    amount:
      (adminProductsById.get(String(p._id || p.id)) ||
        adminProductsById.get(String(p._id || p.id).replace(/^products\//, "")))?.amount ??
      (p.quantity || 0),
    image:
      (adminProductsById.get(String(p._id || p.id)) ||
        adminProductsById.get(String(p._id || p.id).replace(/^products\//, "")))?.image ??
      (p.images?.[0]?.url || p.image_url || ""),
  }));
  
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
            price: `₹${slot.retail_price || 0}`,
            amount: slot.quantity || 0,
            image: slot.image_url || "",
          });
        }
      }
    });
  }
  
  // Merge all products - browse products first (priority), then admin, then slot products
  const allProductIds = new Set<string>();
  const modalProducts: typeof apiProducts = [];
  
  // Add browse products first
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

  const handleProductHideClick = (productId: string) => {
    // TODO: Implement hide/show product visibility
    console.log(`Hide product ${productId}`);
  };

  const handleProductEditClick = (productId: string) => {
    // Find the product to edit
    const product = productsData?.find((p: Product) => p.id.toString() === productId);
    if (product) {
      setEditingProduct({
        id: productId,
        name: product.name,
        category: product.category || "",
        price: product.retail_price,
        quantity: product.quantity,
      });
      setEditProductModalOpen(true);
    }
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
          quantity: data.quantity,
        }),
      });
      
      // Refetch products to show updated data
      await refetchProducts();
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
        onVoiceClick={handleVoiceClick}
        onTestClick={handleTestClick}
        onHideClick={handleHideClick}
        onLoadProductsClick={handleLoadProductsClick}
        onSettingsClick={handleSettingsClick}
        onSyncClick={handleSyncClick}
        onSlotClick={handleSlotClick}
        onProductHideClick={handleProductHideClick}
        onProductEditClick={handleProductEditClick}
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
