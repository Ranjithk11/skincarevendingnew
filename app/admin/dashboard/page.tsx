"use client";

import { useEffect, useState } from "react";
import { AdminDashboard } from "@/containers/admin-dashboard";
import { useRouter } from "next/navigation";
import {
  useGetVendingSlotsQuery,
  useGetProductsQuery,
  useSyncProductQuantitiesMutation,
  useAssignProductToSlotMutation,
  useUpdateSlotQuantityMutation,
  useMotorControlMutation,
  VendingSlot,
  Product,
} from "@/redux/api/adminApi";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Redux queries
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useGetVendingSlotsQuery();
  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useGetProductsQuery();

  // Redux mutations
  const [syncQuantities, { isLoading: isSyncing }] = useSyncProductQuantitiesMutation();
  const [assignProduct] = useAssignProductToSlotMutation();
  const [updateQuantity] = useUpdateSlotQuantityMutation();
  const [motorControl] = useMotorControlMutation();

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
  })) || [];

  const handleCartClick = () => {
    router.push("/products");
  };

  const handleScanAgainClick = () => {
    localStorage.removeItem("admin_logged_in");
    localStorage.removeItem("admin_name");
    router.push("/admin/login");
  };

  const handleDashboardClick = () => {
    refetchSlots();
    refetchProducts();
  };

  const handleHomeMachineClick = () => {
    router.push("/");
  };

  const handleDispenseClick = async () => {
    if (selectedSlot) {
      try {
        await motorControl({ command: `M,${selectedSlot},1` });
      } catch (error) {
        console.error("Dispense error:", error);
      }
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
  };

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
  );
}
