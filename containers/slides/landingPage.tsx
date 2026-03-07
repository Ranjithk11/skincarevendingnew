"use client";

import { LandingTopSection, PageBackground } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const handleStartScan = () => {
    router.push("/questionnaire");
  };

  const handleBrowseProducts = () => {
    router.push("/products");
  };

  const handleSlots = () => {
    router.push("/slots");
  };

  const handleAdminDashboard = () => {
    router.push("/admin/login");
  };

  return (
    <PageBackground showGreenCurve>
      <LandingTopSection 
        onStartScan={handleStartScan} 
        onBrowseProducts={handleBrowseProducts}
        onSlots={handleSlots}
        onAdminDashboard={handleAdminDashboard}
      />
    </PageBackground>
  );
}
