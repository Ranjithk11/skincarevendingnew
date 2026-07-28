"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { clearVisitorSession } from "@/utils/clearVisitorSession";

/**
 * Safety net: when NextAuth goes authenticated → unauthenticated,
 * clear persisted cart + spin-wheel state (covers any signOut path).
 */
export default function ClearCartOnLogout() {
  const { status } = useSession();
  const prevStatusRef = useRef(status);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (prev === "authenticated" && status === "unauthenticated") {
      clearVisitorSession();
    }
  }, [status]);

  return null;
}
