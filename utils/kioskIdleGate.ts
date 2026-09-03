/**
 * Global gate so payment OTP / QR waits are not killed by kiosk idle logout.
 * Multiple callers can nest pause/resume safely.
 */

type Listener = (paused: boolean) => void;

let pauseCount = 0;
const listeners = new Set<Listener>();

function notify() {
  const paused = pauseCount > 0;
  listeners.forEach((listener) => {
    try {
      listener(paused);
    } catch {
      /* ignore */
    }
  });
}

export function isKioskIdlePaused(): boolean {
  return pauseCount > 0;
}

export function pauseKioskIdle(): void {
  pauseCount += 1;
  notify();
}

export function resumeKioskIdle(): void {
  pauseCount = Math.max(0, pauseCount - 1);
  notify();
}

export function subscribeKioskIdlePause(listener: Listener): () => void {
  listeners.add(listener);
  listener(pauseCount > 0);
  return () => {
    listeners.delete(listener);
  };
}
