import { setTimeout, clearTimeout } from "node:timers";
export function abortReason(signal) {
  return signal?.reason instanceof Error
    ? signal.reason
    : Object.assign(new Error("Collection cancelled; retry required"), {
        code: "ABORT_ERR",
      });
}
export function checkAbort(signal) {
  if (signal?.aborted) throw abortReason(signal);
}
/** Abort observation of a wait; the operation must also cancel its native resources. */
export async function abortable(operation, signal) {
  checkAbort(signal);
  if (!signal) return operation();
  let listener;
  try {
    return await Promise.race([
      new Promise((_, reject) => {
        listener = () => reject(abortReason(signal));
        signal.addEventListener("abort", listener, { once: true });
        if (signal.aborted) listener();
      }),
      Promise.resolve().then(() => {
        checkAbort(signal);
        return operation();
      }),
    ]);
  } finally {
    signal.removeEventListener("abort", listener);
  }
}
export function createDeadline(
  milliseconds,
  parentSignal,
  message = "Collection deadline exceeded; retry required",
) {
  if (
    !Number.isSafeInteger(milliseconds) ||
    milliseconds < 1 ||
    milliseconds > 120000
  )
    throw new Error("Invalid collection deadline");
  const controller = new globalThis.AbortController();
  const cancel = () => controller.abort(abortReason(parentSignal));
  if (parentSignal?.aborted) cancel();
  else parentSignal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        Object.assign(new Error(message), { code: "COLLECTION_TIMEOUT" }),
      ),
    milliseconds,
  );
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", cancel);
    },
  };
}
