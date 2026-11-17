import { afterEach, expect, it, vi } from "vitest";
import { createScheduler } from "../skills/content-search-audit/scripts/lib/scheduler.mjs";
afterEach(() => vi.useRealTimers());
const clock = {
  now: () => Date.now(),
  sleep: (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
};
it("spaces starts across schemes on one host and allows a separate host to proceed", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const schedule = createScheduler({}, clock);
  const starts: number[] = [];
  const a = schedule.run("https://example.com/a", async () => {
    starts.push(Date.now());
    return "a";
  });
  const b = schedule.run("http://example.com/b", async () => {
    starts.push(Date.now());
    return "b";
  });
  const c = schedule.run("https://other.example/c", async () => "c");
  await expect(c).resolves.toBe("c");
  await vi.advanceTimersByTimeAsync(999);
  expect(starts).toEqual([0]);
  await vi.advanceTimersByTimeAsync(1);
  expect(starts).toEqual([0, 1000]);
  await expect(Promise.all([a, b])).resolves.toEqual(["a", "b"]);
});
it("holds the concurrency slot until a request finishes and recovers after failure", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const schedule = createScheduler({}, clock);
  let finish: () => void = () => {};
  const first = schedule.run(
    "https://example.com/1",
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  let fail: (error: Error) => void = () => {};
  const second = schedule.run(
    "https://example.com/2",
    () =>
      new Promise<void>((_, reject) => {
        fail = reject;
      }),
  );
  const failure = expect(second).rejects.toThrow("fixture");
  const third = vi.fn(async () => 3);
  const last = schedule.run("https://example.com/3", third);
  await vi.advanceTimersByTimeAsync(5000);
  expect(third).not.toHaveBeenCalled();
  fail(new Error("fixture"));
  await failure;
  await vi.advanceTimersByTimeAsync(0);
  expect(third).toHaveBeenCalledOnce();
  finish();
  await first;
  await expect(last).resolves.toBe(3);
});
it("honors increased crawl delay without resetting prior start time", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const schedule = createScheduler({}, clock);
  await schedule.run("https://example.com/a", async () => 1);
  schedule.setDelay("https://example.com", 3000);
  const task = vi.fn(async () => 2);
  const pending = schedule.run("https://example.com/b", task);
  await vi.advanceTimersByTimeAsync(2999);
  expect(task).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await expect(pending).resolves.toBe(2);
});

it("removes cancelled queued work before its scheduled start", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const schedule = createScheduler({}, clock);
  await schedule.run("https://example.com/a", async () => 1);
  const controller = new AbortController();
  const operation = vi.fn(async () => 2);
  const pending = schedule.run("https://example.com/b", operation, {
    signal: controller.signal,
  });
  const rejected = expect(pending).rejects.toThrow("cancel queued");
  controller.abort(new Error("cancel queued"));
  await rejected;
  await vi.advanceTimersByTimeAsync(5000);
  expect(operation).not.toHaveBeenCalled();
  await expect(
    schedule.run("https://example.com/c", async () => 3),
  ).resolves.toBe(3);
});
