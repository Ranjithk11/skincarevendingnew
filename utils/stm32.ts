export type Stm32Config = {
  port: string;
  baudRate: number;
  timeoutMs: number;
};

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export function getStm32Config(): Stm32Config {
  const port = getEnv("STM32_PORT");
  if (!port) {
    throw new Error("Missing env STM32_PORT (e.g. COM3)");
  }

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

  return { port, baudRate, timeoutMs };
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
