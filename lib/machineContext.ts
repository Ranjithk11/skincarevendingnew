export type MachineContext = {
  machineId: string;
  machineName: string;
  machineLocation: string;
};

type MachineSource = {
  machineId?: string;
  machineName?: string;
  machineLocation?: string;
};

/** Merge machine settings from API, checkout session, session user, and env. */
export function mergeMachineContext(
  ...sources: Array<MachineSource | null | undefined>
): MachineContext {
  const pick = (key: keyof MachineSource) => {
    for (const src of sources) {
      const value = src?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  };

  return {
    machineId:
      pick("machineId") ||
      process.env.NEXT_PUBLIC_LW_MACHINE_ID ||
      process.env.NEXT_PUBLIC_MACHINE_ID ||
      "",
    machineName:
      pick("machineName") ||
      process.env.NEXT_PUBLIC_MACHINE_NAME ||
      "",
    machineLocation:
      pick("machineLocation") ||
      process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
      "",
  };
}

/**
 * Walk-in kiosk purchases: prefer location, then machine name, then machine id.
 * Logged-in scan users keep their auth user id when it looks like a real account id.
 */
export function getWebhookUserId(
  session: { user?: Record<string, unknown> } | null | undefined,
  machine: MachineContext
): string {
  const sessionUserId = session?.user?.id;
  if (sessionUserId && String(sessionUserId).includes("/")) {
    return String(sessionUserId);
  }

  return (
    machine.machineLocation ||
    machine.machineName ||
    machine.machineId ||
    ""
  );
}

export function getWalkInDisplayName(
  session: { user?: Record<string, unknown> } | null | undefined,
  machine: MachineContext
): string {
  const sessionName = session?.user?.name;
  if (typeof sessionName === "string" && sessionName.trim()) {
    return sessionName.trim();
  }

  const label = machine.machineName || machine.machineLocation || "Vending Machine";
  return `Walk-in – ${label}`;
}
