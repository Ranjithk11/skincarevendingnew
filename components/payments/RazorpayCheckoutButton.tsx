"use client";

import ActionButton from "@/components/ui/ActionButton";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ButtonProps } from "@mui/material";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

type CreateOrderResponse =
  | {
      success: true;
      data: {
        keyId: string;
        order: RazorpayOrder;
      };
    }
  | { success: false; error: { message: string } };

type VerifyResponse =
  | { success: true; data: { verified: boolean } }
  | { success: false; error: { message: string } };

type RazorpayPaymentSuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

const upiOnlyCheckoutConfig = {
  display: {
    blocks: {
      upi: {
        name: "Pay via UPI",
        instruments: [{ method: "upi" }],
      },
    },
    sequence: ["block.upi"],
    preferences: {
      show_default_blocks: false,
    },
  },
};

const loadRazorpayScript = (retries = 3): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") return resolve(false);

    // Check if Razorpay is already loaded
    if (typeof window.Razorpay === "function") {
      return resolve(true);
    }

    // Check if script tag exists
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      // Script exists but Razorpay not loaded - wait a bit
      setTimeout(() => {
        if (typeof window.Razorpay === "function") {
          resolve(true);
        } else if (retries > 0) {
          // Remove failed script and retry
          existingScript.remove();
          loadRazorpayScript(retries - 1).then(resolve);
        } else {
          resolve(false);
        }
      }, 1000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      // Verify Razorpay is actually available
      setTimeout(() => {
        resolve(typeof window.Razorpay === "function");
      }, 100);
    };
    script.onerror = () => {
      console.error("[Razorpay] Script failed to load, retries left:", retries - 1);
      if (retries > 1) {
        script.remove();
        setTimeout(() => {
          loadRazorpayScript(retries - 1).then(resolve);
        }, 1000);
      } else {
        resolve(false);
      }
    };
    document.body.appendChild(script);
  });
};

export interface RazorpayCheckoutButtonProps {
  amountPaise: number;
  currency?: string;
  receipt?: string;
  productId?: string;
  mode?: "test" | "live";
  buttonProps?: Omit<ButtonProps, "onClick" | "children" | "variant"> & {
    variant?: "primary" | "outline";
  };
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onVerified?: (payload: {
    orderId: string;
    paymentId: string;
    signature: string;
    productId?: string;
  }) => void;
  onError?: (message: string) => void;
  onProcessingStart?: () => void;
  label?: string;
}

export default function RazorpayCheckoutButton({
  amountPaise,
  currency = "INR",
  receipt,
  productId,
  mode = "test",
  buttonProps,
  customer,
  onVerified,
  onError,
  onProcessingStart,
  label = "Pay Now",
}: RazorpayCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const reportError = useCallback(
    (message: string) => {
      toast.error(message);
      onError?.(message);
    },
    [onError]
  );

  const handlePay = useCallback(async () => {
    if (inFlightRef.current) return;

    try {
      inFlightRef.current = true;
      setIsLoading(true);
      onProcessingStart?.();

      const unlock = () => {
        setIsLoading(false);
        inFlightRef.current = false;
      };

      if (typeof amountPaise !== "number" || !Number.isFinite(amountPaise) || amountPaise <= 0) {
        reportError("Invalid amount");
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || typeof window.Razorpay !== "function") {
        reportError("Failed to load Razorpay checkout. Please check your internet connection.");
        return;
      }

      const createOrderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt,
          mode,
        }),
      });

      const rawText = await createOrderRes.text().catch(() => "");
      const createOrderJson = ((): CreateOrderResponse | null => {
        try {
          return rawText ? (JSON.parse(rawText) as CreateOrderResponse) : null;
        } catch {
          return null;
        }
      })();

      if (!createOrderRes.ok || !createOrderJson || createOrderJson.success === false) {
        const msgFromJson =
          createOrderJson && "error" in createOrderJson
            ? createOrderJson.error.message
            : "";
        const msg =
          msgFromJson ||
          (rawText ? `Create order failed (${createOrderRes.status}): ${rawText}` : `Create order failed (${createOrderRes.status})`);
        reportError(msg);
        return;
      }

      const { keyId, order } = createOrderJson.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Leafwater",
        description: "Product Purchase",
        image: "/wending/goldlog.svg",
        prefill: {
          name: customer?.name,
          email: customer?.email,
          contact: customer?.contact,
          method: "upi",
        },
        method: {
          upi: true,
          card: false,
          netbanking: false,
          wallet: false,
          paylater: false,
          emi: false,
        },
        theme: {
          color: "#2E7D32",
        },
        handler: async (response: RazorpayPaymentSuccessResponse) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                mode,
              }),
            });

            const verifyJson = (await verifyRes
              .json()
              .catch(() => null)) as VerifyResponse | null;

            if (!verifyRes.ok || !verifyJson || verifyJson.success === false) {
              const msg =
                verifyJson && "error" in verifyJson
                  ? verifyJson.error.message
                  : "Payment verification failed";
              reportError(msg);
              return;
            }

            toast.success("Payment successful");
            onVerified?.({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              productId,
            });
          } catch {
            reportError("Payment verification failed");
          } finally {
            unlock();
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled");
            unlock();
          },
        },
      });

      rzp.on("payment.failed", (err: unknown) => {
        const e = err as any;
        const msg = e?.error?.description || e?.error?.reason || "Payment failed";
        reportError(msg);
        unlock();
      });

      rzp.open();
    } catch {
      reportError("Something went wrong. Please try again.");
    }
  }, [amountPaise, currency, receipt, productId, mode, customer, onVerified, onProcessingStart, reportError]);

  return (
    <ActionButton onClick={handlePay} disabled={isLoading} {...buttonProps}>
      {isLoading ? "Processing..." : label}
    </ActionButton>
  );
}
