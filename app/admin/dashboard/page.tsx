"use client";

import { useEffect, useState } from "react";
import { AdminDashboard } from "@/containers/admin-dashboard";
import { SlotAssignmentModal, MachineStatusModal, EditProductModal } from "@/containers/admin-dashboard/components";
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

  // Redux queries
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useGetVendingSlotsQuery();
  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useGetProductsQuery();

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

  // Transform products data for the table
  const transformedProducts = productsData?.map((product: Product) => ({
    id: product.id.toString(),
    name: product.name,
    category: product.category || "Uncategorized",
    price: `Rs.${product.retail_price}`,
    amount: product.quantity,
    image: product.image_url,
  })) || [];

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
      const command = selectedSlot ? `M,${selectedSlot},1` : "DISPENSE";
      const result = await motorControl({ command }).unwrap();
      setDispenseStatus(result.success);
      if (result.success && selectedSlot) {
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
      // Find the product to get its details
      const product = productsData?.find((p: Product) => p.id.toString() === productId);
      
      await assignProduct({ 
        slotId: slotNumber, 
        productId: productId, 
        quantity,
        productName: product?.name,
        category: product?.category,
        retailPrice: product?.retail_price,
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

  // Transform products for modal - include both API products and slot-assigned products
  const apiProducts = productsData?.map((product: Product) => ({
    id: product.id.toString(),
    name: product.name,
    category: product.category || "Uncategorized",
    price: `₹${product.retail_price}`,
    amount: product.quantity,
    image: product.image_url,
  })) || [];
  
  // Add slot-assigned products that aren't in the API list (for slots 1-10 with local products)
  const slotProducts: typeof apiProducts = [];
  if (slotsData) {
    Object.values(slotsData).forEach((slot: any) => {
      if (slot.product_id && slot.product_name) {
        const existsInApi = apiProducts.some(p => p.id === slot.product_id?.toString());
        const existsInSlotProducts = slotProducts.some(p => p.id === slot.product_id?.toString());
        if (!existsInApi && !existsInSlotProducts) {
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
  const modalProducts = [...apiProducts, ...slotProducts];

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
      refetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

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
    </>
  );
}
