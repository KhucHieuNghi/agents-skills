import { setTimeout as sleep } from "node:timers/promises";
import { URL } from "node:url";
import { abortable, abortReason, checkAbort } from "./cancellation.mjs";
/** Shared per-host dispatcher. Wrap one complete HTTP hop, including body reception. */
export function createScheduler(
  options = {},
  clock = { now: () => Date.now(), sleep },
) {
  const concurrency = options.concurrency ?? 2,
    minIntervalMs = options.minIntervalMs ?? 1000;
  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 2 ||
    !Number.isSafeInteger(minIntervalMs) ||
    minIntervalMs < 1000 ||
    minIntervalMs > 86400000
  )
    throw new Error("Invalid collection scheduling limits");
  const hosts = new Map();
  function stateFor(value) {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error("Invalid scheduling URL");
    const key = url.hostname;
    if (!hosts.has(key))
      hosts.set(key, {
        queue: [],
        active: 0,
        lastStart: -Infinity,
        interval: minIntervalMs,
        draining: false,
      });
    return hosts.get(key);
  }
  async function drain(state) {
    if (state.draining) return;
    state.draining = true;
    try {
      while (state.queue.length && state.active < concurrency) {
        let remaining = state.lastStart + state.interval - clock.now();
        while (remaining > 0) {
          const wake = new globalThis.AbortController();
          state.wake = wake;
          try {
            await abortable(
              () => clock.sleep(remaining, undefined, { signal: wake.signal }),
              wake.signal,
            );
          } catch (error) {
            if (!wake.signal.aborted) throw error;
          } finally {
            if (state.wake === wake) state.wake = null;
          }
          if (!state.queue.length) break;
          remaining = state.lastStart + state.interval - clock.now();
        }
        if (!state.queue.length) break;
        const job = state.queue.shift();
        job.cleanup();
        state.active++;
        state.lastStart = clock.now();
        Promise.resolve()
          .then(() => {
            checkAbort(job.signal);
            return job.operation(job.signal);
          })
          .then(job.resolve, job.reject)
          .finally(() => {
            state.active--;
            void drain(state);
          });
      }
    } catch (error) {
      for (const job of state.queue.splice(0)) {
        job.cleanup();
        job.reject(error);
      }
    } finally {
      state.draining = false;
    }
  }
  return {
    run(url, operation, { signal } = {}) {
      if (typeof operation !== "function")
        throw new Error("Scheduled operation required");
      const state = stateFor(url);
      return new Promise((resolve, reject) => {
        checkAbort(signal);
        const job = {
          operation,
          resolve,
          reject,
          signal,
          cleanup: () => signal?.removeEventListener("abort", cancel),
        };
        const cancel = () => {
          const index = state.queue.indexOf(job);
          if (index < 0) return;
          state.queue.splice(index, 1);
          job.cleanup();
          reject(abortReason(signal));
          if (!state.queue.length) state.wake?.abort();
        };
        signal?.addEventListener("abort", cancel, { once: true });
        state.queue.push(job);
        void drain(state);
      });
    },
    setDelay(url, milliseconds) {
      if (
        !Number.isSafeInteger(milliseconds) ||
        milliseconds < 0 ||
        milliseconds > 86400000
      )
        throw new Error("Unsupported crawl delay; leave collection pending");
      const state = stateFor(url);
      state.interval = Math.max(state.interval, milliseconds, minIntervalMs);
    },
    snapshot() {
      return [...hosts.entries()].map(([host, state]) => ({
        host,
        active: state.active,
        pending: state.queue.length,
        minIntervalMs: state.interval,
      }));
    },
  };
}
