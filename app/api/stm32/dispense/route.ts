import { NextResponse } from "next/server";
import { getStm32Config, stm32Dispense } from "@/utils/stm32";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          productCode?: string;
          productCodes?: string[];
        }
      | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid JSON body" } },
        { status: 400 }
      );
    }

    const cfg = getStm32Config();

    const codes: string[] = Array.isArray(body.productCodes)
      ? body.productCodes
      : typeof body.productCode === "string"
        ? [body.productCode]
        : [];

    const normalized = codes
      .map((c) => (typeof c === "string" ? c.trim() : ""))
      .filter((c) => c.length > 0);

    if (normalized.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "Missing productCode(s)" } },
        { status: 400 }
      );
    }

    const results: Array<{
      productCode: string;
      ok: boolean;
      okLine?: string;
      errorLine?: string;
      rawLines: string[];
    }> = [];

    for (const productCode of normalized) {
      const res = await stm32Dispense(cfg, productCode);
      results.push({
        productCode,
        ok: Boolean(res.okLine) && !res.errorLine,
        okLine: res.okLine,
        errorLine: res.errorLine,
        rawLines: res.rawLines,
      });

      if (res.errorLine) {
        break;
      }
    }

    const success = results.every((r) => r.ok);

    return NextResponse.json({
      success,
      data: {
        results,
      },
    });
  } catch (err: any) {
    const message =
      typeof err?.message === "string" && err.message.trim().length > 0
        ? err.message
        : "Failed to dispense";

    const statusCode = message.startsWith("Missing env") || message.startsWith("Invalid env") ? 500 : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "production"
            ? { message }
            : {
                message,
                raw: {
                  name: err?.name,
                  stack: err?.stack,
                },
              },
      },
      { status: statusCode }
    );
  }
}
