/**
 * Serial protocol for productDispenserV8 firmware (115200 baud, \\n-terminated).
 * Keep in sync with the .ino deployed on the NUC.
 */

export function getSlotOffset(): number {
  const raw = process.env.STM32_SLOT_ID_OFFSET;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** UI slot id → firmware motor number (RQ parameter). */
export function toFirmwareMotorNumber(uiSlot: string | number): string {
  const n = Number(uiSlot);
  if (!Number.isFinite(n)) return String(uiSlot).trim();
  return String(n + getSlotOffset());
}

/** Firmware timings from productDispenserV8 (ms). */
export const FIRMWARE_TIMINGS = {
  SPIN_MS: 70000,
  TRAY_DOOR_OPEN_MS: 15000,
  REOPEN_DOOR_OPEN_MS: 10000,
} as const;

export const FIRMWARE_COMMANDS = {
  /** Home vertical tray axis (stepper 0). */
  homeTray: "HOME0",
  /** Full pickup cycle: anti-theft + door open 15s + close → prints 200 */
  tray: "TRAY",
  /** Door-only reopen: 10s open + close → REOPEN complete + 200 */
  reopen: "REOPEN",
  /** Dispense from motor N → RQ{N} */
  dispense: (motorNum: string | number) => `RQ${motorNum}`,
  /** Short DC motor test → M{N} */
  testMotor: (motorNum: string | number) => `M${motorNum}`,
} as const;

export const FIRMWARE_PATTERNS = {
  home: {
    ok: /Homed axis successfully|Moving toward endstop|Endstop already trigerred/i,
    error: /Endstop error|Invalid stepper Motor selected|Unknown command/i,
    timeoutMs: 120000,
  },
  /** Wait for final 200 only — TRAY still runs 15s after "Waiting 5s for pickup". */
  tray: {
    ok: /^200$/,
    error: /Endstop error|Invalid stepper Motor selected|Unknown command|^ERROR\b/i,
    timeoutMs: 180000,
  },
  reopen: {
    ok: /REOPEN complete|^200$/i,
    error: /Endstop error|Unknown command|^ERROR\b/i,
    timeoutMs: 120000,
  },
  dispense: {
    ok: /Stopping motors|Product drop detected|Product not detected/i,
    error: /Endstop error|Unknown command|^ERROR\b/i,
    timeoutMs: 180000,
  },
  testMotor: {
    ok: /Motor test complete/i,
    error: /Unknown command|^ERROR\b/i,
    timeoutMs: 15000,
  },
} as const;
