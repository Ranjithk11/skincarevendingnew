export type Stm32Config = {
  port: string;
  baudRate: number;
  timeoutMs: number;
  mock: boolean;
};

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function isServerlessEnvironment(): boolean {
  // Detect Vercel, AWS Lambda, or other serverless environments
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.SERVERLESS
  );
}

export function getStm32Config(): Stm32Config {
  // Auto-enable mock mode in serverless environments (serialport doesn't work there)
  const isServerless = isServerlessEnvironment();
  const mockEnv = getEnv("STM32_MOCK");
  const mock = isServerless || mockEnv === "true" || mockEnv === "1";

  if (isServerless) {
    console.log("[STM32] Running in serverless environment - using mock mode");
  }

  const port = getEnv("STM32_PORT") || "COM3";

  const baudRateRaw = getEnv("STM32_BAUDRATE");
  const timeoutRaw = getEnv("STM32_TIMEOUT_MS");

  // Default to 115200 baud rate (matching STM32 firmware Serial.begin(115200))
  const baudRate = baudRateRaw ? Number(baudRateRaw) : 115200;
  if (!Number.isFinite(baudRate) || baudRate <= 0) {
    throw new Error("Invalid env STM32_BAUDRATE");
  }

  // Default to 60 seconds timeout (dispense sequence takes time: homing, moving, dispensing, door)
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : 60000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Invalid env STM32_TIMEOUT_MS");
  }

  return { port, baudRate, timeoutMs, mock };
}

type DispenseResult = {
  rawLines: string[];
  okLine?: string;
  errorLine?: string;
};

function normalizeLine(line: string): string {
  return line.replace(/[\r\n]+/g, "").trim();
}

export async function stm32Dispense(
  cfg: Stm32Config,
  productCode: string,
  opts?: {
    commandPrefix?: string;
    commandSuffix?: string;
    okPattern?: RegExp;
    errorPattern?: RegExp;
  }
): Promise<DispenseResult> {
  const code = typeof productCode === "string" ? productCode.trim() : "";
  if (!code) {
    throw new Error("Invalid productCode");
  }

  // Mock mode - simulate successful dispense without hardware
  // Used in serverless environments (Vercel, AWS Lambda) where serialport doesn't work
  if (cfg.mock) {
    console.log(`[STM32 Mock] Simulating dispense for product code: ${code}`);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate small delay
    return {
      rawLines: [`[MOCK] Dispensing ${code}`, "[MOCK] Request sequence finished"],
      okLine: "Request sequence finished",
    };
  }

  const commandPrefix = opts?.commandPrefix ?? "RQ";
  const commandSuffix = opts?.commandSuffix ?? "\r\n";
  // Match Flask's success patterns: "Request sequence finished" or "200" or "Response 200"
  const okPattern = opts?.okPattern ?? /Request sequence finished|^200$|Response 200/i;
  const errorPattern = opts?.errorPattern ?? /^ERROR\b/i;

  const command = `${commandPrefix}${code}${commandSuffix}`;

  // Dynamic import to avoid webpack bundling issues
  const { SerialPort } = await import("serialport");
  const { ReadlineParser } = await import("@serialport/parser-readline");

  const port = new SerialPort({
    path: cfg.port,
    baudRate: cfg.baudRate,
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  const rawLines: string[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      port.open((err) => (err ? reject(err) : resolve()));
    });

    await new Promise<void>((resolve, reject) => {
      port.write(command, (err) => {
        if (err) return reject(err);
        port.drain((drainErr) => (drainErr ? reject(drainErr) : resolve()));
      });
    });

    const result = await new Promise<DispenseResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("STM32 response timeout"));
      }, cfg.timeoutMs);

      const onData = (data: string | Buffer) => {
        const line = normalizeLine(typeof data === "string" ? data : data.toString("utf8"));
        if (!line) return;

        rawLines.push(line);

        if (okPattern.test(line)) {
          cleanup();
          return resolve({ rawLines, okLine: line });
        }

        if (errorPattern.test(line)) {
          cleanup();
          return resolve({ rawLines, errorLine: line });
        }
      };

      const onError = (err: unknown) => {
        cleanup();
        reject(err instanceof Error ? err : new Error("Serial error"));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        parser.off("data", onData);
        port.off("error", onError);
      };

      parser.on("data", onData);
      port.on("error", onError);
    });

    return result;
  } finally {
    await new Promise<void>((resolve) => {
      if (!port.isOpen) return resolve();
      port.close(() => resolve());
    });
  }
}

export async function stm32DispenseMany(
  cfg: Stm32Config,
  productCodes: string[],
  opts?: {
    commandPrefix?: string;
    commandSuffix?: string;
    okPattern?: RegExp;
    errorPattern?: RegExp;
  }
): Promise<Array<{ productCode: string; result: DispenseResult }>> {
  const normalized = (Array.isArray(productCodes) ? productCodes : [])
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter((c) => c.length > 0);

  if (normalized.length === 0) {
    throw new Error("Missing productCode(s)");
  }

  if (cfg.mock) {
    const results: Array<{ productCode: string; result: DispenseResult }> = [];
    for (const code of normalized) {
      const res = await stm32Dispense(cfg, code, opts);
      results.push({ productCode: code, result: res });
    }
    return results;
  }

  const commandPrefix = opts?.commandPrefix ?? "RQ";
  const commandSuffix = opts?.commandSuffix ?? "\r\n";
  const okPattern = opts?.okPattern ?? /Request sequence finished|^200$|Response 200/i;
  const errorPattern = opts?.errorPattern ?? /^ERROR\b/i;

  const { SerialPort } = await import("serialport");
  const { ReadlineParser } = await import("@serialport/parser-readline");

  const port = new SerialPort({
    path: cfg.port,
    baudRate: cfg.baudRate,
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  const runOne = async (code: string): Promise<DispenseResult> => {
    const rawLines: string[] = [];
    const command = `${commandPrefix}${code}${commandSuffix}`;

    await new Promise<void>((resolve, reject) => {
      port.write(command, (err) => {
        if (err) return reject(err);
        port.drain((drainErr) => (drainErr ? reject(drainErr) : resolve()));
      });
    });

    return await new Promise<DispenseResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("STM32 response timeout"));
      }, cfg.timeoutMs);

      const onData = (data: string | Buffer) => {
        const line = normalizeLine(typeof data === "string" ? data : data.toString("utf8"));
        if (!line) return;
        rawLines.push(line);

        if (okPattern.test(line)) {
          cleanup();
          return resolve({ rawLines, okLine: line });
        }

        if (errorPattern.test(line)) {
          cleanup();
          return resolve({ rawLines, errorLine: line });
        }
      };

      const onError = (err: unknown) => {
        cleanup();
        reject(err instanceof Error ? err : new Error("Serial error"));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        parser.off("data", onData);
        port.off("error", onError);
      };

      parser.on("data", onData);
      port.on("error", onError);
    });
  };

  try {
    await new Promise<void>((resolve, reject) => {
      port.open((err) => (err ? reject(err) : resolve()));
    });

    const results: Array<{ productCode: string; result: DispenseResult }> = [];
    for (const code of normalized) {
      const res = await runOne(code);
      results.push({ productCode: code, result: res });
      if (res.errorLine) break;
    }
    return results;
  } finally {
    await new Promise<void>((resolve) => {
      if (!port.isOpen) return resolve();
      port.close(() => resolve());
    });
  }
}
