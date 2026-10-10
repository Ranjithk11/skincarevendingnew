export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { initErrorLog } = await import("./lib/error-log");
  initErrorLog();
}
