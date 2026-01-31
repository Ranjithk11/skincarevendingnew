"use client";

import { useEffect, useState } from "react";
import { AdminDashboard } from "@/containers/admin-dashboard";
import { SlotAssignmentModal, MachineStatusModal } from "@/containers/admin-dashboard/components";
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
  const currentProduct = currentSlotData?.product_id 
    ? productsData?.find((p: Product) => p.id === currentSlotData.product_id)
    : null;

  // Transform products for modal
  const modalProducts = productsData?.map((product: Product) => ({
    id: product.id.toString(),
    name: product.name,
    category: product.category || "Uncategorized",
    price: `₹${product.retail_price}`,
    amount: product.quantity,
    image: product.image_url,
  })) || [];

  const handleProductHideClick = (productId: string) => {
    console.log(`Hide product ${productId}`);
  };

  const handleProductEditClick = (productId: string) => {
    console.log(`Edit product ${productId}`);
  };

  if (slotsLoading || productsLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
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
    </>
  );
}
