import https from "https";
import http from "http";
import { URL } from "url";

type FetchInit = RequestInit & {
  headers?: HeadersInit;
};

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([k, v]) => [k, String(v)]));
  }
  const out: Record<string, string> = {};
  Object.entries(headers).forEach(([k, v]) => {
    if (v !== undefined && v !== null) out[k] = String(v);
  });
  return out;
}

/** Low-level request that can ignore expired TLS certificates. */
function requestWithOptionalInsecureTls(
  url: string,
  init: FetchInit,
  insecure: boolean
): Promise<Response> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (err) {
      reject(err);
      return;
    }

    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const method = (init.method || "GET").toUpperCase();
    const headers = headersToRecord(init.headers);

    const options: https.RequestOptions = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: `${parsed.pathname}${parsed.search}`,
      method,
      headers,
      ...(isHttps && insecure
        ? { rejectUnauthorized: false, agent: new https.Agent({ rejectUnauthorized: false }) }
        : {}),
    };

    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        const responseHeaders = new Headers();
        Object.entries(res.headers).forEach(([key, value]) => {
          if (value == null) return;
          if (Array.isArray(value)) {
            value.forEach((v) => responseHeaders.append(key, v));
          } else {
            responseHeaders.set(key, value);
          }
        });

        resolve(
          new Response(body, {
            status: res.statusCode || 500,
            statusText: res.statusMessage || "",
            headers: responseHeaders,
          })
        );
      });
    });

    req.on("error", reject);

    if (init.body != null && method !== "GET" && method !== "HEAD") {
      req.write(typeof init.body === "string" ? init.body : String(init.body));
    }
    req.end();
  });
}

/**
 * Fetch Leafwater backend URLs. Retries once with relaxed TLS when the
 * upstream certificate is expired (common on kiosk / staging hosts).
 */
export async function fetchLeafwater(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err: any) {
    const causeCode = err?.cause?.code || err?.code;
    const causeMsg = String(err?.cause?.message || err?.message || "");
    const certExpired =
      causeCode === "CERT_HAS_EXPIRED" ||
      causeMsg.toLowerCase().includes("certificate has expired");

    if (!certExpired) throw err;

    console.warn(
      "[leafwater-fetch] TLS certificate expired — retrying with relaxed TLS:",
      url
    );

    return requestWithOptionalInsecureTls(url, init, true);
  }
}
